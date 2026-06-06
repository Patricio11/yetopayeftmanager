import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/authorization';
import { db } from '@/lib/db';
import { eftBanks, merchantDisabledBanks } from '@/lib/db/schema';
import { eq, asc, inArray } from 'drizzle-orm';

/**
 * GET /api/admin/merchants/[id]/eft-banks
 * List all banks with per-merchant enabled/disabled state
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id: merchantId } = await params;

  try {
    const [allBanks, disabledRows] = await Promise.all([
      db.query.eftBanks.findMany({
        orderBy: [asc(eftBanks.displayOrder)],
      }),
      db
        .select({ bankId: merchantDisabledBanks.bankId })
        .from(merchantDisabledBanks)
        .where(eq(merchantDisabledBanks.merchantId, merchantId)),
    ]);

    const disabledIds = new Set(disabledRows.map(r => r.bankId));

    const banks = allBanks.map(bank => ({
      id: bank.id,
      bankName: bank.bankName,
      code: bank.code,
      color: bank.color,
      branchCode: bank.branchCode,
      globalEnabled: bank.enabled,
      merchantEnabled: !disabledIds.has(bank.id),
    }));

    return NextResponse.json({ success: true, data: banks });
  } catch (error) {
    console.error('Error fetching merchant EFT banks:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch banks' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/merchants/[id]/eft-banks
 * Update which banks are disabled for this merchant.
 * Body: { disabledBankIds: string[] }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id: merchantId } = await params;

  try {
    const { disabledBankIds } = await request.json();

    if (!Array.isArray(disabledBankIds)) {
      return NextResponse.json(
        { success: false, message: 'disabledBankIds must be an array' },
        { status: 400 }
      );
    }

    // Delete all current disabled entries for this merchant
    await db
      .delete(merchantDisabledBanks)
      .where(eq(merchantDisabledBanks.merchantId, merchantId));

    // Insert new disabled entries
    if (disabledBankIds.length > 0) {
      // Validate that all bank IDs exist
      const existingBanks = await db
        .select({ id: eftBanks.id })
        .from(eftBanks)
        .where(inArray(eftBanks.id, disabledBankIds));

      const existingIds = new Set(existingBanks.map(b => b.id));
      const validIds = disabledBankIds.filter((id: string) => existingIds.has(id));

      if (validIds.length > 0) {
        await db.insert(merchantDisabledBanks).values(
          validIds.map((bankId: string) => ({
            merchantId,
            bankId,
          }))
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Merchant bank settings updated',
    });
  } catch (error) {
    console.error('Error updating merchant EFT banks:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update bank settings' },
      { status: 500 }
    );
  }
}
