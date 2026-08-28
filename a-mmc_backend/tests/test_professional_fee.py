"""
test_professional_fee.py
------------------------
Coverage for FB-STAFF-1:

  * A new appointment snapshots the clinician's current professional_fee at
    booking time - it is NOT a live join, so a later change to the clinician's
    default must not alter an existing appointment.
  * The per-appointment fee is editable by clinician/secretary via PATCH, and
    rejected for patients (same role gate as marking an appointment "done").
  * additional_request (the merged "Additional Request"/"Other Requests" field)
    is persisted at booking and exposed by the serializer.

Uses conftest.py's shared `flask_app`/`client` fixtures - the single place that
decides whether a database is safe for create_all()/drop_all() (see B-CANCEL-1).
"""

from datetime import date, time, timedelta
from decimal import Decimal
from unittest.mock import patch
from uuid import uuid4

import pytest
from flask_jwt_extended import create_access_token


@pytest.fixture
def booking(flask_app):
    """A patient, a clinician with a default fee, and a future available slot."""
    from app import db as _db
    from app.models.patient import Patient
    from app.models.clinician import Clinician, ClinicianTimeslot

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
        professional_fee=Decimal("800.00"),
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
        consultation_type="f2f",
    )
    _db.session.add(slot)
    _db.session.commit()

    return {"patient": patient, "clinician": clinician, "slot": slot, "date": future_date}


def _auth_header(flask_app, *, user_id, role, first_name="X", last_name="Y", email="x@example.com"):
    with flask_app.app_context():
        token = create_access_token(
            identity=str(user_id),
            additional_claims={
                "user": {"id": user_id, "role": role, "first_name": first_name,
                         "last_name": last_name, "email": email},
                "role": role,
            },
        )
    return {"Authorization": f"Bearer {token}"}


def _book(client, headers, booking, **overrides):
    payload = {
        "patient_id": booking["patient"].patient_id,
        "clinician_id": booking["clinician"].clinician_id,
        "slot_id": booking["slot"].slot_id,
        "consultation_date": str(booking["date"]),
        "consultation_type": "f2f",
        "chief_complaint": "Headache",
    }
    payload.update(overrides)
    return client.post("/api/appointments/", json=payload, headers=headers)


class TestProfessionalFeeSnapshot:

    def test_booking_snapshots_current_clinician_fee(self, flask_app, client, booking):
        from app import db as _db
        from app.models.appointment import Appointment

        headers = _auth_header(flask_app, user_id=booking["patient"].patient_id, role="patient")
        resp = _book(client, headers, booking)
        assert resp.status_code == 201

        appt_id = resp.get_json()["appointment_id"]
        with flask_app.app_context():
            appt = _db.session.get(Appointment, appt_id)
            assert appt.professional_fee == Decimal("800.00")

    def test_snapshot_is_frozen_when_clinician_changes_default_later(self, flask_app, client, booking):
        from app import db as _db
        from app.models.appointment import Appointment
        from app.models.clinician import Clinician

        headers = _auth_header(flask_app, user_id=booking["patient"].patient_id, role="patient")
        appt_id = _book(client, headers, booking).get_json()["appointment_id"]

        with flask_app.app_context():
            clinician = _db.session.get(Clinician, booking["clinician"].clinician_id)
            clinician.professional_fee = Decimal("1500.00")
            _db.session.commit()

            appt = _db.session.get(Appointment, appt_id)
            assert appt.professional_fee == Decimal("800.00")  # unchanged

    def test_serializer_exposes_fee_as_number(self, flask_app, client, booking):
        headers = _auth_header(flask_app, user_id=booking["patient"].patient_id, role="patient")
        appt_id = _book(client, headers, booking).get_json()["appointment_id"]

        body = client.get(f"/api/appointments/{appt_id}", headers=headers).get_json()
        assert body["professional_fee"] == 800.0


class TestProfessionalFeePatch:

    def test_clinician_can_adjust_fee(self, flask_app, client, booking):
        from app import db as _db
        from app.models.appointment import Appointment

        pat_headers = _auth_header(flask_app, user_id=booking["patient"].patient_id, role="patient")
        appt_id = _book(client, pat_headers, booking).get_json()["appointment_id"]

        clin_headers = _auth_header(
            flask_app, user_id=booking["clinician"].clinician_id, role="clinician"
        )
        resp = client.patch(
            f"/api/appointments/{appt_id}",
            json={"professional_fee": 950.5},
            headers=clin_headers,
        )
        assert resp.status_code == 200

        with flask_app.app_context():
            appt = _db.session.get(Appointment, appt_id)
            assert appt.professional_fee == Decimal("950.50")

    def test_patient_cannot_adjust_fee(self, flask_app, client, booking):
        pat_headers = _auth_header(flask_app, user_id=booking["patient"].patient_id, role="patient")
        appt_id = _book(client, pat_headers, booking).get_json()["appointment_id"]

        resp = client.patch(
            f"/api/appointments/{appt_id}",
            json={"professional_fee": 1.0},
            headers=pat_headers,
        )
        assert resp.status_code == 403

    def test_negative_fee_is_rejected(self, flask_app, client, booking):
        pat_headers = _auth_header(flask_app, user_id=booking["patient"].patient_id, role="patient")
        appt_id = _book(client, pat_headers, booking).get_json()["appointment_id"]

        clin_headers = _auth_header(
            flask_app, user_id=booking["clinician"].clinician_id, role="clinician"
        )
        resp = client.patch(
            f"/api/appointments/{appt_id}",
            json={"professional_fee": -5},
            headers=clin_headers,
        )
        assert resp.status_code == 422


class TestAdditionalRequest:

    def test_additional_request_persisted_and_serialized(self, flask_app, client, booking):
        headers = _auth_header(flask_app, user_id=booking["patient"].patient_id, role="patient")
        resp = _book(client, headers, booking, additional_request="Need a wheelchair ramp.")
        assert resp.status_code == 201

        appt_id = resp.get_json()["appointment_id"]
        body = client.get(f"/api/appointments/{appt_id}", headers=headers).get_json()
        assert body["additional_request"] == "Need a wheelchair ramp."
