import { v4 as uuidv4 } from 'uuid';
import db from '../config/db';
import { scheduleEmail, jobExists, EmailJobData } from '../queues/email.queue';

/**
 * Email scheduling request interface
 */
export interface ScheduleEmailRequest {
  toEmail: string;
  subject: string;
  body: string;
  scheduledAt: Date;
  senderEmail: string;
}

/**
 * Email record from database
 */
export interface EmailRecord {
  id: string;
  toEmail: string;
  subject: string;
  body: string;
  scheduledAt: Date;
  sentAt: Date | null;
  status: 'scheduled' | 'sent' | 'failed';
  senderEmail: string;
  createdAt: Date;
}

/**
 * Email Service
 * Handles business logic for email scheduling
 * - Persists emails to database (source of truth)
 * - Schedules jobs in BullMQ
 * - Ensures idempotency and restart safety
 */
class EmailService {
  /**
   * Schedule a new email
   * - Saves to database first (atomic transaction)
   * - Then schedules BullMQ job with same ID (idempotency)
   * 
   * @param request - Email scheduling request
   * @returns Email record from database
   */
  async scheduleEmail(request: ScheduleEmailRequest): Promise<EmailRecord> {
    // Validation
    this.validateEmail(request);

    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      // Generate UUID for email
      const emailId = uuidv4();

      // Insert email into database (source of truth)
      const insertQuery = `
        INSERT INTO emails (id, to_email, subject, body, scheduled_at, sender_email, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;

      const result = await client.query(insertQuery, [
        emailId,
        request.toEmail,
        request.subject,
        request.body,
        request.scheduledAt,
        request.senderEmail,
        'scheduled',
      ]);

      const emailRecord = this.mapRowToEmailRecord(result.rows[0]);

      await client.query('COMMIT');

      // Schedule job in BullMQ (idempotent - jobId = emailId)
      const jobData: EmailJobData = {
        emailId: emailRecord.id,
        toEmail: emailRecord.toEmail,
        subject: emailRecord.subject,
        body: emailRecord.body,
        senderEmail: emailRecord.senderEmail,
        scheduledAt: emailRecord.scheduledAt,
      };

      await scheduleEmail(jobData);

      console.log(`✅ Email scheduled successfully: ${emailRecord.id}`);
      
      return emailRecord;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Failed to schedule email:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get email by ID
   */
  async getEmailById(emailId: string): Promise<EmailRecord | null> {
    try {
      const query = 'SELECT * FROM emails WHERE id = $1';
      const result = await db.query(query, [emailId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToEmailRecord(result.rows[0]);
    } catch (error) {
      console.error(`❌ Failed to get email: ${emailId}`, error);
      throw error;
    }
  }

  /**
   * Get all emails with optional filters
   */
  async getEmails(filters?: {
    status?: 'scheduled' | 'sent' | 'failed';
    senderEmail?: string;
    limit?: number;
    offset?: number;
  }): Promise<EmailRecord[]> {
    try {
      let query = 'SELECT * FROM emails WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (filters?.status) {
        query += ` AND status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }

      if (filters?.senderEmail) {
        query += ` AND sender_email = $${paramIndex}`;
        params.push(filters.senderEmail);
        paramIndex++;
      }

      query += ' ORDER BY scheduled_at DESC';

      if (filters?.limit) {
        query += ` LIMIT $${paramIndex}`;
        params.push(filters.limit);
        paramIndex++;
      }

      if (filters?.offset) {
        query += ` OFFSET $${paramIndex}`;
        params.push(filters.offset);
      }

      const result = await db.query(query, params);
      return result.rows.map((row: any) => this.mapRowToEmailRecord(row));
    } catch (error) {
      console.error('❌ Failed to get emails:', error);
      throw error;
    }
  }

  /**
   * Recover scheduled emails on restart
   * - Finds all 'scheduled' emails from database
   * - Reschedules them in BullMQ if job doesn't exist
   * - Ensures no duplicate jobs (idempotent)
   */
  async recoverScheduledEmails(): Promise<number> {
    try {
      // Get all scheduled emails from database
      const query = `
        SELECT * FROM emails 
        WHERE status = 'scheduled' 
        AND scheduled_at > NOW()
        ORDER BY scheduled_at ASC
      `;

      const result = await db.query(query);
      const scheduledEmails = result.rows.map((row: any) => this.mapRowToEmailRecord(row));

      console.log(`🔍 Found ${scheduledEmails.length} scheduled emails to recover`);

      let recoveredCount = 0;

      for (const email of scheduledEmails) {
        // Check if job already exists in BullMQ
        const exists = await jobExists(email.id);

        if (!exists) {
          // Job doesn't exist, reschedule it
          const jobData: EmailJobData = {
            emailId: email.id,
            toEmail: email.toEmail,
            subject: email.subject,
            body: email.body,
            senderEmail: email.senderEmail,
            scheduledAt: email.scheduledAt,
          };

          await scheduleEmail(jobData);
          recoveredCount++;
          console.log(`♻️ Recovered email job: ${email.id}`);
        }
      }

      console.log(`✅ Recovery complete: ${recoveredCount} jobs recovered`);
      return recoveredCount;
    } catch (error) {
      console.error('❌ Failed to recover scheduled emails:', error);
      throw error;
    }
  }

  /**
   * Validate email scheduling request
   */
  private validateEmail(request: ScheduleEmailRequest): void {
    if (!request.toEmail || !this.isValidEmail(request.toEmail)) {
      throw new Error('Invalid recipient email address');
    }

    if (!request.senderEmail || !this.isValidEmail(request.senderEmail)) {
      throw new Error('Invalid sender email address');
    }

    if (!request.subject || request.subject.trim().length === 0) {
      throw new Error('Email subject is required');
    }

    if (!request.body || request.body.trim().length === 0) {
      throw new Error('Email body is required');
    }

    if (!request.scheduledAt || !(request.scheduledAt instanceof Date)) {
      throw new Error('Invalid scheduled date');
    }

    if (request.scheduledAt.getTime() <= Date.now()) {
      throw new Error('Scheduled date must be in the future');
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    return emailRegex.test(email);
  }

  /**
   * Map database row to EmailRecord
   */
  private mapRowToEmailRecord(row: any): EmailRecord {
    return {
      id: row.id,
      toEmail: row.to_email,
      subject: row.subject,
      body: row.body,
      scheduledAt: new Date(row.scheduled_at),
      sentAt: row.sent_at ? new Date(row.sent_at) : null,
      status: row.status,
      senderEmail: row.sender_email,
      createdAt: new Date(row.created_at),
    };
  }
}

// Singleton instance
const emailService = new EmailService();

export default emailService;
