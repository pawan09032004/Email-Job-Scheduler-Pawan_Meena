## ReachInbox Email Scheduler

A production-grade email scheduling system that mimics a real-world email infrastructure for cold outreach. It is built as a full-stack assignment implementation for ReachInbox, focusing on correctness, reliability and behavior under load.

- Backend: TypeScript, Express.js, PostgreSQL, Redis, BullMQ, Nodemailer (Ethereal)
- Frontend: Next.js (App Router), TypeScript, Tailwind CSS, NextAuth (Google OAuth)

This repository contains:

- A backend API and worker that schedule and send emails via BullMQ delayed jobs (no cron).
- A frontend dashboard that lets you authenticate with Google, compose emails (single or CSV bulk), view scheduled emails, and track sent/failed ones.


## Repository Structure

- `backend/` – Email scheduling API, BullMQ queue, worker, PostgreSQL schema and rate-limiting logic.
- `frontend/` – Next.js dashboard, Google OAuth login, CSV upload and email management UI.


## Quick Start

### Prerequisites

- Node.js 18+
- Docker and Docker Compose (recommended for PostgreSQL + Redis)
- A Google Cloud project with OAuth 2.0 credentials (for Google login)


### 1. Clone and install

```bash
git clone https://github.com/pawan09032004/Email-Job-Scheduler-Pawan_Meena
cd Email-Job-Scheduler-Pawan_Meena

cd backend
npm install

cd ../frontend
npm install
```


### 2. Start infrastructure (PostgreSQL + Redis)

From the `backend` folder:

```bash
cd backend
docker-compose up -d
```

This starts:

- PostgreSQL at `postgresql://postgres:password@localhost:5432/reachinbox`
- Redis at `localhost:6379`


### 3. Environment variables

Create `.env` files in `backend/` and `frontend/` as described below.


#### Backend `.env`

```env
PORT=4000
DATABASE_URL=postgresql://postgres:password@localhost:5432/reachinbox
REDIS_HOST=localhost
REDIS_PORT=6379

WORKER_CONCURRENCY=5
EMAIL_SEND_DELAY_MS=2000
MAX_EMAILS_PER_HOUR=200
```

Configuration notes:

- `WORKER_CONCURRENCY` controls how many jobs a worker processes in parallel.
- `EMAIL_SEND_DELAY_MS` is the minimum delay between email sends per worker (for example, 2000 ms = 2 seconds between sends).
- `MAX_EMAILS_PER_HOUR` is the hourly send limit per sender email address.


#### Frontend `.env.local`

In `frontend/`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000

GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
NEXTAUTH_SECRET=<any-random-secret>
NEXTAUTH_URL=http://localhost:3000
```

- `NEXT_PUBLIC_API_BASE_URL` must point to the deployed backend URL in production.
- Configure Google OAuth redirect URIs to include:
  - `http://localhost:3000/api/auth/callback/google`
  - Your deployed URL equivalent.


### 4. Run backend API and worker

From `backend/`:

```bash
# 1. Run the API server
npm run dev

# 2. In another terminal, run the worker
npm run worker
```

The API listens on `http://localhost:4000`, and the worker continuously consumes jobs from Redis.


### 5. Run the frontend

From `frontend/`:

```bash
npm run dev
```

Open `http://localhost:3000` in your browser:

- Login with Google.
- You will be redirected to `/dashboard` after successful login.


## Architecture Overview

### High-level design

- The **backend API** accepts schedule requests and persists every email in a PostgreSQL `emails` table.
- For each scheduled email, the backend enqueues a **BullMQ delayed job** in a single `email-queue`.
- A dedicated **worker process** consumes jobs with configurable concurrency and rate limiting.
- The worker sends emails through **Ethereal SMTP** using Nodemailer and updates email status in the database.
- The **frontend dashboard** consumes the API to show scheduled/sent emails and to schedule new emails (single or CSV bulk).


### Backend components

- Express API (`backend/src/app.ts`, `backend/src/controllers`, `backend/src/routes`)
- Database access (`backend/src/config/db.ts`, `backend/src/db/schema.sql`)
- BullMQ queue and worker (`backend/src/queues/email.queue.ts`, `backend/src/workers/email.worker.ts`)
- Email service (`backend/src/services/email.service.ts`) for scheduling, querying and recovery.

Data flow for scheduling:

1. Frontend calls `POST /api/emails/schedule` with:
   - `toEmail`, `subject`, `body`, `scheduledAt`, `senderEmail`.
2. Service writes a row into the `emails` table in a transaction.
3. It then adds a BullMQ job to `email-queue` with:
   - `jobId = emailId` (database UUID).
   - `delay = scheduledAt - now`.
4. Jobs live in Redis, so they survive API restarts.


### Worker, concurrency and rate limiting

The worker (`backend/src/workers/email.worker.ts`) is a separate process with:

- `concurrency = WORKER_CONCURRENCY` – controls parallel processing.
- `limiter` in BullMQ configured with:
  - `max = WORKER_CONCURRENCY`
  - `duration = EMAIL_SEND_DELAY_MS`
- An explicit `setTimeout(EMAIL_SEND_DELAY_MS)` in the processor to enforce a minimum delay between sends.

Rate limiting is implemented using a per-sender Redis counter:

