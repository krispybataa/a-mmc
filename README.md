# Project U

> A digital health coordination platform for pre-consultation appointment management.

![Python](https://img.shields.io/badge/Python-3.11+-blue?style=flat-square)
![Flask](https://img.shields.io/badge/Flask-3.x-lightgrey?style=flat-square)
![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ed?style=flat-square)

---

## Overview

Project U is a standalone pre-consultation layer that sits outside the institution's existing clinical systems. Patients can find clinicians through a guided triage flow or a searchable directory, book appointments, and manage their appointment history. Clinicians and their secretaries manage schedules, review incoming requests, and track their daily patient queue. The system operates independently — it handles coordination only, with no billing, diagnostics, or post-consultation records.

---

## Features

### Patient
- Guided triage (symptom- and HMO-based) or direct clinician search
- Clinician directory with filters by specialty, HMO, and schedule
- Appointment booking with date/slot selection, payment type, and SC/PWD discount declaration
- Appointment management: view history, request reschedule, cancel (time-gated)
- Profile management including senior citizen and PWD information
- Appointment reminder banner and PDF export

### Clinician / Secretary
- Daily appointment queue view (queued / done / cancelled)
- Appointment inbox with full detail view and status management
- Accept, decline, reschedule, and mark appointments as done
- Schedule management (AM/PM windows, F2F and teleconsult) with automatic slot generation
- Clinician profile management
- Email notifications on appointment events

### Admin
- Account management for clinicians, secretaries, and patients
- Appointment analytics dashboard (status breakdown, consult type split, bookings over time, top clinicians)
- Email template preview

### Kiosk (Directory Mode)
- Touch-optimized clinician directory with QR codes for mobile booking
- Guided triage flow for walk-in patients
- Idle timeout with automatic reset

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS v4 |
| Backend | Python, Flask, SQLAlchemy, Flask-JWT-Extended |
| Database | PostgreSQL 16 |
| Object Storage | MinIO (S3-compatible) |
| Reverse Proxy | nginx |
| Containerization | Docker, Docker Compose |
| Deployment | Railway |

---

## Architecture

The repository is a monorepo containing three independently deployable applications:

- **`a-mmc_frontend`** — Patient-facing and public React app (clinician directory, booking, dashboards)
- **`a-mmc_backend`** — Flask REST API serving all three frontends
- **`a-mmc_kiosk`** — Touch kiosk React app for walk-in use

All services are containerized via Docker and orchestrated with Docker Compose for local development. In production, an nginx reverse proxy routes `/api/*` requests to the Flask backend and all other paths to the React frontend. PostgreSQL is managed by Railway in production. Authentication uses JWT access tokens held in memory with refresh tokens stored in httpOnly cookies.

---

## Local Development Setup

### Prerequisites

- Docker Desktop
- Node.js 20+
- Python 3.11+

### Setup

1. **Clone the repository**

2. **Copy and configure the environment file**

   ```bash
   cp a-mmc_backend/.env.example a-mmc_backend/.env
   ```

   Fill in required values — see [Environment Variables](#environment-variables) below.

3. **Build Docker images**

   ```bash
   docker build ./a-mmc_backend  -t krispybata/a-mmc-backend:latest
   docker build ./a-mmc_frontend -t krispybata/a-mmc-frontend:latest
   docker build ./a-mmc_kiosk    -t krispybata/a-mmc-kiosk:latest
   ```

4. **Start all services**

   ```bash
   cd a-mmc_infra && docker compose up -d
   ```

5. **Run database migrations** (first run only)

   ```bash
   docker compose exec a-mmc-backend flask db upgrade
   ```

6. **Seed the database** (optional)

   ```bash
   docker compose exec -e PYTHONPATH=/app a-mmc-backend python seeds/seed_all.py
   ```

7. **Access the apps**

   | App | URL |
   |---|---|
   | Main app | http://localhost |
   | Kiosk | http://localhost:7000 |

### Making Changes

After editing any source file:

1. Rebuild the affected image (`a-mmc_backend` or `a-mmc_frontend`)
2. Re-run `docker compose up -d`
3. For model changes, follow the [Migration Flow](#migration-flow) before rebuilding

---

## Production Deployment

Images are pushed to Docker Hub; Railway pulls and runs them automatically.

```bash
docker build ./a-mmc_backend  -t krispybata/a-mmc-backend:latest
docker build ./a-mmc_frontend -t krispybata/a-mmc-frontend:latest
docker push krispybata/a-mmc-backend:latest
docker push krispybata/a-mmc-frontend:latest
```

Trigger a redeploy from the Railway dashboard after pushing updated images.

---

## Migration Flow

Any SQLAlchemy model change requires a two-step rebuild to avoid deploying code against an outdated schema.

1. Make the model change in code
2. Rebuild the backend image and bring services up
3. Generate and apply the migration inside the running container:

   ```bash
   docker compose exec a-mmc-backend flask db migrate -m "description"
   docker compose exec a-mmc-backend flask db upgrade
   ```

4. Copy the generated migration file out of the container:

   ```bash
   docker cp <container_id>:/app/migrations/versions/<file>.py \
     a-mmc_backend/migrations/versions/
   ```

5. Rebuild the backend image again and bring services up

> **Rule:** Never add a non-nullable column without a `server_default` in the same deploy as the code that requires it.

---

## Environment Variables

Copy `a-mmc_backend/.env.example` to `a-mmc_backend/.env` and set the following:

| Variable | Description |
|---|---|
| `SECRET_KEY` | Flask application secret key |
| `FLASK_ENV` | `development` or `production` |
| `SQLALCHEMY_DATABASE_URI` | Full PostgreSQL connection string (local development) |
| `DATABASE_URL` | PostgreSQL connection string injected automatically by Railway (production) |
| `POSTGRES_USER` | PostgreSQL username (local Docker Compose) |
| `POSTGRES_PASSWORD` | PostgreSQL password (local Docker Compose) |
| `POSTGRES_HOST` | PostgreSQL host (local Docker Compose) |
| `POSTGRES_PORT` | PostgreSQL port (local Docker Compose) |
| `POSTGRES_DB` | PostgreSQL database name (local Docker Compose) |
| `JWT_SECRET_KEY` | Secret key for signing JWT access tokens |
| `JWT_ACCESS_TOKEN_EXPIRES` | Access token lifetime in seconds |
| `JWT_COOKIE_SECURE` | Set to `true` in production (requires HTTPS) |
| `SYSTEM_URL` | Base URL of the deployed app — used in email links |
| `MAIL_SERVER` | SMTP server host |
| `MAIL_PORT` | SMTP server port |
| `MAIL_USERNAME` | SMTP login username |
| `MAIL_PASSWORD` | SMTP login password |
| `MAIL_FROM` | Sender address for outgoing emails |
| `MAIL_USE_TLS` | Enable TLS for SMTP (`true`/`false`) |
| `MINIO_ENDPOINT` | MinIO server endpoint |
| `MINIO_ACCESS_KEY` | MinIO access key |
| `MINIO_SECRET_KEY` | MinIO secret key |
| `MINIO_BUCKET` | MinIO bucket name |

> **Email:** If `MAIL_USERNAME` is not set, the backend runs in console preview mode — emails are printed to stdout and not sent.

---

## Project Structure

```
a-mmc/
├── a-mmc_backend/       # Flask API
│   ├── app/
│   ├── migrations/
│   ├── seeds/
│   └── tests/
├── a-mmc_frontend/      # Patient-facing React app
│   ├── src/
│   └── public/
├── a-mmc_kiosk/         # Touch kiosk React app
│   ├── src/
│   └── public/
└── a-mmc_infra/         # Docker Compose and nginx config
```
