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

    if clinician_id:
        query = query.filter_by(clinician_id=clinician_id)
    if slot_date:
        query = query.filter_by(slot_date=slot_date)
    if status:
        query = query.filter_by(status=status)

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
    for field in ["slot_date", "start_time", "end_time", "status", "max_patients"]:
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
        "booked_count": sum(
            1 for a in s.appointments
            if a.status not in ("cancelled", "rejected")
        ),
    }
