from app import create_app, db
from app.models.clinician import (
    Clinician,
    ClinicianSchedule,
    ClinicianHMO,
    ClinicianInfo,
    ClinicianTimeslot
)

from datetime import time, date
from app.services.auth_service import hash_password


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
        # Clinician 1
        ClinicianSchedule(
            clinician_id=clinicians[0].clinician_id,
            day_of_week="Monday",
            am_start=time(9, 0),
            am_end=time(12, 0),
            pm_start=time(13, 0),
            pm_end=time(17, 0),
            consultation_type="f2f"
        ),
        ClinicianSchedule(
            clinician_id=clinicians[0].clinician_id,
            day_of_week="Wednesday",
            am_start=time(9, 0),
            am_end=time(12, 0),
            consultation_type="teleconsult"
        ),

        # Clinician 2
        ClinicianSchedule(
            clinician_id=clinicians[1].clinician_id,
            day_of_week="Tuesday",
            am_start=time(10, 0),
            am_end=time(14, 0),
            consultation_type="f2f"
        )
    ]

    db.session.add_all(schedules)
    db.session.commit()


def seed_hmos(clinicians):
    hmos = [
        ClinicianHMO(
            clinician_id=clinicians[0].clinician_id,
            hmo_name="Maxicare"
        ),
        ClinicianHMO(
            clinician_id=clinicians[0].clinician_id,
            hmo_name="Intellicare"
        ),
        ClinicianHMO(
            clinician_id=clinicians[1].clinician_id,
            hmo_name="Medicard"
        )
    ]

    db.session.add_all(hmos)
    db.session.commit()


def seed_infos(clinicians):
    infos = [
        ClinicianInfo(
            clinician_id=clinicians[0].clinician_id,
            label="background",
            content="Graduated from UP College of Medicine with specialization in Cardiology."
        ),
        ClinicianInfo(
            clinician_id=clinicians[0].clinician_id,
            label="awards",
            content="Awarded Best Cardiologist 2022."
        ),
        ClinicianInfo(
            clinician_id=clinicians[1].clinician_id,
            label="background",
            content="Pediatric specialist with 10+ years experience in child healthcare."
        )
    ]

    db.session.add_all(infos)
    db.session.commit()


def seed_timeslots(clinicians):
    timeslots = [
        ClinicianTimeslot(
            clinician_id=clinicians[0].clinician_id,
            slot_date=date(2026, 4, 1),
            start_time=time(9, 0),
            end_time=time(10, 0),
            status="available",
            max_patients=5,
            consultation_type="f2f"
        ),
        ClinicianTimeslot(
            clinician_id=clinicians[0].clinician_id,
            slot_date=date(2026, 4, 1),
            start_time=time(10, 0),
            end_time=time(11, 0),
            status="available",
            consultation_type="teleconsult"
        ),
        ClinicianTimeslot(
            clinician_id=clinicians[1].clinician_id,
            slot_date=date(2026, 4, 2),
            start_time=time(10, 0),
            end_time=time(11, 30),
            status="available",
            max_patients=3
        )
    ]

    db.session.add_all(timeslots)
    db.session.commit()

def run_seed():
    if Clinician.query.count() > 0:
        print("Already seeded.")
        return

    clinicians = seed_clinicians()
    seed_schedules(clinicians)
    seed_hmos(clinicians)
    seed_infos(clinicians)
    seed_timeslots(clinicians)

    print("Seed complete.")

if __name__ == "__main__":
    app = create_app()

    with app.app_context():
        run_seed()