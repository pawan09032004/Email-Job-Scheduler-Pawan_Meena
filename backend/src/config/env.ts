import dotenv from 'dotenv';

dotenv.config();

interface Config {
  port: number;
  databaseUrl: string;
  redis: {
    host: string;
    port: number;
  };
  worker: {
    concurrency: number;
    emailSendDelayMs: number;
    maxEmailsPerHour: number;
  };
}

const config: Config = {
  port: parseInt(process.env.PORT || '4000', 10),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/reachinbox',
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  worker: {
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
    emailSendDelayMs: parseInt(process.env.EMAIL_SEND_DELAY_MS || '2000', 10),
    maxEmailsPerHour: parseInt(process.env.MAX_EMAILS_PER_HOUR || '200', 10),
  },
};

export default config;
