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
    The query is scoped to the same slot_date as the candidate slot via a JOIN
    on ClinicianTimeslot. Appointments on different calendar dates can never
    conflict regardless of time overlap.
    """
    from app.models.appointment import Appointment
    from app.models.clinician import ClinicianTimeslot

    query = (
        Appointment.query
        .join(ClinicianTimeslot, Appointment.slot_id == ClinicianTimeslot.slot_id)
        .filter(
            Appointment.patient_id == patient_id,
            Appointment.status.in_(_ACTIVE_STATUSES),
            ClinicianTimeslot.slot_date == candidate_slot.slot_date,
        )
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
