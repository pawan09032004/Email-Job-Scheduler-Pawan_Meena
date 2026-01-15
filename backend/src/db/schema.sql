-- Email status enum
CREATE TYPE email_status AS ENUM ('scheduled', 'sent', 'failed');

-- Emails table - Source of truth for all scheduled/sent emails
CREATE TABLE IF NOT EXISTS emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    to_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    scheduled_at TIMESTAMP NOT NULL,
    sent_at TIMESTAMP,
    status email_status NOT NULL DEFAULT 'scheduled',
    sender_email TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Indexes for common queries
    CONSTRAINT valid_email_format CHECK (to_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_sender_format CHECK (sender_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Index on scheduled_at for efficient querying of pending emails
CREATE INDEX IF NOT EXISTS idx_emails_scheduled_at ON emails(scheduled_at);

-- Index on status for filtering by email state
CREATE INDEX IF NOT EXISTS idx_emails_status ON emails(status);

-- Index on sender_email for rate limiting queries
CREATE INDEX IF NOT EXISTS idx_emails_sender_email ON emails(sender_email);

-- Composite index for restart recovery queries
CREATE INDEX IF NOT EXISTS idx_emails_status_scheduled_at ON emails(status, scheduled_at);
