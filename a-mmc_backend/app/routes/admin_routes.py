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

from collections import Counter
from datetime import datetime, timedelta

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt

from app import db
from app.models.admin import Admin
from app.models.clinician import Clinician
from app.models.secretary import Secretary, SecretaryClinicianLink
from app.models.patient import Patient
from app.models.appointment import Appointment
from app.services.auth_service import hash_password
from app.services.email_service import (
    send_initial_credentials_clinician,
    send_initial_credentials_secretary,
)
from app.services.email_templates import (
    appointment_confirmation,
    reschedule_request_to_patient,
    reschedule_request_to_clinician,
    cancellation_notice,
    noshow_confirmation_prompt,
    initial_credentials_clinician,
    initial_credentials_secretary,
    reschedule_confirmation_to_patient,
)
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
# POST /api/admin/clinicians
# ---------------------------------------------------------------------------

@admin_bp.post("/clinicians")
@jwt_required()
def create_clinician():
    err = _require_admin()
    if err:
        return err
    data = request.get_json(force=True) or {}
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
        contact_phone=data.get("contact_phone"),
        contact_email=data.get("contact_email"),
        login_email=data["login_email"],
        login_password_hash=hash_password(data["password"]),
    )
    try:
        db.session.add(clinician)
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise

    # Post-commit: send credentials email. Never affects the HTTP response.
    try:
        send_initial_credentials_clinician(
            clinician_name  = f"{data['first_name']} {data['last_name']}",
            clinician_title = data.get("title", "") or "",
            login_email     = data["login_email"],
            temporary_password = data["password"],
        )
    except Exception:
        pass  # Logged inside send_initial_credentials_clinician

    return jsonify({"clinician_id": clinician.clinician_id}), 201


# ---------------------------------------------------------------------------
# DELETE /api/admin/clinicians/<id>
# ---------------------------------------------------------------------------

@admin_bp.delete("/clinicians/<int:clinician_id>")
@jwt_required()
def delete_clinician(clinician_id: int):
    err = _require_admin()
    if err:
        return err
    c = db.get_or_404(Clinician, clinician_id)
    try:
        db.session.delete(c)
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise
    return jsonify({"message": "deleted"})


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
# POST /api/admin/secretaries
# ---------------------------------------------------------------------------

@admin_bp.post("/secretaries")
@jwt_required()
def create_secretary():
    err = _require_admin()
    if err:
        return err
    data = request.get_json(force=True) or {}
    err = require_fields(data, "first_name", "last_name", "login_email", "password")
    if err:
        return err
    secretary = Secretary(
        title=data.get("title"),
        first_name=data["first_name"],
        last_name=data["last_name"],
        suffix=data.get("suffix"),
        contact_phone=data.get("contact_phone"),
        contact_email=data.get("contact_email"),
        login_email=data["login_email"],
        login_password_hash=hash_password(data["password"]),
    )
    try:
        db.session.add(secretary)
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise

    # Post-commit: send credentials email. Never affects the HTTP response.
    try:
        send_initial_credentials_secretary(
            secretary_name     = f"{data['first_name']} {data['last_name']}",
            login_email        = data["login_email"],
            temporary_password = data["password"],
        )
    except Exception:
        pass  # Logged inside send_initial_credentials_secretary

    return jsonify({"secretary_id": secretary.secretary_id}), 201


# ---------------------------------------------------------------------------
# DELETE /api/admin/secretaries/<id>
# ---------------------------------------------------------------------------

@admin_bp.delete("/secretaries/<int:secretary_id>")
@jwt_required()
def delete_secretary(secretary_id: int):
    err = _require_admin()
    if err:
        return err
    s = db.get_or_404(Secretary, secretary_id)
    try:
        db.session.delete(s)
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise
    return jsonify({"message": "deleted"})


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
# GET /api/admin/email-previews
# ---------------------------------------------------------------------------

_MOCK = {
    "patient_name":        "Maria Santos",
    "clinician_name":      "Reyes",
    "clinician_title":     "Dr.",
    "date":                "July 4, 2026",
    "time":                "10:00",
    "new_date":            "July 11, 2026",
    "new_time":            "14:00",
    "room_number":         "Hall A Rm 230",
    "chief_complaint":     "Joint pain and swelling",
    "payment_type":        "Maxicare",
    "consultation_type":   "f2f",
    "reason":              "The clinician has a scheduling conflict on the original date.",
    "cancelled_by":        "cs",
    "login_email":         "m.santos@email.com",
    "temporary_password":  "Temp@1234!",
    "secretary_name":      "Ana Cruz",
    "system_url":          "",
}


