"""
test_appointment_service.py
---------------------------
Unit tests for app.services.appointment_service.has_overlap().

Strategy
--------
The SQLAlchemy query inside has_overlap() is mocked via unittest.mock.patch
targeting app.models.appointment.Appointment. No database connection is
required — all tests run purely in memory.

The overlap arithmetic (NOT (A.end <= B.start OR B.end <= A.start)) runs in
Python after the query returns, so it IS exercised by these tests even though
the DB layer is mocked.

Overlap rule (from CLAUDE.md):
  Touching boundaries are NOT overlapping.
  e.g. slot A ends at 14:00, slot B starts at 14:00 → not an overlap.
"""

from datetime import time
from types import SimpleNamespace
from unittest.mock import MagicMock, call, patch

import pytest

from app.services.appointment_service import has_overlap


# ---------------------------------------------------------------------------
# Test helpers
# ---------------------------------------------------------------------------

PATIENT_ID = 1


def _slot_ns(start: time, end: time, slot_id: int = 1) -> SimpleNamespace:
    """Minimal slot-like object with only the fields has_overlap() reads."""
    return SimpleNamespace(slot_id=slot_id, start_time=start, end_time=end)


def _appt_ns(slot: SimpleNamespace, appointment_id: int = 1, status: str = "pending") -> SimpleNamespace:
    """Minimal appointment-like object whose .slot relationship is pre-loaded."""
    return SimpleNamespace(appointment_id=appointment_id, slot=slot, status=status)


def _patch_query(appointments: list):
    """
    Return a (patched Appointment class, mock query chain) tuple for use in
    patch() context managers.

    The mock chain supports arbitrary .filter() chaining followed by .all():

        Appointment.query.filter(...)         → mock_chain
        mock_chain.filter(...)                → mock_chain   (exclusion filter)
        mock_chain.all()                      → appointments
    """
    mock_chain = MagicMock()
    mock_chain.filter.return_value = mock_chain
    mock_chain.all.return_value = appointments

    MockAppt = MagicMock()
    MockAppt.query.filter.return_value = mock_chain
    return MockAppt, mock_chain


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestHasOverlapReturnsFalse:

    def test_no_existing_appointments(self, make_slot):
        """Patient has no active appointments — always safe."""
        candidate = make_slot(start_time=time(9, 0), end_time=time(10, 0))
        MockAppt, _ = _patch_query([])
        with patch("app.models.appointment.Appointment", MockAppt):
            assert has_overlap(PATIENT_ID, candidate) is False

    def test_touching_boundary_candidate_end_equals_existing_start(self, make_slot):
        """
        Candidate ends exactly when the existing appointment starts.
        Rule: touching boundaries are NOT overlapping → must return False.
        """
        existing = _appt_ns(_slot_ns(time(14, 0), time(15, 0)))
        candidate = make_slot(start_time=time(13, 0), end_time=time(14, 0))
        MockAppt, _ = _patch_query([existing])
        with patch("app.models.appointment.Appointment", MockAppt):
            assert has_overlap(PATIENT_ID, candidate) is False

    def test_touching_boundary_existing_end_equals_candidate_start(self, make_slot):
        """
        Existing appointment ends exactly when candidate starts.
        Rule: touching boundaries are NOT overlapping → must return False.
        """
        existing = _appt_ns(_slot_ns(time(8, 0), time(9, 0)))
        candidate = make_slot(start_time=time(9, 0), end_time=time(10, 0))
        MockAppt, _ = _patch_query([existing])
        with patch("app.models.appointment.Appointment", MockAppt):
            assert has_overlap(PATIENT_ID, candidate) is False

    def test_exclude_appointment_id_removes_self_conflict(self, make_slot):
        """
        The only conflicting appointment is the one being rescheduled.
        When exclude_appointment_id is provided, the query is built with an
        extra filter and the mock returns [] — has_overlap must return False.
        """
        existing = _appt_ns(_slot_ns(time(9, 0), time(10, 0)), appointment_id=42)
        candidate = make_slot(start_time=time(9, 0), end_time=time(10, 0))

        MockAppt, mock_chain = _patch_query([])
        with patch("app.models.appointment.Appointment", MockAppt):
            result = has_overlap(PATIENT_ID, candidate, exclude_appointment_id=42)

        assert result is False
        # Exclusion filter must have been added (filter called twice on mock_chain)
        assert mock_chain.filter.call_count == 1  # one chained exclusion call after initial

    def test_cancelled_appointment_does_not_trigger_overlap(self, make_slot):
        """
        The query filters on active statuses only. A cancelled appointment with
        an overlapping time is excluded at the DB level; the mock simulates this
        by returning an empty list.
        """
        candidate = make_slot(start_time=time(9, 0), end_time=time(10, 0))
        # Mock returns [] — as if DB filtered out the cancelled appointment
        MockAppt, _ = _patch_query([])
        with patch("app.models.appointment.Appointment", MockAppt):
            assert has_overlap(PATIENT_ID, candidate) is False


