from datetime import datetime, timezone, timedelta

from flask import Blueprint, jsonify, request

from app import db
from app.models.appointment import Appointment
from app.models.clinician import ClinicianTimeslot
from app.utils.validators import require_fields
from app.services.appointment_service import has_overlap
from app.services.email_service import (
    send_appointment_confirmation,
    send_reschedule_request_to_patient,
    send_reschedule_request_to_clinician,
    send_cancellation_notice,
)

appointment_bp = Blueprint("appointments", __name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

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
        return None  # Can't determine time — allow and let operations handle it

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
    """Return a warning string if 24–48 hours remain, else None."""
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


# ---------------------------------------------------------------------------
# Status transition table
# ---------------------------------------------------------------------------

VALID_TRANSITIONS = {
    "pending":               {"accepted", "rejected", "cancelled"},
    "accepted":              {"reschedule_requested", "cancelled"},
    "reschedule_requested":  {"accepted", "cancelled"},
    "rejected":              set(),
    "cancelled":             set(),
}


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@appointment_bp.get("/")
def list_appointments():
    """Filter by patient_id, clinician_id, or status via query params."""
    query = Appointment.query
    patient_id = request.args.get("patient_id", type=int)
    clinician_id = request.args.get("clinician_id", type=int)
    status = request.args.get("status")

    if patient_id:
        query = query.filter_by(patient_id=patient_id)
    if clinician_id:
        query = query.filter_by(clinician_id=clinician_id)
    if status:
        query = query.filter_by(status=status)

    appointments = query.all()
    return jsonify([_serialize(a) for a in appointments])


@appointment_bp.get("/<int:appointment_id>")
def get_appointment(appointment_id: int):
    a = db.get_or_404(Appointment, appointment_id)
    return jsonify(_serialize(a))


@appointment_bp.post("/")
def create_appointment():
    data = request.get_json(force=True) or {}

    err = require_fields(data, "patient_id", "clinician_id", "slot_id", "consultation_date")
    if err:
        return err

    slot = db.get_or_404(ClinicianTimeslot, data["slot_id"])

    if slot.status != "available":
        return jsonify({"error": "Slot is not available"}), 409

    if slot.clinician_id != data["clinician_id"]:
        return jsonify({"error": "Slot does not belong to the specified clinician"}), 409

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
            status="pending",
        )
        db.session.add(appointment)
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise
    return jsonify({"appointment_id": appointment.appointment_id}), 201


@appointment_bp.patch("/<int:appointment_id>")
def update_appointment(appointment_id: int):
    a = db.get_or_404(Appointment, appointment_id)
    data = request.get_json(force=True) or {}

    new_status = data.get("status")
    original_status = a.status  # capture before any mutation for email routing

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
            # Reschedule request — either party initiates
            # ----------------------------------------------------------------
            if new_status == "reschedule_requested":
                reschedule_reason = (data.get("reschedule_reason") or "").strip()
                if not reschedule_reason:
                    return jsonify({"error": "reschedule_reason is required when requesting a reschedule"}), 422
                a.reschedule_reason = reschedule_reason

            # ----------------------------------------------------------------
            # Accepting a reschedule — C/S must confirm with a new slot
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
            # Accept a pending appointment — check max_patients auto-block
            # ----------------------------------------------------------------
            elif new_status == "accepted" and a.status == "pending":
                slot = db.get_or_404(ClinicianTimeslot, a.slot_id)
                a.status = new_status
                db.session.flush()  # Ensure count includes this appointment
                _maybe_auto_block_slot(slot)

            a.status = new_status

        # Non-status field updates
        for field in ["chief_complaint", "chief_complaint_description", "payment_type"]:
            if field in data:
                setattr(a, field, data[field])

        db.session.commit()
    except Exception:
        db.session.rollback()
        raise

    # Post-commit notifications — failures are caught inside each function and logged;
    # they never propagate back to the caller or affect the HTTP response.
    if new_status and new_status != original_status:
        if new_status == "accepted" and original_status == "pending":
            send_appointment_confirmation(a)
        elif new_status == "reschedule_requested":
            # Determine who initiated: if caller is patient, notify clinician; else notify patient
            role = (data.get("role") or "").lower()
            if role == "patient":
                send_reschedule_request_to_clinician(a)
            else:
                send_reschedule_request_to_patient(a)
        elif new_status == "cancelled":
            send_cancellation_notice(a, "patient")
            send_cancellation_notice(a, "clinician")

    return jsonify({"message": "updated"})


@appointment_bp.delete("/<int:appointment_id>")
def cancel_appointment(appointment_id: int):
    """
    Soft-cancel an appointment. Requires a cancellation_reason.
    Time-gated: patients blocked <24h, C/S directed to reschedule flow <24h.
    Warning returned for 24–48h window.
    """
    a = db.get_or_404(Appointment, appointment_id)
    data = request.get_json(force=True) or {}

    if a.status == "cancelled":
        return jsonify({"error": "Appointment is already cancelled"}), 409

    if a.status in ("rejected",):
        return jsonify({"error": f"Cannot cancel an appointment with status '{a.status}'"}), 409

    cancellation_reason = (data.get("cancellation_reason") or "").strip()
    if not cancellation_reason:
        return jsonify({"error": "cancellation_reason is required"}), 422

    role = (data.get("role") or "patient").lower()  # "patient" or "cs"
    if role not in ("patient", "cs"):
        return jsonify({"error": "role must be 'patient' or 'cs'"}), 422

    slot = db.get_or_404(ClinicianTimeslot, a.slot_id)

    # Time gate
    block = _check_cancellation_time(slot, role)
    if block:
        return block

    # Build response — include warning if in the 24–48h window
    warning = _warning_for_cancellation(slot)

    # Slot status is NOT changed — other patients on this slot are unaffected.
    # B1-D-patch: transaction boundary added
    try:
        a.status = "cancelled"
        a.reschedule_reason = cancellation_reason  # reuse field for audit trail
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise

    # Post-commit notifications
    send_cancellation_notice(a, "patient")
    send_cancellation_notice(a, "clinician")

    response = {"message": "Appointment cancelled"}
    if warning:
        response["warning"] = warning
    return jsonify(response)


# ---------------------------------------------------------------------------
# Serializer
# ---------------------------------------------------------------------------

def _serialize(a: Appointment) -> dict:
    return {
        "appointment_id": a.appointment_id,
        "patient_id": a.patient_id,
        "clinician_id": a.clinician_id,
        "slot_id": a.slot_id,
        "consultation_date": str(a.consultation_date),
        "chief_complaint": a.chief_complaint,
        "chief_complaint_description": a.chief_complaint_description,
        "payment_type": a.payment_type,
        "status": a.status,
        "reschedule_reason": a.reschedule_reason,
        "created_at": a.created_at.isoformat() if a.created_at else None,
        "updated_at": a.updated_at.isoformat() if a.updated_at else None,
    }
