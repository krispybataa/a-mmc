"""
auth_service.py
---------------
Password hashing and verification helpers.

These are pure functions — no Flask context, no DB access — so they can be
called from any route or test without ceremony.

TODO(security): The work factor (rounds) for bcrypt is currently at the bcrypt
default (12). Benchmark on your target hardware and adjust via the `rounds`
parameter if needed. A common recommendation is to target ~250ms per hash.

TODO(security): Consider implementing an "upgrade on login" pattern: when a
user logs in successfully, re-hash their password with the current work factor
and persist the new hash. This transparently upgrades older hashes if you ever
raise the work factor in the future.
"""

import bcrypt


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
