// Load environment variables FIRST (before any imports)
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local explicitly
config({ path: resolve(process.cwd(), '.env.local') });

import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not defined in .env.local');
  console.error('Current working directory:', process.cwd());
  console.error('Looking for .env.local at:', resolve(process.cwd(), '.env.local'));
  throw new Error("DATABASE_URL is not defined");
}

// Create Neon client
const sql = neon(process.env.DATABASE_URL);

// Create Drizzle instance
export const db = drizzle(sql, { 
  schema,
  logger: process.env.NODE_ENV === 'development'
});

// Export schema for use in other files
export { schema };

// Test database connection
export async function testConnection() {
  try {
    await sql`SELECT 1 as test`;
    console.log('✅ Database connection established successfully');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}
