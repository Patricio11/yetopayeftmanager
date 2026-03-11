import { NextRequest, NextResponse } from 'next/server';
import { requirePartner } from '@/lib/auth/authorization';
import { db } from '@/lib/db';
import { users, eftTransactions } from '@/lib/db/schema';
import { eq, and, count, sum, sql, desc, gte, inArray } from 'drizzle-orm';

/**
 * GET /api/partner/dashboard
 * Partner dashboard summary: merchant counts, monthly transaction stats, recent transactions
 */
export async function GET(request: NextRequest) {
  const auth = await requirePartner();
  if (!auth.authorized) return auth.response;
  const partnerId = auth.session.user.id;

  try {
    // Get merchant counts
    const [merchantTotal] = await db
      .select({ total: count() })
      .from(users)
      .where(and(eq(users.partnerId, partnerId), eq(users.role, 'merchant')));

    const [merchantActive] = await db
      .select({ total: count() })
      .from(users)
      .where(
        and(
          eq(users.partnerId, partnerId),
          eq(users.role, 'merchant'),
          eq(users.isActive, true)
        )
      );

    // Get partner's merchant IDs
    const merchantRows = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.partnerId, partnerId), eq(users.role, 'merchant')));

    const merchantIds = merchantRows.map((m) => m.id);

    // Start of current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let monthTotal = 0;
    let monthAmount = '0';
    let monthCompleted = 0;
    let recentTransactions: any[] = [];

    if (merchantIds.length > 0) {
      // Transaction stats for current month
      const [txStats] = await db
        .select({
          total: count(),
          totalAmount: sum(eftTransactions.amount),
          completed: count(
            sql`CASE WHEN ${eftTransactions.status} = 'completed' THEN 1 END`
          ),
        })
        .from(eftTransactions)
        .where(
          and(
            inArray(eftTransactions.merchantId, merchantIds),
            gte(eftTransactions.createdAt, startOfMonth)
          )
        );

      monthTotal = txStats?.total || 0;
      monthAmount = txStats?.totalAmount || '0';
      monthCompleted = txStats?.completed || 0;

      // Recent 10 transactions across all merchants
      recentTransactions = await db
        .select({
          id: eftTransactions.id,
          amount: eftTransactions.amount,
          status: eftTransactions.status,
          reference: eftTransactions.reference,
          description: eftTransactions.description,
          customerEmail: eftTransactions.customerEmail,
          createdAt: eftTransactions.createdAt,
          merchantId: eftTransactions.merchantId,
          merchantName: users.name,
          merchantCompany: users.companyName,
        })
        .from(eftTransactions)
        .leftJoin(users, eq(eftTransactions.merchantId, users.id))
        .where(inArray(eftTransactions.merchantId, merchantIds))
        .orderBy(desc(eftTransactions.createdAt))
        .limit(10);
    }

    return NextResponse.json({
      success: true,
      data: {
        merchants: {
          total: merchantTotal?.total || 0,
          active: merchantActive?.total || 0,
        },
        transactions: {
          monthTotal,
          monthAmount,
          monthCompleted,
        },
        recentTransactions,
      },
    });
  } catch (error: any) {
    console.error('Error fetching partner dashboard:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
