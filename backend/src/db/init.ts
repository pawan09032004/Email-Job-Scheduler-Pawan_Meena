import { readFileSync } from 'fs';
import { join } from 'path';
import db from '../config/db';

/**
 * Initialize database schema
 * Reads and executes schema.sql
 */
export async function initializeDatabase(): Promise<void> {
  try {
    console.log('📋 Initializing database schema...');
    
    // Read schema.sql file
    const schemaPath = join(__dirname, '../../src/db/schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');
    
    // Execute schema
    await db.query(schema);
    
    console.log('✅ Database schema initialized successfully');
  } catch (error: any) {
    // Check if it's just that tables already exist
    if (error.code === '42P07' || error.message?.includes('already exists')) {
      console.log('✅ Database schema already exists');
    } else {
      console.error('❌ Failed to initialize database schema:', error);
      throw error;
    }
  }
}

export default initializeDatabase;