- Key format: `email_rate:{senderEmail}:{YYYY-MM-DD-HH}`.
- For each send:
  - The worker checks the current count for that sender in the current hour.
  - If `< MAX_EMAILS_PER_HOUR`, it increments and proceeds.
  - If `>= MAX_EMAILS_PER_HOUR`, the email is not failed:
    - The email’s `scheduled_at` is updated in PostgreSQL to the next hour start.
    - The BullMQ job is moved to delayed state with a new delay until that hour.

This design is:

- Safe across multiple workers and instances (Redis is the shared source of truth for rate limiting).
- Idempotent, because the job `jobId` equals the database `emailId`.


### Restart and persistence strategy

- PostgreSQL is the source of truth for email state.
- BullMQ jobs are persisted in Redis.
- On restart:
  - The worker simply reconnects and resumes.
  - The API exposes `POST /api/emails/recover` which:
    - Queries all `status = 'scheduled'` emails with `scheduled_at > NOW()`.
    - For each, checks if a BullMQ job exists for that `id`.
    - If missing, reschedules the job with `jobId = emailId`.

This guarantees:

- No duplicate jobs on restart.
- No lost scheduled emails.
- No resend of already-sent emails.


### Behavior under load (1000+ emails)

When many emails are scheduled at once:

- BullMQ stores them as delayed jobs in Redis; the worker pulls them as they come due.
- For each sender:
  - At most `MAX_EMAILS_PER_HOUR` are allowed per hour.
  - Additional emails are automatically rescheduled to the next hour.
- Order is preserved as much as reasonably possible:
  - Emails in a given hour are processed in the order of their scheduled time.
  - When rescheduled, they are moved to the next hour with updated `scheduled_at`, so they remain ordered within that new window.


## Frontend Overview

The frontend is a Next.js App Router app (`frontend/`) with:

- Google OAuth via NextAuth (`app/api/auth/[...nextauth]/route.ts`).
- A `/login` page with a Google sign-in button.
- A `/dashboard` page:
  - Shows a header with logout.
  - Greets the user by name.
  - Displays the email table with tabs for **Scheduled** and **Sent**.
  - Provides a primary “Compose Email” button.

Compose modal:

- Allows:
  - Single email scheduling (To, Subject, Body, Sender, Scheduled time).
  - Bulk scheduling via CSV upload:
    - Parses a file of email addresses and optional subject/body per row.
    - Displays total parsed emails and a small preview.
- Lets the user enter “Delay Between Emails (seconds)” and “Hourly Limit”:
  - Current implementation uses global values defined by `EMAIL_SEND_DELAY_MS` and `MAX_EMAILS_PER_HOUR` on the backend.
  - The fields are exposed as UI controls mainly for demonstrating the concept.

Dashboard views:

- **Scheduled Emails** tab:
  - Table columns: To, Subject, Status, Scheduled For, Actions.
  - Status can be `scheduled`, `sent`, or `failed`.
- **Sent Emails** tab:
  - Shows all sent and failed emails with timestamps.
  - Both views have loading states and empty states.

Data fetching is handled via React Query hooks:

- `useEmails` – polls for email lists (`scheduled`/`sent`).
- `useScheduleEmail` – schedules an email and invalidates relevant queries.
- `useQueueStats` – fetches queue metrics for optional stats display.


## Feature Checklist vs Assignment

Backend:

- Accepts email scheduling requests via APIs.
- Persists email jobs in PostgreSQL (`emails` table).
- Uses BullMQ delayed jobs for future sends (no cron).
- Supports multiple senders via `senderEmail`.
- Sends emails via Ethereal SMTP (Nodemailer test account).
- Idempotent job scheduling (`jobId = emailId`).
- Survives server restarts using Redis + DB and recovery logic.
- Implements:
  - Configurable worker concurrency (`WORKER_CONCURRENCY`).
  - Minimum delay between sends (`EMAIL_SEND_DELAY_MS`).
  - Per-sender hourly rate limiting (`MAX_EMAILS_PER_HOUR`, Redis-backed).
  - Rescheduling when rate limit is hit rather than failing jobs.

Frontend:

- Google OAuth login with redirect to dashboard.
- Shows user name and logout (avatar can be added easily if desired).
- Dashboard with:
  - Scheduled and Sent tabs.
  - Primary “Compose Email” button.
- Compose flow:
  - Subject and Body.
  - CSV upload with count and preview.
  - Start time, delay between emails and hourly limit inputs.
  - Schedules via backend API.
- Tables for Scheduled and Sent:
  - Show email details, status, timestamps.
  - Proper loading and empty states.
- Reusable UI components and TypeScript throughout.


## Running in Production

For production:

- Deploy `backend/` to a Node-compatible environment with:
  - PostgreSQL and Redis instances.
  - A process for the API server.
  - A separate process for the worker.
- Deploy `frontend/` to a Next.js hosting platform (e.g. Vercel) with:
  - `NEXT_PUBLIC_API_BASE_URL` pointing to your backend.
  - Properly configured Google OAuth credentials and redirect URLs.

Ensure:

- `EMAIL_SEND_DELAY_MS` and `MAX_EMAILS_PER_HOUR` are set to realistic values for your use case.
- Required ports are open and TLS is configured as needed.



