import { requireAuth } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import { BanksManagementClient } from "@/components/dashboard/BanksManagementClient";
import { db } from "@/lib/db";
import { eftBanks } from "@/lib/db/schema";
import { desc, sql } from "drizzle-orm";

export default async function BanksPage() {
  const session = await requireAuth();

  // Only admins can access this page
  if ((session.user.role || 'merchant') !== "admin") {
    redirect("/dashboard");
  }

  // Fetch all banks with transaction stats
  const banks = await db
    .select({
      bank: eftBanks,
      transactionCount: sql<number>`
        (SELECT COUNT(*)::int FROM eft_transactions WHERE eft_bank_id = ${eftBanks.id})
      `,
      completedCount: sql<number>`
        (SELECT COUNT(*)::int FROM eft_transactions WHERE eft_bank_id = ${eftBanks.id} AND status = 'completed')
      `,
    })
    .from(eftBanks)
    .orderBy(desc(eftBanks.createdAt));

  return <BanksManagementClient initialBanks={banks} />;
}
