/**
 * Test Database Connection
 * Quick script to verify DATABASE_URL is correct
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

console.log('🔍 Testing database connection...\n');

console.log('Environment variables:');
console.log('  DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Not set');
console.log('  NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL || 'Not set');
console.log('');

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set in .env.local');
  console.error('\n💡 Create a .env.local file with:');
  console.error('   DATABASE_URL="postgresql://user:pass@host/database"');
  process.exit(1);
}

// Try to connect
import { db } from './lib/db';
import { users } from './lib/db/schema';

async function testConnection() {
  try {
    console.log('📡 Attempting to connect to database...');
    console.log(`   URL: ${process.env.DATABASE_URL?.substring(0, 40)}...`);
    console.log('');
    
    // Try a simple query
    const result = await db.select().from(users).limit(1);
    
    console.log('✅ Database connection successful!');
    console.log(`   Found ${result.length} user(s) in database`);
    console.log('');
    
    if (result.length > 0) {
      console.log('Sample user:');
      console.log(`   Email: ${result[0].email}`);
      console.log(`   Role: ${result[0].role}`);
    }
    
  } catch (error: any) {
    console.error('❌ Database connection failed!');
    console.error('');
    console.error('Error details:');
    console.error(`   Message: ${error.message}`);
    console.error(`   Code: ${error.code}`);
    console.error('');
    
    if (error.message.includes('fetch failed')) {
      console.error('💡 Possible causes:');
      console.error('   1. DATABASE_URL is incorrect');
      console.error('   2. Database server is not accessible');
      console.error('   3. Firewall blocking connection');
      console.error('   4. SSL/TLS certificate issues');
      console.error('');
      console.error('💡 Check your .env.local file:');
      console.error('   - Make sure DATABASE_URL is correct');
      console.error('   - For Neon, it should look like:');
      console.error('     postgresql://user:pass@ep-xxx.region.aws.neon.tech/dbname?sslmode=require');
    }
    
    throw error;
  }
}

testConnection()
  .then(() => {
    console.log('✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed');
    process.exit(1);
  });
