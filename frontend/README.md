## ReachInbox Email Scheduler – Frontend

This is the frontend dashboard for the ReachInbox email scheduling assignment.

It is a Next.js (App Router) + TypeScript + Tailwind CSS application that:

- Provides Google OAuth login via NextAuth.
- Shows a dashboard with scheduled and sent emails.
- Lets users compose new emails (single and CSV bulk upload).
- Talks to the backend API for scheduling and listing emails.


## Tech Stack

- Framework: Next.js (App Router)
- Language: TypeScript
- Styling: Tailwind CSS
- Auth: NextAuth with Google provider
- Data fetching: React Query (@tanstack/react-query)
- Icons: lucide-react


## Project Structure

- `app/`
  - `page.tsx` – Landing page.
  - `login/page.tsx` – Google login page.
  - `dashboard/page.tsx` – Main dashboard after login.
  - `api/auth/[...nextauth]/route.ts` – NextAuth configuration.
  - `layout.tsx`, `globals.css`, `providers.tsx` – App shell and global styles/providers.
- `components/`
  - `Header.tsx` – Top header with branding and logout.
  - `EmailTable.tsx` – Scheduled/Sent table with tabs.
  - `ComposeEmailModal.tsx` – Compose + CSV upload modal.
  - `EmailDetailsModal.tsx` – Per-email details view.
  - `QueueStats.tsx` – Optional queue statistics panel.
  - `ui/*` – Reusable UI primitives (Button, Input, Textarea, Modal, Toast, etc.).
- `hooks/`
  - `useEmails.ts`, `useScheduleEmail.ts`, `useQueueStats.ts`, `useToast.ts`.
- `lib/`
  - `api.ts` – All HTTP calls to the backend.
  - `types.ts` – Shared frontend types.
  - `utils.ts` – CSV parsing, formatting helpers, etc.


## Environment Variables

Create `.env.local` in this `frontend` folder:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000

GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
NEXTAUTH_SECRET=<any-random-secret>
NEXTAUTH_URL=http://localhost:3000
```

Notes:

- `NEXT_PUBLIC_API_BASE_URL` must target the backend API base URL.
- Google OAuth credentials must have redirect URIs including:
  - `http://localhost:3000/api/auth/callback/google`
  - Your production URL equivalent.


## Running the Frontend

```bash
cd frontend
npm install
npm run dev
```

Then open:

- `http://localhost:3000` – landing/login.

Backend prerequisites:

- The backend API should be running at `http://localhost:4000`.
- The worker process should also be running to actually send scheduled emails.


## Authentication Flow

- The login page uses NextAuth with a Google provider.
- `signIn("google", { callbackUrl: "/dashboard" })` initiates OAuth.
- On success:
  - User is redirected to `/dashboard`.
  - Session data exposes `user.name`, `user.email`, `user.image`, etc.
- Session is consumed on the dashboard and in the header to show user-specific info and enable logout (`signOut`).


## Dashboard UI

### Header

- Shows:
  - Product logo/name.
  - Logout button that signs out and redirects to `/login`.


### Dashboard page

- Greets the user by first name.
- Shows the current date.
- Primary actions:
  - Main card with tabs for **Scheduled** and **Sent** emails.
  - Floating “Compose Email” button that opens the compose modal.


### Compose Email Modal

Features:

- **Bulk upload section**
  - Upload CSV (or similar) file via drag-and-drop or click.
  - Parses addresses using `parseCSV`.
  - Shows:
    - Total number of parsed emails.
    - Preview list (first few entries) with the rest collapsed.
  - When CSV is present, the form switches into “bulk mode”.

- **Email details section**
  - For single-email mode:
    - `To Email` input.
  - Shared fields:
    - `Subject`
    - `Body` (with character counter).

- **Scheduling section**
  - `Sender Email`:
    - Pre-filled from the logged-in user’s Google email when available.
  - `Scheduled Time`:
    - `datetime-local` control, must be in the future.
  - Inputs for:
    - `Delay Between Emails (seconds)`
    - `Hourly Limit`
  - Current implementation:
    - These inputs are for UX and visualization.
    - The actual delay and hourly limit are controlled globally via backend env vars `EMAIL_SEND_DELAY_MS` and `MAX_EMAILS_PER_HOUR`.

- **Submit behavior**
  - Single-email:
    - Sends one request to `POST /api/emails/schedule`.
  - Bulk:
    - Iterates over parsed CSV records and sends one request per row (sharing subject/body when missing in CSV).
  - Success & error states are reported via toast notifications.


### Scheduled and Sent Tabs

The `EmailTable` component:

- Uses `useEmails("scheduled")` and `useEmails("sent")` to fetch lists.
- Shows:
  - To (with avatar circle from first letter).
  - Subject.
  - Status pill (`scheduled`, `sent`, `failed`).
  - Time column:
    - Relative time (e.g. “in 3 minutes”, “5 minutes ago”).
    - Exact formatted date/time.
  - Action column:
    - “View details” button that opens `EmailDetailsModal`.
- Includes:
  - Loading skeleton while fetching.
  - Empty state messages when there are no emails for the tab.

Emails automatically refresh at an interval using React Query’s `refetchInterval` to reflect new sends/failures.


## API Integration

All HTTP calls are centralized in `lib/api.ts`:

- `fetchEmails(status)` – `GET /api/emails?status=...`.
- `fetchEmailById(id)` – `GET /api/emails/:id`.
- `fetchQueueStats()` – `GET /api/emails/stats/queue`.
- `scheduleEmail(payload)` – `POST /api/emails/schedule`.
- `recoverFailedEmails()` – `POST /api/emails/recover`.
- `healthCheck()` – `GET /health`.

Hooks wrap these functions for convenient use in components and handle cache invalidation.


## Production Deployment Notes

- Deploy the Next.js app to your preferred host (e.g. Vercel).
- Ensure:
  - `NEXT_PUBLIC_API_BASE_URL` points to your deployed backend.
  - `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `NEXTAUTH_SECRET` are set correctly.
  - Google OAuth redirect URIs match your production domain.
