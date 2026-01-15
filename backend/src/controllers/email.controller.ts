import { Request, Response } from 'express';
import emailService, { ScheduleEmailRequest } from '../services/email.service';
import { getQueueStats } from '../queues/email.queue';

/**
 * Email Controller
 * Handles HTTP requests for email scheduling
 */
class EmailController {
  /**
   * POST /api/emails/schedule
   * Schedule a new email
   */
  async scheduleEmail(req: Request, res: Response): Promise<void> {
    try {
      const { toEmail, subject, body, scheduledAt, senderEmail } = req.body;

      // Validate required fields
      if (!toEmail || !subject || !body || !scheduledAt || !senderEmail) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: toEmail, subject, body, scheduledAt, senderEmail',
        });
        return;
      }

      // Parse scheduledAt to Date
      const scheduledDate = new Date(scheduledAt);
      if (isNaN(scheduledDate.getTime())) {
        res.status(400).json({
          success: false,
          error: 'Invalid scheduledAt date format',
        });
        return;
      }

      // Create schedule request
      const request: ScheduleEmailRequest = {
        toEmail,
        subject,
        body,
        scheduledAt: scheduledDate,
        senderEmail,
      };

      // Schedule email
      const emailRecord = await emailService.scheduleEmail(request);

      res.status(201).json({
        success: true,
        message: 'Email scheduled successfully',
        data: {
          id: emailRecord.id,
          toEmail: emailRecord.toEmail,
          subject: emailRecord.subject,
          scheduledAt: emailRecord.scheduledAt,
          status: emailRecord.status,
          senderEmail: emailRecord.senderEmail,
          createdAt: emailRecord.createdAt,
        },
      });
    } catch (error: any) {
      console.error('❌ Schedule email error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to schedule email',
      });
    }
  }

  /**
   * GET /api/emails/:id
   * Get email by ID
   */
  async getEmail(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const email = await emailService.getEmailById(id as string);

      if (!email) {
        res.status(404).json({
          success: false,
          error: 'Email not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: email,
      });
    } catch (error: any) {
      console.error('❌ Get email error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get email',
      });
    }
  }

  /**
   * GET /api/emails
   * Get all emails with optional filters
   * Query params: status, senderEmail, limit, offset
   */
  async getEmails(req: Request, res: Response): Promise<void> {
    try {
      const { status, senderEmail, limit, offset } = req.query;

      const filters: any = {};

      if (status) {
        filters.status = status as string;
      }

      if (senderEmail) {
        filters.senderEmail = senderEmail as string;
      }

      if (limit) {
        filters.limit = parseInt(limit as string, 10);
      }

      if (offset) {
        filters.offset = parseInt(offset as string, 10);
      }

      const emails = await emailService.getEmails(filters);

      res.status(200).json({
        success: true,
        count: emails.length,
        data: emails,
      });
    } catch (error: any) {
      console.error('❌ Get emails error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get emails',
      });
    }
  }

  /**
   * GET /api/emails/stats/queue
   * Get queue statistics
   */
  async getQueueStats(_req: Request, res: Response): Promise<void> {
    try {
      const stats = await getQueueStats();

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      console.error('❌ Get queue stats error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get queue stats',
      });
    }
  }

  /**
   * POST /api/emails/recover
   * Recover scheduled emails after restart
   */
  async recoverScheduledEmails(_req: Request, res: Response): Promise<void> {
    try {
      const recoveredCount = await emailService.recoverScheduledEmails();

      res.status(200).json({
        success: true,
        message: `Recovered ${recoveredCount} scheduled emails`,
        data: {
          recoveredCount,
        },
      });
    } catch (error: any) {
      console.error('❌ Recover emails error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to recover emails',
      });
    }
  }

  /**
   * GET /health
   * Health check endpoint
   */
  async healthCheck(_req: Request, res: Response): Promise<void> {
    res.status(200).json({
      success: true,
      message: 'ReachInbox Email Scheduler API is running',
      timestamp: new Date().toISOString(),
    });
  }
}

// Singleton instance
const emailController = new EmailController();

export default emailController;
