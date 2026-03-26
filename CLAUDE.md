# Alagang MMC — Project Context

## What this is
A digital health intervention for Makati Medical Center (MMC) designed to address
process hurdles in patient care coordination. Built as an undergraduate special project
at UP Manila under the CeHRes Roadmap (Human-Centered Design framework).

The system streamlines the patient's journey **prior to consultation** — finding a
clinician, booking an appointment, and managing that appointment. It does not handle
billing, diagnostics, or post-consultation records.

---

## Mission nomenclature
- Backend missions: `B<number>-<letter>` (e.g. B1-A, B1-B, B1-C...)
- Frontend missions: `F<number>-<letter>` (e.g. F6-A, F6-B, F6-C...)
- Patch missions append `-patch` to the parent (e.g. B1-B-patch, B1-D-patch)

---

## Stack
| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Backend | Flask + Flask-SQLAlchemy + Flask-Migrate |
| Database | PostgreSQL 16 (transactional) |
| Containerization | Docker — all three services (frontend, backend, PostgreSQL) via `compose.yaml` in `/misc` |
| Reverse proxy | Planned — Nginx, SSL termination at proxy level, requires signed certs |
| Auth | flask-jwt-extended (JWT), bcrypt |
| Email | stdlib smtplib + email.mime — config-driven, Mailtrap for dev |
| CORS | flask-cors |
| Env management | python-dotenv |

**Scalability strategy:** Vertical only (increase instance spec). No horizontal scaling.
**Cost factors:** API usage, EBS storage, instance spec.
**Postgres connection pooling:** SQLAlchemy pool settings in `config.py` must be tuned
before production; avoid too many concurrent connections on a single instance.

---

## Repo structure
```
a-mmc/
├── a-mmc_backend/
│   ├── .venv/
│   ├── .env              ← not committed, use .env.example as template
│   ├── .env.example      ← safe-to-commit template
│   ├── requirements.txt
│   ├── run.py            ← entry point
│   └── app/
│       ├── __init__.py   ← app factory (create_app), JWTManager registered
│       ├── config.py     ← DevelopmentConfig / ProductionConfig / JWT config
│       ├── models/
│       │   ├── clinician.py   ← Clinician, Schedule, HMO, Info, Timeslot
│       │   ├── secretary.py   ← Secretary + SecretaryClinicianLink
│       │   ├── patient.py
│       │   └── appointment.py
│       ├── routes/
│       │   ├── auth_routes.py        ← login/logout/me/refresh — all 3 roles implemented
│       │   ├── clinician_routes.py   ← includes PATCH schedules/<id> (schedule edit)
│       │   ├── secretary_routes.py
│       │   ├── patient_routes.py
│       │   ├── timeslot_routes.py
│       │   └── appointment_routes.py ← full lifecycle, transaction boundaries verified
│       ├── services/
│       │   ├── auth_service.py       ← hash_password / verify_password + get_*_by_email + build_identity
│       │   ├── appointment_service.py ← has_overlap()
│       │   ├── email_service.py      ← Mailtrap scaffold, 5 notification functions
│       │   └── timeslot_service.py   ← generate_slots + regenerate_slots_for_schedule_change
│       └── utils/
│           ├── __init__.py
│           └── validators.py         ← require_fields() helper
├── a-mmc_frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ClinicianCard.jsx          ← full-width image/avatar, card info below
│   │   │   ├── Navbar.jsx                 ← persistent, excluded from /login, /register, /staff/login
│   │   │   └── shared/
│   │   │       ├── AppointmentDrawer.jsx  ← slide-in detail drawer (right desktop, bottom mobile)
│   │   │       └── SlotPicker.jsx         ← controlled date + slot selection component
│   │   ├── context/
│   │   │   └── AuthContext.jsx       ← real JWT, authLoading, silent refresh on mount, role-aware logout
│   │   ├── data/
│   │   │   ├── mockAppointments.js   ← 4 appointments, one per status
│   │   │   ├── mockClinicians.js     ← 3 clinicians, includes gender field
│   │   │   └── triageLogic.js        ← ⚠️ PLACEHOLDER — pending domain expert review
│   │   ├── lib/
│   │   │   └── utils.js              ← cn() helper
│   │   ├── pages/
│   │   │   ├── public/
│   │   │   │   ├── Home.jsx              ← legacy browse page, kept but no longer on / route
│   │   │   │   ├── FindDoctor.jsx        ← /find — aware vs unaware entry point
│   │   │   │   ├── GuidedSearch.jsx      ← /find/triage — 3-step unaware triage flow
│   │   │   │   ├── Doctors.jsx           ← /doctors — full directory + collapsible filter panel
│   │   │   │   ├── ClinicianProfile.jsx  ← /clinician/:id
│   │   │   │   ├── Login.jsx             ← /login, ?redirect= chain
│   │   │   │   └── Register.jsx          ← /register, 3-step, ?redirect= chain
│   │   │   ├── staff/
│   │   │   │   └── StaffLogin.jsx        ← /staff/login, role selector, ?redirect= chain
│   │   │   └── dashboard/
│   │   │       ├── PatientDashboard.jsx      ← /dashboard
│   │   │       ├── PatientAppointments.jsx   ← /dashboard/appointments
│   │   │       ├── ClinicianDashboard.jsx    ← /clinician-dashboard [STUB]
│   │   │       └── UpdateProfile.jsx         ← /dashboard/profile [STUB]
│   │   ├── services/
│   │   │   └── api.js                ← axios instance, configureApiAuth, request + 401 retry interceptors
│   │   ├── App.jsx                   ← BrowserRouter, Layout, all routes
│   │   ├── main.jsx                  ← wraps app in AuthProvider
│   │   └── index.css                 ← Tailwind v4 + @theme brand tokens
│   ├── public/
│   └── vite.config.js
└── misc/
    ├── compose.yaml
    └── alagang_mmc_erd.html
```

