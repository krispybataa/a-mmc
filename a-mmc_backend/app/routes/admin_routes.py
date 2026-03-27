"""
admin_routes.py
---------------
System administrator endpoints.

Scope (per proposal §7):
  - Account management: view clinician/secretary/patient lists, create admin accounts
  - System monitoring: aggregate counts
  - NOT in scope: appointment details, patient health data, clinical actions

All routes require a valid JWT with role == "admin".
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt

from app import db
from app.models.admin import Admin
from app.models.clinician import Clinician
from app.models.secretary import Secretary, SecretaryClinicianLink
from app.models.patient import Patient
from app.models.appointment import Appointment
from app.services.auth_service import hash_password
from app.utils.validators import require_fields

admin_bp = Blueprint("admin", __name__)


def _require_admin():
    """Return a 403 response tuple if the caller is not an admin, else None."""
    claims = get_jwt()
    if claims.get("role") != "admin":
        return jsonify({"error": "Admin access required"}), 403
    return None


# ---------------------------------------------------------------------------
# GET /api/admin/dashboard
# ---------------------------------------------------------------------------

@admin_bp.get("/dashboard")
@jwt_required()
def dashboard():
    err = _require_admin()
    if err:
        return err
    return jsonify({
        "clinicians":   db.session.query(Clinician).count(),
        "secretaries":  db.session.query(Secretary).count(),
        "patients":     db.session.query(Patient).count(),
        "appointments": db.session.query(Appointment).count(),
    })


# ---------------------------------------------------------------------------
# GET /api/admin/clinicians
# ---------------------------------------------------------------------------

@admin_bp.get("/clinicians")
@jwt_required()
def list_clinicians():
    err = _require_admin()
    if err:
        return err
    clinicians = Clinician.query.all()
    return jsonify([
        {
            "clinician_id":  c.clinician_id,
            "title":         c.title,
            "first_name":    c.first_name,
            "last_name":     c.last_name,
            "specialty":     c.specialty,
            "department":    c.department,
            "room_number":   c.room_number,
            "contact_email": c.contact_email,
            "login_email":   c.login_email,
        }
        for c in clinicians
    ])


# ---------------------------------------------------------------------------
# GET /api/admin/secretaries
# ---------------------------------------------------------------------------

@admin_bp.get("/secretaries")
@jwt_required()
def list_secretaries():
    err = _require_admin()
    if err:
        return err
    secretaries = Secretary.query.all()
    return jsonify([
        {
            "secretary_id":  s.secretary_id,
            "first_name":    s.first_name,
            "last_name":     s.last_name,
            "contact_email": s.contact_email,
            "login_email":   s.login_email,
            "clinician_ids": [link.clinician_id for link in s.clinician_links],
        }
        for s in secretaries
    ])


# ---------------------------------------------------------------------------
# GET /api/admin/patients
# ---------------------------------------------------------------------------

@admin_bp.get("/patients")
@jwt_required()
def list_patients():
    err = _require_admin()
    if err:
        return err
    patients = Patient.query.all()
    # Non-sensitive fields only — no birthday, address, health, sc/pwd data
    return jsonify([
        {
            "patient_id":    p.patient_id,
            "first_name":    p.first_name,
            "last_name":     p.last_name,
            "mobile_number": p.mobile_number,
            "login_email":   p.login_email,
        }
        for p in patients
    ])


# ---------------------------------------------------------------------------
# POST /api/admin/admins
# ---------------------------------------------------------------------------

@admin_bp.post("/admins")
@jwt_required()
def create_admin():
    err = _require_admin()
    if err:
        return err
    data = request.get_json(force=True) or {}
    err = require_fields(data, "first_name", "last_name", "login_email", "password")
    if err:
        return err
    admin = Admin(
        first_name=data["first_name"],
        last_name=data["last_name"],
        login_email=data["login_email"],
        login_password_hash=hash_password(data["password"]),
    )
    try:
        db.session.add(admin)
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise
    return jsonify({"admin_id": admin.admin_id}), 201


# ---------------------------------------------------------------------------
# POST /api/admin/seed-first-admin
# REMOVE BEFORE PRODUCTION
# ---------------------------------------------------------------------------

@admin_bp.post("/seed-first-admin")
def seed_first_admin():
    """
    Bootstrap endpoint — creates the first admin account.

    Hard guard: returns 403 immediately if any admin already exists.
    No auth required (bootstrap problem — there is no admin to authenticate as yet).

    REMOVE BEFORE PRODUCTION.
    """
    # Hard guard: only works when zero admin accounts exist
    if Admin.query.count() > 0:
        return jsonify({"error": "Forbidden — admin account already exists"}), 403

    first_name = "Admin"
    last_name  = "User"
    email      = "admin@alagang-mmc.local"
    password   = "ChangeMe123!"

    admin = Admin(
        first_name=first_name,
        last_name=last_name,
        login_email=email,
        login_password_hash=hash_password(password),
    )
    try:
        db.session.add(admin)
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise

    print(f"[seed-first-admin] Created admin #{admin.admin_id}: {email} / {password}")
    return jsonify({
        "admin_id":    admin.admin_id,
        "login_email": email,
        "password":    password,
    }), 201
