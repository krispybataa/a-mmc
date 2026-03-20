from flask import Blueprint, jsonify, request
from app import db
from app.models.secretary import Secretary, SecretaryClinicianLink

secretary_bp = Blueprint("secretaries", __name__)


@secretary_bp.get("/")
def list_secretaries():
    secretaries = Secretary.query.all()
    return jsonify([
        {
            "secretary_id": s.secretary_id,
            "title": s.title,
            "first_name": s.first_name,
            "last_name": s.last_name,
            "suffix": s.suffix,
            "contact_phone": s.contact_phone,
            "contact_email": s.contact_email,
        }
        for s in secretaries
    ])


@secretary_bp.get("/<int:secretary_id>")
def get_secretary(secretary_id: int):
    s = db.get_or_404(Secretary, secretary_id)
    return jsonify({
        "secretary_id": s.secretary_id,
        "title": s.title,
        "first_name": s.first_name,
        "last_name": s.last_name,
        "suffix": s.suffix,
        "contact_phone": s.contact_phone,
        "contact_email": s.contact_email,
        "clinician_ids": [link.clinician_id for link in s.clinician_links],
    })


@secretary_bp.post("/")
def create_secretary():
    data = request.get_json(force=True)
    secretary = Secretary(
        title=data.get("title"),
        first_name=data["first_name"],
        last_name=data["last_name"],
        suffix=data.get("suffix"),
        contact_phone=data.get("contact_phone"),
        contact_email=data.get("contact_email"),
        login_email=data["login_email"],
        login_password_hash=data["login_password_hash"],
    )
    db.session.add(secretary)
    db.session.commit()
    return jsonify({"secretary_id": secretary.secretary_id}), 201


@secretary_bp.patch("/<int:secretary_id>")
def update_secretary(secretary_id: int):
    s = db.get_or_404(Secretary, secretary_id)
    data = request.get_json(force=True)
    for field in ["title", "first_name", "last_name", "suffix", "contact_phone", "contact_email"]:
        if field in data:
            setattr(s, field, data[field])
    db.session.commit()
    return jsonify({"message": "updated"})


@secretary_bp.delete("/<int:secretary_id>")
def delete_secretary(secretary_id: int):
    s = db.get_or_404(Secretary, secretary_id)
    db.session.delete(s)
    db.session.commit()
    return jsonify({"message": "deleted"})


# ---------------------------------------------------------------------------
# Secretary ↔ Clinician linking
# ---------------------------------------------------------------------------

@secretary_bp.post("/<int:secretary_id>/clinicians/<int:clinician_id>")
def link_clinician(secretary_id: int, clinician_id: int):
    db.get_or_404(Secretary, secretary_id)
    link = SecretaryClinicianLink(secretary_id=secretary_id, clinician_id=clinician_id)
    db.session.add(link)
    db.session.commit()
    return jsonify({"message": "linked", "id": link.id}), 201


@secretary_bp.delete("/<int:secretary_id>/clinicians/<int:clinician_id>")
def unlink_clinician(secretary_id: int, clinician_id: int):
    link = SecretaryClinicianLink.query.filter_by(
        secretary_id=secretary_id, clinician_id=clinician_id
    ).first_or_404()
    db.session.delete(link)
    db.session.commit()
    return jsonify({"message": "unlinked"})
