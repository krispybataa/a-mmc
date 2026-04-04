import csv
import os
import random as _random
import re
import secrets
import string
import sys

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
    existing_patient = Patient.query.filter_by(login_email='patient@test.com').first()
    if existing_patient:
        test_clinician = Clinician.query.filter_by(login_email='clinician@test.com').first()
        if test_clinician and test_clinician.profile_picture is None:
            test_clinician.profile_picture = '/assets/clin-avatars/doc-01.png'
            db.session.commit()
        print("DB already seeded.")
        return

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
        login_password_hash=hash_password("testpassword123"),
        profile_picture='/assets/clin-avatars/doc-01.png',
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
        contact_phone="09000000000",
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
# CSV BULK IMPORT
# =====================================================

_AVATAR_POOL = [f'/assets/clin-avatars/doc-{i:02d}.png' for i in range(1, 9)]

_DAYS = [
    ("mon", "Monday"),
    ("tue", "Tuesday"),
    ("wed", "Wednesday"),
    ("thu", "Thursday"),
    ("fri", "Friday"),
    ("sat", "Saturday"),
]


def _parse_time(value):
    """Parse HH:MM string to datetime.time. Returns None if blank."""
    v = value.strip()
    if not v:
        return None
    parts = v.split(":")
    return time(int(parts[0]), int(parts[1]))


def run_seed_csv(csv_path):
    """
    Bulk import clinicians from a CSV file.
    Idempotent — skips rows where login_email already exists.
    Outputs credentials_manifest.txt for Rheumatology clinicians.

    One row per clinician. F2F and teleconsult schedules are expressed as
    separate column sets (f2f_* and tele_*) on the same row. A schedule row
    is only created for a consultation type when at least one time column for
    that type is non-blank. contact_phone and contact_email are auto-generated
    if not provided in the CSV.
    """
    alphabet = string.ascii_letters + string.digits
    created = 0
    skipped = 0
    rheum_entries = []

    # Build short-day → full-day-name lookup from the module-level _DAYS constant
    _DAY_FULL = {short: full for short, full in _DAYS}
    _DAY_KEYS = [short for short, _ in _DAYS]   # ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']

    _CONSULT_TYPES = [("f2f_", "f2f"), ("tele_", "teleconsult")]

    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            login_email = row.get("login_email", "").strip()
            if not login_email:
                print("ERROR on row (no login_email): missing required field")
                skipped += 1
                continue

            try:
                existing = Clinician.query.filter_by(login_email=login_email).first()
                if existing:
                    print(f"Skipping {login_email} — already exists")
                    if existing.profile_picture is None:
                        existing.profile_picture = _random.choice(_AVATAR_POOL)
                        db.session.commit()
                    skipped += 1
                    continue

                password = row.get("password", "").strip()
                if not password:
                    password = "".join(secrets.choice(alphabet) for _ in range(12))

                # Auto-generate contact fields when not provided in the CSV
                contact_phone = row.get("contact_phone", "").strip()
                if not contact_phone:
                    contact_phone = "09000000000"

                contact_email = row.get("contact_email", "").strip()
                if not contact_email:
                    login = login_email
                    contact_email = (
                        login.replace("@", ".clinic@")
                        if "@" in login
                        else "clinic@asclepius.test"
                    )

                local_number = row.get("local_number", "").strip()
                if not local_number:
                    room = row.get("room_number", "").strip()
                    nums = re.findall(r'\d+', room)
                    local_number = nums[-1] if nums else None

                clinician = Clinician(
                    first_name=row.get("first_name", "").strip(),
                    middle_name=row.get("middle_name", "").strip() or None,
                    last_name=row.get("last_name", "").strip(),
                    suffix=row.get("suffix", "").strip() or None,
                    specialty=row.get("specialty", "").strip(),
                    department=row.get("department", "").strip(),
                    room_number=row.get("room_number", "").strip() or None,
                    local_number=local_number or None,
                    contact_phone=contact_phone,
                    contact_email=contact_email,
                    login_email=login_email,
                    login_password_hash=hash_password(password),
                )
                db.session.add(clinician)
                db.session.flush()

                clinician.profile_picture = _random.choice(_AVATAR_POOL)

                # HMO accreditations (hmo_1 through hmo_10)
                for i in range(1, 11):
                    hmo_name = row.get(f"hmo_{i}", "").strip()
                    if hmo_name:
                        db.session.add(ClinicianHMO(
                            clinician_id=clinician.clinician_id,
                            hmo_name=hmo_name,
                        ))

                db.session.commit()

                # Schedules — one pass per consultation type
                for col_prefix, ctype in _CONSULT_TYPES:
                    has_any = False
                    for day in _DAY_KEYS:
                        am_s = _parse_time(row.get(f"{col_prefix}{day}_am_start", ""))
                        am_e = _parse_time(row.get(f"{col_prefix}{day}_am_end",   ""))
                        pm_s = _parse_time(row.get(f"{col_prefix}{day}_pm_start", ""))
                        pm_e = _parse_time(row.get(f"{col_prefix}{day}_pm_end",   ""))
                        if not any([am_s, am_e, pm_s, pm_e]):
                            continue
                        has_any = True
                        db.session.add(ClinicianSchedule(
                            clinician_id=clinician.clinician_id,
                            day_of_week=_DAY_FULL[day],
                            am_start=am_s,
                            am_end=am_e,
                            pm_start=pm_s,
                            pm_end=pm_e,
                            consultation_type=ctype,
                        ))
                    if has_any:
                        db.session.commit()
                        generate_slots(
                            clinician_id=clinician.clinician_id,
                            from_date=date.today(),
                            to_date=date.today() + timedelta(days=90),
                            commit=True,
                        )

                if row.get("department", "").strip().lower() == "rheumatology":
                    rheum_entries.append(
                        f"Name: {clinician.first_name} {clinician.last_name}\n"
                        f"Login Email: {login_email}\n"
                        f"Password: {password}\n"
                        f"Department: {clinician.department}\n"
                        f"Specialty: {clinician.specialty}\n"
                        f"---"
                    )

                print(f"Created: {login_email}")
                created += 1

            except Exception as e:
                db.session.rollback()
                print(f"ERROR on row {login_email}: {e}")
                skipped += 1

    if rheum_entries:
        manifest_path = os.path.join(os.path.dirname(os.path.abspath(csv_path)), "credentials_manifest.txt")
        with open(manifest_path, "w", encoding="utf-8") as mf:
            mf.write("\n".join(rheum_entries) + "\n")
        print(f"Credentials manifest written to {manifest_path}")

    print(f"CSV import complete. {created} created, {skipped} skipped.")


# =====================================================
# MAIN
# =====================================================

if __name__ == "__main__":
    app = create_app()

    with app.app_context():
        if len(sys.argv) == 1:
            run_seed_part1()
            run_seed_part2(app)
        elif len(sys.argv) == 2 and sys.argv[1].endswith(".csv"):
            run_seed_csv(sys.argv[1])
        else:
            print("Usage:")
            print("  python seed.py              — dev seed")
            print("  python seed.py data.csv     — bulk import")
            sys.exit(1)