from flask import Blueprint, jsonify, request
from datetime import date as date_type
from flask_jwt_extended import jwt_required, get_jwt
from app import db
from app.models.clinician import (
    Clinician,
    ClinicianSchedule,
    ClinicianHMO,
    ClinicianInfo,
)
from app.services.timeslot_service import generate_slots, regenerate_slots_for_schedule_change
from app.utils.validators import require_fields
from app.services.auth_service import hash_password

clinician_bp = Blueprint("clinicians", __name__)



# ---------------------------------------------------------------------------
# Clinicians
# ---------------------------------------------------------------------------

@clinician_bp.get("/")
def list_clinicians():
    clinicians = Clinician.query.all()
    return jsonify([
        {
            "clinician_id": c.clinician_id,
            "title": c.title or "",
            "first_name": c.first_name,
            "middle_name": c.middle_name,
            "last_name": c.last_name,
            "suffix": c.suffix,
            "department": c.department,
            "specialty": c.specialty,
            "local_number": c.local_number,
            "room_number": c.room_number,
            "profile_picture": c.profile_picture,
            "contact_phone": c.contact_phone,
            "contact_email": c.contact_email,
            "schedules": [
                {
                    "day_of_week": s.day_of_week,
                    "am_start": str(s.am_start) if s.am_start else None,
                    "am_end": str(s.am_end) if s.am_end else None,
                    "pm_start": str(s.pm_start) if s.pm_start else None,
                    "pm_end": str(s.pm_end) if s.pm_end else None,
                    "consultation_type": s.consultation_type,
                }
                for s in c.schedules
            ],
            "hmos": [h.hmo_name for h in c.hmos],
        }
        for c in clinicians
    ])


@clinician_bp.get("/<int:clinician_id>")
def get_clinician(clinician_id: int):
    c = db.get_or_404(Clinician, clinician_id)
    return jsonify({
        "clinician_id": c.clinician_id,
        "title": c.title,
        "first_name": c.first_name,
        "middle_name": c.middle_name,
        "last_name": c.last_name,
        "suffix": c.suffix,
        "department": c.department,
        "specialty": c.specialty,
        "local_number": c.local_number,
        "room_number": c.room_number,
        "profile_picture": c.profile_picture,
        "contact_phone": c.contact_phone,
        "contact_email": c.contact_email,
        "schedules": [
            {
                "schedule_id": s.schedule_id,
                "day_of_week": s.day_of_week,
                "am_start": str(s.am_start) if s.am_start else None,
                "am_end": str(s.am_end) if s.am_end else None,
                "pm_start": str(s.pm_start) if s.pm_start else None,
                "pm_end": str(s.pm_end) if s.pm_end else None,
                "consultation_type": s.consultation_type,
            }
            for s in c.schedules
        ],
        "hmos": [{"hmo_id": h.hmo_id, "hmo_name": h.hmo_name} for h in c.hmos],
        "infos": [
            {"info_id": i.info_id, "label": i.label, "content": i.content}
            for i in c.infos
        ],
    })


@clinician_bp.post("/")
@jwt_required()
def create_clinician():
    claims = get_jwt()
    if claims.get("role") != "admin":
        return {"error": "Admin access required"}, 403
    data = request.get_json(force=True) or {}
    # B1-A-patch-2: require_fields added (KeyError risk); "password" replaces "login_password_hash"
    err = require_fields(data, "first_name", "last_name", "login_email", "password")
    if err:
        return err
    clinician = Clinician(
        title=data.get("title"),
        first_name=data["first_name"],
        middle_name=data.get("middle_name"),
        last_name=data["last_name"],
        suffix=data.get("suffix"),
        department=data.get("department"),
        specialty=data.get("specialty"),
        local_number=data.get("local_number"),
        room_number=data.get("room_number"),
        profile_picture=data.get("profile_picture"),
        contact_phone=data.get("contact_phone"),
        contact_email=data.get("contact_email"),
        login_email=data["login_email"],
        login_password_hash=hash_password(data["password"]),  # B1-A-patch-2: hash on write
    )
    db.session.add(clinician)
    db.session.commit()
    return jsonify({"clinician_id": clinician.clinician_id}), 201


@clinician_bp.patch("/<int:clinician_id>")
def update_clinician(clinician_id: int):
    c = db.get_or_404(Clinician, clinician_id)
    data = request.get_json(force=True)
    updatable = [
        "title", "first_name", "middle_name", "last_name", "suffix",
        "department", "specialty", "local_number", "room_number",
        "profile_picture", "contact_phone", "contact_email",
    ]
    for field in updatable:
        if field in data:
            setattr(c, field, data[field])
    db.session.commit()
    return jsonify({"message": "updated"})