---

## Routing
| Path | Component | Auth required |
|---|---|---|
| / | Redirects to /find | No |
| /find | FindDoctor.jsx | No |
| /find/triage | GuidedSearch.jsx | No |
| /doctors | Doctors.jsx | No |
| /clinician/:id | ClinicianProfile.jsx | No (book CTA gates at /login) |
| /login | Login.jsx | No |
| /register | Register.jsx | No |
| /staff/login | StaffLogin.jsx | No |
| /dashboard | PatientDashboard.jsx | Yes → /login?redirect=/dashboard |
| /dashboard/appointments | PatientAppointments.jsx | Yes |
| /dashboard/profile | UpdateProfile.jsx | Yes [STUB] |
| /clinician-dashboard | ClinicianDashboard.jsx | Yes [STUB] |

**?redirect= chain (patient):** Unauthenticated patient hitting a gated page →
`/login?redirect=X` → `/register?redirect=X` → back to X after auth.

**?redirect= chain (staff):** Same pattern via `/staff/login?redirect=X`.

---

## Brand tokens (src/index.css)
```css
@theme {
  --color-primary: #1D409C;
  --color-primary-light: #8EA0CE;
  --color-accent: #CE1117;
  --color-dark: #303030;
  --color-white: #FFFFFF;
}
```
Use via Tailwind: `bg-[var(--color-primary)]`, `text-[var(--color-accent)]`, etc.
No arbitrary hex colors anywhere in the frontend.

---

## Database schema
PostgreSQL 16. All status/type fields use VARCHAR (not enums) for flexibility.
Migrations managed by Flask-Migrate (Alembic under the hood).
DB is transactional — commit/rollback boundaries must be deliberate, especially
for multi-table operations (e.g. booking + auto-block, reschedule slot swap).

### Tables

**CLINICIAN**
Core clinician profile. Owns several child tables.
- `clinician_id` PK, `title`, `first_name`, `middle_name`, `last_name`, `suffix`
- `department`, `specialty`
- `local_number` (internal extension, NOT a phone number), `room_number` (e.g. "Hall A Rm 230")
- `profile_picture` (string path/URL)
- `contact_phone`, `contact_email` (separate from login, but can be the same value)
- `login_email`, `login_password_hash`

**CLINICIAN_SCHEDULE**
One row per day (Mon–Sat). AM and PM slots are independent and nullable.
Uses 24hr TIME columns.
- `schedule_id` PK, `clinician_id` FK
- `day_of_week` (varchar: "Monday"–"Saturday")
- `am_start`, `am_end`, `pm_start`, `pm_end` (TIME, nullable)

