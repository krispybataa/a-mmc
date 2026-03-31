"""
test_timeslot_service.py
------------------------
Unit tests for regenerate_slots_for_schedule_change() in timeslot_service.py.

Strategy
--------
All SQLAlchemy queries and session operations are mocked. The Python-side logic
(orphan classification, stuck/safe bucketing, return dict construction) is
exercised directly. generate_slots() is patched to a no-op — it is tested
separately and its behavior is assumed correct here.

Mock targets:
  app.services.timeslot_service.generate_slots     — no-op
  app.services.timeslot_service.ClinicianSchedule  — schedule query
  app.services.timeslot_service.ClinicianTimeslot  — slot query
  app.models.appointment.Appointment               — active-count query
  app.services.timeslot_service.db                 — session (delete/commit/rollback)

Test date fixture: date(2026, 3, 30) is a Monday.
Mock schedule:     Monday am_start=09:00, am_end=10:00 (one 60-min slot expected)
Expected keys:     {(date(2026, 3, 30), "09:00:00")}
"""

from contextlib import contextmanager
from datetime import date, time
from types import SimpleNamespace
from unittest.mock import MagicMock, call, patch

import pytest
import random

from app.services.timeslot_service import regenerate_slots_for_schedule_change

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

CLINICIAN_ID = 1
FROM_DATE = date(2026, 3, 30)   # Monday
TO_DATE = date(2026, 3, 30)
DURATION = 60

# ---------------------------------------------------------------------------
# Test data factories
# ---------------------------------------------------------------------------

def _schedule_row(
    day_of_week="Monday",
    am_start=time(9, 0),
    am_end=time(10, 0),
    pm_start=None,
    pm_end=None,
    consultation_type=None,
):
    """Mock ClinicianSchedule row."""
    return SimpleNamespace(
        day_of_week=day_of_week,
        am_start=am_start,
        am_end=am_end,
        pm_start=pm_start,
        pm_end=pm_end,
        consultation_type=consultation_type
    )


def _slot(slot_id, start: time, end: time, status="available", consultation_type=None):
    """Mock ClinicianTimeslot row."""
    return SimpleNamespace(
        slot_id=slot_id,
        clinician_id=CLINICIAN_ID,
        slot_date=FROM_DATE,
        start_time=start,
        end_time=end,
        status=status,
        consultation_type=consultation_type
    )


# Known slots:
#   slot_in_schedule   → start=09:00, in expected keys → NOT an orphan
#   slot_orphan_safe   → start=10:00, NOT in expected keys, status=available, count=0
#   slot_orphan_stuck  → start=11:00, NOT in expected keys, count>0

SLOT_IN_SCHEDULE = _slot(1, time(9, 0), time(10, 0), status="available", consultation_type=random.choice(["f2f", "teleconsult"]))
SLOT_ORPHAN_SAFE = _slot(2, time(10, 0), time(11, 0), status="available", consultation_type=random.choice(["f2f", "teleconsult"]))
SLOT_ORPHAN_STUCK = _slot(3, time(11, 0), time(12, 0), status="available", consultation_type=random.choice(["f2f", "teleconsult"]))


# ---------------------------------------------------------------------------
# Mock context builder
# ---------------------------------------------------------------------------

@contextmanager
def _mocked(db_slots, active_counts_by_slot_id=None):
    """
    Context manager that patches all DB dependencies for one test run.

    Parameters
    ----------
    db_slots : list
        ClinicianTimeslot rows returned by the range query.
    active_counts_by_slot_id : dict | None
        Maps slot_id → active appointment count. Defaults to 0 for all.
    """
    if active_counts_by_slot_id is None:
        active_counts_by_slot_id = {}

    # --- Mock ClinicianSchedule ---
    MockSched = MagicMock()
    MockSched.query.filter_by.return_value.all.return_value = [_schedule_row()]

    # --- Mock ClinicianTimeslot ---
    MockSlot = MagicMock()
    MockSlot.query.filter.return_value.all.return_value = db_slots

    # --- Mock Appointment (active count per slot) ---
    MockAppt = MagicMock()
    # Each successive .count() call returns the count for the next orphan slot
    # encountered. Build the side_effect list in orphan-encounter order.
    # (We can't predict call order precisely, but tests control which slots
    # are orphans, so we can set up the right sequence.)

    def _count_side_effect(*_args, **_kwargs):
        # Called as .filter(...).count() — return a MagicMock with a count method
        return mock_count_chain

    mock_count_chain = MagicMock()

    # Build count return values for orphan slots in slot_id order
    orphan_ids = [
        s.slot_id for s in db_slots
        if s.slot_id != SLOT_IN_SCHEDULE.slot_id  # slot 1 is never an orphan in our fixture
    ]
    count_values = [active_counts_by_slot_id.get(sid, 0) for sid in orphan_ids]
    mock_count_chain.count.side_effect = count_values if count_values else None
    if not count_values:
        mock_count_chain.count.return_value = 0

    MockAppt.query.filter.return_value = mock_count_chain

    # --- Mock db.session ---
    mock_db = MagicMock()

    with (
        patch("app.services.timeslot_service.generate_slots"),
        patch("app.services.timeslot_service.ClinicianSchedule", MockSched),
        patch("app.services.timeslot_service.ClinicianTimeslot", MockSlot),
        patch("app.models.appointment.Appointment", MockAppt),
        patch("app.services.timeslot_service.db", mock_db),
    ):
        yield mock_db


