import { Worker, Job } from 'bullmq';
import nodemailer from 'nodemailer';
import redisClient from '../config/redis';
import db from '../config/db';
import config from '../config/env';
import { EmailJobData } from '../queues/email.queue';

/**
 * Email Worker with Rate Limiting and Concurrency Control
 * 
 * KEY FEATURES:
 * - Configurable concurrency (multiple emails in parallel)
 * - Minimum delay between emails (EMAIL_SEND_DELAY_MS)
 * - Hourly rate limiting per sender (Redis-backed, safe across workers)
 * - Automatic rescheduling when rate limit reached
 * - Idempotent job processing (no duplicates)
 * - Survives restarts (jobs persist in Redis)
 */

/**
 * Create Ethereal SMTP transporter
 * Ethereal is a fake SMTP service for testing
 */
async function createEmailTransporter() {
  // Create test account (in production, use real SMTP credentials)
  const testAccount = await nodemailer.createTestAccount();

  const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  return { transporter, testAccount };
}

/**
 * Rate Limiting using Redis
 * - Key format: email_rate:{sender}:{YYYY-MM-DD-HH}
 * - Atomic increment operation (safe across multiple workers)
 * - Automatic expiry after 1 hour
 */
class RateLimiter {
  private redis = redisClient.getClient();
  private maxEmailsPerHour = config.worker.maxEmailsPerHour;

  /**
   * Get current hour key for rate limiting
   */
  private getCurrentHourKey(senderEmail: string): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    
    return `email_rate:${senderEmail}:${year}-${month}-${day}-${hour}`;
  }

  /**
   * Get next hour timestamp
   */
  private getNextHourTimestamp(): Date {
    const nextHour = new Date();
    nextHour.setHours(nextHour.getHours() + 1);
    nextHour.setMinutes(0);
    nextHour.setSeconds(0);
    nextHour.setMilliseconds(0);
    return nextHour;
  }

  /**
   * Check if sender can send email (under rate limit)
   * If allowed, increments counter atomically
   * 
   * @returns { allowed: boolean, nextAvailableAt?: Date }
   */
  async checkAndIncrement(senderEmail: string): Promise<{ allowed: boolean; nextAvailableAt?: Date }> {
    const key = this.getCurrentHourKey(senderEmail);
    
    // Get current count
    const currentCount = await this.redis.get(key);
    const count = currentCount ? parseInt(currentCount, 10) : 0;

    // Check if rate limit exceeded
    if (count >= this.maxEmailsPerHour) {
      console.log(`⚠️ Rate limit reached for ${senderEmail}: ${count}/${this.maxEmailsPerHour}`);
      return {
        allowed: false,
        nextAvailableAt: this.getNextHourTimestamp(),
      };
    }

    // Atomically increment counter
    const newCount = await this.redis.incr(key);
    
    // Set expiry to 1 hour if this is the first email in this hour
    if (newCount === 1) {
      await this.redis.expire(key, 3600); // 1 hour in seconds
    }

    console.log(`✅ Rate limit check passed for ${senderEmail}: ${newCount}/${this.maxEmailsPerHour}`);
    
    return { allowed: true };
  }
}

/**
 * Email sending logic with error handling
 */
