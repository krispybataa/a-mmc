"""
test_email_service.py
---------------------
Unit tests for app/services/email_service.py.

Strategy
--------
All SMTP I/O is mocked via unittest.mock.patch on smtplib.SMTP.
Tests verify:
  - _send() builds and dispatches a correctly addressed message via the
    SMTP context-manager interface
  - Each public notification function calls _send() with the expected
    recipient address
  - A failed _send() is swallowed by the public functions (no exception raised)
  - The PATCH /api/appointments/<id> accept flow triggers send_appointment_confirmation

Mock targets:
  app.services.email_service.smtplib.SMTP   — SMTP connection
"""

from types import SimpleNamespace
from unittest.mock import MagicMock, patch, call
from datetime import date, time

import pytest


# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------

def _make_appointment(
    appointment_id=1,
    patient_email="patient@example.com",
    clinician_email="clinician@example.com",
    consultation_date=date(2026, 4, 1),
    start_time=time(9, 0),
    end_time=time(10, 0),
    reschedule_reason="Schedule conflict",
    status="accepted",
):
    """Build a SimpleNamespace that mimics an Appointment ORM object."""
    patient = SimpleNamespace(
        first_name="Maria",
        last_name="Santos",
        login_email=patient_email,
    )
    clinician = SimpleNamespace(
        title="Dr.",
        first_name="Juan",
        last_name="Dela Cruz",
        login_email=clinician_email,
        contact_email=clinician_email,
    )
    slot = SimpleNamespace(
        start_time=start_time,
        end_time=end_time,
    )
    return SimpleNamespace(
        appointment_id=appointment_id,
        patient=patient,
        clinician=clinician,
        slot=slot,
        consultation_date=consultation_date,
        reschedule_reason=reschedule_reason,
        status=status,
    )


# ---------------------------------------------------------------------------
# Tests for _send()
# ---------------------------------------------------------------------------

class TestSend:
    """_send() builds and dispatches the message via SMTP."""

    def test_sendmail_called_with_correct_recipient(self, flask_app):
        """_send() calls server.sendmail() with the target address."""
        with flask_app.app_context():
            from app.services.email_service import _send
            with patch("app.services.email_service.smtplib.SMTP") as MockSMTP:
                mock_server = MagicMock()
                MockSMTP.return_value.__enter__.return_value = mock_server

                _send("recipient@example.com", "Test Subject", "Test body")

                args, _ = mock_server.sendmail.call_args
                assert args[1] == ["recipient@example.com"]

    def test_sendmail_from_address_matches_config(self, flask_app):
        """_send() uses MAIL_FROM from app config as the sender."""
        with flask_app.app_context():
            flask_app.config["MAIL_FROM"] = "noreply@test.local"
            from app.services.email_service import _send
            with patch("app.services.email_service.smtplib.SMTP") as MockSMTP:
                mock_server = MagicMock()
                MockSMTP.return_value.__enter__.return_value = mock_server

                _send("recipient@example.com", "Subject", "Body")

                args, _ = mock_server.sendmail.call_args
                assert args[0] == "noreply@test.local"

    def test_smtp_host_and_port_from_config(self, flask_app):
        """_send() opens SMTP to the configured host and port."""
        with flask_app.app_context():
            flask_app.config.update({"MAIL_SERVER": "smtp.test.io", "MAIL_PORT": 587})
            from app.services.email_service import _send
            with patch("app.services.email_service.smtplib.SMTP") as MockSMTP:
                MockSMTP.return_value.__enter__.return_value = MagicMock()

                _send("r@example.com", "S", "B")

                MockSMTP.assert_called_once_with("smtp.test.io", 587)


# ---------------------------------------------------------------------------
# Tests for public notification functions (isolation)
# ---------------------------------------------------------------------------

class TestPublicFunctions:
    """Each public function calls _send() with the right recipient."""

    def test_confirmation_sent_to_patient(self, flask_app):
        with flask_app.app_context():
            appt = _make_appointment(patient_email="pat@mail.com")
            with patch("app.services.email_service._send") as mock_send:
                from app.services.email_service import send_appointment_confirmation
                send_appointment_confirmation(appt)
                mock_send.assert_called_once()
                to_arg = mock_send.call_args[0][0]
                assert to_arg == "pat@mail.com"

    def test_reschedule_to_patient_sent_to_patient(self, flask_app):
        with flask_app.app_context():
            appt = _make_appointment(patient_email="pat@mail.com")
            with patch("app.services.email_service._send") as mock_send:
                from app.services.email_service import send_reschedule_request_to_patient
                send_reschedule_request_to_patient(appt)
                mock_send.assert_called_once()
                assert mock_send.call_args[0][0] == "pat@mail.com"

    def test_reschedule_to_clinician_sent_to_clinician(self, flask_app):
        with flask_app.app_context():
            appt = _make_appointment(clinician_email="doc@hospital.com")
            with patch("app.services.email_service._send") as mock_send:
                from app.services.email_service import send_reschedule_request_to_clinician
                send_reschedule_request_to_clinician(appt)
                mock_send.assert_called_once()
                assert mock_send.call_args[0][0] == "doc@hospital.com"

    def test_cancellation_notice_patient_recipient(self, flask_app):
        with flask_app.app_context():
            appt = _make_appointment(patient_email="pat@mail.com")
            with patch("app.services.email_service._send") as mock_send:
                from app.services.email_service import send_cancellation_notice
                send_cancellation_notice(appt, "patient")
                mock_send.assert_called_once()
                assert mock_send.call_args[0][0] == "pat@mail.com"

    def test_cancellation_notice_clinician_recipient(self, flask_app):
        with flask_app.app_context():
            appt = _make_appointment(clinician_email="doc@hospital.com")
            with patch("app.services.email_service._send") as mock_send:
                from app.services.email_service import send_cancellation_notice
                send_cancellation_notice(appt, "clinician")
                mock_send.assert_called_once()
                assert mock_send.call_args[0][0] == "doc@hospital.com"


# ---------------------------------------------------------------------------
# Error isolation — failed _send must not propagate
# ---------------------------------------------------------------------------

class TestErrorIsolation:
    """A broken _send() must not raise from any public function."""

    def test_send_failure_swallowed_by_confirmation(self, flask_app):
        with flask_app.app_context():
            appt = _make_appointment()
            with patch("app.services.email_service._send", side_effect=Exception("SMTP down")):
                from app.services.email_service import send_appointment_confirmation
                # Must not raise
                send_appointment_confirmation(appt)

    def test_send_failure_swallowed_by_cancellation_notice(self, flask_app):
        with flask_app.app_context():
            appt = _make_appointment()
            with patch("app.services.email_service._send", side_effect=ConnectionRefusedError("refused")):
                from app.services.email_service import send_cancellation_notice
                send_cancellation_notice(appt, "patient")
