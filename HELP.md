# Alagang MMC — User Manual

## Overview

A-MMC is a pre-consultation coordination system. Patients use it to find clinicians, book appointments, and track their appointment status. Clinicians and secretaries use it to manage their schedules and handle incoming appointment requests. The system does not handle billing, diagnostics, or any post-consultation records.

---

## Accessing the System

**Supported browsers:** Google Chrome, Mozilla Firefox, Microsoft Edge (latest versions). Safari is supported on iOS.

**Devices:**
- Desktop or laptop computer with a screen width of at least 1024px recommended for the best experience.
- Mobile phones and tablets are supported. Touch targets and text are sized for older users.

**Website Access:** [SYSTEM URL](https://unicorn-prod.up.railway.app)

**Kiosk:** A separate touchscreen terminal is available on hospital premises. No login is required to use the kiosk.

---

## Roles

- **Patient** — Creates an account, finds clinicians, books and manages appointments.
- **Secretary** — Manages appointment requests on behalf of a linked clinician.
- **Clinician** — Views and manages their own schedule, profile, and incoming appointments.
- **System Administrator** — Manages user accounts and monitors system activity.

---

## Patient Guide

### Creating an Account

1. Go to `[SYSTEM URL]` and select **Register** or follow any booking prompt that directs you to sign up.
2. Complete the three-step registration form:
   - **Step 1 — Personal Information:** First name, last name, middle name (optional), birthday, gender, civil status, nationality, religion, occupation.
   - **Step 2 — Contact and Address:** Mobile number (format: `09XXXXXXXXX`), address line, province, city, barangay, country.
   - **Step 3 — Account Credentials:** Email address, password.
3. Fields marked with an asterisk are required.
4. Name fields cannot contain numbers.
5. You must be at least 15 years old to register.
6. After registering, you are logged in automatically and redirected to your intended page.

![SCREENSHOT: Registration form — Step 1 personal information fields](docs/screenshots/register-step1.png)

---

### Finding a Clinician

From the home page, you are brought to the **Find a Doctor** page.

Two paths are available:

- **I know which doctor I need** — Takes you directly to the clinician directory where you can search and filter by specialty, department, and HMO accreditation.
- **Help me find one** — Opens a two-step guided search. First, select your HMO (or choose "None"). Then select the symptom or concern that best matches your situation. The system returns a list of matching clinicians.

On the clinician directory, each card shows the clinician's name, title, specialty, department, and accepted HMOs. Select a card to open the full clinician profile.

The clinician profile shows:
- Name, title, specialty, department
- Room number and local extension
- Accepted HMOs
- Schedule (days and time windows available)
- Background information

![SCREENSHOT: Clinician directory with filter panel](docs/screenshots/clinician-directory.png)

![SCREENSHOT: Individual clinician profile page](docs/screenshots/clinician-profile.png)

---

### Booking an Appointment

1. From a clinician's profile, select **Book an Appointment**.
2. If you are not logged in, you are redirected to the login page and returned to booking after signing in.
3. On the booking page:
   - Select a **consultation type**: In-person (F2F) or Teleconsultation.
   - Select a **date** from the calendar. Only dates with available slots are selectable.
   - Select an **available time slot** (AM or PM window).
   - Enter your **chief complaint** (required) and a brief description (optional).
   - Select your **payment type**: Private or HMO. If HMO, select your plan from the list.
   - If you have a Senior Citizen or PWD ID number on file, a discount option appears.
4. Review the details and select **Submit**.
5. A confirmation email is sent to your registered email address.

Appointments that fall in the past or within the current time window cannot be booked.

![SCREENSHOT: Booking form with date picker and slot selector](docs/screenshots/book-appointment.png)

---

### Managing Appointments

Go to **Dashboard** after logging in to see your upcoming appointments.

For a full appointment history, go to **Dashboard > My Appointments**.

**Cancelling an appointment:**
- You can cancel more than 48 hours before the appointment at no notice.
- Cancelling between 24 and 48 hours before the appointment shows a warning.
- Cancellation is blocked less than 24 hours before the appointment.

**Requesting a reschedule:**
- Reschedule is only available on appointments with the status **Accepted**.
- Pending appointments cannot be rescheduled directly. Wait for the clinic to accept first.

**Appointment status values:**

| Status | Meaning |
|---|---|
| Pending | Submitted, awaiting clinic review |
| Accepted | Confirmed by the clinic |
| Reschedule requested | Clinic has proposed a new time |
| Rejected | Declined by the clinic |
| Cancelled | Cancelled by you or the clinic |
| Done | Consultation has been completed |

![SCREENSHOT: Patient dashboard showing appointment list](docs/screenshots/patient-dashboard.png)

---

## Clinician and Secretary Guide

### Logging In

Staff use a separate login page at `[SYSTEM URL]/staff/login`. Do not use the patient login page.

On the staff login page, select your role (Clinician or Secretary) before entering your credentials.

![SCREENSHOT: Staff login page with role selector](docs/screenshots/staff-login.png)

---

### Managing the Clinician Profile

Go to **Profile** from the staff navigation.

Fields that can be updated:
- Title, first name, middle name, last name, suffix
- Department, specialty
- Room number, local extension number
- Contact phone, contact email
- HMO accreditations (add or remove)
- Background information (bio text)
- Profile picture

Profile picture upload requires a file storage service to be connected. If the system shows no upload option, contact the administrator.

---

### Managing Schedules

Go to **Schedule** from the staff navigation.

The schedule editor shows a grid of days (Monday through Saturday) with AM and PM time windows. Each row can be set for in-person (F2F) consultations, teleconsultations, or both.

Enter times in 24-hour format. For example, an afternoon slot starting at 2:00 PM should be entered as `14:00`, not `02:00`.

When you save a schedule change, the system automatically regenerates timeslots for the next 60 days based on the new settings.

![SCREENSHOT: Schedule manager with day/time grid](docs/screenshots/schedule-manager.png)

---

### Handling Appointments

The default landing page after staff login is the **Today's View** at `/clinician-dashboard/today`.

This page shows three summary counts:
- **Queue:** Appointments with Pending or Accepted status today.
- **Done:** Appointments marked as done today.
- **Cancelled:** Appointments cancelled today.

Below the counts, appointments for today are listed in order of start time.

Go to **Appointments** for the full inbox across all dates.

**Available actions on each appointment:**
- **View Details** — Opens the appointment drawer with full patient information, chief complaint, HMO details, and discount type.
- **Download PDF** — Exports the appointment details as a PDF.

**Within the appointment drawer, you can:**
- Change appointment status (Accept, Reject, Request Reschedule, Mark as Done).
- Change consultation type (F2F or Teleconsultation).
- Update payment status (Paid or Unpaid).

When you request a reschedule, a notification is sent to the patient.

![SCREENSHOT: Today's view with queue, done, and cancelled counts](docs/screenshots/clinician-today.png)

![SCREENSHOT: Appointment drawer open with status controls](docs/screenshots/appointment-drawer.png)

---

## System Administrator Guide

### Logging In

Administrators log in at `[SYSTEM URL]/staff/login`. Select **Administrator** as the role.

The default administrator credentials created during setup are:

- **Email:** `admin@alagang-mmc.local`
- **Password:** `ChangeMe123!`

Change the password immediately after the first login.

---

### Managing Users

The admin interface is available at `[SYSTEM URL]/admin`.

**Clinicians (`/admin/clinicians`):**
- View the full list of clinicians.
- Add a new clinician account (name, department, specialty, login credentials).
- Delete a clinician account. Deletion removes the clinician's schedule and associated records.

**Secretaries (`/admin/secretaries`):**
- View the full list of secretaries.
- Add a new secretary account.
- Link or unlink a secretary to a clinician.
- Delete a secretary account.

**Patients (`/admin/patients`):**
- View the full list of registered patients.
- View a patient's profile details.

Patient accounts cannot be deleted from the admin interface.

![SCREENSHOT: Admin clinician list with Add and Delete actions](docs/screenshots/admin-clinicians.png)

---

### Audit Trail

The administrator dashboard at `[SYSTEM URL]/admin` shows recent system activity including new registrations, new appointments, and appointment status changes.

Detailed analytics are available at `[SYSTEM URL]/admin/analytics`. The analytics page includes:
- Appointment counts over a selected period (week, month, or all time).
- Appointment status breakdown.
- Split between in-person and teleconsultation appointments.
- Bookings by day of week.
- Top 5 most-booked clinicians.

![SCREENSHOT: Admin analytics page with charts](docs/screenshots/admin-analytics.png)

---

## Using the Kiosk

The kiosk is a touchscreen terminal located on hospital premises. It does not require a login.

From the home screen, two options are available:

**Browse Directory:**
1. The full list of clinicians is shown with photos, names, specialties, and departments.
2. Select a clinician card to open their profile.
3. The profile shows the clinician's schedule and a QR code.
4. Scan the QR code with your phone to open the clinician's booking page on your device.

**Find a Specialist:**
1. A two-step triage flow is shown: first select your HMO, then select your symptom or concern.
2. Matching clinicians are shown. Select a clinician to see their profile and QR code.

The kiosk returns to the home screen automatically after 2 minutes of inactivity.

![SCREENSHOT: Kiosk home screen with Browse Directory and Find a Specialist buttons](docs/screenshots/kiosk-home.png)

![SCREENSHOT: Kiosk clinician detail screen with schedule and QR code](docs/screenshots/kiosk-clinician-detail.png)

---

## Common Issues

**Cannot log in after several attempts.**
Entering the wrong password 5 times in a row locks the account for 15 minutes. Wait 15 minutes and try again with the correct password.

**Booking button is greyed out.**
You must be logged in to book an appointment. Select **Log In** and sign in with your patient account. If you do not have an account, select **Register**.

**The time slot I want is not showing.**
Slots that have already passed or are within the current time window are not shown. Slots are also hidden when a clinician has reached their maximum patients for that window.

**I did not receive a confirmation email.**
Check your spam or junk folder. If the email is not there, contact the clinic to confirm the appointment was received.

**The reschedule option is not available.**
Reschedule is only available for appointments with the status **Accepted**. If your appointment is still **Pending**, wait for the clinic to accept it first.
