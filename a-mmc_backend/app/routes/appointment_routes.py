from flask import Blueprint, jsonify, request
from app import db
from app.models.appointment import Appointment
from app.models.clinician import ClinicianTimeslot

appointment_bp = Blueprint("appointments", __name__)


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
    data = request.get_json(force=True)

    # Verify slot is still available
    slot = db.get_or_404(ClinicianTimeslot, data["slot_id"])
    if slot.status != "available":
        return jsonify({"error": "Slot is not available"}), 409

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
    slot.status = "booked"
    db.session.add(appointment)
    db.session.commit()
    return jsonify({"appointment_id": appointment.appointment_id}), 201


@appointment_bp.patch("/<int:appointment_id>")
def update_appointment(appointment_id: int):
    a = db.get_or_404(Appointment, appointment_id)
    data = request.get_json(force=True)
    updatable = [
        "status", "chief_complaint", "chief_complaint_description",
        "payment_type", "reschedule_reason",
    ]
    for field in updatable:
        if field in data:
            setattr(a, field, data[field])
    db.session.commit()
    return jsonify({"message": "updated"})


@appointment_bp.delete("/<int:appointment_id>")
def cancel_appointment(appointment_id: int):
    """Soft-cancel: sets status to cancelled and frees the slot."""
    a = db.get_or_404(Appointment, appointment_id)
    a.status = "cancelled"
    slot = db.get_or_404(ClinicianTimeslot, a.slot_id)
    slot.status = "available"
    db.session.commit()
    return jsonify({"message": "cancelled"})


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
