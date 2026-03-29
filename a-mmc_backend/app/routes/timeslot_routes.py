from flask import Blueprint, jsonify, request
from app import db
from app.models.clinician import ClinicianTimeslot

timeslot_bp = Blueprint("timeslots", __name__)


@timeslot_bp.get("/")
def list_timeslots():
    """List timeslots. Filter by clinician_id and/or date via query params."""
    query = ClinicianTimeslot.query
    clinician_id = request.args.get("clinician_id", type=int)
    slot_date = request.args.get("date")
    status = request.args.get("status")
    consultation_type = request.args.get("consultation_type")

    if clinician_id:
        query = query.filter_by(clinician_id=clinician_id)
    if slot_date:
        query = query.filter_by(slot_date=slot_date)
    if status:
        query = query.filter_by(status=status)
    if consultation_type:
        query = query.filter_by(consultation_type=consultation_type)

    slots = query.all()
    return jsonify([_serialize(s) for s in slots])


@timeslot_bp.get("/<int:slot_id>")
def get_timeslot(slot_id: int):
    s = db.get_or_404(ClinicianTimeslot, slot_id)
    return jsonify(_serialize(s))


@timeslot_bp.post("/")
def create_timeslot():
    data = request.get_json(force=True)
    slot = ClinicianTimeslot(
        clinician_id=data["clinician_id"],
        slot_date=data["slot_date"],
        start_time=data["start_time"],
        end_time=data["end_time"],
        status=data.get("status", "available"),
    )
    db.session.add(slot)
    db.session.commit()
    return jsonify({"slot_id": slot.slot_id}), 201


@timeslot_bp.patch("/<int:slot_id>")
def update_timeslot(slot_id: int):
    s = db.get_or_404(ClinicianTimeslot, slot_id)
    data = request.get_json(force=True)
    # B1-A-patch-2: validate status value — "booked" and other invalid strings
    # must not reach the DB (valid: available | blocked per CLAUDE.md)
    if "status" in data and data["status"] not in ("available", "blocked"):
        return jsonify({"error": "status must be 'available' or 'blocked'"}), 422
    if "consultation_type" in data and data["consultation_type"] not in ("f2f", "teleconsult"):
        return jsonify({"error": "consultation_type must be 'f2f' or 'teleconsult'"}), 422
    for field in ["slot_date", "start_time", "end_time", "status", "max_patients", "consultation_type"]:
        if field in data:
            setattr(s, field, data[field])
    db.session.commit()
    return jsonify({"message": "updated"})


@timeslot_bp.delete("/<int:slot_id>")
def delete_timeslot(slot_id: int):
    s = db.get_or_404(ClinicianTimeslot, slot_id)
    db.session.delete(s)
    db.session.commit()
    return jsonify({"message": "deleted"})


def _serialize(s: ClinicianTimeslot) -> dict:
    return {
        "slot_id": s.slot_id,
        "clinician_id": s.clinician_id,
        "slot_date": str(s.slot_date),
        "start_time": str(s.start_time),
        "end_time": str(s.end_time),
        "status": s.status,
        "max_patients": s.max_patients,
        "consultation_type": s.consultation_type,
        "booked_count": sum(
            1 for a in s.appointments
            if a.status not in ("cancelled", "rejected")
        ),
    }