# ---------------------------------------------------------------------------
# Test cases
# ---------------------------------------------------------------------------

class TestAllSafeOrphans:
    """All orphaned slots are safe → deleted, stuck list empty."""

    def test_deleted_count_correct(self):
        with _mocked([SLOT_IN_SCHEDULE, SLOT_ORPHAN_SAFE]):
            result = regenerate_slots_for_schedule_change(
                CLINICIAN_ID, FROM_DATE, TO_DATE, DURATION
            )
        assert result["deleted"] == 1

    def test_stuck_list_empty(self):
        with _mocked([SLOT_IN_SCHEDULE, SLOT_ORPHAN_SAFE]):
            result = regenerate_slots_for_schedule_change(
                CLINICIAN_ID, FROM_DATE, TO_DATE, DURATION
            )
        assert result["stuck"] == []

    def test_delete_called_for_safe_orphan(self):
        with _mocked([SLOT_IN_SCHEDULE, SLOT_ORPHAN_SAFE]) as mock_db:
            regenerate_slots_for_schedule_change(
                CLINICIAN_ID, FROM_DATE, TO_DATE, DURATION
            )
        mock_db.session.delete.assert_called_once_with(SLOT_ORPHAN_SAFE)

    def test_commit_called_once(self):
        with _mocked([SLOT_IN_SCHEDULE, SLOT_ORPHAN_SAFE]) as mock_db:
            regenerate_slots_for_schedule_change(
                CLINICIAN_ID, FROM_DATE, TO_DATE, DURATION
            )
        mock_db.session.commit.assert_called_once()


class TestAllStuckOrphans:
    """All orphaned slots are stuck → none deleted, all in stuck list, commit still called."""

    def test_deleted_count_zero(self):
        with _mocked([SLOT_IN_SCHEDULE, SLOT_ORPHAN_STUCK], {3: 2}):
            result = regenerate_slots_for_schedule_change(
                CLINICIAN_ID, FROM_DATE, TO_DATE, DURATION
            )
        assert result["deleted"] == 0

    def test_stuck_list_populated(self):
        with _mocked([SLOT_IN_SCHEDULE, SLOT_ORPHAN_STUCK], {3: 2}):
            result = regenerate_slots_for_schedule_change(
                CLINICIAN_ID, FROM_DATE, TO_DATE, DURATION
            )
        assert len(result["stuck"]) == 1
        entry = result["stuck"][0]
        assert entry["slot_id"] == 3
        assert entry["active_appointment_count"] == 2

    def test_stuck_entry_has_correct_time_strings(self):
        with _mocked([SLOT_IN_SCHEDULE, SLOT_ORPHAN_STUCK], {3: 1}):
            result = regenerate_slots_for_schedule_change(
                CLINICIAN_ID, FROM_DATE, TO_DATE, DURATION
            )
        entry = result["stuck"][0]
        assert entry["start_time"] == "11:00"
        assert entry["end_time"] == "12:00"
        assert entry["slot_date"] == str(FROM_DATE)

    def test_delete_not_called(self):
        with _mocked([SLOT_IN_SCHEDULE, SLOT_ORPHAN_STUCK], {3: 1}) as mock_db:
            regenerate_slots_for_schedule_change(
                CLINICIAN_ID, FROM_DATE, TO_DATE, DURATION
            )
        mock_db.session.delete.assert_not_called()

    def test_commit_still_called(self):
        """Commit must run even when there are no deletions."""
        with _mocked([SLOT_IN_SCHEDULE, SLOT_ORPHAN_STUCK], {3: 1}) as mock_db:
            regenerate_slots_for_schedule_change(
                CLINICIAN_ID, FROM_DATE, TO_DATE, DURATION
            )
        mock_db.session.commit.assert_called_once()


