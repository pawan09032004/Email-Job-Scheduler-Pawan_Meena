import createApp from './app';
import config from './config/env';
import db from './config/db';
import redisClient from './config/redis';
import emailService from './services/email.service';
import initializeDatabase from './db/init';

/**
 * Server Entry Point
 * - Initializes database and Redis connections
 * - Creates database schema if needed
 * - Starts Express server
 * - Recovers scheduled emails on startup
 * - Handles graceful shutdown
 */

async function startServer() {
  try {
    console.log('🚀 Starting ReachInbox Email Scheduler API...\n');

    // Test database connection
    console.log('📦 Connecting to PostgreSQL...');
    const dbConnected = await db.testConnection();
    if (!dbConnected) {
      throw new Error('Failed to connect to PostgreSQL');
    }

    // Test Redis connection
    console.log('🔴 Connecting to Redis...');
    const redisConnected = await redisClient.testConnection();
    if (!redisConnected) {
      throw new Error('Failed to connect to Redis');
    }

    // Initialize database schema
    await initializeDatabase();

    // Recover scheduled emails from database (restart safety)
    console.log('\n♻️ Recovering scheduled emails...');
    const recoveredCount = await emailService.recoverScheduledEmails();
    console.log(`✅ Recovered ${recoveredCount} scheduled emails\n`);

    // Create Express app
    const app = createApp();

    // Start server
    const server = app.listen(config.port, () => {
      console.log('\n✅ ReachInbox Email Scheduler API is running');
      console.log(`🌐 Server: http://localhost:${config.port}`);
      console.log(`🏥 Health: http://localhost:${config.port}/health`);
      console.log(`📧 API: http://localhost:${config.port}/api/emails`);
      console.log(`\n⚙️  Config: Concurrency=${config.worker.concurrency}, Delay=${config.worker.emailSendDelayMs}ms, MaxPerHour=${config.worker.maxEmailsPerHour}`);
      console.log('💡 Start worker: npm run worker\n');
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      
      server.close(async () => {
        console.log('✅ HTTP server closed');
        
        try {
          await db.close();
          console.log('✅ Database connection closed');
          
          await redisClient.close();
          console.log('✅ Redis connection closed');
          
          console.log('👋 Shutdown complete');
          process.exit(0);
        } catch (error) {
          console.error('❌ Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('⚠️ Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start server
startServer();
