"""
conftest.py
-----------
Shared pytest fixtures for the Alagang MMC backend test suite.

Fixtures
--------
flask_app   (scope=module) — test Flask app with SQLite in-memory DB
client      (scope=module) — Flask test client bound to flask_app
make_slot                  — factory for SimpleNamespace ClinicianTimeslot-like objects
make_appointment           — factory for SimpleNamespace Appointment-like objects
"""

import pytest
from datetime import date, time
from types import SimpleNamespace


# ---------------------------------------------------------------------------
# Flask app + test client
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def flask_app():
    """
    A Flask application instance configured for testing.

    Uses SQLite in-memory — no real PostgreSQL connection required.
    Creates all tables before the first test in the module and drops them after.
    The application context is pushed for the duration of the module.
    """
    from app import create_app, db as _db

    _app = create_app("development")
    _app.config.update({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
        "JWT_SECRET_KEY": "test-secret-key",
        # Disable cookie security flags so test responses don't require HTTPS
        "JWT_COOKIE_SECURE": False,
    })

    with _app.app_context():
        _db.create_all()
        yield _app
        _db.drop_all()


@pytest.fixture(scope="module")
def client(flask_app):
    """Flask test client. Requires flask_app fixture."""
    return flask_app.test_client()


# ---------------------------------------------------------------------------
# Domain object factories
# These create plain SimpleNamespace objects — no DB required.
# ---------------------------------------------------------------------------

@pytest.fixture
def make_slot():
    """
    Factory for ClinicianTimeslot-like objects (SimpleNamespace).

    Usage:
        slot = make_slot(start_time=time(9, 0), end_time=time(10, 0))
        slot = make_slot(slot_id=2, clinician_id=5, status="blocked")
    """
    def _factory(
        slot_id: int = 1,
        clinician_id: int = 1,
        slot_date=None,
        start_time: time = time(9, 0),
        end_time: time = time(10, 0),
        status: str = "available",
        max_patients=None,
    ):
        return SimpleNamespace(
            slot_id=slot_id,
            clinician_id=clinician_id,
            slot_date=slot_date if slot_date is not None else date.today(),
            start_time=start_time,
            end_time=end_time,
            status=status,
            max_patients=max_patients,
        )
    return _factory


@pytest.fixture
def make_appointment():
    """
    Factory for Appointment-like objects (SimpleNamespace).

    Usage:
        appt = make_appointment(patient_id=1, slot=some_slot, status="pending")
    """
    def _factory(
        appointment_id: int = 1,
        patient_id: int = 1,
        clinician_id: int = 1,
        slot=None,
        status: str = "pending",
    ):
        return SimpleNamespace(
            appointment_id=appointment_id,
            patient_id=patient_id,
            clinician_id=clinician_id,
            slot=slot,
            status=status,
        )
    return _factory