@clinician_bp.delete("/<int:clinician_id>")
@jwt_required()
def delete_clinician(clinician_id: int):
    claims = get_jwt()
    if claims.get("role") != "admin":
        return {"error": "Admin access required"}, 403
    c = db.get_or_404(Clinician, clinician_id)
    # B1-A-patch-2: cascade deletes child rows (schedules, hmos, infos, timeslots,
    # secretary_links) — multi-table write requires transaction boundary
    try:
        db.session.delete(c)
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise
    return jsonify({"message": "deleted"})


# ---------------------------------------------------------------------------
# Schedules (nested under clinician)
# ---------------------------------------------------------------------------

@clinician_bp.get("/<int:clinician_id>/schedules")
def list_schedules(clinician_id: int):
    db.get_or_404(Clinician, clinician_id)
    schedules = ClinicianSchedule.query.filter_by(clinician_id=clinician_id).all()
    return jsonify([
        {
            "schedule_id": s.schedule_id,
            "day_of_week": s.day_of_week,
            "am_start": str(s.am_start) if s.am_start else None,
            "am_end": str(s.am_end) if s.am_end else None,
            "pm_start": str(s.pm_start) if s.pm_start else None,
            "pm_end": str(s.pm_end) if s.pm_end else None,
            "consultation_type": s.consultation_type,
        }
        for s in schedules
    ])


@clinician_bp.post("/<int:clinician_id>/schedules")
def create_schedule(clinician_id: int):
    db.get_or_404(Clinician, clinician_id)
    data = request.get_json(force=True)
    schedule = ClinicianSchedule(
        clinician_id=clinician_id,
        day_of_week=data["day_of_week"],
        am_start=data.get("am_start"),
        am_end=data.get("am_end"),
        pm_start=data.get("pm_start"),
        pm_end=data.get("pm_end"),
        consultation_type=data.get("consultation_type", "f2f"),
    )
    db.session.add(schedule)
    # B1-A-patch-2: flush (not commit) so generate_slots can query the new schedule row;
    # a single commit at the end makes schedule creation + slot generation atomic.
    # Previously two separate commits meant a generate_slots failure would leave the
    # schedule committed but with no slots.
    db.session.flush()

    from datetime import date, timedelta
    today = date.today()
    try:
        slots_created = generate_slots(
            clinician_id=clinician_id,
            from_date=today,
            to_date=today + timedelta(days=60),
            commit=False,  # B1-A-patch-2: participate in parent transaction
        )
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise

    return jsonify({"schedule_id": schedule.schedule_id, "slots_created": slots_created}), 201


@clinician_bp.patch("/<int:clinician_id>/schedules/<int:schedule_id>")
@jwt_required()
def update_schedule(clinician_id: int, schedule_id: int):
    """
    Edit a ClinicianSchedule row and regenerate timeslots for the affected range.

    Requires a valid JWT with role "clinician" or "secretary".

    Body (JSON, all fields optional — only present fields are updated):
        day_of_week  (str)
        am_start     (str, "HH:MM")
        am_end       (str, "HH:MM")
        pm_start     (str, "HH:MM")
        pm_end       (str, "HH:MM")

    Returns 200:
        {
            "schedule": { updated schedule fields },
            "slot_regeneration": {
                "deleted": int,
                "stuck": [ { slot_id, slot_date, start_time, end_time,
                              active_appointment_count }, ... ]
            }
        }

    The slot_regeneration.stuck list contains slots that C/S must manually
    resolve (cancel or reschedule each appointment) before the old slot can be
    removed from the system. The schedule update is NOT blocked by stuck slots —
    the information is surfaced so C/S can act on it.
    """
    claims = get_jwt()
    if claims.get("role") not in ("clinician", "secretary"):
        return jsonify({"error": "Forbidden — clinician or secretary role required"}), 403

    db.get_or_404(Clinician, clinician_id)
    schedule = db.get_or_404(ClinicianSchedule, schedule_id)

    if schedule.clinician_id != clinician_id:
        return jsonify({"error": "Schedule not found for this clinician"}), 404

    data = request.get_json(force=True) or {}

    from datetime import date, timedelta
    today = date.today()
    regen_to = today + timedelta(days=60)

    try:
        for field in ["day_of_week", "am_start", "am_end", "pm_start", "pm_end", "consultation_type"]:
            if field in data:
                setattr(schedule, field, data[field])

        # Flush schedule update so generate_slots() queries the updated values
        db.session.flush()

        result = regenerate_slots_for_schedule_change(
            clinician_id=clinician_id,
            from_date=today,
            to_date=regen_to,
        )
        # regenerate_slots_for_schedule_change() commits internally.
        # This commit is a safety-net no-op if the service already committed.
        db.session.commit()

    except Exception:
        db.session.rollback()
        raise

    def _fmt(t) -> str | None:
        return str(t)[:5] if t else None

    return jsonify({
        "schedule": {
            "schedule_id": schedule.schedule_id,
            "day_of_week": schedule.day_of_week,
            "am_start": _fmt(schedule.am_start),
            "am_end": _fmt(schedule.am_end),
            "pm_start": _fmt(schedule.pm_start),
            "pm_end": _fmt(schedule.pm_end),
            "consultation_type": schedule.consultation_type,
        },
        "slot_regeneration": result,
    })


