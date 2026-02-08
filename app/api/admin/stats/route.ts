import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/authorization';
import { db } from '@/lib/db';
import { users, eftTransactions, eftBankAccounts, apiKeys } from '@/lib/db/schema';
import { eq, count, sum, sql, and, gte } from 'drizzle-orm';

/**
 * GET /api/admin/stats
 * Platform-wide statistics for admin dashboard
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // User stats
    const [userStats] = await db
      .select({
        totalUsers: count(),
        totalMerchants: count(sql`CASE WHEN ${users.role} = 'merchant' THEN 1 END`),
        totalAdmins: count(sql`CASE WHEN ${users.role} = 'admin' THEN 1 END`),
        activeUsers: count(sql`CASE WHEN ${users.isActive} = true THEN 1 END`),
        inactiveUsers: count(sql`CASE WHEN ${users.isActive} = false THEN 1 END`),
        verifiedUsers: count(sql`CASE WHEN ${users.emailVerified} = true THEN 1 END`),
        kycPending: count(sql`CASE WHEN ${users.kycStatus} = 'pending' THEN 1 END`),
        kycApproved: count(sql`CASE WHEN ${users.kycStatus} = 'approved' THEN 1 END`),
        kycRejected: count(sql`CASE WHEN ${users.kycStatus} = 'rejected' THEN 1 END`),
      })
      .from(users);

    // New merchants this month
    const [newMerchantsMonth] = await db
      .select({ count: count() })
      .from(users)
      .where(and(eq(users.role, 'merchant'), gte(users.createdAt, thirtyDaysAgo)));

    // Transaction stats
    const [txStats] = await db
      .select({
        totalTransactions: count(),
        totalVolume: sum(eftTransactions.amount),
        completedTransactions: count(sql`CASE WHEN ${eftTransactions.status} = 'completed' THEN 1 END`),
        completedVolume: sum(sql`CASE WHEN ${eftTransactions.status} = 'completed' THEN ${eftTransactions.amount}::numeric ELSE 0 END`),
        failedTransactions: count(sql`CASE WHEN ${eftTransactions.status} = 'failed' THEN 1 END`),
        pendingTransactions: count(sql`CASE WHEN ${eftTransactions.status} IN ('not_started', 'initiated') THEN 1 END`),
      })
      .from(eftTransactions);

    // Today's transactions
    const [todayTx] = await db
      .select({
        count: count(),
        volume: sum(eftTransactions.amount),
      })
      .from(eftTransactions)
      .where(gte(eftTransactions.createdAt, today));

    // Last 7 days transactions
    const [weekTx] = await db
      .select({
        count: count(),
        volume: sum(eftTransactions.amount),
      })
      .from(eftTransactions)
      .where(gte(eftTransactions.createdAt, sevenDaysAgo));

    // Last 30 days transactions
    const [monthTx] = await db
      .select({
        count: count(),
        volume: sum(eftTransactions.amount),
      })
      .from(eftTransactions)
      .where(gte(eftTransactions.createdAt, thirtyDaysAgo));

    // Daily transaction chart data (last 30 days)
    const dailyTransactions = await db
      .select({
        date: sql<string>`DATE(${eftTransactions.createdAt})::text`,
        count: count(),
        volume: sum(eftTransactions.amount),
        completed: count(sql`CASE WHEN ${eftTransactions.status} = 'completed' THEN 1 END`),
      })
      .from(eftTransactions)
      .where(gte(eftTransactions.createdAt, thirtyDaysAgo))
      .groupBy(sql`DATE(${eftTransactions.createdAt})`)
      .orderBy(sql`DATE(${eftTransactions.createdAt})`);

    // Top merchants by volume
    const topMerchants = await db
      .select({
        merchantId: eftTransactions.merchantId,
        merchantName: users.name,
        companyName: users.companyName,
        totalVolume: sum(eftTransactions.amount),
        totalTransactions: count(),
      })
      .from(eftTransactions)
      .leftJoin(users, eq(eftTransactions.merchantId, users.id))
      .groupBy(eftTransactions.merchantId, users.name, users.companyName)
      .orderBy(sql`sum(${eftTransactions.amount}) DESC NULLS LAST`)
      .limit(10);

    // Success rate
    const successRate = txStats.totalTransactions > 0
      ? ((txStats.completedTransactions / txStats.totalTransactions) * 100).toFixed(1)
      : '0';

    return NextResponse.json({
      success: true,
      data: {
        users: {
          ...userStats,
          newMerchantsThisMonth: newMerchantsMonth?.count || 0,
        },
        transactions: {
          ...txStats,
          successRate,
          today: {
            count: todayTx?.count || 0,
            volume: todayTx?.volume || '0',
          },
          thisWeek: {
            count: weekTx?.count || 0,
            volume: weekTx?.volume || '0',
          },
          thisMonth: {
            count: monthTx?.count || 0,
            volume: monthTx?.volume || '0',
          },
        },
        charts: {
          dailyTransactions,
        },
        topMerchants,
      },
    });
  } catch (error: any) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
