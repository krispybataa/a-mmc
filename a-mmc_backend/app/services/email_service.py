"""
email_service.py
----------------
Transactional email notifications for appointment lifecycle events.

All public functions catch send errors internally — a failed email never causes
an appointment operation to fail or roll back. Errors are logged to stderr via
the Flask app logger.

SMTP configuration is read from the Flask app config at call time.

Console preview mode:
  When MAIL_USERNAME is not set (empty string), no SMTP connection is attempted.
  Instead, the full rendered HTML is printed to stdout with a clear header:
    [EMAIL PREVIEW - not sent] Subject: <subject>
  This enables usability testing without any SMTP configuration.

Production:
  Set MAIL_SERVER, MAIL_PORT, MAIL_USERNAME, MAIL_PASSWORD, MAIL_FROM,
  MAIL_USE_TLS, and SYSTEM_URL in the environment / .env file.
  Switching providers (Mailtrap → SendGrid) is a .env change only.
"""

import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from flask import current_app

from app.services.email_templates import (
    appointment_confirmation,
    reschedule_request_to_patient,
    reschedule_request_to_clinician,
    cancellation_notice,
    noshow_confirmation_prompt,
    initial_credentials_clinician,
    initial_credentials_secretary,
    reschedule_confirmation_to_patient,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

def _send(to: str, subject: str, html: str) -> None:
    """
    Send an HTML email via SMTP, or log it to the console if SMTP is unconfigured.

    "Unconfigured" is determined by MAIL_USERNAME being absent or empty — every
    supported SMTP provider (Mailtrap, SendGrid) requires credentials, so an
    empty username is a reliable sentinel. When unconfigured, the full rendered
    HTML is printed to stdout so usability testing can proceed without a live
    mail server.
    """
    cfg = current_app.config

    if not cfg.get("MAIL_USERNAME", ""):
        # ── Console preview mode ──────────────────────────────────────────────
        print(f"[EMAIL PREVIEW - not sent] Subject: {subject}")
        print(html)
        logger.info("[EMAIL PREVIEW - not sent] Subject: %s | To: %s", subject, to)
        return

    # ── Live SMTP send ────────────────────────────────────────────────────────
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = cfg.get("MAIL_FROM", "noreply@alagang-mmc.local")
    msg["To"]      = to
    msg.attach(MIMEText(html, "html"))

    with smtplib.SMTP(cfg["MAIL_SERVER"], cfg["MAIL_PORT"]) as server:
        if cfg.get("MAIL_USE_TLS", True):
            server.starttls()
        server.login(cfg["MAIL_USERNAME"], cfg.get("MAIL_PASSWORD", ""))
        server.sendmail(cfg["MAIL_FROM"], [to], msg.as_string())

    logger.info("Email sent to %s | subject: %s", to, subject)


def _system_url() -> str:
    """Return SYSTEM_URL from environment, with no trailing slash."""
    return os.environ.get("SYSTEM_URL", "").rstrip("/")


# ---------------------------------------------------------------------------
# Public notification functions
# ---------------------------------------------------------------------------

def _secretary_contact_for(clinician_id: int) -> dict:
    """
    Return contact details for the first secretary linked to this clinician.
    Returns a dict with keys: email, name, phone.
    All values default to empty string if no secretary is linked or fields are unset.
    Uses deferred imports to avoid circular references.
    """
    try:
        from app.models.secretary import SecretaryClinicianLink, Secretary
        link = SecretaryClinicianLink.query.filter_by(clinician_id=clinician_id).first()
        if link:
            secretary = Secretary.query.get(link.secretary_id)
            if secretary:
                return {
                    "email": secretary.contact_email or "",
                    "name":  f"{secretary.first_name} {secretary.last_name}".strip(),
                    "phone": secretary.contact_phone or "",
                }
    except Exception:
        pass
    return {"email": "", "name": "", "phone": ""}


def send_appointment_confirmation(appointment) -> None:
    """
    Notify the patient that their appointment has been accepted by C/S.

    appointment: Appointment ORM object (with .patient, .clinician, .slot loaded)
    """
    try:
        patient   = appointment.patient
        clinician = appointment.clinician
        slot      = appointment.slot

        sec = _secretary_contact_for(clinician.clinician_id)
        tpl = appointment_confirmation(
            patient_name             = f"{patient.first_name} {patient.last_name}",
            clinician_name           = f"{clinician.first_name} {clinician.last_name}",
            clinician_title          = clinician.title or "",
            date                     = str(appointment.consultation_date),
            time                     = str(slot.start_time)[:5],
            room_number              = clinician.room_number or "",
            chief_complaint          = appointment.chief_complaint or "",
            payment_type             = appointment.payment_type or "",
            consultation_type        = appointment.consultation_type or "",
            secretary_email          = sec["email"],
            secretary_name           = sec["name"],
            secretary_contact_phone  = sec["phone"],
        )
        _send(patient.login_email, tpl["subject"], tpl["html"])
    except Exception:
        logger.exception(
            "Failed to send appointment confirmation for appointment_id=%s",
            getattr(appointment, "appointment_id", "?"),
        )


def send_reschedule_request_to_patient(appointment) -> None:
    """
    Notify the patient that C/S has requested a reschedule.

    appointment: Appointment ORM object (status already set to reschedule_requested)
    """
    try:
        patient   = appointment.patient
        clinician = appointment.clinician
        slot      = appointment.slot

        tpl = reschedule_request_to_patient(
            patient_name    = f"{patient.first_name} {patient.last_name}",
            clinician_name  = f"{clinician.first_name} {clinician.last_name}",
            clinician_title = clinician.title or "",
            original_date   = str(appointment.consultation_date),
            original_time   = str(slot.start_time)[:5],
            reason          = appointment.reschedule_reason or "Not specified",
        )
        _send(patient.login_email, tpl["subject"], tpl["html"])
    except Exception:
        logger.exception(
            "Failed to send reschedule-request-to-patient for appointment_id=%s",
            getattr(appointment, "appointment_id", "?"),
        )


def send_reschedule_request_to_clinician(appointment) -> None:
    """
    Notify the clinician (via contact_email) that the patient has requested a reschedule.

    appointment: Appointment ORM object (status already set to reschedule_requested)
    """
    try:
        patient   = appointment.patient
        clinician = appointment.clinician
        slot      = appointment.slot

        to = clinician.contact_email or clinician.login_email
        tpl = reschedule_request_to_clinician(
            clinician_name  = f"{clinician.first_name} {clinician.last_name}",
            clinician_title = clinician.title or "",
            patient_name    = f"{patient.first_name} {patient.last_name}",
            original_date   = str(appointment.consultation_date),
            original_time   = str(slot.start_time)[:5],
            reason          = appointment.reschedule_reason or "Not specified",
        )
        _send(to, tpl["subject"], tpl["html"])
    except Exception:
        logger.exception(
            "Failed to send reschedule-request-to-clinician for appointment_id=%s",
            getattr(appointment, "appointment_id", "?"),
        )


def send_cancellation_notice(appointment, recipient: str, cancelled_by: str = "") -> None:
    """
    Notify one party that an appointment has been cancelled.

    recipient:    "patient" | "clinician"
    cancelled_by: "patient" | "cs" | "" (unknown / not tracked at call site)
    appointment:  Appointment ORM object (status already set to cancelled)
    """
    try:
        patient   = appointment.patient
        clinician = appointment.clinician
        slot      = appointment.slot

        if recipient == "patient":
            to             = patient.login_email
            recipient_name = f"{patient.first_name} {patient.last_name}"
            other_name     = (
                f"{(clinician.title or '')} {clinician.first_name} {clinician.last_name}".strip()
            )
        else:
            to             = clinician.contact_email or clinician.login_email
            recipient_name = (
                f"{(clinician.title or '')} {clinician.first_name} {clinician.last_name}".strip()
            )
            other_name     = f"{patient.first_name} {patient.last_name}"

        reason = (
            appointment.cancellation_reason
            or appointment.reschedule_reason
            or "Not specified"
        )

        tpl = cancellation_notice(
            recipient_name   = recipient_name,
            other_party_name = other_name,
            date             = str(appointment.consultation_date),
            time             = str(slot.start_time)[:5],
            reason           = reason,
            cancelled_by     = cancelled_by,
        )
        _send(to, tpl["subject"], tpl["html"])
    except Exception:
        logger.exception(
            "Failed to send cancellation notice (recipient=%s) for appointment_id=%s",
            recipient,
            getattr(appointment, "appointment_id", "?"),
        )


def send_noshow_confirmation_prompt(appointment) -> None:
    """
    Send an appointment reminder to the patient the day before their appointment.

    Intended to be triggered by a scheduled task that runs ~24 hours before each
    accepted appointment's start time.

    # TODO(scheduler): Wire into a Railway scheduled task. Do NOT call this inline
    # from a request handler — it is meant for background execution only.
    """
    try:
        patient   = appointment.patient
        clinician = appointment.clinician
        slot      = appointment.slot

        tpl = noshow_confirmation_prompt(
            patient_name    = f"{patient.first_name} {patient.last_name}",
            clinician_name  = f"{clinician.first_name} {clinician.last_name}",
            clinician_title = clinician.title or "",
            date            = str(appointment.consultation_date),
            time            = str(slot.start_time)[:5],
            room_number     = clinician.room_number or "",
        )
        _send(patient.login_email, tpl["subject"], tpl["html"])
    except Exception:
        logger.exception(
            "Failed to send no-show prompt for appointment_id=%s",
            getattr(appointment, "appointment_id", "?"),
        )


def send_initial_credentials_clinician(
    clinician_name: str,
    clinician_title: str,
    login_email: str,
    temporary_password: str,
) -> None:
    """
    Send login credentials to a newly created clinician account.

    Called by admin_routes after POST /api/admin/clinicians commits.
    temporary_password is the raw plaintext password captured before hashing.
    """
    try:
        tpl = initial_credentials_clinician(
            clinician_name     = clinician_name,
            clinician_title    = clinician_title,
            login_email        = login_email,
            temporary_password = temporary_password,
            system_url         = _system_url(),
        )
        _send(login_email, tpl["subject"], tpl["html"])
    except Exception:
        logger.exception(
            "Failed to send initial credentials email to clinician %s", login_email
        )


def send_initial_credentials_secretary(
    secretary_name: str,
    login_email: str,
    temporary_password: str,
) -> None:
    """
    Send login credentials to a newly created secretary account.

    Called by admin_routes after POST /api/admin/secretaries commits.
    temporary_password is the raw plaintext password captured before hashing.
    """
    try:
        tpl = initial_credentials_secretary(
            secretary_name     = secretary_name,
            login_email        = login_email,
            temporary_password = temporary_password,
            system_url         = _system_url(),
        )
        _send(login_email, tpl["subject"], tpl["html"])
    except Exception:
        logger.exception(
            "Failed to send initial credentials email to secretary %s", login_email
        )


def send_reschedule_confirmation_to_patient(appointment) -> None:
    """
    Notify the patient that their rescheduled appointment has been confirmed.

    Called by appointment_routes after C/S moves reschedule_requested → accepted
    with a new_slot_id.
    appointment: Appointment ORM object (slot_id already updated to the new slot)
    """
    try:
        patient   = appointment.patient
        clinician = appointment.clinician
        slot      = appointment.slot   # reflects the newly assigned slot post-commit

        sec = _secretary_contact_for(clinician.clinician_id)
        tpl = reschedule_confirmation_to_patient(
            patient_name            = f"{patient.first_name} {patient.last_name}",
            clinician_name          = f"{clinician.first_name} {clinician.last_name}",
            clinician_title         = clinician.title or "",
            new_date                = str(slot.slot_date),
            new_time                = str(slot.start_time)[:5],
            room_number             = clinician.room_number or "",
            secretary_email         = sec["email"],
            secretary_name          = sec["name"],
            secretary_contact_phone = sec["phone"],
        )
        _send(patient.login_email, tpl["subject"], tpl["html"])
    except Exception:
        logger.exception(
            "Failed to send reschedule confirmation for appointment_id=%s",
            getattr(appointment, "appointment_id", "?"),
        )
