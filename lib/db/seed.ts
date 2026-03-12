/**
 * Seed Script for OneGate EFT
 * 
 * Creates admin and merchant users with Better Auth integration
 * 
 * IMPORTANT: This script uses Better Auth API to create users properly.
 * Make sure your dev server is running on http://localhost:3000
 * 
 * Usage: npm run db:seed
 */

import * as dotenv from 'dotenv';

// Load environment variables
const envFile = process.env.NODE_ENV === 'production' ? '.env' : '.env.local';
dotenv.config({ path: envFile });

import { db } from './index';
import { users, eftBanks, eftBankAccounts, userServices } from './schema';
import { eq } from 'drizzle-orm';

const DEFAULT_PASSWORD = 'Admin@123456';

const seedUsersData = [
  {
    name: 'Admin User',
    email: 'admin@onegate.co.za',
    password: DEFAULT_PASSWORD,
    role: 'admin' as const,
    companyName: 'OneGate EFT Admin',
    bankAccount: {
      accountNumber: '99999999999',
      accountHolderName: 'OneGate EFT Admin',
      accountName: 'Admin Test Account',
      accountType: 'cheque' as const,
      branchCode: '250655',
      branchName: 'FNB Head Office',
      bankCode: 'FNB',
    },
  },
  {
    name: 'John Merchant',
    email: 'merchant@onegate.co.za',
    password: 'Merchant@123',
    role: 'merchant' as const,
    companyName: 'Acme Corporation',
    bankAccount: {
      accountNumber: '62123456789',
      accountHolderName: 'Acme Corporation',
      accountName: 'Business Account',
      accountType: 'cheque' as const,
      branchCode: '250655',
      branchName: 'FNB Sandton',
      bankCode: 'FNB',
    },
  },
  {
    name: 'Sarah Johnson',
    email: 'saraheft@techstore.com',
    password: 'Sarah@123456',
    role: 'merchant' as const,
    companyName: 'Tech Store SA',
    bankAccount: {
      accountNumber: '12345678901',
      accountHolderName: 'Tech Store SA',
      accountName: 'Main Business Account',
      accountType: 'cheque' as const,
      branchCode: '051001',
      branchName: 'Standard Bank Rosebank',
      bankCode: 'STANDARD',
    },
  },
];

