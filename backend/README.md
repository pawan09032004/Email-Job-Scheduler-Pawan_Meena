## ReachInbox Email Scheduler – Backend

This backend is a TypeScript + Express.js + BullMQ service that:

- Exposes REST APIs to schedule and list emails.
- Persists email state in PostgreSQL.
- Uses BullMQ delayed jobs (no cron) for future sends.
- Sends emails via Ethereal SMTP.
- Enforces concurrency, a minimum delay between sends, and per-sender hourly rate limiting using Redis.


## Tech Stack

- Language: TypeScript
- Framework: Express.js
- Queue: BullMQ (Redis-backed)
- Database: PostgreSQL
- Cache/Rate-limiter store: Redis
- SMTP: Nodemailer with Ethereal test accounts


## Project Structure

- `src/app.ts` – Express app wiring, middleware, routes.
- `src/server.ts` – Bootstraps HTTP server.
- `src/config/` – Environment, DB and Redis config.
- `src/db/schema.sql` – Database schema for `emails` table.
- `src/controllers/email.controller.ts` – HTTP handlers.
- `src/routes/email.routes.ts` – Email routes.
- `src/services/email.service.ts` – Business logic for scheduling, listing, and recovering emails.
- `src/queues/email.queue.ts` – BullMQ queue configuration and helper functions.
- `src/workers/email.worker.ts` – Worker that processes jobs, applies rate limiting and sends emails.


## Environment Variables

Create a `.env` file in this `backend` folder:

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

- `WORKER_CONCURRENCY` controls how many emails each worker can process in parallel.
- `EMAIL_SEND_DELAY_MS` is the minimum delay between individual sends per worker (for example, 2000 ms = 2 seconds).
- `MAX_EMAILS_PER_HOUR` is the hourly send limit per sender email address, enforced via Redis.


## Database Schema

The core table is `emails` (see `src/db/schema.sql`):

- `id` (UUID, PK) – logical id for both DB row and queue job.
- `to_email`, `sender_email` – recipient and sender addresses.
- `subject`, `body`.
- `scheduled_at` – time the email should be sent.
- `sent_at` – time it was actually sent (nullable).
- `status` – `scheduled | sent | failed`.
- `created_at`.

Indexes are created on `scheduled_at`, `status`, `sender_email`, and `(status, scheduled_at)` to support queries and restart recovery.


## Scheduling Design

Request flow:

1. Client calls `POST /api/emails/schedule` with:
   - `toEmail`, `subject`, `body`, `scheduledAt`, `senderEmail`.
2. `EmailService.scheduleEmail`:
   - Validates the payload.
   - Starts a DB transaction.
   - Inserts a row into `emails` with status `scheduled`.
   - Commits the transaction.
3. After commit, the service adds a job to the BullMQ `email-queue` with:
   - `jobId = emailId` (the UUID from the DB).
   - `delay = scheduledAt - now`.

Key properties:

- Jobs are delayed in Redis; no cron or OS scheduler is used.
- `jobId = emailId` guarantees idempotency: adding the same job twice will not create duplicates.


## Worker, Concurrency and Delay Between Emails

The worker is created in `src/workers/email.worker.ts` and is usually started via:

```bash
npm run worker
```

Configuration:

- `concurrency = WORKER_CONCURRENCY` (from env).
- BullMQ `limiter` uses:
  - `max = WORKER_CONCURRENCY`
  - `duration = EMAIL_SEND_DELAY_MS`
- Before sending each email, the worker also waits:

```ts
await new Promise(resolve => setTimeout(resolve, config.worker.emailSendDelayMs));
```

This ensures:

- Multiple jobs can be processed in parallel (configurable).
- There is a minimum delay between sends to avoid hammering the SMTP provider.


## Rate Limiting Strategy

Rate limiting is implemented per sender email (`senderEmail`) and per hour using Redis.

- Key format: `email_rate:{senderEmail}:{YYYY-MM-DD-HH}`.
- On each attempt:
  - Read current count from Redis.
  - If it is below `MAX_EMAILS_PER_HOUR`:
    - Increment (`INCR`) and set `EXPIRE 3600` seconds on first use.
    - Proceed with sending.
  - If it is at or above `MAX_EMAILS_PER_HOUR`:
    - The job is not failed.
    - The DB row’s `scheduled_at` is updated to the next hour start.
    - The job is moved to delayed state with the corresponding delay.

This makes the rate limit:

- Redis-backed and safe across multiple workers/instances.
- Per-sender (multi-tenant ready).
- Non-dropping: jobs are rescheduled instead of failing.


## Restart and Recovery

The queue is persisted in Redis, but the ultimate source of truth is PostgreSQL.

- On restart of the API or worker:
  - BullMQ reconnects to Redis and resumes from persisted jobs.
- For extra safety, an endpoint `POST /api/emails/recover` runs:
  - It queries all `status = 'scheduled'` emails with `scheduled_at > NOW()`.
  - For each email, checks whether a job exists in BullMQ for that `id`.
  - If missing, re-adds the job with `jobId = emailId` and proper delay.

Because of the idempotent job ids, recovery never creates duplicates.


## API Endpoints

Base URL: `http://localhost:4000`

- `GET /health` – Basic health check.
- `POST /api/emails/schedule` – Schedule a new email.
- `GET /api/emails` – List emails, supports filters:
  - `status` (`scheduled | sent | failed`)
  - `senderEmail`
  - `limit`, `offset`
- `GET /api/emails/:id` – Get a single email by id.
- `GET /api/emails/stats/queue` – Returns queue metrics (waiting, active, delayed, completed, failed).
- `POST /api/emails/recover` – Triggers scheduled email recovery from DB to queue.

The `examples.http` file in this folder contains ready-to-use HTTP examples for local development.


## Local Development

### Prerequisites

- Node.js 18+
- Docker + Docker Compose


### Steps

```bash
cd backend

# Install dependencies
npm install

# Start PostgreSQL + Redis
docker-compose up -d

# Run API server
npm run dev

# In another terminal, run the worker
npm run worker
```

The server will be available at `http://localhost:4000`.


## NPM Scripts

```bash
npm run build        # Build TypeScript into dist/
npm start            # Run production server from dist/
npm run dev          # Run dev server with ts-node
npm run worker       # Run email worker
npm run docker:up    # Start Docker services (PostgreSQL + Redis)
npm run docker:down  # Stop Docker services
npm run docker:logs  # Tail Docker logs
```


## Troubleshooting

- **Docker services not starting**

  ```bash
  docker-compose down -v
  docker-compose up -d
  ```

- **Database connection failed**

  ```bash
  docker logs reachinbox_postgres
  # Check DATABASE_URL in .env
  ```

- **Redis connection failed**

  ```bash
  docker logs reachinbox_redis
  docker exec -it reachinbox_redis redis-cli ping
  ```

- **Worker not processing jobs**

  ```bash
  # Ensure worker is running
  npm run worker

  # Inspect queue keys in Redis
  docker exec -it reachinbox_redis redis-cli
  KEYS bull:email-queue:*
  ```
