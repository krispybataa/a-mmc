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
        db.session.commit()

    return len(new_slots)


def regenerate_slots_for_schedule_change(
    clinician_id: int,
    affected_day_of_week: str,
    from_date: date,
    to_date: date,
    slot_duration_minutes: int = 60,
) -> dict:
    """
    Handle schedule changes by removing orphaned slots and regenerating.

    Call this after a ClinicianSchedule row is modified (times changed or day
    toggled). It targets only future slots on the affected day of the week
    within the supplied date range.

    Algorithm
    ---------
    1. Fetch all existing future slots for (clinician, date_range, affected_day).
    2. Split into two buckets:
       - "safe" slots: status == "available" AND zero non-cancelled appointments
         → delete these; they are safe orphans (no patient impact)
       - "stuck" slots: have one or more active appointments
         (pending | accepted | reschedule_requested)
         → leave them untouched; return them for C/S to resolve manually
    3. Run generate_slots() for the affected range to produce slots matching
       the new schedule.
    4. Return a summary dict with counts and the list of stuck slots.

    Returns
    -------
    {
        "deleted": int,          # safe slots removed
        "created": int,          # new slots generated
        "stuck": [               # slots needing manual C/S action
            {
                "slot_id": int,
                "slot_date": str,
                "start_time": str,
                "end_time": str,
                "active_appointment_count": int,
            },
            ...
        ]
    }

    TODO: Implement this function before the schedule-edit endpoint (PATCH
    /api/clinicians/<id>/schedules/<schedule_id>) goes live. The route should
    call this and surface the "stuck" list to the C/S user so they know which
    appointments still need manual rescheduling.
    """
    raise NotImplementedError(
        "regenerate_slots_for_schedule_change() is not yet implemented. "
        "See the docstring for the full algorithm."
    )

