import { NextRequest, NextResponse } from 'next/server';
import { authenticateMerchant } from '@/lib/auth/merchant-auth';
import { db } from '@/lib/db';
import { eftTransactions, eftBanks } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * GET /api/merchant/transactions/[id]
 * Look up a single transaction by ID or reference.
 * Only returns the transaction if it belongs to the authenticated merchant.
 * Supports both session and API key authentication.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateMerchant(request, 'transactions.read');
  if (!auth.success) return auth.response;

  try {
    const { id } = await params;

    if (!id || id.trim() === '') {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    // Try lookup by ID first, then by reference
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    const rows = await db
      .select({
        id: eftTransactions.id,
        status: eftTransactions.status,
        amount: eftTransactions.amount,
        reference: eftTransactions.reference,
        description: eftTransactions.description,
        customerEmail: eftTransactions.customerEmail,
        customerName: eftTransactions.customerName,
        failureReason: eftTransactions.failureReason,
        statusReason: eftTransactions.statusReason,
        bankName: eftBanks.bankName,
        bankCode: eftBanks.code,
        createdAt: eftTransactions.createdAt,
        updatedAt: eftTransactions.updatedAt,
        completedAt: eftTransactions.completedAt,
      })
      .from(eftTransactions)
      .leftJoin(eftBanks, eq(eftTransactions.eftBankId, eftBanks.id))
      .where(
        and(
          isUuid
            ? eq(eftTransactions.id, id)
            : eq(eftTransactions.reference, id),
          eq(eftTransactions.merchantId, auth.merchantId)
        )
      )
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    const t = rows[0];

    return NextResponse.json({
      success: true,
      data: {
        id: t.id,
        status: t.status,
        amount: t.amount,
        reference: t.reference,
        description: t.description,
        customerEmail: t.customerEmail,
        customerName: t.customerName,
        failureReason: t.failureReason,
        statusReason: t.statusReason,
        bank: t.bankName ? { name: t.bankName, code: t.bankCode } : null,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        completedAt: t.completedAt,
      },
    });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch transaction' },
      { status: 500 }
    );
  }
}
