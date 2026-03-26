"""
timeslot_service.py
-------------------
Generates ClinicianTimeslot rows from a clinician's ClinicianSchedule.

Usage:
    from app.services.timeslot_service import generate_slots
    count = generate_slots(clinician_id=1, from_date=date(2026,3,24), to_date=date(2026,3,30))
"""

from datetime import date, datetime, timedelta

from app import db
from app.models.clinician import ClinicianSchedule, ClinicianTimeslot


# Map day name → Python weekday int (Monday=0 … Sunday=6)
_DAY_MAP = {
    "Monday": 0,
    "Tuesday": 1,
    "Wednesday": 2,
    "Thursday": 3,
    "Friday": 4,
    "Saturday": 5,
    "Sunday": 6,
}


def _time_to_minutes(t) -> int:
    """Convert a datetime.time (or timedelta from Postgres) to minutes since midnight."""
    if t is None:
        return None
    if isinstance(t, timedelta):
        return int(t.total_seconds() // 60)
    return t.hour * 60 + t.minute


def _minutes_to_time_str(minutes: int) -> str:
    """Convert minutes since midnight back to 'HH:MM:SS' string."""
    h, m = divmod(minutes, 60)
    return f"{h:02d}:{m:02d}:00"


def generate_slots(
    clinician_id: int,
    from_date: date,
    to_date: date,
    slot_duration_minutes: int = 60,
    commit: bool = True,
) -> int:
    """
    Generate ClinicianTimeslot rows for `clinician_id` between `from_date`
    and `to_date` (inclusive) based on their ClinicianSchedule.

    Slots that already exist for a given (clinician, date, start_time) are
    skipped to prevent duplicates.

    Returns the number of new slots created.
    """
    if from_date > to_date:
        raise ValueError("from_date must be on or before to_date")

    # Load this clinician's schedule rows, keyed by weekday int
    schedule_rows = ClinicianSchedule.query.filter_by(clinician_id=clinician_id).all()
    schedule_by_day: dict[int, ClinicianSchedule] = {
        _DAY_MAP[row.day_of_week]: row
        for row in schedule_rows
        if row.day_of_week in _DAY_MAP
    }

    if not schedule_by_day:
        return 0  # No schedule defined — nothing to generate

    # Fetch existing slot keys to avoid duplicates
    existing = ClinicianTimeslot.query.filter(
        ClinicianTimeslot.clinician_id == clinician_id,
        ClinicianTimeslot.slot_date >= from_date,
        ClinicianTimeslot.slot_date <= to_date,
    ).all()

    existing_keys: set[tuple] = {
        (s.slot_date, _minutes_to_time_str(_time_to_minutes(s.start_time)))
        for s in existing
    }

    new_slots: list[ClinicianTimeslot] = []
    current = from_date

    while current <= to_date:
        weekday = current.weekday()
        sched = schedule_by_day.get(weekday)

        if sched:
            # Generate slots for AM window and PM window independently
            for window_start_raw, window_end_raw in [
                (sched.am_start, sched.am_end),
                (sched.pm_start, sched.pm_end),
            ]:
                start_min = _time_to_minutes(window_start_raw)
                end_min = _time_to_minutes(window_end_raw)

                if start_min is None or end_min is None:
                    continue  # Window not defined for this day
                if start_min >= end_min:
                    continue  # Degenerate window — skip

                cursor = start_min
                while cursor + slot_duration_minutes <= end_min:
                    start_str = _minutes_to_time_str(cursor)
                    end_str = _minutes_to_time_str(cursor + slot_duration_minutes)

                    key = (current, start_str)
                    if key not in existing_keys:
                        new_slots.append(
                            ClinicianTimeslot(
                                clinician_id=clinician_id,
                                slot_date=current,
                                start_time=start_str,
                                end_time=end_str,
                                status="available",
                            )
                        )
                        existing_keys.add(key)

                    cursor += slot_duration_minutes

        current += timedelta(days=1)

    if new_slots:
        db.session.bulk_save_objects(new_slots)
        if commit:
            db.session.commit()

    return len(new_slots)


def _compute_expected_keys(
    clinician_id: int,
    from_date: date,
    to_date: date,
    slot_duration_minutes: int,
) -> set:
    """
    Derive the set of (slot_date, start_time_str) keys that SHOULD exist for a
    clinician given their current ClinicianSchedule, for dates in [from_date, to_date].

    This mirrors the key-derivation logic inside generate_slots() without
    creating any DB rows. Used by regenerate_slots_for_schedule_change() to
    identify orphaned slots after a schedule edit.
    """
    schedule_rows = ClinicianSchedule.query.filter_by(clinician_id=clinician_id).all()
    schedule_by_day: dict[int, ClinicianSchedule] = {
        _DAY_MAP[row.day_of_week]: row
        for row in schedule_rows
        if row.day_of_week in _DAY_MAP
    }

    expected: set[tuple] = set()
    current = from_date

    while current <= to_date:
        weekday = current.weekday()
        sched = schedule_by_day.get(weekday)
        if sched:
            for window_start_raw, window_end_raw in [
                (sched.am_start, sched.am_end),
                (sched.pm_start, sched.pm_end),
            ]:
                start_min = _time_to_minutes(window_start_raw)
                end_min = _time_to_minutes(window_end_raw)
                if start_min is None or end_min is None:
                    continue
                if start_min >= end_min:
                    continue
                cursor = start_min
                while cursor + slot_duration_minutes <= end_min:
                    expected.add((current, _minutes_to_time_str(cursor)))
                    cursor += slot_duration_minutes
        current += timedelta(days=1)

    return expected


def regenerate_slots_for_schedule_change(
    clinician_id: int,
    from_date: date,
    to_date: date,
    slot_duration_minutes: int = 60,
) -> dict:
    """
    Handle schedule changes by inserting new slots and removing orphaned ones.

    Call this after a ClinicianSchedule row is modified (times changed or day
    toggled). Operates over the full [from_date, to_date] range — all slots for
    the clinician in that window are checked against the updated schedule.

    Algorithm
    ---------
    1. Call generate_slots() with commit=False — inserts any new slots that match
       the updated schedule into the session (no commit yet).
    2. Derive the expected (slot_date, start_time_str) key set from the current
       ClinicianSchedule rows (post-edit values, visible via session autoflush).
    3. Query all ClinicianTimeslot rows for the clinician in [from_date, to_date].
       Any slot whose key is NOT in the expected set is an orphan.
    4. Classify orphans:
       - Stuck:       has one or more active appointments (pending | accepted |
                      reschedule_requested), regardless of slot status.
                      Left in place; returned in the result for C/S to resolve.
       - Safe orphan: status == "available" AND zero active appointments.
                      Deleted from the DB.
       - Blocked with no active appointments: left in place (C/S explicitly blocked it).
    5. Commit — a single commit covers both the generate_slots inserts and the
       safe orphan deletes (atomic with the schedule update if the caller flushed
       the schedule change before invoking this function).

    Transactional contract
    ----------------------
    This function wraps the full operation in a try/except:
      - On success: commits once and returns.
      - On failure: rolls back the session and re-raises.

    The schedule-edit route should flush the schedule update BEFORE calling this,
    so that generate_slots() queries the updated schedule values. The route must
    NOT commit before the call; the single commit here covers everything atomically.

    Returns
    -------
    {
        "deleted": int,     # count of safe orphans deleted
        "stuck": [          # slots needing manual C/S action before they can be removed
            {
                "slot_id": int,
                "slot_date": str,    # ISO date string
                "start_time": str,   # HH:MM
                "end_time": str,     # HH:MM
                "active_appointment_count": int,
            },
            ...
        ]
    }
    """
    _ACTIVE = ("pending", "accepted", "reschedule_requested")

    try:
        # Step 1: Insert new slots matching the updated schedule (no commit yet)
        generate_slots(clinician_id, from_date, to_date, slot_duration_minutes, commit=False)

        # Step 2: Derive expected keys from the current (post-edit) schedule
        expected_keys = _compute_expected_keys(
            clinician_id, from_date, to_date, slot_duration_minutes
        )

        # Step 3: Query all timeslots in range.
        # SQLAlchemy autoflushes before this query, so generate_slots inserts are visible.
        all_slots = ClinicianTimeslot.query.filter(
            ClinicianTimeslot.clinician_id == clinician_id,
            ClinicianTimeslot.slot_date >= from_date,
            ClinicianTimeslot.slot_date <= to_date,
        ).all()

        # Step 4: Identify orphans — slots whose key is no longer in the schedule
        orphans = [
            s for s in all_slots
            if (s.slot_date, _minutes_to_time_str(_time_to_minutes(s.start_time)))
            not in expected_keys
        ]

        # Step 5: Classify — deferred import avoids circular reference
        from app.models.appointment import Appointment

        safe_orphans: list = []
        stuck: list = []

        for slot in orphans:
            active_count = Appointment.query.filter(
                Appointment.slot_id == slot.slot_id,
                Appointment.status.in_(_ACTIVE),
            ).count()

            if active_count > 0:
                # Stuck: has active appointments — C/S must resolve manually
                stuck.append({
                    "slot_id": slot.slot_id,
                    "slot_date": str(slot.slot_date),
                    "start_time": _minutes_to_time_str(_time_to_minutes(slot.start_time))[:5],
                    "end_time": _minutes_to_time_str(_time_to_minutes(slot.end_time))[:5],
                    "active_appointment_count": active_count,
                })
            elif slot.status == "available":
                # Safe: available and no active appointments — delete
                safe_orphans.append(slot)
            # else: blocked with no active appointments — leave in place

        # Step 6: Delete safe orphans
        for orphan in safe_orphans:
            db.session.delete(orphan)

        # Step 7: Single commit — covers generate_slots inserts + orphan deletes
        # (and the caller's flushed schedule update if this is called from the route)
        db.session.commit()

        return {
            "deleted": len(safe_orphans),
            "stuck": stuck,
        }

    except Exception:
        db.session.rollback()
        raise

