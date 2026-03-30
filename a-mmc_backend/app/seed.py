from app import create_app, db
from app.models.clinician import (
    Clinician,
    ClinicianSchedule,
    ClinicianHMO,
    ClinicianInfo,
    ClinicianTimeslot
)

from datetime import time, date, timedelta
from app.services.auth_service import hash_password

from app.models.patient import Patient
from app.models.secretary import Secretary, SecretaryClinicianLink
from app.models.appointment import Appointment
from app.services.timeslot_service import generate_slots

# =====================================================
# DB SEEDING
# =====================================================

def seed_clinicians():
    clinicians = [
        Clinician(
            title="Dr.",
            first_name="Juan",
            middle_name="Santos",
            last_name="Dela Cruz",
            suffix="MD",
            department="Cardiology",
            specialty="Heart Specialist",
            local_number="101",
            room_number="Rm 201",
            contact_phone="09171234567",
            contact_email="juan.delacruz@hospital.com",
            login_email="juan.delacruz@portal.com",
            login_password_hash=hash_password("password123")
        ),
        Clinician(
            title="Dr.",
            first_name="Maria",
            middle_name="Lopez",
            last_name="Reyes",
            suffix="MD",
            department="Pediatrics",
            specialty="Child Specialist",
            local_number="102",
            room_number="Rm 202",
            contact_phone="09179876543",
            contact_email="maria.reyes@hospital.com",
            login_email="maria.reyes@portal.com",
            login_password_hash=hash_password("password123")
        )
    ]

    db.session.add_all(clinicians)
    db.session.commit()
    return clinicians


def seed_schedules(clinicians):
    schedules = [
        ClinicianSchedule(
            clinician_id=clinicians[0].clinician_id,
            day_of_week="Monday",
            am_start=time(9, 0),
            am_end=time(12, 0),
            pm_start=time(13, 0),
            pm_end=time(17, 0),
        ),
        ClinicianSchedule(
            clinician_id=clinicians[1].clinician_id,
            day_of_week="Tuesday",
            am_start=time(10, 0),
            am_end=time(14, 0),
        )
    ]

    db.session.add_all(schedules)
    db.session.commit()


def seed_hmos(clinicians):
    hmos = [
        ClinicianHMO(clinician_id=clinicians[0].clinician_id, hmo_name="Maxicare"),
        ClinicianHMO(clinician_id=clinicians[1].clinician_id, hmo_name="Medicard")
    ]

    db.session.add_all(hmos)
    db.session.commit()


def seed_infos(clinicians):
    infos = [
        ClinicianInfo(
            clinician_id=clinicians[0].clinician_id,
            label="background",
            content="Cardiology specialist."
        ),
        ClinicianInfo(
            clinician_id=clinicians[1].clinician_id,
            label="background",
            content="Pediatrics specialist."
        )
    ]

    db.session.add_all(infos)
    db.session.commit()


def run_seed_part1():
    existing = Clinician.query.filter_by(
        login_email="juan.delacruz@portal.com"
    ).first()

    if existing:
        print("DB already seeded.")
        return

    clinicians = seed_clinicians()
    seed_schedules(clinicians)
    seed_hmos(clinicians)
    seed_infos(clinicians)

    print("DB seed (1) complete.")


# =====================================================
# API SEEDING (FULL WORKFLOW)
# =====================================================

def run_seed_part2(app):
    print("Running DB seed...")

    # -------------------------
    # PATIENT
    # -------------------------
    patient = Patient(
        first_name="Test",
        last_name="Patient",
        birthday=date(1990, 1, 1),
        gender="M",
        mobile_number="09171234567",
        address_line_1="123 Test St",
        province="Metro Manila",
        city="Makati",
        barangay="Bel-Air",
        country="Philippines",
        login_email="patient@test.com",
        login_password_hash=hash_password("testpassword123"),
        preferred_language="Filipino",
        educational_attainment="College"
    )
    db.session.add(patient)
    db.session.commit()
    patient_id = patient.patient_id

    # -------------------------
    # CLINICIAN
    # -------------------------
    clinician = Clinician(
        title="Dr.",
        first_name="Test",
        last_name="Clinician",
        specialty="Rheumatology",
        department="Internal Medicine",
        room_number="Hall A Rm 230",
        contact_email="clinician@test.com",
        login_email="clinician@test.com",
        login_password_hash=hash_password("testpassword123")
    )
    db.session.add(clinician)
    db.session.commit()
    clinician_id = clinician.clinician_id

    # -------------------------
    # SECRETARY
    # -------------------------
    secretary = Secretary(
        first_name="Test",
        last_name="Secretary",
        contact_email="secretary@test.com",
        login_email="secretary@test.com",
        login_password_hash=hash_password("testpassword123")
    )
    db.session.add(secretary)
    db.session.commit()
    secretary_id = secretary.secretary_id

    # LINK
    link = SecretaryClinicianLink(secretary_id=secretary_id, clinician_id=clinician_id)
    db.session.add(link)
    db.session.commit()

    # -------------------------
    # SCHEDULE (AUTO-SLOTS)
    # -------------------------
    schedule = ClinicianSchedule(
        clinician_id=clinician_id,
        day_of_week="Monday",
        am_start=time(9, 0),
        am_end=time(12, 0),
        pm_start=time(13, 0),
        pm_end=time(17, 0)
    )
    db.session.add(schedule)
    db.session.commit()

    today = date.today()
    slots_created = generate_slots(
        clinician_id=clinician_id,
        from_date=today,
        to_date=today + timedelta(days=60),
        commit=True
    )
    print("Slots created:", slots_created)

    # -------------------------
    # FETCH SLOTS
    # -------------------------
    slots = ClinicianTimeslot.query.filter_by(clinician_id=clinician_id, status="available").all()

    if not slots:
        print("No slots available")
        return

    slot1 = slots[0]
    slot2 = slots[1] if len(slots) > 1 else slot1

    # -------------------------
    # CREATE APPOINTMENT
    # -------------------------
    appointment = Appointment(
        patient_id=patient_id,
        clinician_id=clinician_id,
        slot_id=slot1.slot_id,
        consultation_date=slot1.slot_date,
        chief_complaint="Joint pain",
        payment_type="HMO"
    )
    db.session.add(appointment)
    db.session.commit()
    appointment_id = appointment.appointment_id

    # ACCEPT
    appointment.status = "accepted"
    db.session.commit()

    # RESCHEDULE REQUEST
    appointment.status = "reschedule_requested"
    appointment.reschedule_reason = "Cannot attend"
    db.session.commit()

    # ACCEPT NEW SLOT
    appointment.status = "accepted"
    appointment.slot_id = slot2.slot_id
    db.session.commit()

    # CANCEL
    db.session.delete(appointment)
    db.session.commit()

    print("DB seed complete.")


# =====================================================
# MAIN
# =====================================================

if __name__ == "__main__":
    app = create_app()

    with app.app_context():
        run_seed_part1()
        run_seed_part2(app)