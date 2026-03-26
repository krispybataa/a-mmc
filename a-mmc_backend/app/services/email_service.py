"""
email_service.py
----------------
Transactional email notifications for appointment lifecycle events.

All public functions catch send errors internally — a failed email never causes
an appointment operation to fail or roll back. Errors are logged to stderr via
the Flask app logger.

SMTP configuration is read from the Flask app config at call time (MAIL_SERVER,
MAIL_PORT, MAIL_USERNAME, MAIL_PASSWORD, MAIL_FROM, MAIL_USE_TLS).

Development / test default: Mailtrap sandbox (smtp.mailtrap.io:587).
"""

import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from flask import current_app

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Private send helper
# ---------------------------------------------------------------------------

def _send(to: str, subject: str, body: str) -> None:
    """
    Build and send a plain-text email via SMTP.

    Reads MAIL_* keys from current_app.config. Raises on any SMTP error so
    callers can decide how to handle it (public functions catch and log).
    """
    cfg = current_app.config

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = cfg["MAIL_FROM"]
    msg["To"] = to
    msg.attach(MIMEText(body, "plain"))

    with smtplib.SMTP(cfg["MAIL_SERVER"], cfg["MAIL_PORT"]) as server:
        if cfg.get("MAIL_USE_TLS", True):
            server.starttls()
        username = cfg.get("MAIL_USERNAME", "")
        password = cfg.get("MAIL_PASSWORD", "")
        if username:
            server.login(username, password)
        server.sendmail(cfg["MAIL_FROM"], [to], msg.as_string())

    logger.info("Email sent to %s | subject: %s", to, subject)


# ---------------------------------------------------------------------------
# Public notification functions
# ---------------------------------------------------------------------------

def send_appointment_confirmation(appointment) -> None:
    """
    Notify the patient that their appointment has been accepted by C/S.

    appointment: Appointment ORM object (with .patient, .clinician, .slot relationships loaded)
    """
    try:
        patient = appointment.patient
        clinician = appointment.clinician
        slot = appointment.slot

        to = patient.login_email
        subject = "Your appointment has been confirmed — Alagang MMC"
        body = (
            f"Dear {patient.first_name} {patient.last_name},\n\n"
            f"Your appointment with {clinician.title or ''} {clinician.first_name} {clinician.last_name} "
            f"has been confirmed.\n\n"
            f"  Date: {appointment.consultation_date}\n"
            f"  Time: {str(slot.start_time)[:5]} – {str(slot.end_time)[:5]}\n\n"
            f"Please arrive at least 15 minutes before your scheduled time.\n\n"
            f"If you need to cancel or reschedule, please log in to your account or "
            f"contact the clinic directly.\n\n"
            f"— Alagang MMC\n"
        )
        _send(to, subject, body)
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
        patient = appointment.patient
        clinician = appointment.clinician

        to = patient.login_email
        subject = "Your appointment reschedule request — Alagang MMC"
        body = (
            f"Dear {patient.first_name} {patient.last_name},\n\n"
            f"The clinic has requested to reschedule your appointment with "
            f"{clinician.title or ''} {clinician.first_name} {clinician.last_name}.\n\n"
            f"  Reason: {appointment.reschedule_reason or 'Not specified'}\n\n"
            f"Please log in to your account to review and confirm a new time, "
            f"or contact the clinic for assistance.\n\n"
            f"— Alagang MMC\n"
        )
        _send(to, subject, body)
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
        patient = appointment.patient
        clinician = appointment.clinician

        to = clinician.contact_email or clinician.login_email
        subject = "Reschedule request from patient — Alagang MMC"
        body = (
            f"Dear {clinician.title or ''} {clinician.first_name} {clinician.last_name},\n\n"
            f"Patient {patient.first_name} {patient.last_name} has requested to reschedule "
            f"their appointment (ID #{appointment.appointment_id}).\n\n"
            f"  Original date: {appointment.consultation_date}\n"
            f"  Reason: {appointment.reschedule_reason or 'Not specified'}\n\n"
            f"Please log in to the clinic portal to confirm a new time slot.\n\n"
            f"— Alagang MMC\n"
        )
        _send(to, subject, body)
    except Exception:
        logger.exception(
            "Failed to send reschedule-request-to-clinician for appointment_id=%s",
            getattr(appointment, "appointment_id", "?"),
        )


def send_cancellation_notice(appointment, recipient: str) -> None:
    """
    Notify one party that an appointment has been cancelled.

    recipient: "patient" | "clinician"
    appointment: Appointment ORM object (status already set to cancelled)
    """
    try:
        patient = appointment.patient
        clinician = appointment.clinician
        slot = appointment.slot

        if recipient == "patient":
            to = patient.login_email
            greeting = f"Dear {patient.first_name} {patient.last_name},"
            body_line = (
                f"Your appointment with {clinician.title or ''} {clinician.first_name} {clinician.last_name} "
                f"on {appointment.consultation_date} at {str(slot.start_time)[:5]} has been cancelled."
            )
        else:
            to = clinician.contact_email or clinician.login_email
            greeting = f"Dear {clinician.title or ''} {clinician.first_name} {clinician.last_name},"
            body_line = (
                f"The appointment with patient {patient.first_name} {patient.last_name} "
                f"on {appointment.consultation_date} at {str(slot.start_time)[:5]} has been cancelled."
            )

        subject = "Appointment cancelled — Alagang MMC"
        body = (
            f"{greeting}\n\n"
            f"{body_line}\n\n"
            f"  Reason: {appointment.reschedule_reason or 'Not specified'}\n\n"
            f"If you have questions, please contact the clinic directly.\n\n"
            f"— Alagang MMC\n"
        )
        _send(to, subject, body)
    except Exception:
        logger.exception(
            "Failed to send cancellation notice (recipient=%s) for appointment_id=%s",
            recipient,
            getattr(appointment, "appointment_id", "?"),
        )


def send_noshow_confirmation_prompt(appointment) -> None:
    """
    Ask the clinician to confirm whether the patient was a no-show.

    Intended to be triggered by a scheduled task (e.g. a cron job or Celery task)
    after the appointment's scheduled time has passed.

    # TODO(scheduler): Wire this into a scheduled task that runs after each
    # accepted appointment's end_time. Do NOT call this inline from a request handler.

    appointment: Appointment ORM object
    """
    try:
        clinician = appointment.clinician
        patient = appointment.patient
        slot = appointment.slot

        to = clinician.contact_email or clinician.login_email
        subject = "Did your patient attend? — Alagang MMC"
        body = (
            f"Dear {clinician.title or ''} {clinician.first_name} {clinician.last_name},\n\n"
            f"We noticed that the appointment with {patient.first_name} {patient.last_name} "
            f"(ID #{appointment.appointment_id}) scheduled for "
            f"{appointment.consultation_date} at {str(slot.start_time)[:5]} has passed.\n\n"
            f"Please log in to the clinic portal to confirm attendance or mark this "
            f"appointment as a no-show.\n\n"
            f"— Alagang MMC\n"
        )
        _send(to, subject, body)
    except Exception:
        logger.exception(
            "Failed to send no-show prompt for appointment_id=%s",
            getattr(appointment, "appointment_id", "?"),
        )
