import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/authorization';
import { db } from '@/lib/db';
import { eftTransactions, eftBanks } from '@/lib/db/schema';
import { eq, desc, and, like, sql } from 'drizzle-orm';

/**
 * GET /api/admin/merchants/[id]/transactions
 * Get all transactions for a specific merchant
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
  const status = searchParams.get('status');
  const search = searchParams.get('search');
  const offset = (page - 1) * limit;

  try {
    const conditions = [eq(eftTransactions.merchantId, id)];

    if (status && status !== 'all') {
      conditions.push(eq(eftTransactions.status, status as any));
    }
    if (search) {
      conditions.push(
        sql`(${eftTransactions.reference} ILIKE ${'%' + search + '%'} OR ${eftTransactions.customerEmail} ILIKE ${'%' + search + '%'} OR ${eftTransactions.customerName} ILIKE ${'%' + search + '%'})`
      );
    }

    const whereClause = and(...conditions);

    const transactions = await db
      .select({
        id: eftTransactions.id,
        amount: eftTransactions.amount,
        reference: eftTransactions.reference,
        status: eftTransactions.status,
        customerEmail: eftTransactions.customerEmail,
        customerName: eftTransactions.customerName,
        description: eftTransactions.description,
        createdAt: eftTransactions.createdAt,
        completedAt: eftTransactions.completedAt,
        bankName: eftBanks.bankName,
      })
      .from(eftTransactions)
      .leftJoin(eftBanks, eq(eftTransactions.eftBankId, eftBanks.id))
      .where(whereClause)
      .orderBy(desc(eftTransactions.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(eftTransactions)
      .where(whereClause);

    return NextResponse.json({
      success: true,
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching merchant transactions:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}
