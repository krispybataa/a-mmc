"""
auth_routes.py
--------------
Authentication endpoints for all four user roles.

Token strategy:
  - Access token  — 60 min, returned in response body as { "access_token": "..." }
  - Refresh token — 7 days, set as an httpOnly cookie named "refresh_token"
  - Logout blocklists the access token JTI for immediate revocation

Security: rate limiting via Flask-Limiter, account lockout
(in-memory), JWT blocklist (in-memory), CSRF double-submit
on refresh endpoint. See CLAUDE.md for details.
"""

import secrets
from datetime import datetime, timedelta, timezone

from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import (
    jwt_required,
    get_jwt,
    create_access_token,
    create_refresh_token,
    set_refresh_cookies,
    unset_jwt_cookies,
)

from app import limiter
from app.services.auth_service import (
    verify_password,
    hash_password,
    get_patient_by_email,
    get_clinician_by_email,
    get_secretary_by_email,
    get_admin_by_email,
    build_identity,
    blocklist_token,
)
from app.utils.validators import require_fields

auth_bp = Blueprint("auth", __name__)

_INVALID_CREDENTIALS = {"error": "Invalid credentials"}

# ---------------------------------------------------------------------------
# Account lockout — in-memory, resets on server restart.
# 5 consecutive failures locks the account for 15 minutes.
# ---------------------------------------------------------------------------

_failed_attempts: dict = {}
# Key: lowercased email string
# Value: {"count": int, "locked_until": datetime | None}

_LOCKOUT_THRESHOLD = 5
_LOCKOUT_DURATION  = timedelta(minutes=15)


def _check_lockout(email: str):
    """Return a 429 response tuple if this email is currently locked, else None."""
    key   = email.strip().lower()
    entry = _failed_attempts.get(key)
    if not entry:
        return None
    locked_until = entry.get("locked_until")
    if locked_until is None:
        return None
    now = datetime.now(timezone.utc)
    if now < locked_until:
        return jsonify({
            "error": (
                "Account temporarily locked due to too many failed attempts. "
                "Please try again in 15 minutes."
            )
        }), 429
    # Lock window has expired — auto-clear and allow the attempt
    _failed_attempts.pop(key, None)
    return None


def _record_failure(email: str) -> None:
    """Increment the failure count; apply lockout when threshold is reached."""
    key   = email.strip().lower()
    entry = _failed_attempts.setdefault(key, {"count": 0, "locked_until": None})
    entry["count"] += 1
    if entry["count"] >= _LOCKOUT_THRESHOLD:
        entry["locked_until"] = datetime.now(timezone.utc) + _LOCKOUT_DURATION


def _clear_attempt(email: str) -> None:
    """Reset failure tracking on a successful login."""
    _failed_attempts.pop(email.strip().lower(), None)


# ---------------------------------------------------------------------------
# CSRF helper
# ---------------------------------------------------------------------------

def _set_csrf_cookie(response, token: str) -> None:
    """Attach the CSRF double-submit cookie to a response."""
    secure = current_app.config.get("JWT_COOKIE_SECURE", True)
    response.set_cookie(
        "csrf_token",
        token,
        secure=secure,
        httponly=False,   # intentional — JS must read this value
        samesite="Lax",
    )


# ---------------------------------------------------------------------------
# Internal helper — shared login logic for all four roles
# ---------------------------------------------------------------------------

def _login(get_by_email_fn, role: str):
    """
    Shared login flow used by all four role-specific login endpoints.

    Validates required fields, checks account lockout, looks up the user,
    verifies the password, records failures / clears on success, and returns
    an access token (body) + refresh token (httpOnly cookie) + CSRF cookie.
    """
    data = request.get_json(silent=True) or {}

    err = require_fields(data, "email", "password")
    if err:
        return err

    email = data["email"]

    # Check lockout before touching the DB or running bcrypt
    lockout = _check_lockout(email)
    if lockout:
        return lockout

    user = get_by_email_fn(email)

    # Same 401 for "not found" and "wrong password" — no user enumeration
    if user is None or not verify_password(data["password"], user.login_password_hash):
        _record_failure(email)
        return jsonify(_INVALID_CREDENTIALS), 401

    _clear_attempt(email)

    identity = build_identity(user, role)
    # flask_jwt_extended 4.7+ requires the JWT sub claim to be a string.
    # Use the user's numeric ID as the sub; store the full identity dict in
    # additional_claims["user"] so /me and /refresh can reconstruct it.
    access_token = create_access_token(
        identity=str(identity["id"]),
        additional_claims={"user": identity, "role": role},
    )
    refresh_token = create_refresh_token(
        identity=str(identity["id"]),
        additional_claims={"user": identity, "role": role},
    )

    response = jsonify({"access_token": access_token, "user": identity})
    set_refresh_cookies(response, refresh_token)
    _set_csrf_cookie(response, secrets.token_hex(32))
    return response, 200


