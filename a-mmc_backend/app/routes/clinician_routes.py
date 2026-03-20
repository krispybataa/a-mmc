from flask import Blueprint, jsonify, request
from app import db
from app.models.clinician import (
    Clinician,
    ClinicianSchedule,
    ClinicianHMO,
    ClinicianInfo,
)

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
def create_clinician():
    data = request.get_json(force=True)
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
        login_password_hash=data["login_password_hash"],
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
def delete_clinician(clinician_id: int):
    c = db.get_or_404(Clinician, clinician_id)
    db.session.delete(c)
    db.session.commit()
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
    )
    db.session.add(schedule)
    db.session.commit()
    return jsonify({"schedule_id": schedule.schedule_id}), 201


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
