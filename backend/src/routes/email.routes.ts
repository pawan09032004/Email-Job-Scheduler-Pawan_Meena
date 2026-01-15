import { Router } from 'express';
import emailController from '../controllers/email.controller';

const router = Router();

/**
 * Email Routes
 * Base path: /api/emails
 */

// Schedule a new email
router.post('/schedule', (req, res) => emailController.scheduleEmail(req, res));

// Get email by ID
router.get('/:id', (req, res) => emailController.getEmail(req, res));

// Get all emails with filters
router.get('/', (req, res) => emailController.getEmails(req, res));

// Get queue statistics
router.get('/stats/queue', (req, res) => emailController.getQueueStats(req, res));

// Recover scheduled emails (restart recovery)
router.post('/recover', (req, res) => emailController.recoverScheduledEmails(req, res));

export default router;