async function seed() {
  console.log('🌱 Starting OneGate EFT database seed...\n');

  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set in environment variables');
    console.error('\n💡 Make sure you have a .env.local file with:');
    console.error('   DATABASE_URL="your-database-url"\n');
    process.exit(1);
  }

  try {
    const baseURL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const createdUsers = [];

    console.log(`📡 Using API endpoint: ${baseURL}/api/auth/sign-up/email`);
    console.log(`🗄️  Database: ${process.env.DATABASE_URL.substring(0, 30)}...\n`);

    // Clear existing test users first
    console.log('🧹 Clearing existing test users...');
    for (const userData of seedUsersData) {
      const existingUsers = await db
        .select()
        .from(users)
        .where(eq(users.email, userData.email));
      
      if (existingUsers.length > 0) {
        const userId = existingUsers[0].id;
        // Delete related records first (foreign keys)
        await db.delete(eftBankAccounts).where(eq(eftBankAccounts.merchantId, userId));
        await db.delete(userServices).where(eq(userServices.userId, userId));
        // Then delete user (Better Auth will cascade delete account)
        await db.delete(users).where(eq(users.email, userData.email));
        console.log(`   ✅ Deleted existing user: ${userData.email}`);
      }
    }
    console.log('✅ Test users cleared\n');

    // Create EFT Banks first
    console.log('🏦 Creating EFT banks...');
    const banksData = [
      { bankName: 'First National Bank', code: 'fnb', color: '#007DC5', branchCode: '250655', enabled: true },
      { bankName: 'Standard Bank', code: 'standardbank', color: '#0033A1', branchCode: '051001', enabled: true },
      { bankName: 'ABSA', code: 'absa', color: '#E30613', branchCode: '632005', enabled: true },
      { bankName: 'Nedbank', code: 'nedbank', color: '#007A4D', branchCode: '198765', enabled: true },
      { bankName: 'Capitec', code: 'capitec', color: '#0066B3', branchCode: '470010', enabled: true },
    ];

    for (const bankData of banksData) {
      await db.insert(eftBanks).values(bankData).onConflictDoUpdate({
        target: eftBanks.code,
        set: { bankName: bankData.bankName, enabled: bankData.enabled, updatedAt: new Date() },
      });
    }
    console.log('✅ Created 5 EFT banks\n');

    // Get banks for account creation
    const allBanks = await db.select().from(eftBanks);
    const fnbBank = allBanks.find(b => b.code === 'fnb');
    const standardBank = allBanks.find(b => b.code === 'standardbank');

    // Create users via Better Auth API
    console.log('👥 Creating users via Better Auth API...\n');
    
    for (const userData of seedUsersData) {
      try {
        console.log(`Creating ${userData.role}: ${userData.email}...`);
        
        // Use Better Auth signup API
        const response = await fetch(`${baseURL}/api/auth/sign-up/email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: userData.email,
            password: userData.password,
            name: userData.name,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.log(`   ⚠️  Failed to create ${userData.email}: ${errorText}`);
          continue;
        }

        // Update user with additional fields
        const updatedUsers = await db
          .update(users)
          .set({
            role: userData.role,
            companyName: userData.companyName,
            emailVerified: true,
            updatedAt: new Date(),
          })
          .where(eq(users.email, userData.email))
          .returning();

        if (updatedUsers.length > 0) {
          const user = updatedUsers[0];
          createdUsers.push(user);
          console.log(`   ✅ Created ${userData.role}: ${userData.email}`);

          // Enable OneGate EFT service
          await db.insert(userServices).values({
            userId: user.id,
            serviceName: 'onegateeft',
            isEnabled: true,
          }).onConflictDoNothing();
          console.log(`   ⚙️  Enabled OneGate EFT service`);

          // Create bank account
          const bankId = userData.bankAccount.bankCode === 'FNB' ? fnbBank?.id : standardBank?.id;
          await db.insert(eftBankAccounts).values({
            merchantId: user.id,
            eftBanksId: bankId,
            accountNumber: userData.bankAccount.accountNumber,
            accountHolderName: userData.bankAccount.accountHolderName,
            accountName: userData.bankAccount.accountName,
            accountType: userData.bankAccount.accountType,
            branchCode: userData.bankAccount.branchCode,
            branchName: userData.bankAccount.branchName,
            bankCode: userData.bankAccount.bankCode,
            isPrimary: true,
            isVerified: true,
          }).onConflictDoNothing();
          console.log(`   💳 Created bank account: ${userData.bankAccount.accountNumber}\n`);
        }
      } catch (error: any) {
        console.log(`   ❌ Error creating ${userData.email}: ${error.message}\n`);
      }
    }

    console.log('\n🎉 Seeding completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   👥 Users created: ${createdUsers.length}`);
    console.log(`   - Admins: ${createdUsers.filter(u => u.role === 'admin').length}`);
    console.log(`   - Merchants: ${createdUsers.filter(u => u.role === 'merchant').length}\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔑 Login Credentials');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⚠️  DEVELOPMENT/TESTING ONLY\n');

    seedUsersData.forEach(user => {
      console.log(`${user.role.toUpperCase()}:`);
      console.log(`  Email:    ${user.email}`);
      console.log(`  Password: ******`);
      console.log(`  Name:     ${user.name}`);
      console.log(`  Company:  ${user.companyName}`);
      console.log('');
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💡 Quick Start:');
    console.log('   1. Go to: http://localhost:3000/auth/login');
    console.log('   2. Sign in with credentials above\n');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    if (error instanceof Error) {
      console.error('   Details:', error.message);
    }
    throw error;
  }
}

// Run the seed function
seed()
  .then(() => {
    console.log('✅ Seed script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seed script failed:', error);
    process.exit(1);
  });
