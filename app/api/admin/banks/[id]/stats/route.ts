import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { eftBanks, eftTransactions } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";

/**
 * GET /api/admin/banks/[id]/stats
 * Full per-status breakdown + rates + recent transactions for one bank.
 * Transactions are linked to a bank via eft_bank_id (set on bank selection).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;

  try {
    const bank = await db.query.eftBanks.findFirst({ where: eq(eftBanks.id, id) });
    if (!bank) {
      return NextResponse.json({ success: false, message: "Bank not found" }, { status: 404 });
    }

    const [statusRows, recent] = await Promise.all([
      db
        .select({
          status: eftTransactions.status,
          count: sql<number>`COUNT(*)::int`,
        })
        .from(eftTransactions)
        .where(eq(eftTransactions.eftBankId, id))
        .groupBy(eftTransactions.status),
      db
        .select({
          id: eftTransactions.id,
          reference: eftTransactions.reference,
          amount: eftTransactions.amount,
          status: eftTransactions.status,
          statusReason: eftTransactions.statusReason,
          customerName: eftTransactions.customerName,
          createdAt: eftTransactions.createdAt,
        })
        .from(eftTransactions)
        .where(eq(eftTransactions.eftBankId, id))
        .orderBy(desc(eftTransactions.createdAt))
        .limit(15),
    ]);

    const by: Record<string, number> = {};
    for (const r of statusRows) by[r.status || "unknown"] = r.count;

    const total = statusRows.reduce((s, r) => s + r.count, 0);
    const completed = by["completed"] || 0;
    const failed = by["failed"] || 0;
    const cancelled = by["cancelled"] || 0;
    const aborted = by["aborted"] || 0;
    const expired = by["expired"] || 0;
    const notStarted = by["not_started"] || 0;
    const initiated = by["initiated"] || 0;
    const pending = by["pending"] || 0;

    // Success rate is over transactions that actually STARTED (exclude
    // not_started/initiated links nobody engaged) so it reflects real attempts.
    const attempts = total - notStarted - initiated;
    const successRate = attempts > 0 ? Math.round((completed / attempts) * 100) : 0;
    const failRate = attempts > 0 ? Math.round(((failed + aborted + expired + cancelled) / attempts) * 100) : 0;

    return NextResponse.json({
      success: true,
      stats: {
        total,
        completed,
        failed,
        cancelled,
        aborted,
        expired,
        notStarted,
        initiated,
        pending,
        attempts,
        successRate,
        failRate,
      },
      recent,
    });
  } catch (error: any) {
    console.error("Error fetching bank stats:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch bank stats" }, { status: 500 });
  }
}
