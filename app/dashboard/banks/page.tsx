import { requireAuth } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import { BanksManagementClient } from "@/components/dashboard/BanksManagementClient";
import { db } from "@/lib/db";
import { eftBanks, eftTransactions } from "@/lib/db/schema";
import { desc, sql } from "drizzle-orm";

// Always render fresh — stats change constantly and must never be cached stale.
export const dynamic = "force-dynamic";

export default async function BanksPage() {
  const session = await requireAuth();

  // Only admins can access this page
  if ((session.user.role || 'merchant') !== "admin") {
    redirect("/dashboard");
  }

  // Per-bank transaction stats in ONE grouped pass (correlated subqueries with a
  // Drizzle column ref were returning 0), then merge onto the bank list in JS.
  const [banks, stats] = await Promise.all([
    db.select().from(eftBanks).orderBy(eftBanks.displayOrder, desc(eftBanks.createdAt)),
    db
      .select({
        eftBankId: eftTransactions.eftBankId,
        total: sql<number>`COUNT(*)::int`,
        completed: sql<number>`COUNT(*) FILTER (WHERE ${eftTransactions.status} = 'completed')::int`,
      })
      .from(eftTransactions)
      .groupBy(eftTransactions.eftBankId),
  ]);

  const statsMap = new Map(stats.map((s) => [s.eftBankId, s]));
  const initialBanks = banks.map((bank) => {
    const s = statsMap.get(bank.id);
    return {
      bank,
      transactionCount: s?.total ?? 0,
      completedCount: s?.completed ?? 0,
    };
  });

  return <BanksManagementClient initialBanks={initialBanks} />;
}
