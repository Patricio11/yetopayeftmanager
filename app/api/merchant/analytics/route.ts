import { NextRequest, NextResponse } from "next/server";
import { authenticateMerchant } from "@/lib/auth/merchant-auth";
import { db } from "@/lib/db";
import { eftTransactions, eftBanks } from "@/lib/db/schema";
import { eq, and, gte, lte, sql, count, sum } from "drizzle-orm";

/**
 * GET /api/merchant/analytics
 * Returns comprehensive analytics data for the merchant dashboard.
 * Supports both session and API key authentication.
 *
 * Query params:
 *   from - ISO date (start of period)
 *   to   - ISO date (end of period)
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateMerchant(req, 'analytics.read');
  if (!auth.success) return auth.response;

  const merchantId = auth.merchantId;
  const url = new URL(req.url);

  // Parse date range (default: last 30 days)
  const now = new Date();
  const defaultFrom = new Date(now);
  defaultFrom.setDate(defaultFrom.getDate() - 29);
  defaultFrom.setHours(0, 0, 0, 0);

  const from = url.searchParams.get("from")
    ? new Date(url.searchParams.get("from")!)
    : defaultFrom;
  const to = url.searchParams.get("to")
    ? new Date(url.searchParams.get("to")!)
    : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  // Calculate previous period for comparison (same length, immediately before)
  const periodMs = to.getTime() - from.getTime();
  const prevFrom = new Date(from.getTime() - periodMs);
  const prevTo = new Date(from.getTime() - 1);

  const baseWhere = eq(eftTransactions.merchantId, merchantId);

  try {
    // Run all queries in parallel
    const [
      currentPeriodStats,
      previousPeriodStats,
      dailyBreakdown,
      hourlyBreakdown,
      bankPerformance,
      topFailureReasons,
      allTimeStats,
      paymentMethodBreakdown,
    ] = await Promise.all([
      // 1. Current period KPIs
      db.select({
        totalCount: count(),
        completedCount: sql<number>`COUNT(CASE WHEN ${eftTransactions.status} = 'completed' THEN 1 END)::int`,
        failedCount: sql<number>`COUNT(CASE WHEN ${eftTransactions.status} IN ('failed','cancelled','aborted','expired') THEN 1 END)::int`,
        pendingCount: sql<number>`COUNT(CASE WHEN ${eftTransactions.status} IN ('initiated','pending','not_started') THEN 1 END)::int`,
        totalRevenue: sql<string>`COALESCE(SUM(CASE WHEN ${eftTransactions.status} = 'completed' THEN CAST(${eftTransactions.amount} AS NUMERIC) ELSE 0 END), 0)`,
        totalVolume: sql<string>`COALESCE(SUM(CAST(${eftTransactions.amount} AS NUMERIC)), 0)`,
        avgAmount: sql<string>`COALESCE(AVG(CASE WHEN ${eftTransactions.status} = 'completed' THEN CAST(${eftTransactions.amount} AS NUMERIC) END), 0)`,
        maxAmount: sql<string>`COALESCE(MAX(CASE WHEN ${eftTransactions.status} = 'completed' THEN CAST(${eftTransactions.amount} AS NUMERIC) END), 0)`,
        minAmount: sql<string>`COALESCE(MIN(CASE WHEN ${eftTransactions.status} = 'completed' THEN CAST(${eftTransactions.amount} AS NUMERIC) END), 0)`,
      })
        .from(eftTransactions)
        .where(and(baseWhere, gte(eftTransactions.createdAt, from), lte(eftTransactions.createdAt, to))),

      // 2. Previous period KPIs (for comparison)
      db.select({
        totalCount: count(),
        completedCount: sql<number>`COUNT(CASE WHEN ${eftTransactions.status} = 'completed' THEN 1 END)::int`,
        totalRevenue: sql<string>`COALESCE(SUM(CASE WHEN ${eftTransactions.status} = 'completed' THEN CAST(${eftTransactions.amount} AS NUMERIC) ELSE 0 END), 0)`,
      })
        .from(eftTransactions)
        .where(and(baseWhere, gte(eftTransactions.createdAt, prevFrom), lte(eftTransactions.createdAt, prevTo))),

      // 3. Daily breakdown (for trend charts)
      db.select({
        day: sql<string>`TO_CHAR(${eftTransactions.createdAt}, 'YYYY-MM-DD')`,
        completed: sql<number>`COUNT(CASE WHEN ${eftTransactions.status} = 'completed' THEN 1 END)::int`,
        failed: sql<number>`COUNT(CASE WHEN ${eftTransactions.status} IN ('failed','cancelled','aborted','expired') THEN 1 END)::int`,
        pending: sql<number>`COUNT(CASE WHEN ${eftTransactions.status} IN ('initiated','pending','not_started') THEN 1 END)::int`,
        total: count(),
        revenue: sql<string>`COALESCE(SUM(CASE WHEN ${eftTransactions.status} = 'completed' THEN CAST(${eftTransactions.amount} AS NUMERIC) ELSE 0 END), 0)`,
        volume: sql<string>`COALESCE(SUM(CAST(${eftTransactions.amount} AS NUMERIC)), 0)`,
      })
        .from(eftTransactions)
        .where(and(baseWhere, gte(eftTransactions.createdAt, from), lte(eftTransactions.createdAt, to)))
        .groupBy(sql`TO_CHAR(${eftTransactions.createdAt}, 'YYYY-MM-DD')`)
        .orderBy(sql`TO_CHAR(${eftTransactions.createdAt}, 'YYYY-MM-DD')`),

      // 4. Hourly breakdown (peak hours heatmap)
      db.select({
        hour: sql<number>`EXTRACT(HOUR FROM ${eftTransactions.createdAt})::int`,
        dayOfWeek: sql<number>`EXTRACT(DOW FROM ${eftTransactions.createdAt})::int`,
        count: count(),
        completed: sql<number>`COUNT(CASE WHEN ${eftTransactions.status} = 'completed' THEN 1 END)::int`,
      })
        .from(eftTransactions)
        .where(and(baseWhere, gte(eftTransactions.createdAt, from), lte(eftTransactions.createdAt, to)))
        .groupBy(
          sql`EXTRACT(HOUR FROM ${eftTransactions.createdAt})`,
          sql`EXTRACT(DOW FROM ${eftTransactions.createdAt})`
        ),

      // 5. Bank performance
      db.select({
        bankId: eftTransactions.eftBankId,
        bankName: eftBanks.bankName,
        bankCode: eftBanks.code,
        totalCount: count(),
        completedCount: sql<number>`COUNT(CASE WHEN ${eftTransactions.status} = 'completed' THEN 1 END)::int`,
        failedCount: sql<number>`COUNT(CASE WHEN ${eftTransactions.status} IN ('failed','cancelled','aborted','expired') THEN 1 END)::int`,
        revenue: sql<string>`COALESCE(SUM(CASE WHEN ${eftTransactions.status} = 'completed' THEN CAST(${eftTransactions.amount} AS NUMERIC) ELSE 0 END), 0)`,
      })
        .from(eftTransactions)
        .leftJoin(eftBanks, eq(eftTransactions.eftBankId, eftBanks.id))
        .where(and(baseWhere, gte(eftTransactions.createdAt, from), lte(eftTransactions.createdAt, to)))
        .groupBy(eftTransactions.eftBankId, eftBanks.bankName, eftBanks.code),

      // 6. Top failure reasons
      db.select({
        reason: sql<string>`COALESCE(${eftTransactions.failureReason}, ${eftTransactions.statusReason}, 'Unknown')`,
        count: count(),
      })
        .from(eftTransactions)
        .where(
          and(
            baseWhere,
            gte(eftTransactions.createdAt, from),
            lte(eftTransactions.createdAt, to),
            sql`${eftTransactions.status} IN ('failed','cancelled','aborted','expired')`
          )
        )
        .groupBy(sql`COALESCE(${eftTransactions.failureReason}, ${eftTransactions.statusReason}, 'Unknown')`)
        .orderBy(sql`COUNT(*) DESC`)
        .limit(10),

      // 7. All-time totals (for lifetime stats)
      db.select({
        totalCount: count(),
        completedCount: sql<number>`COUNT(CASE WHEN ${eftTransactions.status} = 'completed' THEN 1 END)::int`,
        totalRevenue: sql<string>`COALESCE(SUM(CASE WHEN ${eftTransactions.status} = 'completed' THEN CAST(${eftTransactions.amount} AS NUMERIC) ELSE 0 END), 0)`,
      })
        .from(eftTransactions)
        .where(baseWhere),

      // 8. Payment method breakdown
      db.select({
        paymentMethod: eftTransactions.paymentMethod,
        totalCount: count(),
        completedCount: sql<number>`COUNT(CASE WHEN ${eftTransactions.status} = 'completed' THEN 1 END)::int`,
        failedCount: sql<number>`COUNT(CASE WHEN ${eftTransactions.status} IN ('failed','cancelled','aborted','expired') THEN 1 END)::int`,
        revenue: sql<string>`COALESCE(SUM(CASE WHEN ${eftTransactions.status} = 'completed' THEN CAST(${eftTransactions.amount} AS NUMERIC) ELSE 0 END), 0)`,
        volume: sql<string>`COALESCE(SUM(CAST(${eftTransactions.amount} AS NUMERIC)), 0)`,
      })
        .from(eftTransactions)
        .where(and(baseWhere, gte(eftTransactions.createdAt, from), lte(eftTransactions.createdAt, to)))
        .groupBy(eftTransactions.paymentMethod),
    ]);

    const current = currentPeriodStats[0];
    const previous = previousPeriodStats[0];
    const allTime = allTimeStats[0];

    // Calculate growth percentages
    const revenueGrowth = previous.totalRevenue && parseFloat(previous.totalRevenue) > 0
      ? ((parseFloat(current.totalRevenue) - parseFloat(previous.totalRevenue)) / parseFloat(previous.totalRevenue)) * 100
      : 0;
    const volumeGrowth = previous.totalCount > 0
      ? ((current.totalCount - previous.totalCount) / previous.totalCount) * 100
      : 0;
    const successRate = current.totalCount > 0
      ? (current.completedCount / current.totalCount) * 100
      : 0;
    const prevSuccessRate = previous.totalCount > 0
      ? (previous.completedCount / previous.totalCount) * 100
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        period: { from: from.toISOString(), to: to.toISOString() },
        kpis: {
          revenue: parseFloat(current.totalRevenue),
          revenueGrowth: Math.round(revenueGrowth * 10) / 10,
          transactionCount: current.totalCount,
          volumeGrowth: Math.round(volumeGrowth * 10) / 10,
          completedCount: current.completedCount,
          failedCount: current.failedCount,
          pendingCount: current.pendingCount,
          successRate: Math.round(successRate * 10) / 10,
          successRateChange: Math.round((successRate - prevSuccessRate) * 10) / 10,
          avgTransactionValue: parseFloat(parseFloat(current.avgAmount).toFixed(2)),
          maxTransaction: parseFloat(parseFloat(current.maxAmount).toFixed(2)),
          minTransaction: parseFloat(parseFloat(current.minAmount).toFixed(2)),
          totalVolume: parseFloat(current.totalVolume),
        },
        allTime: {
          totalTransactions: allTime.totalCount,
          totalRevenue: parseFloat(allTime.totalRevenue),
          completedTransactions: allTime.completedCount,
        },
        dailyBreakdown: dailyBreakdown.map(d => ({
          date: d.day,
          completed: d.completed,
          failed: d.failed,
          pending: d.pending,
          total: d.total,
          revenue: parseFloat(d.revenue),
          volume: parseFloat(d.volume),
        })),
        hourlyBreakdown: hourlyBreakdown.map(h => ({
          hour: h.hour,
          dayOfWeek: h.dayOfWeek,
          count: h.count,
          completed: h.completed,
        })),
        bankPerformance: bankPerformance
          .filter(b => b.bankName)
          .map(b => ({
            bankName: b.bankName!,
            bankCode: b.bankCode,
            totalCount: b.totalCount,
            completedCount: b.completedCount,
            failedCount: b.failedCount,
            successRate: b.totalCount > 0 ? Math.round((b.completedCount / b.totalCount) * 1000) / 10 : 0,
            revenue: parseFloat(b.revenue),
          }))
          .sort((a, b) => b.totalCount - a.totalCount),
        topFailureReasons: topFailureReasons.map(f => ({
          reason: f.reason,
          count: f.count,
        })),
        paymentMethodBreakdown: paymentMethodBreakdown.map(m => ({
          method: m.paymentMethod || 'eft_direct',
          label: (m.paymentMethod || 'eft_direct') === 'card' ? 'Card Payment' : 'Pay by Bank (EFT)',
          totalCount: m.totalCount,
          completedCount: m.completedCount,
          failedCount: m.failedCount,
          successRate: m.totalCount > 0 ? Math.round((m.completedCount / m.totalCount) * 1000) / 10 : 0,
          revenue: parseFloat(m.revenue),
          volume: parseFloat(m.volume),
        })).sort((a, b) => b.totalCount - a.totalCount),
      },
    });
  } catch (error: any) {
    console.error("[Analytics API] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