**CLINICIAN_HMO**
Flexible array of HMO accreditations. Can be empty.
- `hmo_id` PK, `clinician_id` FK, `hmo_name`

**CLINICIAN_INFO**
Flexible "more information" entries (background, awards, etc.). Can be empty.
- `info_id` PK, `clinician_id` FK, `content` (text), `label` (varchar, e.g. "background")

**CLINICIAN_TIMESLOT**
Generated slots derived from CLINICIAN_SCHEDULE. Appointments reference these.
- `slot_id` PK, `clinician_id` FK
- `slot_date` (date), `start_time`, `end_time` (TIME)
- `status` (varchar: `available` | `blocked`)
- `max_patients` (int, nullable) — optional soft patient cap; auto-blocks slot when reached

**SECRETARY**
Assistive administrative role. Manages clinician profile, schedule, and appointments
on behalf of the clinician. Same system permissions as the clinician.
- `secretary_id` PK, `title`, `first_name`, `last_name`, `suffix`
- `contact_phone`, `contact_email`
- `login_email`, `login_password_hash`

**SECRETARY_CLINICIAN**
M2M junction between secretaries and clinicians. In practice mostly 1:1,
but the schema supports multiple secretaries per clinician.
- `id` PK, `secretary_id` FK, `clinician_id` FK

**PATIENT**
Required fields marked. Account required to book appointments.
- `patient_id` PK
- `last_name`*, `first_name`*, `middle_name`
- `birthday`* (date), `gender`*, `civil_status`, `nationality`, `religion`, `occupation`
- `mobile_number`*
- `next_of_kin_name`, `next_of_kin_relationship`, `next_of_kin_contact`
- `address_line_1`*, `province`*, `city`*, `barangay`*, `country`*
- `login_email`*, `login_password_hash`
- `sc_pwd_id_number`, `pwd_id_front` (string), `pwd_id_back` (string)
- `preferred_language`*, `culture`, `educational_attainment`*, `disability_type`

**APPOINTMENT**
A patient books an appointment within a clinician's timeslot.
A patient may have many appointments across many clinicians, so long as timeslots
do not overlap. Secretary or clinician can accept or request reschedule.
- `appointment_id` PK
- `patient_id` FK, `clinician_id` FK, `slot_id` FK
- `consultation_date` (date)
- `chief_complaint` (varchar), `chief_complaint_description` (text)
- `payment_type` (varchar, free text)
- `status` (varchar: "pending", "accepted", "reschedule_requested", "rejected", "cancelled")
- `reschedule_reason` (text, nullable)
- `cancellation_reason` (text, nullable)
- `created_at`, `updated_at` (timestamp)

---

## Key design decisions
- **VARCHAR over ENUM** everywhere statuses or types appear — easier to extend without migrations
- **Child tables** for HMO and Info instead of arrays/JSONB — keeps queries clean and rows addable without schema changes
- **CLINICIAN_TIMESLOT** as a pre-generated slots table — slots are created from schedule on save (60-day rolling window); appointments reference a slot rather than raw times
- **SECRETARY_CLINICIAN** as a junction table — supports M2M even though 1:1 is the common case
- **No integration** with external MMC systems (iHIMS, EMR) — operates as a standalone system
- **No billing, diagnostics, or post-consultation data** — strictly pre-consultation coordination

### Auth token strategy
- Access token: 60 minutes, returned in response body as `{ "access_token": "..." }`
- Refresh token: 7 days, set as `httpOnly` cookie named `refresh_token`
- No blocklist — logout clears cookie client-side only. `# TODO(security)` marked for production hardening
- Cookie settings: `httpOnly=True`, `secure=True` (False in DevelopmentConfig), `samesite="Lax"`
- Frontend stores access token in memory only (NOT localStorage — XSS risk)
- Silent refresh on AuthContext mount via `POST /api/auth/refresh`
- api.js 401 interceptor retries once with refreshed token; guards against infinite loop on /refresh itself

