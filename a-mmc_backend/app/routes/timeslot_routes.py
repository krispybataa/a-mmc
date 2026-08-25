from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt
from app import db
from app.models.clinician import ClinicianTimeslot
from app.models.secretary import SecretaryClinicianLink

timeslot_bp = Blueprint("timeslots", __name__)


def _can_manage_clinician(clinician_id, claims: dict) -> bool:
    """
    True if the caller (per JWT claims) may create/edit/delete timeslots for
    this clinician_id: the clinician themselves, a secretary linked to them,
    or an admin.
    """
    role = claims.get("role")
    user_id = claims.get("user", {}).get("id")
    if role == "admin":
        return True
    if role == "clinician":
        return clinician_id == user_id
    if role == "secretary":
        return SecretaryClinicianLink.query.filter_by(
            secretary_id=user_id, clinician_id=clinician_id
        ).first() is not None
    return False


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
@jwt_required()
def create_timeslot():
    data = request.get_json(force=True)
    if not _can_manage_clinician(data.get("clinician_id"), get_jwt()):
        return jsonify({"error": "Forbidden - not authorized for this clinician"}), 403
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
@jwt_required()
def update_timeslot(slot_id: int):
    s = db.get_or_404(ClinicianTimeslot, slot_id)
    if not _can_manage_clinician(s.clinician_id, get_jwt()):
        return jsonify({"error": "Forbidden - not authorized for this clinician"}), 403
    data = request.get_json(force=True)
    # B1-A-patch-2: validate status value - "booked" and other invalid strings
    # must not reach the DB (valid: available)
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
@jwt_required()
def delete_timeslot(slot_id: int):
    s = db.get_or_404(ClinicianTimeslot, slot_id)
    if not _can_manage_clinician(s.clinician_id, get_jwt()):
        return jsonify({"error": "Forbidden - not authorized for this clinician"}), 403
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
