import { NextRequest, NextResponse } from 'next/server';
import { requirePartner } from '@/lib/auth/authorization';
import { db } from '@/lib/db';
import { users, eftTransactions } from '@/lib/db/schema';
import { eq, and, count, sum, sql, gte, lte, inArray } from 'drizzle-orm';

/**
 * GET /api/partner/analytics
 * Aggregated analytics across partner's merchants with period comparison
 */
export async function GET(request: NextRequest) {
  const auth = await requirePartner();
  if (!auth.authorized) return auth.response;
  const partnerId = auth.session.user.id;

  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();

    // Default: last 30 days
    const toDate = searchParams.get('to')
      ? new Date(searchParams.get('to')!)
      : now;
    const fromDate = searchParams.get('from')
      ? new Date(searchParams.get('from')!)
      : new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Calculate previous period (same duration, immediately before)
    const periodDuration = toDate.getTime() - fromDate.getTime();
    const prevFrom = new Date(fromDate.getTime() - periodDuration);
    const prevTo = new Date(fromDate.getTime());

    // Get partner's merchant IDs
    const merchantRows = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.partnerId, partnerId), eq(users.role, 'merchant')));

    const merchantIds = merchantRows.map((m) => m.id);

    if (merchantIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          period: {
            from: fromDate.toISOString(),
            to: toDate.toISOString(),
          },
          kpis: {
            totalTransactions: 0,
            totalAmount: '0',
            completedCount: 0,
            failedCount: 0,
            growth: {
              transactions: 0,
              amount: 0,
            },
          },
          merchantBreakdown: [],
        },
      });
    }

    // Run queries in parallel
    const [currentKpis, previousKpis, merchantBreakdown] = await Promise.all([
      // Current period KPIs
      db
        .select({
          totalTransactions: count(),
          totalAmount: sum(eftTransactions.amount),
          completedCount: count(
            sql`CASE WHEN ${eftTransactions.status} = 'completed' THEN 1 END`
          ),
          failedCount: count(
            sql`CASE WHEN ${eftTransactions.status} = 'failed' THEN 1 END`
          ),
        })
        .from(eftTransactions)
        .where(
          and(
            inArray(eftTransactions.merchantId, merchantIds),
            gte(eftTransactions.createdAt, fromDate),
            lte(eftTransactions.createdAt, toDate)
          )
        )
        .then((rows) => rows[0]),

      // Previous period KPIs (for comparison)
      db
        .select({
          totalTransactions: count(),
          totalAmount: sum(eftTransactions.amount),
        })
        .from(eftTransactions)
        .where(
          and(
            inArray(eftTransactions.merchantId, merchantIds),
            gte(eftTransactions.createdAt, prevFrom),
            lte(eftTransactions.createdAt, prevTo)
          )
        )
        .then((rows) => rows[0]),

      // Per-merchant breakdown
      db
        .select({
          merchantId: eftTransactions.merchantId,
          merchantName: users.name,
          merchantCompany: users.companyName,
          totalTransactions: count(),
          totalAmount: sum(eftTransactions.amount),
          completedCount: count(
            sql`CASE WHEN ${eftTransactions.status} = 'completed' THEN 1 END`
          ),
        })
        .from(eftTransactions)
        .leftJoin(users, eq(eftTransactions.merchantId, users.id))
        .where(
          and(
            inArray(eftTransactions.merchantId, merchantIds),
            gte(eftTransactions.createdAt, fromDate),
            lte(eftTransactions.createdAt, toDate)
          )
        )
        .groupBy(eftTransactions.merchantId, users.name, users.companyName),
    ]);

    // Calculate growth percentages
    const currentTxCount = currentKpis?.totalTransactions || 0;
    const previousTxCount = previousKpis?.totalTransactions || 0;
    const currentAmount = parseFloat(currentKpis?.totalAmount || '0');
    const previousAmount = parseFloat(previousKpis?.totalAmount || '0');

    const transactionGrowth =
      previousTxCount > 0
        ? Math.round(((currentTxCount - previousTxCount) / previousTxCount) * 100)
        : 0;
    const amountGrowth =
      previousAmount > 0
        ? Math.round(((currentAmount - previousAmount) / previousAmount) * 100)
        : 0;

    return NextResponse.json({
      success: true,
      data: {
        period: {
          from: fromDate.toISOString(),
          to: toDate.toISOString(),
        },
        kpis: {
          totalTransactions: currentTxCount,
          totalAmount: currentKpis?.totalAmount || '0',
          completedCount: currentKpis?.completedCount || 0,
          failedCount: currentKpis?.failedCount || 0,
          growth: {
            transactions: transactionGrowth,
            amount: amountGrowth,
          },
        },
        merchantBreakdown,
      },
    });
  } catch (error: any) {
    console.error('Error fetching partner analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