# ---------------------------------------------------------------------------
# HMOs (nested under clinician)
# ---------------------------------------------------------------------------

@clinician_bp.get("/<int:clinician_id>/hmos")
def list_hmos(clinician_id: int):
    db.get_or_404(Clinician, clinician_id)
    hmos = ClinicianHMO.query.filter_by(clinician_id=clinician_id).all()
    return jsonify([{"hmo_id": h.hmo_id, "hmo_name": h.hmo_name} for h in hmos])


@clinician_bp.post("/<int:clinician_id>/hmos")
def create_hmo(clinician_id: int):
    db.get_or_404(Clinician, clinician_id)
    data = request.get_json(force=True)
    hmo = ClinicianHMO(clinician_id=clinician_id, hmo_name=data["hmo_name"])
    db.session.add(hmo)
    db.session.commit()
    return jsonify({"hmo_id": hmo.hmo_id}), 201


@clinician_bp.delete("/<int:clinician_id>/hmos/<int:hmo_id>")
def delete_hmo(clinician_id: int, hmo_id: int):
    db.get_or_404(Clinician, clinician_id)
    hmo = db.get_or_404(ClinicianHMO, hmo_id)
    if hmo.clinician_id != clinician_id:
        return jsonify({"error": "HMO not found for this clinician"}), 404
    db.session.delete(hmo)
    db.session.commit()
    return jsonify({"message": "deleted"})


# ---------------------------------------------------------------------------
# Infos (nested under clinician)
# ---------------------------------------------------------------------------

@clinician_bp.get("/<int:clinician_id>/infos")
def list_infos(clinician_id: int):
    db.get_or_404(Clinician, clinician_id)
    infos = ClinicianInfo.query.filter_by(clinician_id=clinician_id).all()
    return jsonify([
        {"info_id": i.info_id, "label": i.label, "content": i.content}
        for i in infos
    ])


@clinician_bp.post("/<int:clinician_id>/infos")
def create_info(clinician_id: int):
    db.get_or_404(Clinician, clinician_id)
    data = request.get_json(force=True)
    info = ClinicianInfo(
        clinician_id=clinician_id,
        content=data["content"],
        label=data.get("label"),
    )
    db.session.add(info)
    db.session.commit()
    return jsonify({"info_id": info.info_id}), 201


@clinician_bp.delete("/<int:clinician_id>/infos/<int:info_id>")
def delete_info(clinician_id: int, info_id: int):
    db.get_or_404(Clinician, clinician_id)
    info = db.get_or_404(ClinicianInfo, info_id)
    if info.clinician_id != clinician_id:
        return jsonify({"error": "Info not found for this clinician"}), 404
    db.session.delete(info)
    db.session.commit()
    return jsonify({"message": "deleted"})


# ---------------------------------------------------------------------------
# Timeslot generation
# ---------------------------------------------------------------------------

@clinician_bp.post("/<int:clinician_id>/generate-slots")
def generate_clinician_slots(clinician_id: int):
    """
    Generate available timeslots for a clinician from their schedule.

    Body (JSON):
        from_date  (str, YYYY-MM-DD, required)
        to_date    (str, YYYY-MM-DD, required)

    Returns:
        { "slots_created": N }
    """
    db.get_or_404(Clinician, clinician_id)
    data = request.get_json(force=True) or {}

    from_date_str = data.get("from_date")
    to_date_str = data.get("to_date")
    if not from_date_str or not to_date_str:
        return jsonify({"error": "Missing required fields: from_date, to_date"}), 422

    try:
        from_date = date_type.fromisoformat(from_date_str)
        to_date = date_type.fromisoformat(to_date_str)
    except ValueError:
        return jsonify({"error": "Dates must be in YYYY-MM-DD format"}), 422

    if from_date > to_date:
        return jsonify({"error": "from_date must be on or before to_date"}), 422

    try:
        count = generate_slots(
            clinician_id=clinician_id,
            from_date=from_date,
            to_date=to_date,
        )
    except ValueError as e:
        return jsonify({"error": str(e)}), 422

    return jsonify({"slots_created": count}), 201
