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
- Integration missions: `FB-<letter><number>` (e.g. FB-A1, FB-B3, FB-C2...)
- Patch missions append `-patch` to the parent (e.g. B1-A-patch, B1-A-patch-2)

---

## Stack
| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Backend | Flask + Flask-SQLAlchemy + Flask-Migrate |
| Database | PostgreSQL 16 (transactional) |
| Containerization | Docker — all three services (frontend, backend, PostgreSQL) via `compose.yaml` in `/a-mmc_infra` |
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
│   ├── .env.example      ← safe-to-commit template (also used as env_file in compose)
│   ├── requirements.txt
│   ├── run.py            ← entry point
│   └── app/
│       ├── __init__.py   ← app factory (create_app), JWTManager registered
│       ├── config.py     ← DevelopmentConfig / ProductionConfig / JWT config
│       ├── models/
│       │   ├── clinician.py   ← Clinician, Schedule, HMO, Info, Timeslot
│       │   ├── secretary.py   ← Secretary + SecretaryClinicianLink
│       │   ├── patient.py
│       │   ├── appointment.py
│       │   └── admin.py       ← Admin (admin_id, first_name, last_name, login_email, login_password_hash)
│       ├── routes/
│       │   ├── auth_routes.py        ← login/logout/me/refresh — all 4 roles; JWT sub fix (str id + user claim)
│       │   ├── clinician_routes.py   ← CRUD + schedules, hmos, infos, timeslots; POST+DELETE guarded by admin role
│       │   ├── secretary_routes.py   ← CRUD + link/unlink clinician; POST/DELETE/link/unlink guarded by admin role
│       │   ├── patient_routes.py
│       │   ├── timeslot_routes.py
│       │   ├── appointment_routes.py ← full lifecycle; _serialize includes nested clinician, slot, patient
│       │   └── admin_routes.py       ← /api/admin — dashboard counts, clinician/secretary/patient lists, create admin, seed endpoint
│       ├── services/
│       │   ├── auth_service.py       ← hash_password / verify_password + get_*_by_email (all 4 roles) + build_identity
│       │   ├── appointment_service.py ← has_overlap()
│       │   ├── email_service.py      ← Mailtrap scaffold, 5 notification functions
│       │   └── timeslot_service.py   ← generate_slots + regenerate_slots_for_schedule_change
│       └── utils/
│           ├── __init__.py
│           └── validators.py         ← require_fields() helper
├── a-mmc_frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AdminLayout.jsx            ← sidebar + header shell for all /admin/* pages
│   │   │   ├── ClinicianCard.jsx          ← full-width image/avatar, card info below
│   │   │   ├── Navbar.jsx                 ← persistent, excluded from /login, /register, /staff/login
│   │   │   └── shared/
│   │   │       ├── AppointmentDrawer.jsx  ← slide-in detail drawer (right desktop, bottom mobile)
│   │   │       └── SlotPicker.jsx         ← controlled date + slot selection; optional availableSlots prop
│   │   ├── context/
│   │   │   └── AuthContext.jsx       ← real JWT, authLoading, silent refresh on mount, role-aware logout
│   │   ├── lib/
│   │   │   └── utils.js              ← cn() helper
│   │   ├── pages/
│   │   │   ├── public/
│   │   │   │   ├── Home.jsx              ← legacy browse page, live API fetch, no longer on / route
│   │   │   │   ├── FindDoctor.jsx        ← /find — aware vs unaware entry point
│   │   │   │   ├── GuidedSearch.jsx      ← /find/triage — 3-step unaware triage flow
│   │   │   │   ├── Doctors.jsx           ← /doctors — live clinician list, collapsible filter panel
│   │   │   │   ├── ClinicianProfile.jsx  ← /clinician/:id — live clinician detail
│   │   │   │   ├── BookAppointment.jsx   ← appointment booking, live clinician + slot fetch
│   │   │   │   ├── Login.jsx             ← /login, real auth, ?redirect= chain
│   │   │   │   └── Register.jsx          ← /register, real registration + auto-login, ?redirect= chain
│   │   │   ├── staff/
│   │   │   │   └── StaffLogin.jsx        ← /staff/login, role selector, real auth, ?redirect= chain
│   │   │   ├── admin/
│   │   │   │   ├── AdminDashboard.jsx    ← /admin — summary counts + recent activity
│   │   │   │   ├── AdminClinicians.jsx   ← /admin/clinicians — clinician list, add/delete
│   │   │   │   ├── AdminSecretaries.jsx  ← /admin/secretaries — secretary list, link/unlink clinician
│   │   │   │   └── AdminPatients.jsx     ← /admin/patients — patient list, view details
│   │   │   └── dashboard/
│   │   │       ├── PatientDashboard.jsx       ← /dashboard, live appointments
│   │   │       ├── PatientAppointments.jsx    ← /dashboard/appointments, live appointments
│   │   │       ├── ClinicianDashboard.jsx     ← /clinician-dashboard, live C/S inbox
│   │   │       ├── ClinicianProfileManager.jsx ← /clinician-dashboard/profile, live profile edit
│   │   │       ├── ScheduleManager.jsx        ← /clinician-dashboard/schedule, live schedule edit
│   │   │       ├── ChangePassword.jsx         ← /clinician-dashboard/change-password, C/S password change
│   │   │       └── UpdateProfile.jsx          ← /dashboard/profile, patient profile edit
│   │   ├── services/
│   │   │   ├── api.js                ← axios instance, configureApiAuth, request + 401 retry interceptors
│   │   │   └── uploadService.js      ← Railway bucket stub; uploadFile(file, context) → null until wired
│   │   ├── App.jsx                   ← BrowserRouter, Layout, all routes
│   │   ├── main.jsx                  ← wraps app in AuthProvider
│   │   └── index.css                 ← Tailwind v4 + @theme brand tokens
│   ├── public/
│   └── vite.config.js
└── a-mmc_infra/
    ├── compose.yaml
    └── nginx.conf (planned)
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
| /dashboard/profile | UpdateProfile.jsx | Yes |
| /clinician-dashboard | ClinicianDashboard.jsx | Yes → /staff/login?redirect=... |
| /clinician-dashboard/profile | ClinicianProfileManager.jsx | Yes |
| /clinician-dashboard/schedule | ScheduleManager.jsx | Yes |
| /clinician-dashboard/change-password | ChangePassword.jsx | Yes (role: clinician \| secretary) |
| /admin | AdminDashboard.jsx | Yes (role: admin) |
| /admin/clinicians | AdminClinicians.jsx | Yes (role: admin) |
| /admin/secretaries | AdminSecretaries.jsx | Yes (role: admin) |
| /admin/patients | AdminPatients.jsx | Yes (role: admin) |

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
One row per day (Mon–Sat) per consultation type. AM and PM slots are independent and nullable.
Uses 24hr TIME columns. A clinician may have multiple rows per day (e.g. one f2f, one teleconsult).
- `schedule_id` PK, `clinician_id` FK
- `day_of_week` (varchar: "Monday"–"Saturday")
- `am_start`, `am_end`, `pm_start`, `pm_end` (TIME, nullable)
- `consultation_type` (varchar: `f2f` | `teleconsult`, server_default `f2f`)

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
- `consultation_type` (varchar: `f2f` | `teleconsult`, server_default `f2f`) — carried from parent schedule row

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

**ADMIN**
System administrator. Account management and monitoring only — no clinical access.
- `admin_id` PK, `first_name`, `last_name`
- `login_email` (unique), `login_password_hash`

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
- `appointment_id` PK
- `patient_id` FK, `clinician_id` FK, `slot_id` FK
- `consultation_date` (date)
- `chief_complaint` (varchar), `chief_complaint_description` (text)
- `payment_type` (varchar, free text)
- `consultation_type` (varchar: `f2f` | `teleconsult`, server_default `f2f`) — must match the booked slot's consultation_type
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
- **Gender filter removed** from Doctors.jsx — field not present in Clinician schema

### Auth token strategy
- Access token: 60 minutes, returned in response body as `{ "access_token": "...", "user": {...} }`
- Refresh token: 7 days, set as `httpOnly` cookie named `refresh_token`
- JWT blocklist: logout calls `blocklist_token(jti)` — token is invalid immediately, no waiting for 60-min TTL
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
- `_time_to_minutes()` handles all three types: `timedelta`, `str` ("HH:MM" or "HH:MM:SS"), `datetime.time`
- If a `ClinicianSchedule` row is edited, `regenerate_slots_for_schedule_change()` handles cleanup:
  - **Safe orphans** (available, zero active appointments) → deleted automatically
  - **Stuck slots** (have active appointments) → returned to C/S for manual action
- Schedule-edit PATCH wraps schedule update + regeneration in a single atomic transaction
- Stuck slot list is surfaced in the response and in the ScheduleManager UI — does not block the save

### Slot model invariants (DO NOT CHANGE without design review)
- A slot (`CLINICIAN_TIMESLOT`) may hold **multiple appointments** — it is NOT 1:1 with a patient
- Slot `status` is **only ever written by C/S explicitly** (`available` → `blocked` and back), or auto-blocked when `max_patients` is reached. **Booking, rescheduling, and cancelling an appointment never write to slot status**
- `"booked"` is NOT a valid slot status. Valid values: `available | blocked`
- `max_patients` is nullable. When set, the slot auto-blocks after that many `accepted` appointments (opt-in soft capacity). Slot count is NOT shown to patients.

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
- `DELETE /api/clinicians/<id>` — cascade deletes child rows
- `DELETE /api/secretaries/<id>` — cascade deletes SecretaryClinicianLink rows

### Secretary-clinician link route
- REST-style URL: `POST /api/secretaries/<secretary_id>/clinicians/<clinician_id>`
- No request body needed — both IDs are in the URL
- Unlink: `DELETE /api/secretaries/<secretary_id>/clinicians/<clinician_id>`

### Role-based clinician_id resolution (frontend)
Used in ClinicianDashboard, ClinicianProfileManager, and ScheduleManager:
- `role === "clinician"` → use `user.id` directly
- `role === "secretary"` → `GET /api/secretaries/<user.id>` → `clinician_ids[0]`

### Upload service pattern
`uploadService.js` is the single integration point for all file uploads.
It exports `uploadFile(file, context) → Promise<string|null>`.
Currently returns `null` (Railway bucket not configured).
`# TODO(upload)` marks the only line that needs changing when Railway
credentials are available. All consumers handle `null` gracefully.
ClinicianProfileManager profile picture upload should follow the same
pattern when wired.

### Appointment serializer (_serialize in appointment_routes.py)
Returns nested objects for related entities:
- `clinician: { clinician_id, title, first_name, last_name, specialty, room_number }`
- `slot: { slot_id, slot_date, start_time }` (start_time sliced to HH:MM)
- `patient: { patient_id, first_name, last_name }` (nested object)
- `patient_first_name`, `patient_last_name` (flat fields, preserved for compatibility)

### Security implementation (B-SEC-1)
- **Rate limiting:** Flask-Limiter with `memory://` storage (single-instance deployment, no Redis needed). Default: 200/min API-wide. Login endpoints: 10/min + 50/hr. Patient registration: 5/hr.
- **Account lockout:** In-memory dict in `auth_routes.py`. 5 consecutive failures → 15-minute lock on that email. Resets on restart — acceptable for SRET scope; replace with DB-backed solution for production.
- **JWT blocklist:** In-memory set in `auth_service.py`. Tokens added on logout are rejected immediately by `token_in_blocklist_loader`. Clears on restart — same tradeoff as lockout; production should use Redis.
- **CSRF:** Double-submit cookie pattern on `/refresh` only. Login sets a non-httpOnly `csrf_token` cookie (JS-readable). Every `/refresh` request must include `X-CSRF-Token: <token>` header matching the cookie; a new cookie is issued on each successful refresh. Login endpoints are not cookie-reliant so full CSRF coverage is not required.

---

## Auth layer
`flask-jwt-extended` is fully wired. All four login endpoints are implemented.
- `app/services/auth_service.py` — `hash_password()`, `verify_password()`, `get_*_by_email()` (all 4 roles), `build_identity()`
- `app/routes/auth_routes.py` — `/patient/login`, `/clinician/login`, `/secretary/login`, `/admin/login`, `/refresh`, `/logout`, `/me`
- JWT token strategy (B2-A fix): `sub` claim is the user's numeric ID as a string (flask_jwt_extended 4.7+ requirement);
  full user identity dict stored in `additional_claims["user"]`; `get_jwt()` used everywhere instead of `get_jwt_identity()`
- ✅ Security hardening (B-SEC-1): rate limiting (Flask-Limiter, 200/min API-wide, 10/min + 50/hr on login, 5/hr on registration), account lockout (5 failed attempts → 15min lock, in-memory), JWT blocklist (in-memory, clears on restart), CSRF double-submit cookie protection on `/api/auth/refresh`

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
- ✅ Flask backend fully scaffolded and smoke-tested against live DB
- ✅ All 9 schema tables implemented as SQLAlchemy models (Admin added B2-A)
- ✅ All domain route blueprints with full CRUD
- ✅ Appointment lifecycle, slot model invariants, and cancellation time gates enforced
- ✅ Auth layer fully implemented — all 4 roles, access + refresh tokens, httpOnly cookie
- ✅ JWT sub-claim fix (B2-A): flask_jwt_extended 4.7+ requires string sub; user dict in additional_claims["user"]
- ✅ 60-day rolling slot generation on schedule save
- ✅ `regenerate_slots_for_schedule_change()` fully implemented and wired
- ✅ Patient overlap check implemented and wired
- ✅ Email service scaffolded (Mailtrap) — 5 notification functions wired post-commit
- ✅ Transaction boundaries verified on all multi-table write routes
- ✅ Password hashing on all four registration routes
- ✅ Full route audit completed (B1-A-patch-2) — FK checks, status guards, boundaries
- ✅ DELETE routes for HMO and info entries added (FB-C1)
- ✅ Admin role added (B2-A): Admin model + migration, admin login, route guards on account
  creation/deletion routes, admin blueprint with dashboard counts + user lists + create admin
- ✅ Seed endpoint for first admin bootstrap (POST /api/admin/seed-first-admin — REMOVE BEFORE PRODUCTION)
- ⏳ Unit tests not yet run against live DB (scaffolds in place)

### Frontend
- ✅ Full patient-facing frontend (F5 series)
- ✅ Full C/S frontend (F6 series): inbox, profile manager, schedule manager
- ✅ Full frontend-backend integration (FB series): all pages on live API
- ✅ mockClinicians.js and mockAppointments.js deleted
- ✅ SlotPicker supports optional availableSlots prop for real slot objects
- ✅ Admin frontend (F8-A) — AdminLayout + 4 pages, wired to live API
- ✅ Schedule Manager and ClinicianProfile show F2F and Teleconsult in separate labeled sections (F9-A-patch complete)
- ✅ F-CS-A — Change Password page for C/S at /clinician-dashboard/change-password; PATCH /api/auth/change-password backend endpoint
- ✅ F7-A — UpdateProfile.jsx fully implemented with all 5 sections (Personal, Contact, Next of Kin, Preferences, SC/PWD); uploadService.js stub for file uploads
- ✅ uploadService.js — Railway bucket stub, returns null until wired, degrades gracefully in UpdateProfile form

### Docker
- ✅ a-mmc-postgres: up and running, all 10 tables migrated
- ✅ a-mmc-backend: up and running, smoke-tested
- ✅ a-mmc-frontend: up and running

### Known debt
- Profile picture upload not wired in ClinicianProfileManager (`# TODO(integration)` — Railway bucket, same pattern as uploadService.js)
- `uploadService.js` returns null until Railway bucket credentials are configured (`# TODO(upload)`)
- `send_noshow_confirmation_prompt()` not wired (needs scheduler — `# TODO(scheduler)`)
- `triageLogic.js` routing logic pending domain expert validation
- `window.confirm()` still present in Register flow
- Admin "Link Clinician" modal uses a dropdown — will need search/filter once clinician count grows
- AdminSecretaries linked clinician display depends on API response shape — verify `clinician_ids` vs `linked_clinicians` field name against live backend response
- StaffLayout.jsx mobile responsiveness pending verification (F-PATCH-UI-1)
- "Makati Medical Center" redaction — verify no remaining instances in rendered UI after rebuild (F-PATCH-UI-1)

---

## Agenda

**IMMEDIATE:**
1. F-PATCH-UI-1 — Staff mobile responsiveness + role subtitle + A-MMC redaction (all frontend + backend string instances)

**NEXT (pre-deploy, in order):**
2. F10-A — Similar doctors on ClinicianProfile (`GET /api/clinicians/?specialty=<specialty>`, exclude current)
3. F8-A-auto — Automate admin smoke test verification
4. Profile picture upload — wire uploadService.js in ClinicianProfileManager, integrate with Railway bucket
5. B-EMAIL-1 — Email template framework: wire all 5 existing scaffolded functions, add initial credentials emails for C/S and Clinician on admin account creation, add reschedule confirmation to patient. All calls through configurable emailService; templates log to console when SMTP not set.
6. F-EMAIL-1 — Admin email preview page at /admin/email-previews: renders each template with mock data for SRET presentation
7. `send_noshow_confirmation_prompt` — wire to Railway scheduler
8. Appointment analytics — /admin/analytics: aggregate booking data by clinician, status, and time period

**DEFERRED (post-SRET):**
10. triageLogic.js — domain expert validation of specialty routing
11. Admin delete-clinician cascade verification

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
- Registration endpoints accept `"password"` field — hashed internally before storage
- Secretary-clinician link uses REST URL pattern, no request body
- All routes use trailing slash consistently (Flask redirects without it)
- All UI-visible and code references to "Makati Medical Center" use "A-MMC" instead — the repository is public. Devlogs and the thesis proposal (.tex) are exempt from this convention.