from datetime import datetime, date, timezone, timedelta
from zoneinfo import ZoneInfo

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt

from app import db
from app.models.appointment import Appointment
from app.models.clinician import ClinicianTimeslot
from app.models.patient import Patient
from app.models.secretary import SecretaryClinicianLink
from app.utils.validators import require_fields
from app.services.appointment_service import has_overlap
from app.services.email_service import (
    send_appointment_confirmation,
    send_reschedule_request_to_patient,
    send_reschedule_request_to_clinician,
    send_cancellation_notice,
    send_reschedule_confirmation_to_patient,
)

appointment_bp = Blueprint("appointments", __name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _format_payment_type(payment_type: str | None) -> str | None:
    """Convert stored 'HMO:<name>' to display 'HMO - <name>'. Pass-through otherwise."""
    if payment_type and payment_type.startswith("HMO:"):
        return "HMO - " + payment_type[4:]
    return payment_type


def _hours_until_slot(slot: ClinicianTimeslot) -> float | None:
    """Return hours between now (UTC) and the slot's start datetime. None if undetermined."""
    try:
        slot_dt = datetime.combine(slot.slot_date, slot.start_time).replace(tzinfo=timezone.utc)
        delta = slot_dt - datetime.now(timezone.utc)
        return delta.total_seconds() / 3600
    except Exception:
        return None


def _check_cancellation_time(slot: ClinicianTimeslot, role: str) -> tuple | None:
    """
    Enforce time-based cancellation rules. Returns (response, status_code) on block,
    or None if cancellation is allowed.

    role: "patient" | "cs"  (clinician or secretary)
    """
    hours = _hours_until_slot(slot)
    if hours is None:
        return None  # Can't determine time - allow and let operations handle it

    if role == "patient" and hours < 24:
        return jsonify({
            "error": "Cancellations within 24 hours of your appointment must be coordinated "
                     "directly with the clinic. Please contact your clinician or secretary.",
            "contact_required": True,
        }), 403

    if role == "cs" and hours < 24:
        return jsonify({
            "error": "Appointments within 24 hours cannot be directly cancelled. "
                     "Please use the reschedule flow instead.",
            "use_reschedule": True,
        }), 403

    return None  # Allowed


def _warning_for_cancellation(slot: ClinicianTimeslot) -> str | None:
    """Return a warning string if 24-48 hours remain, else None."""
    hours = _hours_until_slot(slot)
    if hours is not None and 24 <= hours < 48:
        return "This appointment is within 48 hours. Please confirm the cancellation."
    return None


def _maybe_auto_block_slot(slot: ClinicianTimeslot) -> None:
    """
    If slot has a max_patients limit, count accepted appointments and auto-block
    the slot if the limit has been reached.
    """
    if slot.max_patients is None:
        return
    accepted_count = Appointment.query.filter_by(
        slot_id=slot.slot_id, status="accepted"
    ).count()
    if accepted_count >= slot.max_patients:
        slot.status = "blocked"


def _appointment_scope(claims: dict) -> dict:
    """
    Determine which appointments the caller (per the JWT's claims) may see or act on.

    Returns one of:
      {"admin": True}               - no restriction
      {"patient_id": <id>}          - patient role, scoped to their own appointments
      {"clinician_ids": [<id>...]}  - clinician role (their own id) or secretary role
                                       (every clinician_id they're linked to)
    """
    role = claims.get("role")
    user_id = claims.get("user", {}).get("id")

    if role == "admin":
        return {"admin": True}
    if role == "patient":
        return {"patient_id": user_id}
    if role == "clinician":
        return {"clinician_ids": [user_id]}
    if role == "secretary":
        linked = [
            link.clinician_id
            for link in SecretaryClinicianLink.query.filter_by(secretary_id=user_id).all()
        ]
        return {"clinician_ids": linked}
    return {}


def _can_access_appointment(a: Appointment, claims: dict) -> bool:
    """True if the caller's scope (see _appointment_scope) covers this appointment."""
    scope = _appointment_scope(claims)
    if scope.get("admin"):
        return True
    if "patient_id" in scope:
        return a.patient_id == scope["patient_id"]
    if "clinician_ids" in scope:
        return a.clinician_id in scope["clinician_ids"]
    return False


# ---------------------------------------------------------------------------
# Status transition table
# ---------------------------------------------------------------------------

VALID_TRANSITIONS = {
    "pending":               {"accepted", "rejected", "declined", "cancelled"},
    "accepted":              {"reschedule_requested", "cancelled", "done"},
    "reschedule_requested":  {"accepted", "cancelled"},
    "done":                  set(),
    "rejected":              set(),
    "declined":              set(),
    "cancelled":             set(),
}


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@appointment_bp.get("/")
@jwt_required()
def list_appointments():
    """
    Filter by patient_id, clinician_id, or status via query params.

    Results are scoped to the caller: patients see only their own appointments,
    clinicians/secretaries see only appointments for the clinician_id(s) they're
    linked to, admins see everything. A patient_id/clinician_id query param
    outside the caller's scope is rejected rather than silently ignored.
    """
    claims = get_jwt()
    scope = _appointment_scope(claims)

    patient_id = request.args.get("patient_id", type=int)
    clinician_id = request.args.get("clinician_id", type=int)
    status = request.args.get("status")

    query = Appointment.query

    if "patient_id" in scope:
        query = query.filter_by(patient_id=scope["patient_id"])
    elif "clinician_ids" in scope:
        allowed = scope["clinician_ids"]
        if clinician_id is not None:
            if clinician_id not in allowed:
                return jsonify({"error": "Forbidden - not authorized for this clinician"}), 403
            query = query.filter_by(clinician_id=clinician_id)
        else:
            query = query.filter(Appointment.clinician_id.in_(allowed))
    elif scope.get("admin"):
        if patient_id:
            query = query.filter_by(patient_id=patient_id)
        if clinician_id:
            query = query.filter_by(clinician_id=clinician_id)
    else:
        return jsonify({"error": "Forbidden"}), 403

    if status:
        query = query.filter_by(status=status)

    appointments = query.all()
    return jsonify([_serialize(a) for a in appointments])


@appointment_bp.get("/<int:appointment_id>")
@jwt_required()
def get_appointment(appointment_id: int):
    a = db.get_or_404(Appointment, appointment_id)
    if not _can_access_appointment(a, get_jwt()):
        return jsonify({"error": "Forbidden"}), 403
    return jsonify(_serialize(a))


@appointment_bp.post("/")
@jwt_required()
def create_appointment():
    data = request.get_json(force=True) or {}

    err = require_fields(data, "patient_id", "clinician_id", "slot_id", "consultation_date")
    if err:
        return err

    # Normalise consultation_date to a real date object. The column is db.Date;
    # passing the raw string only ever worked because Postgres coerces it, and
    # breaks on stricter backends (e.g. SQLite in the test fixture).
    raw_date = data["consultation_date"]
    if isinstance(raw_date, str):
        try:
            data["consultation_date"] = date.fromisoformat(raw_date)
        except ValueError:
            return jsonify({"error": "consultation_date must be in YYYY-MM-DD format."}), 400

    # A patient can only ever book for themselves. Staff (clinician/secretary/
    # admin) booking on a patient's behalf - e.g. a phone booking - is allowed
    # deliberately: they may pass any patient_id.
    claims = get_jwt()
    if claims.get("role") == "patient" and data["patient_id"] != claims.get("user", {}).get("id"):
        return jsonify({"error": "Forbidden - cannot book an appointment for another patient"}), 403

    patient = db.get_or_404(Patient, data["patient_id"])  # B1-A-patch-2: verify patient FK before insert

    slot = db.get_or_404(ClinicianTimeslot, data["slot_id"])

    if slot.status != "available":
        return jsonify({"error": "Slot is not available"}), 409

    if slot.clinician_id != data["clinician_id"]:
        return jsonify({"error": "Slot does not belong to the specified clinician"}), 409

    # Temporal guard - PH time (Asia/Manila, UTC+8)
    _manila = ZoneInfo("Asia/Manila")
    _now_ph = datetime.now(_manila)
    _today_ph = _now_ph.date()

    if slot.slot_date < _today_ph:
        return jsonify({"error": "Appointment date has already passed."}), 400

    if slot.slot_date == _today_ph and slot.start_time <= _now_ph.time():
        return jsonify({"error": "This time slot has already passed for today."}), 400

    consultation_type = data.get("consultation_type", "f2f")
    if slot.consultation_type != consultation_type:
        return jsonify({
            "error": f"Slot consultation type '{slot.consultation_type}' does not match "
                     f"requested type '{consultation_type}'"
        }), 400

    # discount_type validation and SC/PWD guard
    discount_type = data.get("discount_type") or None
    if discount_type is not None and discount_type not in ("Senior Citizen", "PWD"):
        return jsonify({"error": "Invalid discount type."}), 422
    if discount_type is not None and not patient.sc_pwd_id_number:
        return jsonify({
            "error": "A valid Senior Citizen or PWD ID must be on your profile to use this discount."
        }), 403

    if has_overlap(data["patient_id"], slot):
        return jsonify({"error": "This time slot conflicts with an existing appointment."}), 409

    # Note: slot status is NOT changed here. Slots stay available until C/S blocks them.
    # Booking count is tracked via Appointment rows (see _maybe_auto_block_slot).
    # B1-B-patch: transaction boundary added
    try:
        appointment = Appointment(
            patient_id=data["patient_id"],
            clinician_id=data["clinician_id"],
            slot_id=data["slot_id"],
            consultation_date=data["consultation_date"],
            chief_complaint=data.get("chief_complaint"),
            chief_complaint_description=data.get("chief_complaint_description"),
            payment_type=data.get("payment_type"),
            discount_type=discount_type,
            consultation_type=consultation_type,
            # Snapshot the clinician's current default fee - not a live join.
            professional_fee=slot.clinician.professional_fee,
            additional_request=(data.get("additional_request") or None),
            status="pending",
        )
        db.session.add(appointment)
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise
    return jsonify({"appointment_id": appointment.appointment_id}), 201


@appointment_bp.patch("/<int:appointment_id>")
@jwt_required()
def update_appointment(appointment_id: int):
    a = db.get_or_404(Appointment, appointment_id)
    claims = get_jwt()
    if not _can_access_appointment(a, claims):
        return jsonify({"error": "Forbidden"}), 403

    data = request.get_json(force=True) or {}

    new_status = data.get("status")
    original_status = a.status  # capture before any mutation for email routing
    # "patient" | "clinician" | "secretary" | "admin" - from the JWT, never the request body
    role = claims.get("role")

    # Completed appointments are immutable
    if a.status == "done":
        return jsonify({"error": "This appointment has already been completed."}), 400

    # B1-B-patch: transaction boundary added
    # All validation early-returns above this point write nothing to the session.
    # Every branch below that reaches db.session.commit() is covered by this boundary.
    try:
        if new_status and new_status != a.status:

            # Validate transition
            allowed = VALID_TRANSITIONS.get(a.status, set())
            if new_status not in allowed:
                return jsonify({
                    "error": f"Cannot transition appointment from '{a.status}' to '{new_status}'"
                }), 409

            # ----------------------------------------------------------------
            # Done - C/S marks appointment as completed after patient is seen
            # ----------------------------------------------------------------
            if new_status == "done":
                if role not in ("clinician", "secretary"):
                    return jsonify({
                        "error": "Only clinicians or secretaries can mark an appointment as done."
                    }), 403

            # ----------------------------------------------------------------
            # Decline - C/S declines a pending appointment
            # ----------------------------------------------------------------
            elif new_status == "declined":
                decline_reason = (data.get("decline_reason") or "").strip()
                if not decline_reason:
                    return jsonify({"error": "decline_reason is required when declining an appointment"}), 422
                a.decline_reason = decline_reason

            # ----------------------------------------------------------------
            # Reschedule request - either party initiates
            # ----------------------------------------------------------------
            elif new_status == "reschedule_requested":
                reschedule_reason = (data.get("reschedule_reason") or "").strip()
                if not reschedule_reason:
                    return jsonify({"error": "reschedule_reason is required when requesting a reschedule"}), 422
                a.reschedule_reason = reschedule_reason

            # ----------------------------------------------------------------
            # Cancel - either party cancels via the status-update endpoint
            # (the dedicated DELETE endpoint below has its own time-gating)
            # ----------------------------------------------------------------
            elif new_status == "cancelled":
                cancellation_reason = (data.get("cancellation_reason") or "").strip()
                if not cancellation_reason:
                    return jsonify({"error": "cancellation_reason is required when cancelling an appointment"}), 422
                a.cancellation_reason = cancellation_reason

            # ----------------------------------------------------------------
            # Accepting a reschedule - C/S must confirm with a new slot
            # ----------------------------------------------------------------
            elif new_status == "accepted" and a.status == "reschedule_requested":
                new_slot_id = data.get("new_slot_id")
                if not new_slot_id:
                    return jsonify({"error": "new_slot_id is required when confirming a reschedule"}), 422

                new_slot = db.get_or_404(ClinicianTimeslot, new_slot_id)
                if new_slot.status != "available":
                    return jsonify({"error": "New slot is not available"}), 409
                if new_slot.clinician_id != a.clinician_id:
                    return jsonify({"error": "New slot does not belong to the same clinician"}), 409

                if has_overlap(a.patient_id, new_slot, exclude_appointment_id=appointment_id):
                    return jsonify({"error": "The new slot conflicts with the patient's existing appointments."}), 409

                # Update appointment to new slot. Old slot is NOT touched.
                a.slot_id = new_slot.slot_id
                a.consultation_date = str(new_slot.slot_date)

            # ----------------------------------------------------------------
            # Accept a pending appointment - check max_patients auto-block
            # ----------------------------------------------------------------
            elif new_status == "accepted" and a.status == "pending":
                slot = db.get_or_404(ClinicianTimeslot, a.slot_id)
                a.status = new_status
                db.session.flush()  # Ensure count includes this appointment
                _maybe_auto_block_slot(slot)

            a.status = new_status

        # Non-status field updates (any role)
        for field in ["chief_complaint", "chief_complaint_description", "payment_type", "discount_type"]:
            if field in data:
                setattr(a, field, data[field])

        # payment_status - C/S only
        if "payment_status" in data:
            if role == "patient":
                return jsonify({"error": "Patients cannot update payment status."}), 403
            ps = data["payment_status"]
            if ps is not None and ps not in ("paid", "unpaid"):
                return jsonify({"error": "payment_status must be 'paid', 'unpaid', or null."}), 422
            a.payment_status = ps

        # professional_fee - clinician/secretary only (same gate as marking done)
        if "professional_fee" in data:
            if role not in ("clinician", "secretary"):
                return jsonify({"error": "Only clinicians or secretaries can update the professional fee."}), 403
            fee = data["professional_fee"]
            if fee is not None:
                try:
                    fee = float(fee)
                except (TypeError, ValueError):
                    return jsonify({"error": "professional_fee must be a number or null."}), 422
                if fee < 0:
                    return jsonify({"error": "professional_fee cannot be negative."}), 422
            a.professional_fee = fee

        db.session.commit()
    except Exception:
        db.session.rollback()
        raise

    # Post-commit notifications - failures are caught inside each function and logged;
    # they never propagate back to the caller or affect the HTTP response.
    if new_status and new_status != original_status:
        if new_status == "accepted" and original_status == "pending":
            send_appointment_confirmation(a)
        elif new_status == "accepted" and original_status == "reschedule_requested":
            send_reschedule_confirmation_to_patient(a)
        elif new_status == "reschedule_requested":
            # Determine who initiated: if caller is patient, notify clinician; else notify patient
            if role == "patient":
                send_reschedule_request_to_clinician(a)
            else:
                send_reschedule_request_to_patient(a)
        elif new_status == "declined":
            send_cancellation_notice(a, "patient", cancelled_by="clinician")
        elif new_status == "cancelled":
            send_cancellation_notice(a, "patient")
            send_cancellation_notice(a, "clinician")

    return jsonify({"message": "updated"})


@appointment_bp.delete("/<int:appointment_id>")
@jwt_required()
def cancel_appointment(appointment_id: int):
    """
    Soft-cancel an appointment. Requires a cancellation_reason.
    Time-gated: patients blocked <24h, C/S directed to reschedule flow <24h.
    Warning returned for 24-48h window.
    """
    a = db.get_or_404(Appointment, appointment_id)
    claims = get_jwt()
    if not _can_access_appointment(a, claims):
        return jsonify({"error": "Forbidden"}), 403

    data = request.get_json(force=True) or {}

    if a.status == "done":
        return jsonify({"error": "This appointment has already been completed."}), 400

    if a.status == "cancelled":
        return jsonify({"error": "Appointment is already cancelled"}), 409

    if a.status in ("rejected",):
        return jsonify({"error": f"Cannot cancel an appointment with status '{a.status}'"}), 409

    cancellation_reason = (data.get("cancellation_reason") or "").strip()
    if not cancellation_reason:
        return jsonify({"error": "cancellation_reason is required"}), 422

    # Cancellation-cutoff rule only distinguishes patient vs. staff - clinician,
    # secretary, and admin are all treated as staff ("cs") here. Token-derived,
    # not client-supplied.
    role = "patient" if claims.get("role") == "patient" else "cs"

    slot = db.get_or_404(ClinicianTimeslot, a.slot_id)

    # Time gate
    block = _check_cancellation_time(slot, role)
    if block:
        return block

    # Build response - include warning if in the 24-48h window
    warning = _warning_for_cancellation(slot)

    # Slot status is NOT changed - other patients on this slot are unaffected.
    # B1-D-patch: transaction boundary added
    try:
        a.status = "cancelled"
        a.cancellation_reason = cancellation_reason
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise

    # Post-commit notifications - pass role so the template can show who cancelled
    send_cancellation_notice(a, "patient",   cancelled_by=role)
    send_cancellation_notice(a, "clinician", cancelled_by=role)

    response = {"message": "Appointment cancelled"}
    if warning:
        response["warning"] = warning
    return jsonify(response)


# ---------------------------------------------------------------------------
# Serializer
# ---------------------------------------------------------------------------

def _serialize(a: Appointment) -> dict:
    c = a.clinician
    s = a.slot
    return {
        "appointment_id": a.appointment_id,
        "patient_id": a.patient_id,
        "patient_first_name": a.patient.first_name,
        "patient_last_name": a.patient.last_name,
        "patient": {
            "patient_id": a.patient_id,
            "first_name": a.patient.first_name,
            "last_name": a.patient.last_name,
        },
        "clinician_id": a.clinician_id,
        "clinician": {
            "clinician_id": c.clinician_id,
            "title": c.title or "",
            "first_name": c.first_name,
            "last_name": c.last_name,
            "specialty": c.specialty,
            "room_number": c.room_number,
        },
        "slot_id": a.slot_id,
        "slot": {
            "slot_id": s.slot_id,
            "slot_date": str(s.slot_date),
            "start_time": str(s.start_time)[:5],   # HH:MM
            "end_time": str(s.end_time)[:5],        # HH:MM
        },
        "consultation_date": str(a.consultation_date),
        "chief_complaint": a.chief_complaint,
        "chief_complaint_description": a.chief_complaint_description,
        "payment_type": _format_payment_type(a.payment_type),
        "discount_type": a.discount_type,
        "payment_status": a.payment_status,
        "professional_fee": float(a.professional_fee) if a.professional_fee is not None else None,
        "additional_request": a.additional_request,
        "consultation_type": a.consultation_type,
        "status": a.status,
        "reschedule_reason": a.reschedule_reason,
        "decline_reason": a.decline_reason,
        "cancellation_reason": a.cancellation_reason,
        "created_at": a.created_at.isoformat() if a.created_at else None,
        "updated_at": a.updated_at.isoformat() if a.updated_at else None,
    }
