"""
test_appointment_cancellation.py
---------------------------------
Regression coverage for B-CANCEL-1: cancellation_reason must be persisted in
its own column, not overloaded onto reschedule_reason (DELETE endpoint) or
silently dropped (PATCH endpoint).

Uses its own function-scoped app/db fixture (fresh in-memory SQLite per test)
rather than conftest.py's module-scoped `flask_app`/`client`, since these
tests reuse the same patient/clinician login_email across cases and a shared
module-scoped DB would collide on the unique constraint.

Database isolation itself relies on conftest.py pinning
ACTIONS_TEST_DATABASE_URL to sqlite before `app`/`config` are first imported
in this process (see the comment there) - BaseConfig.SQLALCHEMY_DATABASE_URI
is resolved once, at import time, so it cannot be safely overridden per-test
via app.config.update() after the fact. The assertion below is a safety net
in case that ever regresses.
"""

from datetime import date, time, timedelta
from unittest.mock import patch

import pytest
from flask_jwt_extended import create_access_token


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def app():
    from app import create_app, db as _db

    _app = create_app("development")
    _app.config.update({
        "TESTING": True,
        "JWT_SECRET_KEY": "test-secret-key-at-least-32-bytes-long",
        "JWT_COOKIE_SECURE": False,
    })

    uri = _app.config["SQLALCHEMY_DATABASE_URI"]
    assert uri and uri.startswith("sqlite"), (
        f"Refusing to run against non-sqlite database: {uri!r}"
    )

    with _app.app_context():
        _db.create_all()
        yield _app
        _db.session.remove()
        _db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def booking(app):
    """Creates a patient, clinician, future timeslot, and a pending appointment."""
    from app import db as _db
    from app.models.patient import Patient
    from app.models.clinician import Clinician, ClinicianTimeslot
    from app.models.appointment import Appointment

    patient = Patient(
        last_name="Dela Cruz", first_name="Juana", birthday=date(1990, 1, 1),
        gender="Female", mobile_number="09170000000",
        address_line_1="123 St", province="Metro Manila", city="Manila", barangay="Brgy 1",
        login_email="patient@example.com", login_password_hash="x",
        educational_attainment="College",
    )
    clinician = Clinician(
        first_name="Jose", last_name="Rizal",
        login_email="clinician@example.com", login_password_hash="x",
    )
    _db.session.add_all([patient, clinician])
    _db.session.commit()

    future_date = date.today() + timedelta(days=3)
    slot = ClinicianTimeslot(
        clinician_id=clinician.clinician_id,
        slot_date=future_date,
        start_time=time(9, 0),
        end_time=time(10, 0),
        status="available",
    )
    _db.session.add(slot)
    _db.session.commit()

    appt = Appointment(
        patient_id=patient.patient_id,
        clinician_id=clinician.clinician_id,
        slot_id=slot.slot_id,
        consultation_date=future_date,
        status="pending",
    )
    _db.session.add(appt)
    _db.session.commit()

    return {"patient": patient, "clinician": clinician, "slot": slot, "appointment": appt}


def _patient_auth_header(app, patient):
    with app.app_context():
        token = create_access_token(
            identity=str(patient.patient_id),
            additional_claims={
                "user": {
                    "id": patient.patient_id,
                    "role": "patient",
                    "first_name": patient.first_name,
                    "last_name": patient.last_name,
                    "email": patient.login_email,
                },
                "role": "patient",
            },
        )
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# DELETE /appointments/<id> - cancel_appointment
# ---------------------------------------------------------------------------

class TestCancelAppointmentPersistsReason:

    @patch("app.routes.appointment_routes.send_cancellation_notice")
    def test_cancel_reason_lands_in_its_own_column(self, mock_notice, app, client, booking):
        from app import db as _db
        from app.models.appointment import Appointment

        appt = booking["appointment"]
        headers = _patient_auth_header(app, booking["patient"])

        resp = client.delete(
            f"/api/appointments/{appt.appointment_id}",
            json={"cancellation_reason": "Feeling better, no longer needed."},
            headers=headers,
        )
        assert resp.status_code == 200

        with app.app_context():
            refreshed = _db.session.get(Appointment, appt.appointment_id)
            assert refreshed.status == "cancelled"
            assert refreshed.cancellation_reason == "Feeling better, no longer needed."
            # Must NOT be stuffed into the unrelated reschedule_reason field
            assert refreshed.reschedule_reason is None

        # Email path should have been notified using the persisted appointment
        assert mock_notice.called

    @patch("app.routes.appointment_routes.send_cancellation_notice")
    def test_cancel_without_reason_is_rejected(self, mock_notice, app, client, booking):
        appt = booking["appointment"]
        headers = _patient_auth_header(app, booking["patient"])

        resp = client.delete(
            f"/api/appointments/{appt.appointment_id}",
            json={"cancellation_reason": "   "},
            headers=headers,
        )
        assert resp.status_code == 422
        mock_notice.assert_not_called()

    @patch("app.routes.appointment_routes.send_cancellation_notice")
    def test_serialized_appointment_exposes_cancellation_reason(self, mock_notice, app, client, booking):
        appt = booking["appointment"]
        headers = _patient_auth_header(app, booking["patient"])

        client.delete(
            f"/api/appointments/{appt.appointment_id}",
            json={"cancellation_reason": "Schedule conflict."},
            headers=headers,
        )

        resp = client.get(f"/api/appointments/{appt.appointment_id}", headers=headers)
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["cancellation_reason"] == "Schedule conflict."