# ---------------------------------------------------------------------------
# POST /api/auth/patient/login
# ---------------------------------------------------------------------------

@auth_bp.post("/patient/login")
@limiter.limit("50 per hour")
@limiter.limit("10 per minute")
def patient_login():
    return _login(get_patient_by_email, "patient")


# ---------------------------------------------------------------------------
# POST /api/auth/clinician/login
# ---------------------------------------------------------------------------

@auth_bp.post("/clinician/login")
@limiter.limit("50 per hour")
@limiter.limit("10 per minute")
def clinician_login():
    return _login(get_clinician_by_email, "clinician")


# ---------------------------------------------------------------------------
# POST /api/auth/secretary/login
# ---------------------------------------------------------------------------

@auth_bp.post("/secretary/login")
@limiter.limit("50 per hour")
@limiter.limit("10 per minute")
def secretary_login():
    return _login(get_secretary_by_email, "secretary")


# ---------------------------------------------------------------------------
# POST /api/auth/admin/login
# ---------------------------------------------------------------------------

@auth_bp.post("/admin/login")
@limiter.limit("50 per hour")
@limiter.limit("10 per minute")
def admin_login():
    return _login(get_admin_by_email, "admin")


# ---------------------------------------------------------------------------
# POST /api/auth/refresh
# ---------------------------------------------------------------------------

@auth_bp.post("/refresh")
@jwt_required(refresh=True)
def refresh():
    """
    Issue a new access token using the refresh token stored in the httpOnly cookie.

    The refresh token is read automatically by flask-jwt-extended from the
    "refresh_token" cookie. CSRF double-submit validation is performed first:
    the X-CSRF-Token request header must match the csrf_token cookie.
    """
    csrf_cookie = request.cookies.get("csrf_token", "")
    csrf_header = request.headers.get("X-CSRF-Token", "")
    if not csrf_cookie or not csrf_header or csrf_cookie != csrf_header:
        return jsonify({"error": "CSRF validation failed"}), 403

    claims = get_jwt()
    identity = claims["user"]
    access_token = create_access_token(
        identity=str(identity["id"]),
        additional_claims={"user": identity, "role": identity["role"]},
    )

    # Rotate the CSRF token on every successful refresh
    response = jsonify({"access_token": access_token, "user": identity})
    _set_csrf_cookie(response, secrets.token_hex(32))
    return response, 200


# ---------------------------------------------------------------------------
# POST /api/auth/logout
# ---------------------------------------------------------------------------

@auth_bp.post("/logout")
@jwt_required()
def logout():
    """
    Revoke the current access token and clear the refresh cookie.

    The access token JTI is added to the in-memory blocklist so it is
    rejected immediately by the token_in_blocklist_loader callback, without
    waiting for the 60-minute TTL to expire.
    """
    jti = get_jwt()["jti"]
    blocklist_token(jti)
    response = jsonify({"message": "Logged out"})
    unset_jwt_cookies(response)
    return response, 200


# ---------------------------------------------------------------------------
# PATCH /api/auth/change-password
# ---------------------------------------------------------------------------

@auth_bp.patch("/change-password")
@jwt_required()
def change_password():
    """
    Change the password for the currently authenticated clinician or secretary.

    Expects JSON: { "current_password": "...", "new_password": "..." }
    Returns 200 on success, 401 if current_password is wrong,
    400 if required fields are missing.
    """
    from app import db

    claims = get_jwt()
    identity = claims["user"]
    role = identity.get("role")

    if role not in ("clinician", "secretary"):
        return jsonify({"error": "Password change is only available for clinician and secretary accounts."}), 403

    data = request.get_json(silent=True) or {}

    err = require_fields(data, "current_password", "new_password")
    if err:
        return err

    current_password = data["current_password"]
    new_password     = data["new_password"]

    if len(new_password) < 8:
        return jsonify({"error": "New password must be at least 8 characters."}), 400

    if role == "clinician":
        from app.models.clinician import Clinician
        user = Clinician.query.get(identity["id"])
    else:
        from app.models.secretary import Secretary
        user = Secretary.query.get(identity["id"])

    if user is None:
        return jsonify({"error": "User not found."}), 404

    if not verify_password(current_password, user.login_password_hash):
        return jsonify({"error": "Current password is incorrect."}), 401

    try:
        user.login_password_hash = hash_password(new_password)
        db.session.commit()
        return jsonify({"message": "Password updated successfully."}), 200
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Failed to update password."}), 500


# ---------------------------------------------------------------------------
# GET /api/auth/me
# ---------------------------------------------------------------------------

@auth_bp.get("/me")
@jwt_required()
def me():
    """
    Return the identity of the currently authenticated user from the token.

    No DB query — identity is read directly from the JWT payload as set at
    login time via build_identity() and stored in the "user" additional claim.
    """
    claims = get_jwt()
    return jsonify({"user": claims["user"]}), 200
