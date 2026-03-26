"""
appointment_service.py
----------------------
Business logic for appointment operations.

Pure functions — no route handling. DB-accessing functions require an active
Flask application context (called from within a request or app.app_context()).

Uses deferred imports inside functions to avoid circular references, consistent
with the pattern established in auth_service.py.
"""

_ACTIVE_STATUSES = ("pending", "accepted", "reschedule_requested")


def has_overlap(patient_id: int, candidate_slot, exclude_appointment_id=None) -> bool:
    """
    Return True if candidate_slot overlaps an existing active appointment for the patient.

    Parameters
    ----------
    patient_id : int
        Patient whose appointment history is checked.
    candidate_slot : ClinicianTimeslot ORM instance (or any object with
        start_time and end_time attributes of type datetime.time)
        The slot being proposed for a new booking or reschedule.
    exclude_appointment_id : int | None
        When provided, this appointment is excluded from the check. Used during
        reschedule-confirm so the appointment being rescheduled does not conflict
        with itself.

    Returns
    -------
    bool
        True  — an overlap exists; the booking should be rejected.
        False — no overlap; safe to proceed.

    Overlap definition (from CLAUDE.md)
    ------------------------------------
    Two slots overlap when NOT (A.end <= B.start OR B.end <= A.start).
    Touching boundaries are NOT considered overlapping:
      slot A ending at 14:00 and slot B starting at 14:00 → False (no overlap).

    Notes
    -----
    Time comparison only (start_time / end_time) — date is not included in the
    overlap test as documented. Slots on different dates that share a time range
    are treated as conflicting; this is intentional per the current design and
    can be revisited if the booking model evolves.
    """
    from app.models.appointment import Appointment

    query = Appointment.query.filter(
        Appointment.patient_id == patient_id,
        Appointment.status.in_(_ACTIVE_STATUSES),
    )
    if exclude_appointment_id is not None:
        query = query.filter(Appointment.appointment_id != exclude_appointment_id)

    for appt in query.all():
        b_start = appt.slot.start_time
        b_end = appt.slot.end_time
        # Overlap: NOT (A.end <= B.start OR B.end <= A.start)
        if not (candidate_slot.end_time <= b_start or b_end <= candidate_slot.start_time):
            return True

    return False