### Email strategy
- Provider: Mailtrap for dev/testing (no domain required), SendGrid for production
- All MAIL_* config is env-sourced — switching provider is a `.env` change only, zero code changes
- MAIL_FROM placeholder: `noreply@alagang-mmc.local` — update when domain is settled
- Failed email never affects DB transaction — all send calls are post-commit, wrapped in try/except
- `send_noshow_confirmation_prompt()` scaffolded but not wired — requires scheduler
  (`# TODO(scheduler)` marked in appointment_routes.py)

### Schedule change handling (timeslot invariant)
- `generate_slots()` is idempotent — it skips existing `(clinician, date, start_time)` keys and never deletes
- `generate_slots()` accepts `commit=False` param for parent-transaction participation
- If a `ClinicianSchedule` row is edited, `regenerate_slots_for_schedule_change()` handles cleanup:
  - **Safe orphans** (available, zero active appointments) → deleted automatically
  - **Stuck slots** (have active appointments) → returned to C/S for manual action
- Schedule-edit PATCH wraps schedule update + regeneration in a single atomic transaction
- Stuck slot list is surfaced in the response — does not block the save

### Slot model invariants (DO NOT CHANGE without design review)
- A slot (`CLINICIAN_TIMESLOT`) may hold **multiple appointments** — it is NOT 1:1 with a patient
- Slot `status` is **only ever written by C/S explicitly** (`available` → `blocked` and back), or auto-blocked when `max_patients` is reached. **Booking, rescheduling, and cancelling an appointment never write to slot status**
- `"booked"` is NOT a valid slot status. Valid values: `available | blocked`
- `max_patients` is nullable. When set, the slot auto-blocks after that many `accepted` appointments (opt-in soft capacity). Slot count is NOT shown to patients.
- Slot booking count is derived from `Appointment` rows for audit; it is informational only, never enforced unless `max_patients` is set

### Appointment status lifecycle
```
pending → accepted | rejected | cancelled
accepted → reschedule_requested | cancelled
reschedule_requested → accepted (new slot) | cancelled
rejected → (terminal)
cancelled → (terminal)
```

### Cancellation time rules
- **> 48 hours:** Any party may cancel freely; `cancellation_reason` required
- **24–48 hours:** Allowed with a warning in the API response
- **< 24 hours (patient):** Blocked — patient is directed to contact C/S directly
- **< 24 hours (C/S):** Cannot outright cancel — must use the `reschedule_requested` flow

### Reschedule rules
- Either patient or C/S may initiate `reschedule_requested`; `reschedule_reason` required
- C/S confirms by supplying `new_slot_id` when moving to `accepted`; new slot must be `available` and belong to the same clinician
- Old slot is **never touched** on reschedule — it may have other patients

### Patient overlap check
- Overlap test: `NOT (A.end <= B.start OR B.end <= A.start)` — touching boundaries are allowed
- Active statuses checked: `pending | accepted | reschedule_requested`
- Implemented in `app/services/appointment_service.py` — `has_overlap(patient_id, candidate_slot, exclude_appointment_id=None)`
- Wired into: `POST /api/appointments/` and reschedule-confirm branch of `PATCH /api/appointments/<id>`

### Transaction boundaries
All multi-table write operations are wrapped in try/except with db.session.rollback() on failure.
Verified routes:
- `POST /api/appointments/` — booking + potential auto-block
- `PATCH /api/appointments/<id>` — all status transition branches including flush + auto-block
- `DELETE /api/appointments/<id>` — cancellation
- `PATCH /api/clinicians/<id>/schedules/<schedule_id>` — schedule update + slot regeneration

---

## Auth layer
`flask-jwt-extended` is fully wired. All three login endpoints are implemented.
- `app/services/auth_service.py` — `hash_password()`, `verify_password()`, `get_*_by_email()`, `build_identity()`
- `app/routes/auth_routes.py` — `/patient/login`, `/clinician/login`, `/secretary/login`, `/refresh`, `/logout`, `/me`
- All security hardening decisions marked `# TODO(security)`: blocklist, CSRF protection, rate limiting, brute-force protection

---

