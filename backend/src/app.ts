import express, { Application, Request, Response, NextFunction } from 'express';
import emailRoutes from './routes/email.routes';
import emailController from './controllers/email.controller';

/**
 * Express Application Setup
 * - RESTful API for email scheduling
 * - Error handling middleware
 * - CORS enabled
 * - JSON body parsing
 */
export function createApp(): Application {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // CORS (allow all origins for testing)
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    
    next();
  });

  // Health check endpoint
  app.get('/health', (req, res) => emailController.healthCheck(req, res));

  // API Routes
  app.use('/api/emails', emailRoutes);

  // Root endpoint
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'ReachInbox Email Scheduler API',
      version: '1.0.0',
      endpoints: {
        health: 'GET /health',
        scheduleEmail: 'POST /api/emails/schedule',
        getEmail: 'GET /api/emails/:id',
        getEmails: 'GET /api/emails',
        queueStats: 'GET /api/emails/stats/queue',
        recoverEmails: 'POST /api/emails/recover',
      },
    });
  });

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: 'Endpoint not found',
      path: req.path,
    });
  });

  // Global error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('❌ Unhandled error:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: err.message,
    });
  });

  return app;
}

export default createApp;
