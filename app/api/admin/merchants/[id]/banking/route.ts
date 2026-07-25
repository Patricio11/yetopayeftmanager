import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/authorization';
import { db } from '@/lib/db';
import { eftBankAccounts, eftBanks, settlementBanks } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

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

const updateSchema = z.object({
  accountId: z.string().uuid(),
  settlementBankId: z.string().uuid().optional().or(z.literal('').transform(() => undefined)),
  accountNumber: z.string().min(1).optional(),
  accountHolderName: z.string().min(1).optional(),
  accountName: z.string().optional().nullable(),
  accountType: z.enum(['savings', 'cheque', 'transmission', 'bond', 'investment']).optional(),
  isPrimary: z.boolean().optional(),
});

/**
 * PATCH /api/admin/merchants/[id]/banking
 * Admin edits one of a merchant's bank accounts (accountId in the body).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id: merchantId } = await params;

  try {
    const validated = updateSchema.parse(await request.json());

    // The account must belong to this merchant.
    const [existing] = await db
      .select()
      .from(eftBankAccounts)
      .where(and(eq(eftBankAccounts.id, validated.accountId), eq(eftBankAccounts.merchantId, merchantId)));
    if (!existing) {
      return NextResponse.json({ success: false, message: 'Bank account not found' }, { status: 404 });
    }

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (validated.settlementBankId) {
      const [bank] = await db.select().from(settlementBanks).where(eq(settlementBanks.id, validated.settlementBankId));
      if (!bank) return NextResponse.json({ success: false, message: 'Selected bank not found' }, { status: 400 });
      updates.settlementBankId = bank.id;
      updates.branchCode = bank.branchCode;
      updates.bankCode = bank.code;
    }
    if (validated.accountNumber !== undefined) updates.accountNumber = validated.accountNumber;
    if (validated.accountHolderName !== undefined) updates.accountHolderName = validated.accountHolderName;
    if (validated.accountName !== undefined) updates.accountName = validated.accountName;
    if (validated.accountType !== undefined) updates.accountType = validated.accountType;

    // Editing account details invalidates a prior verification.
    if (validated.accountNumber !== undefined && validated.accountNumber !== existing.accountNumber) {
      updates.isVerified = false;
    }

    if (validated.isPrimary === true) {
      await db.update(eftBankAccounts).set({ isPrimary: false, updatedAt: new Date() }).where(eq(eftBankAccounts.merchantId, merchantId));
      updates.isPrimary = true;
    }

    const [updated] = await db.update(eftBankAccounts).set(updates).where(eq(eftBankAccounts.id, validated.accountId)).returning();
    return NextResponse.json({ success: true, message: 'Bank account updated', data: { account: updated } });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: 'Invalid request data', details: error.issues }, { status: 400 });
    }
    console.error('Error updating merchant banking (admin):', error?.message || error);
    return NextResponse.json({ success: false, message: 'Failed to update bank account' }, { status: 500 });
  }
}
