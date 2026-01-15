import { Queue, QueueOptions } from 'bullmq';
import redisClient from '../config/redis';

/**
 * Email job data structure
 */
export interface EmailJobData {
  emailId: string; // UUID from database
  toEmail: string;
  subject: string;
  body: string;
  senderEmail: string;
  scheduledAt: Date;
}

/**
 * BullMQ Queue Configuration
 * - Jobs persist in Redis (survives server restarts)
 * - jobId equals DB email id (ensures idempotency - no duplicates)
 * - Delayed jobs for scheduled emails
 */
const queueOptions: QueueOptions = {
  connection: redisClient.createConnection(),
  defaultJobOptions: {
    attempts: 3, // Retry failed jobs up to 3 times
    backoff: {
      type: 'exponential',
      delay: 5000, // Start with 5 second delay
    },
    removeOnComplete: true, // Clean up successful jobs
    removeOnFail: false, // Keep failed jobs for debugging
  },
};

/**
 * Email Queue
 * - Single queue for all scheduled emails
 * - Uses delayed jobs (not cron jobs)
 */
export const emailQueue = new Queue<EmailJobData>('email-queue', queueOptions);

/**
 * Add a scheduled email to the queue
 * @param emailData - Email details from database
 * @returns Job ID (same as email DB ID)
 */
export async function scheduleEmail(emailData: EmailJobData): Promise<string> {
  const delay = emailData.scheduledAt.getTime() - Date.now();

  // Ensure the email is scheduled in the future
  if (delay < 0) {
    throw new Error('Cannot schedule emails in the past');
  }

  /**
   * CRITICAL: jobId MUST equal database email id
   * - Prevents duplicate jobs on restart
   * - If job already exists, BullMQ won't create duplicate
   * - Enables idempotent scheduling
   */
  const job = await emailQueue.add(
    'send-email',
    emailData,
    {
      jobId: emailData.emailId, // Idempotency key
      delay, // Delay in milliseconds
    }
  );

  console.log(`📧 Email scheduled: ${emailData.emailId} to ${emailData.toEmail} at ${emailData.scheduledAt}`);
  
  return job.id || emailData.emailId;
}

/**
 * Check if a job already exists (for restart recovery)
 */
export async function jobExists(emailId: string): Promise<boolean> {
  const job = await emailQueue.getJob(emailId);
  return job !== undefined;
}

/**
 * Remove a job from the queue (if cancellation is needed)
 */
export async function removeJob(emailId: string): Promise<void> {
  const job = await emailQueue.getJob(emailId);
  if (job) {
    await job.remove();
    console.log(`🗑️ Job removed: ${emailId}`);
  }
}

/**
 * Get queue metrics
 */
export async function getQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    emailQueue.getWaitingCount(),
    emailQueue.getActiveCount(),
    emailQueue.getCompletedCount(),
    emailQueue.getFailedCount(),
    emailQueue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
  };
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Closing email queue...');
  await emailQueue.close();
});

export default emailQueue;
