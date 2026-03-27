"""
auth_routes.py
--------------
Authentication endpoints for all three user roles.

Token strategy:
  - Access token  — 60 min, returned in response body as { "access_token": "..." }
  - Refresh token — 7 days, set as an httpOnly cookie named "refresh_token"
  - Logout clears the cookie; the access token expires naturally (stateless)

TODO(security) items deferred for production hardening:
  - Rate-limiting on /login endpoints (e.g. flask-limiter)
  - Brute-force protection / account lockout after N failed attempts
  - Server-side token blocklist (see /logout) for true access-token revocation
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import (
    jwt_required,
    get_jwt_identity,
    create_access_token,
    create_refresh_token,
    set_refresh_cookies,
    unset_jwt_cookies,
)

from app.services.auth_service import (
    verify_password,
    get_patient_by_email,
    get_clinician_by_email,
    get_secretary_by_email,
    build_identity,
)
from app.utils.validators import require_fields

auth_bp = Blueprint("auth", __name__)

_INVALID_CREDENTIALS = {"error": "Invalid credentials"}


# ---------------------------------------------------------------------------
# Internal helper — shared login logic for all three roles
# ---------------------------------------------------------------------------

def _login(get_by_email_fn, role: str):
    """
    Shared login flow used by all three role-specific login endpoints.

    Validates required fields, looks up the user, verifies the password, and
    returns an access token (body) + refresh token (httpOnly cookie).
    """
    data = request.get_json(silent=True) or {}

    err = require_fields(data, "email", "password")
    if err:
        return err

    user = get_by_email_fn(data["email"])

    # Same 401 for "not found" and "wrong password" — no user enumeration
    if user is None or not verify_password(data["password"], user.login_password_hash):
        return jsonify(_INVALID_CREDENTIALS), 401

    identity = build_identity(user, role)
    access_token = create_access_token(
        identity=identity,
        additional_claims={"role": role},
    )
    refresh_token = create_refresh_token(
        identity=identity,
        additional_claims={"role": role},
    )

    response = jsonify({"access_token": access_token, "user": identity})
    set_refresh_cookies(response, refresh_token)
    return response, 200


# ---------------------------------------------------------------------------
# POST /api/auth/patient/login
# ---------------------------------------------------------------------------

@auth_bp.post("/patient/login")
def patient_login():
    # TODO(security): Add rate-limiting to prevent brute-force attacks
    # TODO(security): Add account lockout after N consecutive failed attempts
    return _login(get_patient_by_email, "patient")


# ---------------------------------------------------------------------------
# POST /api/auth/clinician/login
# ---------------------------------------------------------------------------

@auth_bp.post("/clinician/login")
def clinician_login():
    # TODO(security): Add rate-limiting to prevent brute-force attacks
    # TODO(security): Add account lockout after N consecutive failed attempts
    return _login(get_clinician_by_email, "clinician")


# ---------------------------------------------------------------------------
# POST /api/auth/secretary/login
# ---------------------------------------------------------------------------

@auth_bp.post("/secretary/login")
def secretary_login():
    # TODO(security): Add rate-limiting to prevent brute-force attacks
    # TODO(security): Add account lockout after N consecutive failed attempts
    return _login(get_secretary_by_email, "secretary")


# ---------------------------------------------------------------------------
# POST /api/auth/refresh
# ---------------------------------------------------------------------------

@auth_bp.post("/refresh")
@jwt_required(refresh=True)
def refresh():
    """
    Issue a new access token using the refresh token stored in the httpOnly cookie.

    The refresh token is read automatically by flask-jwt-extended from the
    "refresh_token" cookie (JWT_TOKEN_LOCATION includes "cookies").
    """
    identity = get_jwt_identity()
    access_token = create_access_token(
        identity=identity,
        additional_claims={"role": identity["role"]},
    )
    return jsonify({"access_token": access_token, "user": identity}), 200


# ---------------------------------------------------------------------------
# POST /api/auth/logout
# ---------------------------------------------------------------------------

@auth_bp.post("/logout")
@jwt_required()
def logout():
    """
    Clear the refresh token cookie.

    The access token is NOT revoked — it remains valid until it expires (60 min).

    TODO(security): Implement a server-side token blocklist for production
    hardening. On logout, add get_jwt()["jti"] to a blocklist (DB or Redis)
    and check it in a @jwt.token_in_blocklist_loader callback. This gives true
    revocation without waiting for the access token TTL to expire.
    """
    response = jsonify({"message": "Logged out"})
    unset_jwt_cookies(response)
    return response, 200


# ---------------------------------------------------------------------------
# GET /api/auth/me
# ---------------------------------------------------------------------------

@auth_bp.get("/me")
@jwt_required()
def me():
    """
    Return the identity of the currently authenticated user from the token.

    No DB query — identity is read directly from the JWT payload as set at
    login time via build_identity().
    """
    identity = get_jwt_identity()
    return jsonify({"user": identity}), 200
