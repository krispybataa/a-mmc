"""
test_auth_service.py
--------------------
Unit tests for app/services/auth_service.py.

These tests are purely in-process — no Flask app context and no database
connection are required. They cover the password hashing utilities and the
in-memory JWT blocklist.
"""

import pytest
from types import SimpleNamespace

from app.services.auth_service import (
    hash_password,
    verify_password,
    blocklist_token,
    is_token_blocked,
    build_identity,
)


# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------

class TestHashPassword:
    def test_returns_string(self):
        result = hash_password("secret123")
        assert isinstance(result, str)

    def test_not_plaintext(self):
        pwd = "secret123"
        assert hash_password(pwd) != pwd

    def test_two_hashes_differ(self):
        """bcrypt uses a random salt — same input must not produce the same hash."""
        assert hash_password("secret123") != hash_password("secret123")


class TestVerifyPassword:
    def test_correct_password_returns_true(self):
        hashed = hash_password("correct_horse")
        assert verify_password("correct_horse", hashed) is True

    def test_wrong_password_returns_false(self):
        hashed = hash_password("correct_horse")
        assert verify_password("wrong_horse", hashed) is False

    def test_empty_password_does_not_match_nonempty_hash(self):
        hashed = hash_password("notempty")
        assert verify_password("", hashed) is False


# ---------------------------------------------------------------------------
# JWT blocklist
# ---------------------------------------------------------------------------

class TestJwtBlocklist:
    def test_is_token_blocked_unknown_jti_returns_false(self):
        assert is_token_blocked("definitely-not-added-jti-xyz") is False

    def test_blocklist_token_causes_is_blocked_true(self):
        jti = "test-jti-block-1"
        blocklist_token(jti)
        assert is_token_blocked(jti) is True

    def test_different_jti_not_affected(self):
        jti_a = "test-jti-block-a"
        jti_b = "test-jti-block-b"
        blocklist_token(jti_a)
        assert is_token_blocked(jti_b) is False

    def test_blocking_same_jti_twice_is_idempotent(self):
        jti = "test-jti-block-dup"
        blocklist_token(jti)
        blocklist_token(jti)
        assert is_token_blocked(jti) is True


# ---------------------------------------------------------------------------
# build_identity
# ---------------------------------------------------------------------------

class TestBuildIdentity:
    def _make_user(self, **kwargs):
        defaults = dict(
            patient_id=None,
            clinician_id=None,
            secretary_id=None,
            admin_id=None,
            first_name="Ada",
            last_name="Lovelace",
            login_email="ada@example.com",
        )
        defaults.update(kwargs)
        return SimpleNamespace(**defaults)

    def test_role_is_included(self):
        user = self._make_user(patient_id=1)
        identity = build_identity(user, "patient")
        assert identity["role"] == "patient"

    def test_patient_id_resolved(self):
        user = self._make_user(patient_id=42)
        identity = build_identity(user, "patient")
        assert identity["id"] == 42

    def test_clinician_id_resolved(self):
        user = self._make_user(clinician_id=7)
        identity = build_identity(user, "clinician")
        assert identity["id"] == 7

    def test_secretary_id_resolved(self):
        user = self._make_user(secretary_id=3)
        identity = build_identity(user, "secretary")
        assert identity["id"] == 3

    def test_admin_id_resolved(self):
        user = self._make_user(admin_id=99)
        identity = build_identity(user, "admin")
        assert identity["id"] == 99

    def test_email_included(self):
        user = self._make_user(patient_id=1)
        identity = build_identity(user, "patient")
        assert identity["email"] == "ada@example.com"

    def test_name_fields_included(self):
        user = self._make_user(patient_id=1)
        identity = build_identity(user, "patient")
        assert identity["first_name"] == "Ada"
        assert identity["last_name"] == "Lovelace"