@admin_bp.get("/email-previews")
@jwt_required()
def email_previews():
    err = _require_admin()
    if err:
        return err

    m = _MOCK
    templates = [
        {
            "id":    "appointment_confirmation",
            "label": "Appointment Confirmation",
            **appointment_confirmation(
                patient_name      = m["patient_name"],
                clinician_name    = m["clinician_name"],
                clinician_title   = m["clinician_title"],
                date              = m["date"],
                time              = m["time"],
                room_number       = m["room_number"],
                chief_complaint   = m["chief_complaint"],
                payment_type      = m["payment_type"],
                consultation_type = m["consultation_type"],
            ),
        },
        {
            "id":    "reschedule_request_to_patient",
            "label": "Reschedule Request (to Patient)",
            **reschedule_request_to_patient(
                patient_name    = m["patient_name"],
                clinician_name  = m["clinician_name"],
                clinician_title = m["clinician_title"],
                original_date   = m["date"],
                original_time   = m["time"],
                reason          = m["reason"],
            ),
        },
        {
            "id":    "reschedule_request_to_clinician",
            "label": "Reschedule Request (to Clinician)",
            **reschedule_request_to_clinician(
                clinician_name  = m["clinician_name"],
                clinician_title = m["clinician_title"],
                patient_name    = m["patient_name"],
                original_date   = m["date"],
                original_time   = m["time"],
                reason          = m["reason"],
            ),
        },
        {
            "id":    "cancellation_notice",
            "label": "Cancellation Notice",
            **cancellation_notice(
                recipient_name   = m["patient_name"],
                other_party_name = f"{m['clinician_title']} {m['clinician_name']}",
                date             = m["date"],
                time             = m["time"],
                reason           = m["reason"],
                cancelled_by     = m["cancelled_by"],
            ),
        },
        {
            "id":    "noshow_confirmation_prompt",
            "label": "Appointment Reminder",
            **noshow_confirmation_prompt(
                patient_name    = m["patient_name"],
                clinician_name  = m["clinician_name"],
                clinician_title = m["clinician_title"],
                date            = m["date"],
                time            = m["time"],
                room_number     = m["room_number"],
            ),
        },
        {
            "id":    "initial_credentials_clinician",
            "label": "Initial Credentials (Clinician)",
            **initial_credentials_clinician(
                clinician_name     = m["clinician_name"],
                clinician_title    = m["clinician_title"],
                login_email        = m["login_email"],
                temporary_password = m["temporary_password"],
                system_url         = m["system_url"],
            ),
        },
        {
            "id":    "initial_credentials_secretary",
            "label": "Initial Credentials (Secretary)",
            **initial_credentials_secretary(
                secretary_name     = m["secretary_name"],
                login_email        = m["login_email"],
                temporary_password = m["temporary_password"],
                system_url         = m["system_url"],
            ),
        },
        {
            "id":    "reschedule_confirmation_to_patient",
            "label": "Reschedule Confirmation (to Patient)",
            **reschedule_confirmation_to_patient(
                patient_name    = m["patient_name"],
                clinician_name  = m["clinician_name"],
                clinician_title = m["clinician_title"],
                new_date        = m["new_date"],
                new_time        = m["new_time"],
                room_number     = m["room_number"],
            ),
        },
    ]
    return jsonify(templates)


# ---------------------------------------------------------------------------
# GET /api/admin/analytics
# ---------------------------------------------------------------------------

@admin_bp.get("/analytics")
@jwt_required()
def analytics():
    err = _require_admin()
    if err:
        return err

    try:
        period = request.args.get("period", "month")
        if period not in ("week", "month", "all"):
            period = "month"

        now = datetime.utcnow()
        if period == "week":
            since = now - timedelta(days=7)
        elif period == "month":
            since = now - timedelta(days=30)
        else:
            since = None

        q = db.session.query(Appointment)
        if since is not None:
            q = q.filter(Appointment.created_at >= since)
        appointments = q.all()

        # Appointments by status
        status_counts = {
            "pending": 0, "accepted": 0, "cancelled": 0,
            "completed": 0, "no_show": 0, "reschedule_requested": 0,
        }
        for a in appointments:
            if a.status in status_counts:
                status_counts[a.status] += 1

        # Appointments by consultation type
        type_counts = {"f2f": 0, "teleconsult": 0}
        for a in appointments:
            if a.consultation_type in type_counts:
                type_counts[a.consultation_type] += 1

        # Appointments by day (grouped on booking date from created_at)
        day_counts: dict = {}
        for a in appointments:
            if a.created_at:
                d = str(a.created_at.date())
                day_counts[d] = day_counts.get(d, 0) + 1
        appointments_by_day = [
            {"date": d, "count": c}
            for d, c in sorted(day_counts.items())
        ]

        # Top 5 clinicians by appointment count
        clinician_counter = Counter(a.clinician_id for a in appointments)
        top_clinicians = []
        for cid, count in clinician_counter.most_common(5):
            c = db.session.get(Clinician, cid)
            if c:
                top_clinicians.append({
                    "clinician_id": cid,
                    "name": f"{c.first_name} {c.last_name}",
                    "count": count,
                })

        return jsonify({
            "appointments_by_status":           status_counts,
            "appointments_by_consultation_type": type_counts,
            "appointments_by_day":              appointments_by_day,
            "top_clinicians":                   top_clinicians,
            "period":                           period,
        })

    except Exception:
        return jsonify({"error": "An unexpected error occurred"}), 500


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
