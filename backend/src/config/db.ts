import { Pool, PoolClient } from 'pg';
import config from './env';

/**
 * PostgreSQL connection pool
 * - Automatically manages connections
 * - Survives server restarts
 * - Source of truth for email scheduling state
 */
class Database {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: config.databaseUrl,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('error', (err: Error) => {
      console.error('Unexpected PostgreSQL pool error:', err);
    });
  }

  /**
   * Get a client from the pool
   */
  async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  /**
   * Execute a query directly (for simple queries)
   */
  async query(text: string, params?: any[]) {
    return await this.pool.query(text, params);
  }

  /**
   * Close all connections (for graceful shutdown)
   */
  async close(): Promise<void> {
    await this.pool.end();
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.query('SELECT NOW()');
      console.log('✅ Database connected successfully at:', result.rows[0].now);
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      return false;
    }
  }
}

// Singleton instance
const db = new Database();

export default db;