async function sendEmail(data: EmailJobData): Promise<{ success: boolean; messageUrl?: string; error?: string }> {
  try {
    const { transporter, testAccount } = await createEmailTransporter();

    const info = await transporter.sendMail({
      from: `"ReachInbox" <${data.senderEmail}>`,
      to: data.toEmail,
      subject: data.subject,
      text: data.body,
      html: `<p>${data.body}</p>`,
    });

    // Get Ethereal preview URL
    const messageUrl = nodemailer.getTestMessageUrl(info);

    console.log(`📬 Email sent: ${data.emailId}`);
    console.log(`📧 Preview URL: ${messageUrl}`);
    console.log(`🔑 Ethereal Account - User: ${testAccount.user}, Pass: ${testAccount.pass}`);

    return { success: true, messageUrl: messageUrl || undefined };
  } catch (error: any) {
    console.error(`❌ Email send failed: ${data.emailId}`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Update email status in database
 */
async function updateEmailStatus(
  emailId: string,
  status: 'sent' | 'failed',
  sentAt?: Date
): Promise<void> {
  try {
    const query = `
      UPDATE emails 
      SET status = $1, sent_at = $2, updated_at = NOW()
      WHERE id = $3
    `;
    
    await db.query(query, [status, sentAt || null, emailId]);
    console.log(`📝 Email status updated: ${emailId} -> ${status}`);
  } catch (error) {
    console.error(`❌ Failed to update email status: ${emailId}`, error);
    throw error;
  }
}

/**
 * Reschedule email to next available hour
 */
async function rescheduleEmail(emailId: string, nextAvailableAt: Date): Promise<void> {
  try {
    const query = `
      UPDATE emails 
      SET scheduled_at = $1
      WHERE id = $2
    `;
    
    await db.query(query, [nextAvailableAt, emailId]);
    console.log(`⏰ Email rescheduled: ${emailId} to ${nextAvailableAt}`);
  } catch (error) {
    console.error(`❌ Failed to reschedule email: ${emailId}`, error);
    throw error;
  }
}

/**
 * Worker process function
 * Handles each email job with rate limiting and concurrency control
 */
async function processEmailJob(job: Job<EmailJobData>): Promise<void> {
  const data = job.data;
  
  console.log(`🔄 Processing email job: ${data.emailId} to ${data.toEmail}`);

  // Rate limiting check
  const rateLimiter = new RateLimiter();
  const rateLimitCheck = await rateLimiter.checkAndIncrement(data.senderEmail);

  if (!rateLimitCheck.allowed) {
    // Rate limit exceeded - reschedule to next hour
    console.log(`⏸️ Rate limit exceeded for ${data.senderEmail}. Rescheduling...`);
    
    if (rateLimitCheck.nextAvailableAt) {
      await rescheduleEmail(data.emailId, rateLimitCheck.nextAvailableAt);
      
      // Calculate delay to next hour
      const delay = rateLimitCheck.nextAvailableAt.getTime() - Date.now();
      
      // Re-add job with new delay (idempotent due to jobId)
      await job.updateData({
        ...data,
        scheduledAt: rateLimitCheck.nextAvailableAt,
      });
      
      // Move job to delayed state
      await job.changeDelay(delay);
      
      console.log(`⏰ Job rescheduled to ${rateLimitCheck.nextAvailableAt}`);
      return; // Don't mark as failed
    }
  }

  // Minimum delay between emails (prevent overwhelming SMTP server)
  await new Promise(resolve => setTimeout(resolve, config.worker.emailSendDelayMs));

  // Send email
  const result = await sendEmail(data);

  if (result.success) {
    // Update database to 'sent'
    await updateEmailStatus(data.emailId, 'sent', new Date());
    console.log(`✅ Email job completed: ${data.emailId}`);
  } else {
    // Update database to 'failed'
    await updateEmailStatus(data.emailId, 'failed');
    console.log(`❌ Email job failed: ${data.emailId}`);
    throw new Error(result.error || 'Email send failed');
  }
}

/**
 * Create and start the worker
 */
export function startWorker(): Worker<EmailJobData> {
  const worker = new Worker<EmailJobData>(
    'email-queue',
    processEmailJob,
    {
      connection: redisClient.createConnection(),
      concurrency: config.worker.concurrency, // Process multiple emails in parallel
      limiter: {
        max: config.worker.concurrency,
        duration: config.worker.emailSendDelayMs,
      },
    }
  );

  // Worker event handlers
  worker.on('completed', (job) => {
    console.log(`✅ Job completed: ${job.id}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ Job failed: ${job?.id}`, err);
  });

  worker.on('error', (err) => {
    console.error('❌ Worker error:', err);
  });

  worker.on('ready', () => {
    console.log('🚀 Email worker is ready and listening for jobs...');
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('Shutting down worker...');
    await worker.close();
    await db.close();
    await redisClient.close();
  });

  return worker;
}

// Start worker if this file is executed directly
if (require.main === module) {
  console.log('🚀 Starting email worker...');
  console.log(`⚙️ Concurrency: ${config.worker.concurrency}`);
  console.log(`⏱️ Email delay: ${config.worker.emailSendDelayMs}ms`);
  console.log(`📊 Max emails per hour: ${config.worker.maxEmailsPerHour}`);
  
  startWorker();
}

export default { startWorker, processEmailJob };
