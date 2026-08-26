"""
conftest.py
-----------
Shared pytest fixtures for the Alagang MMC backend test suite.

Fixtures
--------
flask_app   (scope=module) — test Flask app bound to a disposable database
client      (scope=module) — Flask test client bound to flask_app
make_slot                  — factory for SimpleNamespace ClinicianTimeslot-like objects
make_appointment           — factory for SimpleNamespace Appointment-like objects

This is the ONLY place that decides whether a database is safe to run
create_all()/drop_all() against - see the assertion inside flask_app().
Tests that need DB-backed fixtures must depend on flask_app/client rather
than building their own app instance; a second implementation of that
safety check is how B-CANCEL-1's dev-database incident happened.
"""

import pytest
from datetime import date, time
from types import SimpleNamespace
from dotenv import load_dotenv
import os

load_dotenv()

# BaseConfig.SQLALCHEMY_DATABASE_URI is resolved from ACTIONS_TEST_DATABASE_URL
# at import time (config/BaseConfig.py), before create_app() ever runs - so it
# MUST be set here, before `app`/`config` are imported anywhere in this process.
# Setting app.config["SQLALCHEMY_DATABASE_URI"] on the Flask app *after* the
# fact does NOT work: Flask-SQLAlchemy 3.x builds its engine eagerly inside
# db.init_app() (called from create_app()), so a late override is silently
# ignored and create_all()/drop_all() run against whatever real database
# BaseConfig originally pointed at (e.g. the dev Postgres container).
os.environ.setdefault("ACTIONS_TEST_DATABASE_URL", "sqlite:///:memory:")

# ---------------------------------------------------------------------------
# Flask app + test client
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def flask_app():
    """
    A Flask application instance configured for testing.

    Bound to a disposable database - in-memory SQLite locally (the default
    set above), or CI's throwaway per-run Postgres service, whichever
    ACTIONS_TEST_DATABASE_URL resolves to. Creates all tables before the
    first test in the module and drops them after. The application context
    is pushed for the duration of the module.
    """
    from app import create_app, db as _db

    _app = create_app("development")
    _app.config.update({
        "TESTING": True,
        "JWT_SECRET_KEY": os.environ.get("JWT_SECRET_KEY") or "test-secret-key-at-least-32-bytes-long",
        # Disable cookie security flags so test responses don't require HTTPS
        "JWT_COOKIE_SECURE": False,
    })

    # Safety net: confirm the ACTIONS_TEST_DATABASE_URL override actually
    # took effect, rather than trusting it blindly. "Safe" isn't "sqlite
    # specifically" - it's "whatever disposable DB this environment set via
    # ACTIONS_TEST_DATABASE_URL, as opposed to BaseConfig's PG*-based
    # fallback to the real dev database". That fallback silently taking over
    # is exactly how the B-CANCEL-1 incident happened.
    expected_uri = os.environ["ACTIONS_TEST_DATABASE_URL"]
    actual_uri = _app.config["SQLALCHEMY_DATABASE_URI"]
    assert actual_uri == expected_uri, (
        "Refusing to run flask_app fixture (create_all/drop_all) against a "
        f"database that isn't the ACTIONS_TEST_DATABASE_URL override: "
        f"got {actual_uri!r}, expected {expected_uri!r}"
    )

    with _app.app_context():
        _db.create_all()
        yield _app
        # A request or test can leave its scoped session's transaction open
        # (e.g. a lazy-loaded relationship SELECT that never got committed
        # or rolled back). Against Postgres, drop_all() then blocks
        # indefinitely on the ACCESS EXCLUSIVE lock it needs - it doesn't
        # error, it just hangs forever waiting on that other session.
        # session.remove() closes/rolls back any such leftover session first.
        _db.session.remove()
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
        consultation_type=None,
    ):
        return SimpleNamespace(
            slot_id=slot_id,
            clinician_id=clinician_id,
            slot_date=slot_date if slot_date is not None else date.today(),
            start_time=start_time,
            end_time=end_time,
            status=status,
            max_patients=max_patients,
            consultation_type=consultation_type,
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
