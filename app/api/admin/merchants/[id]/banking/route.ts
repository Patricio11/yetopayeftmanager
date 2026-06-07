import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/authorization';
import { db } from '@/lib/db';
import { eftBankAccounts, eftBanks, settlementBanks } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * GET /api/admin/merchants/[id]/banking
 * Get all bank accounts for a specific merchant
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;

  try {
    const bankAccounts = await db
      .select({
        id: eftBankAccounts.id,
        accountNumber: eftBankAccounts.accountNumber,
        accountHolderName: eftBankAccounts.accountHolderName,
        accountName: eftBankAccounts.accountName,
        accountType: eftBankAccounts.accountType,
        branchCode: eftBankAccounts.branchCode,
        branchName: eftBankAccounts.branchName,
        bankCode: eftBankAccounts.bankCode,
        isPrimary: eftBankAccounts.isPrimary,
        isVerified: eftBankAccounts.isVerified,
        createdAt: eftBankAccounts.createdAt,
        updatedAt: eftBankAccounts.updatedAt,
        settlementBankId: eftBankAccounts.settlementBankId,
        bankName: settlementBanks.bankName,
        bankFullName: settlementBanks.fullName,
        bankColor: settlementBanks.color,
      })
      .from(eftBankAccounts)
      .leftJoin(settlementBanks, eq(eftBankAccounts.settlementBankId, settlementBanks.id))
      .where(eq(eftBankAccounts.merchantId, id));

    return NextResponse.json({
      success: true,
      data: bankAccounts,
      count: bankAccounts.length,
    });
  } catch (error: any) {
    console.error('Error fetching merchant banking:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch bank accounts' },
      { status: 500 }
    );
  }
}
