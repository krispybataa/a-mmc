"""
test_appointment_cancellation.py
---------------------------------
Regression coverage for B-CANCEL-1: cancellation_reason must be persisted in
its own column, not overloaded onto reschedule_reason (DELETE endpoint) or
silently dropped (PATCH endpoint).

Uses conftest.py's shared `flask_app`/`client` fixtures, like every other
DB-backed test should - there is exactly one place (conftest.flask_app) that
decides whether a database is safe to run create_all()/drop_all() against.
A second, independent copy of that check is what caused B-CANCEL-1's dev
database incident: it hardcoded "must be sqlite" and broke in CI, where the
disposable-but-real Postgres service is the legitimately safe database.

flask_app is module-scoped (one DB, shared by every test in this file), so
`booking()` gives each test its own uniquely-emailed patient/clinician to
avoid colliding on the login_email unique constraint.
"""

from datetime import date, time, timedelta
from unittest.mock import patch
from uuid import uuid4

import pytest
from flask_jwt_extended import create_access_token


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def booking(flask_app):
    """Creates a patient, clinician, future timeslot, and a pending appointment."""
    from app import db as _db
    from app.models.patient import Patient
    from app.models.clinician import Clinician, ClinicianTimeslot
    from app.models.appointment import Appointment

    unique = uuid4().hex[:10]
    patient = Patient(
        last_name="Dela Cruz", first_name="Juana", birthday=date(1990, 1, 1),
        gender="Female", mobile_number="09170000000",
        address_line_1="123 St", province="Metro Manila", city="Manila", barangay="Brgy 1",
        login_email=f"patient-{unique}@example.com", login_password_hash="x",
        educational_attainment="College",
    )
    clinician = Clinician(
        first_name="Jose", last_name="Rizal",
        login_email=f"clinician-{unique}@example.com", login_password_hash="x",
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


def _patient_auth_header(flask_app, patient):
    with flask_app.app_context():
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
    def test_cancel_reason_lands_in_its_own_column(self, mock_notice, flask_app, client, booking):
        from app import db as _db
        from app.models.appointment import Appointment

        appt = booking["appointment"]
        headers = _patient_auth_header(flask_app, booking["patient"])

        resp = client.delete(
            f"/api/appointments/{appt.appointment_id}",
            json={"cancellation_reason": "Feeling better, no longer needed."},
            headers=headers,
        )
        assert resp.status_code == 200

        with flask_app.app_context():
            refreshed = _db.session.get(Appointment, appt.appointment_id)
            assert refreshed.status == "cancelled"
            assert refreshed.cancellation_reason == "Feeling better, no longer needed."
            # Must NOT be stuffed into the unrelated reschedule_reason field
            assert refreshed.reschedule_reason is None

        # Email path should have been notified using the persisted appointment
        assert mock_notice.called

    @patch("app.routes.appointment_routes.send_cancellation_notice")
    def test_cancel_without_reason_is_rejected(self, mock_notice, flask_app, client, booking):
        appt = booking["appointment"]
        headers = _patient_auth_header(flask_app, booking["patient"])

        resp = client.delete(
            f"/api/appointments/{appt.appointment_id}",
            json={"cancellation_reason": "   "},
            headers=headers,
        )
        assert resp.status_code == 422
        mock_notice.assert_not_called()

    @patch("app.routes.appointment_routes.send_cancellation_notice")
    def test_serialized_appointment_exposes_cancellation_reason(self, mock_notice, flask_app, client, booking):
        appt = booking["appointment"]
        headers = _patient_auth_header(flask_app, booking["patient"])

        client.delete(
            f"/api/appointments/{appt.appointment_id}",
            json={"cancellation_reason": "Schedule conflict."},
            headers=headers,
        )

        resp = client.get(f"/api/appointments/{appt.appointment_id}", headers=headers)
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["cancellation_reason"] == "Schedule conflict."
