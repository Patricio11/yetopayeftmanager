/**
 * Seed Test Transactions for Recon Testing
 *
 * Inserts many completed (and some failed) transactions for each merchant
 * so you can test invoice generation and the reconciliation dashboard.
 *
 * Usage: npx tsx lib/db/seed-transactions.ts
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { db } from './index';
import { users, eftBanks, eftTransactions, eftMerchantFees, eftSystemFees } from './schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

// ─── Config ──────────────────────────────────────────────────────────────────
const TRANSACTIONS_PER_MERCHANT = 60; // How many completed txns per merchant
const FAILED_PER_MERCHANT = 8;        // A few failed ones for realism
const MONTHS_BACK = 2;                 // Spread transactions across this many months

function randomAmount(min: number, max: number): string {
  return (Math.random() * (max - min) + min).toFixed(2);
}

function randomDate(monthsBack: number): Date {
  const now = new Date();
  const earliest = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
  const diff = now.getTime() - earliest.getTime();
  return new Date(earliest.getTime() + Math.random() * diff);
}

function generateRef(): string {
  return `TEST-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
}

async function seedTransactions() {
  console.log('🌱 Seeding test transactions for recon testing...\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not set. Make sure .env.local exists.');
    process.exit(1);
  }

  // 1. Fetch all merchants
  const merchants = await db
    .select({ id: users.id, name: users.name, companyName: users.companyName, email: users.email })
    .from(users)
    .where(eq(users.role, 'merchant'));

  if (merchants.length === 0) {
    console.error('❌ No merchants found. Run npm run db:seed first to create users.');
    process.exit(1);
  }

  console.log(`👥 Found ${merchants.length} merchant(s):`);
  merchants.forEach(m => console.log(`   - ${m.companyName || m.name} (${m.email})`));
  console.log('');

  // 2. Fetch banks
  const banks = await db.select().from(eftBanks);
  if (banks.length === 0) {
    console.error('❌ No banks found. Run npm run db:seed first.');
    process.exit(1);
  }
  console.log(`🏦 Found ${banks.length} bank(s)\n`);

  // 3. Ensure system fee defaults exist
  const existingSysFees = await db.select().from(eftSystemFees).limit(1);
  if (existingSysFees.length === 0) {
    console.log('⚙️  Creating system fee defaults (R5.00 fixed, 2.50% percentage, 15% VAT)...');
    await db.insert(eftSystemFees).values({
      fixedFeeValue: '5.00',
      percentageFeeValue: '2.50',
      vatEnabled: true,
      vatRate: '15.00',
    });
    console.log('   ✅ System fees created\n');
  } else {
    console.log('⚙️  System fee defaults already exist\n');
  }

  // 4. Ensure each merchant has a fee config
  for (const merchant of merchants) {
    const existing = await db.query.eftMerchantFees.findFirst({
      where: eq(eftMerchantFees.merchantId, merchant.id),
    });

    if (!existing) {
      // Alternate between fixed and percentage for variety
      const idx = merchants.indexOf(merchant);
      const feeType = idx % 2 === 0 ? 'fixed' : 'percentage';
      console.log(`💰 Creating ${feeType} fee config for ${merchant.companyName || merchant.name}...`);
      await db.insert(eftMerchantFees).values({
        merchantId: merchant.id,
        feeType,
        fixedFeeValue: feeType === 'fixed' ? '5.00' : null,
        percentageFeeValue: feeType === 'percentage' ? '2.50' : null,
        vatEnabled: true,
        vatRate: '15.00',
        isActive: true,
      });
      console.log('   ✅ Fee config created');
    } else {
      console.log(`💰 Fee config already exists for ${merchant.companyName || merchant.name} (${existing.feeType})`);
    }
  }
  console.log('');

  // 5. Insert transactions for each merchant
  let totalInserted = 0;

  for (const merchant of merchants) {
    console.log(`📝 Seeding transactions for ${merchant.companyName || merchant.name}...`);

    const txns: Array<{
      merchantId: string;
      amount: string;
      reference: string;
      eftBankId: string | null;
      status: string;
      customerEmail: string | null;
      customerName: string | null;
      description: string | null;
      createdAt: Date;
      updatedAt: Date;
      completedAt: Date | null;
      metadata: Record<string, any>;
    }> = [];

    // Completed transactions
    for (let i = 0; i < TRANSACTIONS_PER_MERCHANT; i++) {
      const bank = banks[Math.floor(Math.random() * banks.length)];
      const created = randomDate(MONTHS_BACK);
      const completed = new Date(created.getTime() + Math.random() * 5 * 60 * 1000); // 0-5 min after creation
      const amount = randomAmount(50, 5000);
      const customerNames = [
        'John Doe', 'Jane Smith', 'Thabo Mokoena', 'Sipho Ndlovu', 'Lerato Moloi',
        'Pieter van Wyk', 'Nomsa Dlamini', 'David Nkosi', 'Zanele Khumalo', 'Mohammed Patel',
        'Lungile Mthembu', 'Bongani Zulu', 'Ayanda Cele', 'Fatima Mahomed', 'Werner Botha',
      ];
      const name = customerNames[Math.floor(Math.random() * customerNames.length)];
      const email = `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`;

      txns.push({
        merchantId: merchant.id,
        amount,
        reference: generateRef(),
        eftBankId: bank.id,
        status: 'completed',
        customerEmail: email,
        customerName: name,
        description: `Test payment #${i + 1}`,
        createdAt: created,
        updatedAt: completed,
        completedAt: completed,
        metadata: {
          seeded: true,
          bank_name: bank.bankName,
          bank_code: bank.code,
        },
      });
    }

    // Failed transactions
    for (let i = 0; i < FAILED_PER_MERCHANT; i++) {
      const bank = banks[Math.floor(Math.random() * banks.length)];
      const created = randomDate(MONTHS_BACK);
      const amount = randomAmount(100, 3000);

      txns.push({
        merchantId: merchant.id,
        amount,
        reference: generateRef(),
        eftBankId: bank.id,
        status: 'failed',
        customerEmail: `customer${i}@test.com`,
        customerName: `Test Customer ${i}`,
        description: `Failed test payment #${i + 1}`,
        createdAt: created,
        updatedAt: created,
        completedAt: null,
        metadata: {
          seeded: true,
          bank_name: bank.bankName,
          failure_reason: 'Test failure — seeded data',
        },
      });
    }

    // Batch insert
    const batchSize = 25;
    for (let i = 0; i < txns.length; i += batchSize) {
      const batch = txns.slice(i, i + batchSize);
      await db.insert(eftTransactions).values(batch as any);
    }

    const completedCount = txns.filter(t => t.status === 'completed').length;
    const failedCount = txns.filter(t => t.status === 'failed').length;
    const totalVolume = txns
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    console.log(`   ✅ ${completedCount} completed, ${failedCount} failed`);
    console.log(`   💵 Total volume: R${totalVolume.toFixed(2)}`);
    totalInserted += txns.length;
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 Seeding complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   📊 Total transactions inserted: ${totalInserted}`);
  console.log(`   👥 Merchants: ${merchants.length}`);
  console.log(`   📅 Date range: last ${MONTHS_BACK} months`);
  console.log('\n💡 Next steps:');
  console.log('   1. Go to Admin → Reconciliation');
  console.log('   2. Click "Generate Invoice"');
  console.log('   3. Select a merchant and date range');
  console.log('   4. The invoice should calculate based on completed transactions\n');
}

seedTransactions()
  .then(() => {
    console.log('✅ Done');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  });