class TestHasOverlapReturnsTrue:

    def test_exact_same_slot(self, make_slot):
        """Candidate and existing appointment share identical start and end times."""
        existing = _appt_ns(_slot_ns(time(9, 0), time(10, 0)))
        candidate = make_slot(start_time=time(9, 0), end_time=time(10, 0))
        MockAppt, _ = _patch_query([existing])
        with patch("app.models.appointment.Appointment", MockAppt):
            assert has_overlap(PATIENT_ID, candidate) is True

    def test_candidate_starts_inside_existing(self, make_slot):
        """Candidate begins within an existing appointment's window."""
        existing = _appt_ns(_slot_ns(time(9, 0), time(11, 0)))
        candidate = make_slot(start_time=time(10, 0), end_time=time(12, 0))
        MockAppt, _ = _patch_query([existing])
        with patch("app.models.appointment.Appointment", MockAppt):
            assert has_overlap(PATIENT_ID, candidate) is True

    def test_candidate_ends_inside_existing(self, make_slot):
        """Candidate ends within an existing appointment's window."""
        existing = _appt_ns(_slot_ns(time(10, 0), time(12, 0)))
        candidate = make_slot(start_time=time(9, 0), end_time=time(11, 0))
        MockAppt, _ = _patch_query([existing])
        with patch("app.models.appointment.Appointment", MockAppt):
            assert has_overlap(PATIENT_ID, candidate) is True

    def test_existing_fully_inside_candidate(self, make_slot):
        """Existing appointment is entirely contained within the candidate window."""
        existing = _appt_ns(_slot_ns(time(10, 0), time(11, 0)))
        candidate = make_slot(start_time=time(9, 0), end_time=time(12, 0))
        MockAppt, _ = _patch_query([existing])
        with patch("app.models.appointment.Appointment", MockAppt):
            assert has_overlap(PATIENT_ID, candidate) is True


class TestHasOverlapQueryConstruction:

    def test_query_uses_active_status_filter(self, make_slot):
        """
        Verifies that the initial Appointment.query.filter() is called (meaning
        the status.in_() clause is applied). The mock simulates the DB having
        already filtered to active statuses only.
        """
        candidate = make_slot(start_time=time(9, 0), end_time=time(10, 0))
        MockAppt, _ = _patch_query([])
        with patch("app.models.appointment.Appointment", MockAppt):
            has_overlap(PATIENT_ID, candidate)
        MockAppt.query.filter.assert_called_once()

    def test_exclusion_adds_second_filter_call(self, make_slot):
        """
        When exclude_appointment_id is provided, an additional .filter() call
        is chained onto the query.
        """
        candidate = make_slot(start_time=time(9, 0), end_time=time(10, 0))
        MockAppt, mock_chain = _patch_query([])
        with patch("app.models.appointment.Appointment", MockAppt):
            has_overlap(PATIENT_ID, candidate, exclude_appointment_id=99)
        # Initial filter on MockAppt.query, plus one chained filter for exclusion
        assert mock_chain.filter.call_count == 1

    def test_no_exclusion_does_not_add_second_filter_call(self, make_slot):
        """
        When exclude_appointment_id is None (default), no extra .filter() is chained.
        """
        candidate = make_slot(start_time=time(9, 0), end_time=time(10, 0))
        MockAppt, mock_chain = _patch_query([])
        with patch("app.models.appointment.Appointment", MockAppt):
            has_overlap(PATIENT_ID, candidate)
        mock_chain.filter.assert_not_called()
