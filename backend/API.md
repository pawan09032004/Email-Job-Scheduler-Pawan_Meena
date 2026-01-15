# ReachInbox Email Scheduler - API Documentation

## Base URL
```
http://localhost:4000
```

## Endpoints

### 1. Health Check

**GET** `/health`

Check if the API server is running.

**Response:**
```json
{
  "success": true,
  "message": "ReachInbox Email Scheduler API is running",
  "timestamp": "2026-01-14T12:00:00.000Z"
}
```

---

### 2. Schedule Email

**POST** `/api/emails/schedule`

Schedule a new email to be sent at a future time.

**Request Body:**
```json
{
  "toEmail": "recipient@example.com",
  "subject": "Meeting Reminder",
  "body": "Don't forget about our meeting tomorrow at 10 AM",
  "scheduledAt": "2026-01-15T10:00:00.000Z",
  "senderEmail": "sender@example.com"
}
```

**Request Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| toEmail | string | Yes | Recipient email address |
| subject | string | Yes | Email subject line |
| body | string | Yes | Email body content |
| scheduledAt | ISO 8601 string | Yes | When to send the email (future date) |
| senderEmail | string | Yes | Sender email address |

**Success Response (201):**
```json
{
  "success": true,
  "message": "Email scheduled successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "toEmail": "recipient@example.com",
    "subject": "Meeting Reminder",
    "scheduledAt": "2026-01-15T10:00:00.000Z",
    "status": "scheduled",
    "senderEmail": "sender@example.com",
    "createdAt": "2026-01-14T12:00:00.000Z"
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Missing required fields: toEmail, subject, body, scheduledAt, senderEmail"
}
```

**Error Response (500):**
```json
{
  "success": false,
  "error": "Failed to schedule email"
}
```

---

### 3. Get Email by ID

**GET** `/api/emails/:id`

Retrieve details of a specific email.

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | UUID | Email ID |

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "toEmail": "recipient@example.com",
    "subject": "Meeting Reminder",
    "body": "Don't forget about our meeting tomorrow at 10 AM",
    "scheduledAt": "2026-01-15T10:00:00.000Z",
    "sentAt": null,
    "status": "scheduled",
    "senderEmail": "sender@example.com",
    "createdAt": "2026-01-14T12:00:00.000Z"
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "error": "Email not found"
}
```

---

### 4. Get All Emails

**GET** `/api/emails`

Retrieve all emails with optional filters.

**Query Parameters:**
| Parameter | Type | Optional | Description |
|-----------|------|----------|-------------|
| status | string | Yes | Filter by status: `scheduled`, `sent`, `failed` |
| senderEmail | string | Yes | Filter by sender email |
| limit | number | Yes | Maximum number of results |
| offset | number | Yes | Number of results to skip |

**Example Request:**
```
GET /api/emails?status=scheduled&limit=10
```

**Success Response (200):**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "toEmail": "recipient1@example.com",
      "subject": "Email 1",
      "body": "Body 1",
      "scheduledAt": "2026-01-15T10:00:00.000Z",
      "sentAt": null,
      "status": "scheduled",
      "senderEmail": "sender@example.com",
      "createdAt": "2026-01-14T12:00:00.000Z"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "toEmail": "recipient2@example.com",
      "subject": "Email 2",
      "body": "Body 2",
      "scheduledAt": "2026-01-15T11:00:00.000Z",
      "sentAt": null,
      "status": "scheduled",
      "senderEmail": "sender@example.com",
      "createdAt": "2026-01-14T12:05:00.000Z"
    }
  ]
}
```

---

### 5. Get Queue Statistics

**GET** `/api/emails/stats/queue`

Get current statistics about the BullMQ email queue.

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "waiting": 5,
    "active": 2,
    "completed": 150,
    "failed": 3,
    "delayed": 25,
    "total": 185
  }
}
```

**Queue Status Explanation:**
- **waiting**: Jobs ready to be processed
- **active**: Jobs currently being processed
- **completed**: Successfully processed jobs
- **failed**: Failed jobs (will retry)
- **delayed**: Scheduled jobs waiting for their time
- **total**: Total number of jobs

---

### 6. Recover Scheduled Emails

**POST** `/api/emails/recover`

Manually trigger recovery of scheduled emails from the database. This is automatically run on server startup, but can be triggered manually if needed.

**Success Response (200):**
```json
{
  "success": true,
  "message": "Recovered 5 scheduled emails",
  "data": {
    "recoveredCount": 5
  }
}
```

---

## Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 404 | Not Found |
| 500 | Internal Server Error |

---

## Example Usage with cURL

### Schedule an email for 1 hour from now
```bash
SCHEDULED_AT=$(date -u -d "+1 hour" +"%Y-%m-%dT%H:%M:%S.000Z")

curl -X POST http://localhost:4000/api/emails/schedule \
  -H "Content-Type: application/json" \
  -d "{
    \"toEmail\": \"test@example.com\",
    \"subject\": \"Test Email\",
    \"body\": \"This is a test email\",
    \"scheduledAt\": \"$SCHEDULED_AT\",
    \"senderEmail\": \"sender@example.com\"
  }"
```

### Get all scheduled emails
```bash
curl http://localhost:4000/api/emails?status=scheduled
```

### Get queue statistics
```bash
curl http://localhost:4000/api/emails/stats/queue
```

---

## Example Usage with JavaScript/Fetch

```javascript
// Schedule an email
async function scheduleEmail() {
  const response = await fetch('http://localhost:4000/api/emails/schedule', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      toEmail: 'recipient@example.com',
      subject: 'Test Email',
      body: 'This is a test email',
      scheduledAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      senderEmail: 'sender@example.com',
    }),
  });

  const data = await response.json();
  console.log('Scheduled:', data);
}

// Get all emails
async function getEmails() {
  const response = await fetch('http://localhost:4000/api/emails');
  const data = await response.json();
  console.log('Emails:', data);
}

// Get queue stats
async function getQueueStats() {
  const response = await fetch('http://localhost:4000/api/emails/stats/queue');
  const data = await response.json();
  console.log('Queue Stats:', data);
}
```

---

## Rate Limiting Behavior

The system implements hourly rate limiting per sender:
- Default: 200 emails per hour per sender
- Configurable via `MAX_EMAILS_PER_HOUR` env variable
- When limit is reached, emails are automatically rescheduled to the next hour
- No jobs fail due to rate limits
- Rate limiting is distributed across multiple workers using Redis

---

## Idempotency

- Each email gets a unique UUID
- BullMQ jobs use the email UUID as `jobId`
- If the same job is added twice, BullMQ won't create a duplicate
- Safe to call recovery endpoint multiple times
- Restarts won't cause duplicate emails

---

## Worker Architecture

- Worker runs separately from API server
- Start with: `npm run worker`
- Configurable concurrency (default: 5 parallel jobs)
- Minimum delay between emails (default: 2000ms)
- Processes delayed jobs automatically when scheduled time arrives
- Safe to run multiple worker instances
