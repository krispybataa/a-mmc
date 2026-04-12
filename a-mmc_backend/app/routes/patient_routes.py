import re
from datetime import date

from flask import Blueprint, jsonify, request
from app import db, limiter
from app.models.patient import Patient
from app.utils.validators import require_fields
from app.services.auth_service import hash_password

patient_bp = Blueprint("patients", __name__)


@patient_bp.get("/")
def list_patients():
    patients = Patient.query.all()
    return jsonify([
        {
            "patient_id": p.patient_id,
            "last_name": p.last_name,
            "first_name": p.first_name,
            "middle_name": p.middle_name,
            "birthday": str(p.birthday) if p.birthday else None,
            "gender": p.gender,
            "mobile_number": p.mobile_number,
        }
        for p in patients
    ])


@patient_bp.get("/<int:patient_id>")
def get_patient(patient_id: int):
    p = db.get_or_404(Patient, patient_id)
    return jsonify({
        "patient_id": p.patient_id,
        "last_name": p.last_name,
        "first_name": p.first_name,
        "middle_name": p.middle_name,
        "birthday": str(p.birthday) if p.birthday else None,
        "gender": p.gender,
        "civil_status": p.civil_status,
        "nationality": p.nationality,
        "religion": p.religion,
        "occupation": p.occupation,
        "mobile_number": p.mobile_number,
        "next_of_kin_name": p.next_of_kin_name,
        "next_of_kin_relationship": p.next_of_kin_relationship,
        "next_of_kin_contact": p.next_of_kin_contact,
        "address_line_1": p.address_line_1,
        "province": p.province,
        "city": p.city,
        "barangay": p.barangay,
        "country": p.country,
        "sc_pwd_id_number": p.sc_pwd_id_number,
        "preferred_language": p.preferred_language,
        "culture": p.culture,
        "educational_attainment": p.educational_attainment,
        "disability_type": p.disability_type,
    })


@patient_bp.post("/")
@limiter.limit("5 per hour")
def create_patient():
    data = request.get_json(force=True) or {}

    err = require_fields(
        data,
        "last_name", "first_name", "birthday", "gender",
        "mobile_number", "address_line_1", "province", "city",
        "barangay", "login_email", "password", "educational_attainment",
    )
    if err:
        return err

    # Format validation
    for name_field in ("first_name", "last_name"):
        if re.search(r"\d", data[name_field]):
            return jsonify({"error": "Please enter a valid name (letters only)."}), 422

    mobile = re.sub(r"\s", "", data["mobile_number"])
    if not re.fullmatch(r"09\d{9}", mobile):
        return jsonify({"error": "Mobile number must be 11 digits starting with 09."}), 422

    try:
        dob = date.fromisoformat(data["birthday"])
    except ValueError:
        return jsonify({"error": "Please enter a valid date of birth."}), 422

    today = date.today()
    if dob > today:
        return jsonify({"error": "Date of birth cannot be in the future."}), 422
    if dob < date(1900, 1, 1):
        return jsonify({"error": "Please enter a valid date of birth."}), 422
    fifteen_years_ago = today.replace(year=today.year - 15)
    if dob > fifteen_years_ago:
        return jsonify({"error": "You must be at least 15 years old to register."}), 422

    patient = Patient(
        last_name=data["last_name"],
        first_name=data["first_name"],
        middle_name=data.get("middle_name"),
        birthday=data["birthday"],
        gender=data["gender"],
        civil_status=data.get("civil_status"),
        nationality=data.get("nationality"),
        religion=data.get("religion"),
        occupation=data.get("occupation"),
        mobile_number=data["mobile_number"],
        next_of_kin_name=data.get("next_of_kin_name"),
        next_of_kin_relationship=data.get("next_of_kin_relationship"),
        next_of_kin_contact=data.get("next_of_kin_contact"),
        address_line_1=data["address_line_1"],
        province=data["province"],
        city=data["city"],
        barangay=data["barangay"],
        country=data.get("country", "Philippines"),
        login_email=data["login_email"],
        login_password_hash=hash_password(data["password"]),  # B1-A-patch: hash on write
        sc_pwd_id_number=data.get("sc_pwd_id_number"),
        pwd_id_front=data.get("pwd_id_front"),
        pwd_id_back=data.get("pwd_id_back"),
        preferred_language=data.get("preferred_language", "Filipino"),
        culture=data.get("culture"),
        educational_attainment=data["educational_attainment"],
        disability_type=data.get("disability_type"),
    )
    db.session.add(patient)
    db.session.commit()
    return jsonify({"patient_id": patient.patient_id}), 201


@patient_bp.patch("/<int:patient_id>")
def update_patient(patient_id: int):
    p = db.get_or_404(Patient, patient_id)
    data = request.get_json(force=True)
    updatable = [
        "last_name", "first_name", "middle_name", "birthday", "gender",
        "civil_status", "nationality", "religion", "occupation", "mobile_number",
        "next_of_kin_name", "next_of_kin_relationship", "next_of_kin_contact",
        "address_line_1", "province", "city", "barangay", "country",
        "sc_pwd_id_number", "pwd_id_front", "pwd_id_back",
        "preferred_language", "culture", "educational_attainment", "disability_type",
    ]
    for field in updatable:
        if field in data:
            setattr(p, field, data[field])
    db.session.commit()
    return jsonify({"message": "updated"})


@patient_bp.delete("/<int:patient_id>")
def delete_patient(patient_id: int):
    p = db.get_or_404(Patient, patient_id)
    db.session.delete(p)
    db.session.commit()
    return jsonify({"message": "deleted"})