## User roles
| Role | What they do in the system |
|---|---|
| Patient | Browse clinicians, create account, book and manage appointments |
| Secretary | Manage clinician profile + schedule, accept/reschedule appointments |
| Clinician | Same permissions as secretary, takes system priority |
| System Administrator | User account management, audit trail, system monitoring |

Patients can browse clinicians without an account but must register to book.

---

## Where things stand

### Backend
- ✅ Flask backend fully scaffolded (app factory, config, models, routes, services, utils)
- ✅ All 8 schema tables implemented as SQLAlchemy models
- ✅ All 5 domain route blueprints scaffolded with full CRUD
- ✅ Appointment lifecycle, slot model invariants, and cancellation time gates enforced
- ✅ Auth layer fully implemented — all 3 roles, access + refresh tokens, httpOnly cookie
- ✅ 60-day rolling slot generation on schedule save (`timeslot_service.generate_slots`)
- ✅ `regenerate_slots_for_schedule_change()` fully implemented and wired into schedule-edit route
- ✅ Patient overlap check implemented (`appointment_service.has_overlap`) and wired
- ✅ Email service scaffolded (Mailtrap) — 5 notification functions wired post-commit
- ✅ Transaction boundaries verified on all multi-table write routes
- ✅ Unit test scaffolds in place: `tests/test_appointment_service.py`, `tests/test_timeslot_service.py`, `tests/test_email_service.py`
- ✅ `.env.example` template in place (JWT, DB, MAIL_* vars)
- ⏳ First migration not yet run — Postgres not yet touched (with collaborators)
- ⏳ No smoke-testing against live DB yet (B2 mission — pinned)

### Frontend
- ✅ F5-A through F5-G-patch: full patient-facing frontend complete
- ✅ F6-A: StaffLogin.jsx (/staff/login), AuthContext real JWT + silent refresh,
      api.js request + 401 retry interceptors, configureApiAuth token bridge
- ⏳ F6-B: C/S Appointment Inbox
- ⏳ F6-C: Clinician Profile Manager
- ⏳ F6-D: Schedule Manager

### Known debt
- `window.confirm()` dialogs are placeholders throughout (cancel, reschedule flows)
- Cancellation/reschedule time gates not yet enforced on frontend
- `triageLogic.js` routing logic pending domain expert validation
- `Home.jsx` kept but unused — can be deleted once confirmed no longer needed
- `ClinicianDashboard.jsx` and `UpdateProfile.jsx` are stubs
- `send_noshow_confirmation_prompt()` not wired — requires scheduler (`# TODO(scheduler)`)
- `# TODO(security)` markers throughout auth: blocklist, CSRF, rate limiting, brute-force protection

---

## Next steps (priority order)

### Immediate — C/S frontend
- F6-B: C/S Appointment Inbox — paginated list, accept / request reschedule actions
- F6-C: Clinician Profile Manager — edit profile fields, upload profile picture
- F6-D: Schedule Manager — weekly schedule editor, triggers slot regeneration, surfaces stuck slots

### Backend (once DB is up with collaborators) — B2
1. Copy `.env.example` → `.env`; fill in DB credentials, `JWT_SECRET_KEY`, `MAIL_*`
2. `flask db init && flask db migrate -m "initial schema" && flask db upgrade`
3. Smoke-test all routes against live DB
4. Run full unit test suite (`pytest tests/`)
5. Begin frontend → backend integration (replace mock data with real API calls via `api.js`)

---

## Conventions to follow
- App factory pattern via `create_app()` in `app/__init__.py`
- Config via classes in `config.py` (DevelopmentConfig, ProductionConfig)
- Models in `app/models/`, one file per domain entity
- Routes in `app/routes/`, one blueprint per domain entity
- Services in `app/services/`, pure logic functions (no route handling)
- Deferred imports inside service functions to avoid circular references
- All secrets and DB credentials via `.env` (never hardcoded)
- 24hr time throughout (TIME columns, API responses, frontend display) — no AM/PM anywhere
- Desktop-first layout that degrades gracefully to mobile
- Touch targets minimum 44px, base font minimum 16px — primary demographic is 60+ users
- Use brand tokens only — no arbitrary hex colors in frontend code
- All React hooks before any conditional returns (Rules of Hooks)
- No localStorage or sessionStorage for tokens — memory only