class TestMixedOrphans:
    """Some orphans are safe, some are stuck — only safe ones deleted."""

    def test_deleted_count_is_only_safe(self):
        with _mocked(
            [SLOT_IN_SCHEDULE, SLOT_ORPHAN_SAFE, SLOT_ORPHAN_STUCK],
            {2: 0, 3: 1},
        ):
            result = regenerate_slots_for_schedule_change(
                CLINICIAN_ID, FROM_DATE, TO_DATE, DURATION
            )
        assert result["deleted"] == 1

    def test_stuck_list_contains_only_stuck(self):
        with _mocked(
            [SLOT_IN_SCHEDULE, SLOT_ORPHAN_SAFE, SLOT_ORPHAN_STUCK],
            {2: 0, 3: 1},
        ):
            result = regenerate_slots_for_schedule_change(
                CLINICIAN_ID, FROM_DATE, TO_DATE, DURATION
            )
        assert len(result["stuck"]) == 1
        assert result["stuck"][0]["slot_id"] == 3

    def test_delete_called_only_for_safe(self):
        with _mocked(
            [SLOT_IN_SCHEDULE, SLOT_ORPHAN_SAFE, SLOT_ORPHAN_STUCK],
            {2: 0, 3: 1},
        ) as mock_db:
            regenerate_slots_for_schedule_change(
                CLINICIAN_ID, FROM_DATE, TO_DATE, DURATION
            )
        mock_db.session.delete.assert_called_once_with(SLOT_ORPHAN_SAFE)


class TestNoOrphans:
    """No orphaned slots → deleted=0, stuck=[], commit called."""

    def test_returns_zero_deleted(self):
        with _mocked([SLOT_IN_SCHEDULE]):
            result = regenerate_slots_for_schedule_change(
                CLINICIAN_ID, FROM_DATE, TO_DATE, DURATION
            )
        assert result["deleted"] == 0
        assert result["stuck"] == []

    def test_delete_not_called(self):
        with _mocked([SLOT_IN_SCHEDULE]) as mock_db:
            regenerate_slots_for_schedule_change(
                CLINICIAN_ID, FROM_DATE, TO_DATE, DURATION
            )
        mock_db.session.delete.assert_not_called()

    def test_commit_called(self):
        with _mocked([SLOT_IN_SCHEDULE]) as mock_db:
            regenerate_slots_for_schedule_change(
                CLINICIAN_ID, FROM_DATE, TO_DATE, DURATION
            )
        mock_db.session.commit.assert_called_once()


class TestOrphanClassificationEdgeCases:

    def test_available_slot_with_active_appointments_is_stuck(self):
        """
        A slot with status="available" but active appointments is STUCK, not safe.
        Active appointments take precedence over slot status.
        """
        # SLOT_ORPHAN_SAFE has status="available" — but we give it an active appointment
        with _mocked([SLOT_IN_SCHEDULE, SLOT_ORPHAN_SAFE], {2: 1}):
            result = regenerate_slots_for_schedule_change(
                CLINICIAN_ID, FROM_DATE, TO_DATE, DURATION
            )
        assert result["deleted"] == 0
        assert len(result["stuck"]) == 1
        assert result["stuck"][0]["slot_id"] == 2

    def test_blocked_slot_with_no_appointments_is_left_in_place(self):
        """
        A blocked slot with zero active appointments is neither safe nor stuck —
        it is left in place (C/S explicitly blocked it).
        """
        slot_blocked_orphan = _slot(4, time(10, 0), time(11, 0), status="blocked")
        with _mocked([SLOT_IN_SCHEDULE, slot_blocked_orphan], {4: 0}):
            result = regenerate_slots_for_schedule_change(
                CLINICIAN_ID, FROM_DATE, TO_DATE, DURATION
            )
        assert result["deleted"] == 0   # not deleted
        assert result["stuck"] == []    # not stuck


class TestTransactionalBehavior:

    def test_exception_during_delete_triggers_rollback(self):
        """
        If db.session.delete() raises, rollback must be called and the exception
        must propagate to the caller.
        """
        with _mocked([SLOT_IN_SCHEDULE, SLOT_ORPHAN_SAFE]) as mock_db:
            mock_db.session.delete.side_effect = RuntimeError("DB constraint violated")
            with pytest.raises(RuntimeError, match="DB constraint violated"):
                regenerate_slots_for_schedule_change(
                    CLINICIAN_ID, FROM_DATE, TO_DATE, DURATION
                )
            mock_db.session.rollback.assert_called_once()

    def test_exception_during_delete_does_not_commit(self):
        """If an exception occurs, commit must NOT be called."""
        with _mocked([SLOT_IN_SCHEDULE, SLOT_ORPHAN_SAFE]) as mock_db:
            mock_db.session.delete.side_effect = RuntimeError("failure")
            with pytest.raises(RuntimeError):
                regenerate_slots_for_schedule_change(
                    CLINICIAN_ID, FROM_DATE, TO_DATE, DURATION
                )
            mock_db.session.commit.assert_not_called()

    def test_exception_during_commit_triggers_rollback(self):
        """If db.session.commit() itself raises, rollback must be called."""
        with _mocked([SLOT_IN_SCHEDULE]) as mock_db:
            mock_db.session.commit.side_effect = RuntimeError("commit failed")
            with pytest.raises(RuntimeError, match="commit failed"):
                regenerate_slots_for_schedule_change(
                    CLINICIAN_ID, FROM_DATE, TO_DATE, DURATION
                )
            mock_db.session.rollback.assert_called_once()
