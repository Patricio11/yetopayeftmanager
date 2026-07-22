import { NextRequest, NextResponse } from 'next/server';
import { requirePartner } from '@/lib/auth/authorization';
import { db } from '@/lib/db';
import { users, eftTransactions, eftBanks } from '@/lib/db/schema';
import { eq, and, count, desc, gte, lte, inArray, or, ilike, sql } from 'drizzle-orm';

/**
 * GET /api/partner/transactions
 * Transactions across all partner's merchants with filters and pagination
 */
export async function GET(request: NextRequest) {
  const auth = await requirePartner();
  if (!auth.authorized) return auth.response;
  const partnerId = auth.session.user.id;

  try {
    const { searchParams } = new URL(request.url);
    const merchantId = searchParams.get('merchantId');
    const status = searchParams.get('status');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const search = searchParams.get('search');
    const bankId = searchParams.get('bankId');
    const paymentMethod = searchParams.get('paymentMethod');
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50'), 1), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);

    // Get partner's merchant IDs
    const merchantRows = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.partnerId, partnerId), eq(users.role, 'merchant')));

    const merchantIds = merchantRows.map((m) => m.id);

    if (merchantIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        pagination: { total: 0, limit, offset, hasMore: false },
      });
    }

    // If a specific merchantId is provided, verify it belongs to this partner
    if (merchantId && !merchantIds.includes(merchantId)) {
      return NextResponse.json(
        { success: false, message: 'Merchant not found' },
        { status: 404 }
      );
    }

    // Build conditions
    const conditions = [
      inArray(
        eftTransactions.merchantId,
        merchantId ? [merchantId] : merchantIds
      ),
    ];

    if (status) {
      conditions.push(eq(eftTransactions.status, status as any));
    }
    if (from) {
      conditions.push(gte(eftTransactions.createdAt, new Date(from)));
    }
    if (to) {
      const endDate = new Date(to);
      endDate.setHours(23, 59, 59, 999);
      conditions.push(lte(eftTransactions.createdAt, endDate));
    }
    // Search matches reference, customer email/name, the transaction ID, and
    // the sub-merchant's own reference (metadata.merchantReference) — the
    // latter is not unique, but search returns a list so that's fine.
    if (search) {
      conditions.push(
        or(
          ilike(eftTransactions.reference, `%${search}%`),
          ilike(eftTransactions.customerEmail, `%${search}%`),
          ilike(eftTransactions.customerName, `%${search}%`),
          sql`${eftTransactions.id}::text ILIKE ${`%${search}%`}`,
          sql`${eftTransactions.metadata}->>'merchantReference' ILIKE ${`%${search}%`}`
        )!
      );
    }
    if (bankId) {
      conditions.push(eq(eftTransactions.eftBankId, bankId));
    }
    if (paymentMethod) {
      conditions.push(eq(eftTransactions.paymentMethod, paymentMethod));
    }

    const whereClause = and(...conditions);

    // Count total
    const [totalResult] = await db
      .select({ total: count() })
      .from(eftTransactions)
      .where(whereClause);

    const total = totalResult?.total || 0;

    // Fetch transactions with merchant info
    const transactions = await db
      .select({
        id: eftTransactions.id,
        merchantId: eftTransactions.merchantId,
        amount: eftTransactions.amount,
        reference: eftTransactions.reference,
        status: eftTransactions.status,
        description: eftTransactions.description,
        customerEmail: eftTransactions.customerEmail,
        customerName: eftTransactions.customerName,
        createdAt: eftTransactions.createdAt,
        completedAt: eftTransactions.completedAt,
        statusReason: eftTransactions.statusReason,
        paymentMethod: eftTransactions.paymentMethod,
        bankName: eftBanks.bankName,
        merchantName: users.name,
        merchantCompany: users.companyName,
      })
      .from(eftTransactions)
      .leftJoin(users, eq(eftTransactions.merchantId, users.id))
      .leftJoin(eftBanks, eq(eftTransactions.eftBankId, eftBanks.id))
      .where(whereClause)
      .orderBy(desc(eftTransactions.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      success: true,
      data: transactions,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error: any) {
    console.error('Error fetching partner transactions:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}
