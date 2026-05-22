/**
 * Seed Payment Services Registry
 *
 * Seeds the payment_services table with initial service definitions
 * and backfills serviceName on existing fee/transaction rows.
 *
 * Safe to run multiple times (uses onConflictDoNothing).
 *
 * Usage: npx tsx lib/db/seed-services.ts
 */

import * as dotenv from 'dotenv';
const envFile = process.env.NODE_ENV === 'production' ? '.env' : '.env.local';
dotenv.config({ path: envFile });

import { db } from './index';
import { paymentServices } from './schema/services';
import { eftSystemFees, eftMerchantFees } from './schema/recon';
import { eftTransactions } from './schema/eft';
import { userServices } from './schema/system';
import { users } from './schema/users';
import { eq, isNull, or } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

async function seedServices() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 Seeding Payment Services');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. Seed payment_services registry
  console.log('📋 Seeding payment_services table...');

  await db.insert(paymentServices).values({
    code: 'eft_direct',
    name: 'Pay by Bank (EFT)',
    description: 'Direct EFT bank transfer — customers select their bank and complete payment via instant EFT.',
    category: 'eft',
    provider: 'internal',
    icon: 'Building2',
    isActive: true,
    requiresSetup: false,
    displayOrder: 1,
    metadata: { currencies: ['ZAR'] },
  }).onConflictDoNothing();
  console.log('   ✅ eft_direct — Pay by Bank (EFT)');

  await db.insert(paymentServices).values({
    code: 'card',
    name: 'Card Payments',
    description: 'Accept Visa, Mastercard, and other card payments via secure hosted payment page.',
    category: 'card',
    provider: 'callpay',
    providerConfig: {},
    icon: 'CreditCard',
    isActive: false,
    requiresSetup: true,
    displayOrder: 2,
    metadata: { currencies: ['ZAR'], integration: 'hosted_redirect' },
  }).onConflictDoNothing();
  console.log('   ✅ card — Card Payments (inactive until configured)');

  // 1b. Migrate card_callpay → card in all tables (safe to re-run)
  console.log('\n📋 Migrating card_callpay → card in existing records...');
  // Delete the old service row if the new 'card' row already exists
  await db.execute(sql`DELETE FROM payment_services WHERE code = 'card_callpay' AND EXISTS (SELECT 1 FROM payment_services WHERE code = 'card')`);
  // If only the old row exists (no new 'card' row yet), rename it
  await db.execute(sql`UPDATE payment_services SET code = 'card' WHERE code = 'card_callpay'`);
  // Update references in all related tables
  await db.execute(sql`UPDATE user_services SET service_name = 'card' WHERE service_name = 'card_callpay'`);
  await db.execute(sql`UPDATE eft_system_fees SET service_name = 'card' WHERE service_name = 'card_callpay'`);
  await db.execute(sql`UPDATE eft_merchant_fees SET service_name = 'card' WHERE service_name = 'card_callpay'`);
  await db.execute(sql`UPDATE eft_transactions SET payment_method = 'card' WHERE payment_method = 'card_callpay'`);
  console.log('   ✅ Migrated card_callpay → card across all tables');

  // 2. Backfill serviceName on eft_system_fees
  console.log('\n📋 Backfilling eft_system_fees.service_name...');
  const sysFeeResult = await db
    .update(eftSystemFees)
    .set({ serviceName: 'eft_direct' })
    .where(isNull(eftSystemFees.serviceName))
    .returning();
  console.log(`   ✅ Updated ${sysFeeResult.length} system fee rows`);

  // 3. Backfill serviceName on eft_merchant_fees
  console.log('\n📋 Backfilling eft_merchant_fees.service_name...');
  const merchantFeeResult = await db
    .update(eftMerchantFees)
    .set({ serviceName: 'eft_direct' })
    .where(isNull(eftMerchantFees.serviceName))
    .returning();
  console.log(`   ✅ Updated ${merchantFeeResult.length} merchant fee rows`);

  // 4. Backfill paymentMethod on eft_transactions
  console.log('\n📋 Backfilling eft_transactions.payment_method...');
  const txResult = await db.execute(
    sql`UPDATE eft_transactions SET payment_method = 'eft_direct' WHERE payment_method IS NULL`
  );
  console.log(`   ✅ Backfilled transactions`);

  // 5. Ensure all merchants/partners have eft_direct in user_services
  console.log('\n📋 Ensuring merchants have eft_direct in user_services...');
  const allMerchants = await db
    .select({ id: users.id })
    .from(users)
    .where(or(eq(users.role, 'merchant'), eq(users.role, 'partner')));

  let added = 0;
  for (const merchant of allMerchants) {
    try {
      await db.insert(userServices).values({
        userId: merchant.id,
        serviceName: 'eft_direct',
        isEnabled: true,
      }).onConflictDoNothing();
      added++;
    } catch { /* already exists */ }
  }
  console.log(`   ✅ Processed ${allMerchants.length} merchants (${added} eft_direct entries ensured)`);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 Payment services seeding complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

seedServices()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  });
