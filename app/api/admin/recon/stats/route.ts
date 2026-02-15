import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { eftInvoices, eftTransactions } from "@/lib/db/schema";
import { eq, sql, and, gte, count } from "drizzle-orm";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return auth.response;

    // Total invoices by status
    const statusCounts = await db
      .select({
        status: eftInvoices.status,
        count: count(),
        total: sql<string>`COALESCE(SUM(${eftInvoices.totalAmount}::numeric), 0)`,
      })
      .from(eftInvoices)
      .groupBy(eftInvoices.status);

    // Current month completed transactions (not yet invoiced potential)
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const [currentMonthTxns] = await db
      .select({
        count: count(),
        volume: sql<string>`COALESCE(SUM(${eftTransactions.amount}::numeric), 0)`,
      })
      .from(eftTransactions)
      .where(
        and(
          eq(eftTransactions.status, "completed"),
          gte(eftTransactions.completedAt, monthStart)
        )
      );

    // Total revenue from paid invoices
    const [paidStats] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${eftInvoices.totalAmount}::numeric), 0)`,
        count: count(),
      })
      .from(eftInvoices)
      .where(eq(eftInvoices.status, "paid"));

    // Outstanding (draft + sent + overdue)
    const [outstandingStats] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${eftInvoices.totalAmount}::numeric), 0)`,
        count: count(),
      })
      .from(eftInvoices)
      .where(
        sql`${eftInvoices.status} IN ('draft', 'sent', 'overdue')`
      );

    return NextResponse.json({
      success: true,
      data: {
        statusCounts,
        currentMonth: {
          transactionCount: currentMonthTxns?.count || 0,
          transactionVolume: currentMonthTxns?.volume || "0",
        },
        totalRevenue: paidStats?.total || "0",
        totalRevenueCount: paidStats?.count || 0,
        outstanding: outstandingStats?.total || "0",
        outstandingCount: outstandingStats?.count || 0,
      },
    });
  } catch (error: any) {
    console.error("Error fetching recon stats:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
