"""
auth_routes.py
--------------
Authentication endpoints for all three user roles.

STATUS: STUB — not yet implemented.

Each endpoint is intentionally wired to return a 501 response that documents
its expected contract (inputs / outputs). This gives the collaborator a clear
API surface to implement against without any hidden assumptions baked in.

TODO(security) items visible throughout this file are the collaborator's
responsibility:
  - Choose and configure token lifetime / rotation strategy
  - Implement a token blocklist if logout must be hard (stateful JWT)
  - Add rate-limiting to /login endpoints (e.g. flask-limiter)
  - Add brute-force protection (account lockout after N failed attempts)
  - Ensure login_email comparison is case-insensitive and normalised
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity

auth_bp = Blueprint("auth", __name__)


# ---------------------------------------------------------------------------
# Helper — consistent "not yet implemented" stub response
# ---------------------------------------------------------------------------
def _stub(expects: dict, returns_when_done: dict, note: str = "") -> tuple:
    body = {
        "status": "not_implemented",
        "expects": expects,
        "returns_when_done": returns_when_done,
    }
    if note:
        body["note"] = note
    return jsonify(body), 501


# ---------------------------------------------------------------------------
# POST /api/auth/patient/login
# ---------------------------------------------------------------------------
@auth_bp.post("/patient/login")
def patient_login():
    """
    Authenticate a patient and return an access token.

    Expected body:
        { "login_email": "string", "password": "string" }

    Returns:
        { "access_token": "string", "patient_id": int }

    TODO(security):
      1. Look up Patient by login_email (case-insensitive)
      2. Call auth_service.verify_password(body["password"], patient.login_password_hash)
      3. On success, create_access_token(identity=str(patient.patient_id),
             additional_claims={"role": "patient"})
      4. Return access_token in response body (and/or httpOnly cookie — your call)
      5. On failure, return 401; do NOT reveal whether email or password was wrong
    """
    return _stub(
        expects={"login_email": "string", "password": "string"},
        returns_when_done={"access_token": "string", "patient_id": "int"},
        note="See auth_service.verify_password and flask_jwt_extended.create_access_token",
    )


# ---------------------------------------------------------------------------
# POST /api/auth/clinician/login
# ---------------------------------------------------------------------------
@auth_bp.post("/clinician/login")
def clinician_login():
    """
    Authenticate a clinician and return an access token.

    Expected body:
        { "login_email": "string", "password": "string" }

    Returns:
        { "access_token": "string", "clinician_id": int }

    TODO(security): Same pattern as patient_login. Role claim: "clinician".
    """
    return _stub(
        expects={"login_email": "string", "password": "string"},
        returns_when_done={"access_token": "string", "clinician_id": "int"},
        note="Role claim should be 'clinician'. See patient_login docstring for full flow.",
    )


# ---------------------------------------------------------------------------
# POST /api/auth/secretary/login
# ---------------------------------------------------------------------------
@auth_bp.post("/secretary/login")
def secretary_login():
    """
    Authenticate a secretary and return an access token.

    Expected body:
        { "login_email": "string", "password": "string" }

    Returns:
        { "access_token": "string", "secretary_id": int }

    TODO(security): Same pattern as patient_login. Role claim: "secretary".
    """
    return _stub(
        expects={"login_email": "string", "password": "string"},
        returns_when_done={"access_token": "string", "secretary_id": "int"},
        note="Role claim should be 'secretary'. See patient_login docstring for full flow.",
    )


# ---------------------------------------------------------------------------
# POST /api/auth/logout
# ---------------------------------------------------------------------------
@auth_bp.post("/logout")
@jwt_required()
def logout():
    """
    Invalidate the current access token.

    TODO(security):
      If you need stateful logout (token must be truly revoked, not just expired):
        1. Add a TokenBlocklist model (jti: string, created_at: datetime)
        2. In @jwt.token_in_blocklist_loader, check if jti is in the DB
        3. On logout, add get_jwt()["jti"] to the blocklist
      If stateless logout (client just discards the token) is acceptable, this
      endpoint can simply return 200 and let the client handle it.
    """
    return _stub(
        expects={"Authorization": "Bearer <token> (header)"},
        returns_when_done={"message": "logged out"},
        note=(
            "TODO(security): Implement token blocklist for true revocation, "
            "or document that logout is client-side only."
        ),
    )


# ---------------------------------------------------------------------------
# GET /api/auth/me
# ---------------------------------------------------------------------------
@auth_bp.get("/me")
@jwt_required()
def me():
    """
    Return the identity of the currently authenticated user.

    The JWT identity is set at login time; the role claim tells you which
    table to query for the full profile.

    TODO(security): Decide what to expose here. Avoid leaking sensitive fields
    (login_password_hash, etc.). Return only what the frontend needs for
    session hydration.

    TODO: After login is implemented, return the actual user object from DB
    using get_jwt_identity() and get_jwt()["role"].
    """
    identity = get_jwt_identity()  # Will be None until login is implemented
    return _stub(
        expects={"Authorization": "Bearer <token> (header)"},
        returns_when_done={
            "id": "int",
            "role": "patient | clinician | secretary",
            "name": "string",
        },
        note=f"Current JWT identity (will be None until login is implemented): {identity}",
    )
