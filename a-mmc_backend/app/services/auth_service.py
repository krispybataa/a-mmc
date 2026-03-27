"""
auth_service.py
---------------
Password hashing, verification, and user-lookup helpers for all three roles.

Pure functions only — no route handling. DB-accessing functions require an
active Flask application context (i.e. they must be called from within a
request or app.app_context()).

TODO(security): The work factor (rounds) for bcrypt is currently at the bcrypt
default (12). Benchmark on your target hardware and adjust via the `rounds`
parameter if needed. A common recommendation is to target ~250ms per hash.

TODO(security): Consider implementing an "upgrade on login" pattern: when a
user logs in successfully, re-hash their password with the current work factor
and persist the new hash. This transparently upgrades older hashes if you ever
raise the work factor in the future.
"""

import bcrypt
from sqlalchemy import func


def hash_password(plain: str) -> str:
    """
    Hash a plaintext password using bcrypt.

    Returns a UTF-8 string suitable for storing in `login_password_hash`.
    """
    password_bytes = plain.encode("utf-8")
    hashed = bcrypt.hashpw(password_bytes, bcrypt.gensalt())
    return hashed.decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """
    Verify a plaintext password against a stored bcrypt hash.

    Returns True if they match, False otherwise.
    Always runs in constant time to prevent timing attacks.
    """
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


# ---------------------------------------------------------------------------
# User lookup by login email (case-insensitive)
# ---------------------------------------------------------------------------

def get_patient_by_email(email: str):
    """Return a Patient row matching login_email (case-insensitive), or None."""
    from app.models.patient import Patient
    return Patient.query.filter(
        func.lower(Patient.login_email) == email.strip().lower()
    ).first()


def get_clinician_by_email(email: str):
    """Return a Clinician row matching login_email (case-insensitive), or None."""
    from app.models.clinician import Clinician
    return Clinician.query.filter(
        func.lower(Clinician.login_email) == email.strip().lower()
    ).first()


def get_secretary_by_email(email: str):
    """Return a Secretary row matching login_email (case-insensitive), or None."""
    from app.models.secretary import Secretary
    return Secretary.query.filter(
        func.lower(Secretary.login_email) == email.strip().lower()
    ).first()


# ---------------------------------------------------------------------------
# Identity builder
# ---------------------------------------------------------------------------

def build_identity(user, role: str) -> dict:
    """
    Build the JWT identity payload from a user row and role string.

    role must be one of: "patient" | "clinician" | "secretary"

    The returned dict is stored as the JWT identity and also returned to the
    client in the login response body — do not include sensitive fields here.
    """
    return {
        "id": getattr(user, f"{role}_id"),
        "role": role,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.login_email,
    }
