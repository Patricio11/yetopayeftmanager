import 'dotenv/config';
import { db } from './index';
import { users, eftBanks, eftBankAccounts, userServices } from './schema';
import { eq } from 'drizzle-orm';

/**
 * Seed script for YETOPAYEFT
 * Creates admin and merchant users with all necessary data
 */

async function seed() {
  console.log('🌱 Starting database seed...\n');

  try {
    // 1. Create Admin User
    console.log('👤 Creating admin user...');
    const [admin] = await db
      .insert(users)
      .values({
        id: 'admin-001',
        email: 'admin@yetopayeft.com',
        name: 'Admin User',
        emailVerified: true,
        role: 'admin',
        companyName: 'YETOPAYEFT Admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: users.email,
        set: {
          name: 'Admin User',
          role: 'admin',
          updatedAt: new Date(),
        },
      })
      .returning();

    console.log('✅ Admin created:', admin.email);

    // 1b. Enable YETOPAYEFT service for admin (so they can test)
    await db
      .insert(userServices)
      .values({
        userId: admin.id,
        serviceName: 'yetopayeft',
        isEnabled: true,
      })
      .onConflictDoNothing();

    console.log('✅ YETOPAYEFT service enabled for admin');

    // 2. Create Merchant User 1
    console.log('\n👤 Creating merchant user 1...');
    const [merchant1] = await db
      .insert(users)
      .values({
        id: 'merchant-001',
        email: 'merchant@yetopayeft.com',
        name: 'John Merchant',
        emailVerified: true,
        role: 'merchant',
        companyName: 'Acme Corporation',
        companyLogoUrl: 'https://via.placeholder.com/150/10b981/ffffff?text=ACME',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: users.email,
        set: {
          name: 'John Merchant',
          role: 'merchant',
          companyName: 'Acme Corporation',
          updatedAt: new Date(),
        },
      })
      .returning();

    console.log('✅ Merchant 1 created:', merchant1.email);

    // 3. Create Merchant User 2
    console.log('\n👤 Creating merchant user 2...');
    const [merchant2] = await db
      .insert(users)
      .values({
        id: 'merchant-002',
        email: 'sarah@techstore.com',
        name: 'Sarah Johnson',
        emailVerified: true,
        role: 'merchant',
        companyName: 'Tech Store SA',
        companyLogoUrl: 'https://via.placeholder.com/150/059669/ffffff?text=TECH',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: users.email,
        set: {
          name: 'Sarah Johnson',
          role: 'merchant',
          companyName: 'Tech Store SA',
          updatedAt: new Date(),
        },
      })
      .returning();

    console.log('✅ Merchant 2 created:', merchant2.email);

    // 4. Create EFT Banks
    console.log('\n🏦 Creating EFT banks...');
    
    const banksData = [
      {
        bankName: 'First National Bank',
        code: 'fnb',
        color: '#007DC5',
        branchCode: '250655',
        enabled: true,
      },
      {
        bankName: 'Standard Bank',
        code: 'standardbank',
        color: '#0033A1',
        branchCode: '051001',
        enabled: true,
      },
      {
        bankName: 'ABSA',
        code: 'absa',
        color: '#E30613',
        branchCode: '632005',
        enabled: true,
      },
      {
        bankName: 'Nedbank',
        code: 'nedbank',
        color: '#007A4D',
        branchCode: '198765',
        enabled: true,
      },
      {
        bankName: 'Capitec',
        code: 'capitec',
        color: '#0066B3',
        branchCode: '470010',
        enabled: true,
      },
    ];

    for (const bankData of banksData) {
      await db
        .insert(eftBanks)
        .values(bankData)
        .onConflictDoUpdate({
          target: eftBanks.code,
          set: {
            bankName: bankData.bankName,
            enabled: bankData.enabled,
            updatedAt: new Date(),
          },
        });
    }

    console.log('✅ Created 5 EFT banks');

    // 5. Get created banks for bank accounts
    const allBanks = await db.select().from(eftBanks);
    const fnbBank = allBanks.find(b => b.code === 'fnb');
    const standardBank = allBanks.find(b => b.code === 'standardbank');

    // 6. Create Bank Account for Admin (for testing)
    console.log('\n💳 Creating bank account for Admin...');
    await db
      .insert(eftBankAccounts)
      .values({
        merchantId: admin.id,
        eftBanksId: fnbBank?.id,
        accountNumber: '99999999999',
        accountHolderName: 'YETOPAYEFT Admin',
        accountName: 'Admin Test Account',
        accountType: 'cheque',
        branchCode: '250655',
        branchName: 'FNB Head Office',
        bankCode: 'FNB',
        isPrimary: true,
        isVerified: true,
      })
      .onConflictDoNothing();

    console.log('✅ Bank account created for Admin');

    // 7. Create Bank Accounts for Merchant 1
    console.log('\n💳 Creating bank accounts for Merchant 1...');
    await db
      .insert(eftBankAccounts)
      .values({
        merchantId: merchant1.id,
        eftBanksId: fnbBank?.id,
        accountNumber: '62123456789',
        accountHolderName: 'Acme Corporation',
        accountName: 'Business Account',
        accountType: 'cheque',
        branchCode: '250655',
        branchName: 'FNB Sandton',
        bankCode: 'FNB',
        isPrimary: true,
        isVerified: true,
      })
      .onConflictDoNothing();

    console.log('✅ Bank account created for Merchant 1');

    // 8. Create Bank Accounts for Merchant 2
    console.log('\n💳 Creating bank accounts for Merchant 2...');
    await db
      .insert(eftBankAccounts)
      .values({
        merchantId: merchant2.id,
        eftBanksId: standardBank?.id,
        accountNumber: '12345678901',
        accountHolderName: 'Tech Store SA',
        accountName: 'Main Business Account',
        accountType: 'cheque',
        branchCode: '051001',
        branchName: 'Standard Bank Rosebank',
        bankCode: 'STANDARD',
        isPrimary: true,
        isVerified: true,
      })
      .onConflictDoNothing();

    console.log('✅ Bank account created for Merchant 2');

    // 9. Enable YETOPAYEFT service for merchants
    console.log('\n⚙️ Enabling YETOPAYEFT service for merchants...');
    
    await db
      .insert(userServices)
      .values({
        userId: merchant1.id,
        serviceName: 'yetopayeft',
        isEnabled: true,
      })
      .onConflictDoNothing();

    await db
      .insert(userServices)
      .values({
        userId: merchant2.id,
        serviceName: 'yetopayeft',
        isEnabled: true,
      })
      .onConflictDoNothing();

    console.log('✅ Services enabled for merchants');

    console.log('\n✅ Database seeded successfully!\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📋 LOGIN CREDENTIALS');
    console.log('═══════════════════════════════════════════════════════\n');
    
    console.log('👨‍💼 ADMIN USER:');
    console.log('   Email:    admin@yetopayeft.com');
    console.log('   Password: Admin@123456');
    console.log('   Role:     admin');
    console.log('   Company:  YETOPAYEFT Admin');
    console.log('   Bank:     FNB - 99999999999 (Test Account)');
    console.log('   Access:   Full system access + Can create payment links\n');
    
    console.log('👤 MERCHANT 1:');
    console.log('   Email:    merchant@yetopayeft.com');
    console.log('   Password: Merchant@123');
    console.log('   Role:     merchant');
    console.log('   Company:  Acme Corporation');
    console.log('   Bank:     FNB - 62123456789\n');
    
    console.log('👤 MERCHANT 2:');
    console.log('   Email:    sarah@techstore.com');
    console.log('   Password: Sarah@123456');
    console.log('   Role:     merchant');
    console.log('   Company:  Tech Store SA');
    console.log('   Bank:     Standard Bank - 12345678901\n');
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('🏦 BANKS AVAILABLE:');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('   • FNB (First National Bank)');
    console.log('   • Standard Bank');
    console.log('   • ABSA');
    console.log('   • Nedbank');
    console.log('   • Capitec\n');
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('📝 NOTES:');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('   1. Users need to be created in Better Auth first');
    console.log('   2. Use these credentials to sign up via /auth/register');
    console.log('   3. After signup, the role will be set automatically');
    console.log('   4. Bank accounts are pre-configured and verified');
    console.log('   5. YETOPAYEFT service is enabled for all merchants\n');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run seed
seed()
  .then(() => {
    console.log('✅ Seed completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  });
