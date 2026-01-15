# ReachInbox Email Scheduler - Backend API

Production-grade email scheduling system built with TypeScript, Express.js, BullMQ, PostgreSQL, and Redis.

## 🎯 Features

- ✅ **No Cron Jobs** - Uses BullMQ delayed jobs for scheduling
- ✅ **Restart Safe** - Automatic recovery from PostgreSQL on startup
- ✅ **No Duplicates** - Idempotent job scheduling with UUID-based jobIds
- ✅ **Rate Limiting** - Redis-backed hourly limits per sender (multi-worker safe)
- ✅ **Concurrency Control** - Process multiple emails in parallel
- ✅ **TypeScript** - Full type safety throughout
- ✅ **Docker Ready** - PostgreSQL and Redis via Docker Compose

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- Docker & Docker Compose

### Installation

```bash
# 1. Install dependencies
cd backend
npm install

# 2. Create .env file
cat > .env << EOF
PORT=4000
DATABASE_URL=postgresql://postgres:password@localhost:5432/reachinbox
REDIS_HOST=localhost
REDIS_PORT=6379
WORKER_CONCURRENCY=5
EMAIL_SEND_DELAY_MS=2000
MAX_EMAILS_PER_HOUR=200
EOF

# 3. Start Docker services
docker-compose up -d

# 4. Run API server (Terminal 1)
npm run dev

# 5. Run worker (Terminal 2)
npm run worker
```

## 📚 API Documentation

See **[API.md](API.md)** for complete API endpoint documentation and **[examples.http](examples.http)** for request examples.

## 🔧 Tech Stack

- **Language**: TypeScript
- **Framework**: Express.js
- **Queue**: BullMQ (Redis-backed)
- **Database**: PostgreSQL
- **SMTP**: Ethereal Email (for testing)
- **Redis**: BullMQ + Rate Limiting

## 📊 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/emails/schedule` | POST | Schedule a new email |
| `/api/emails` | GET | List all emails |
| `/api/emails/:id` | GET | Get specific email |
| `/api/emails/stats/queue` | GET | Queue statistics |
| `/api/emails/recover` | POST | Restart recovery |

## 🛠️ NPM Scripts

```bash
npm run build        # Build TypeScript to dist/
npm start            # Run production server
npm run dev          # Run dev server with ts-node
npm run worker       # Run email worker
npm run docker:up    # Start Docker services
npm run docker:down  # Stop Docker services
npm run docker:logs  # View Docker logs
```

## 🔐 Environment Variables

```env
PORT=4000
DATABASE_URL=postgresql://postgres:password@localhost:5432/reachinbox
REDIS_HOST=localhost
REDIS_PORT=6379
WORKER_CONCURRENCY=5
EMAIL_SEND_DELAY_MS=2000
MAX_EMAILS_PER_HOUR=200
```

## 🐛 Troubleshooting

### Docker Services Not Starting
```bash
docker-compose down -v
docker-compose up -d
```

### Database Connection Failed
```bash
docker logs reachinbox_postgres
# Check DATABASE_URL in .env
```

### Redis Connection Failed
```bash
docker logs reachinbox_redis
docker exec -it reachinbox_redis redis-cli ping
```

### Worker Not Processing Jobs
```bash
# Make sure worker is running
npm run worker

# Check queue in Redis
docker exec -it reachinbox_redis redis-cli
KEYS bull:email-queue:*
```

---

**Status**: ✅ Production Ready
