import { requireAuth } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { eftTransactions, eftBanks, users } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { TransactionsClient } from "@/components/dashboard/TransactionsClient";
import { buildTxConditions } from "@/lib/transactions-filter";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await requireAuth();
  const isAdmin = (session.user.role || 'merchant') === "admin";

  // Audit access: admins always; merchants only when an admin granted it
  let auditEnabled = isAdmin;
  if (!isAdmin) {
    const me = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      columns: { eftSettings: true },
    });
    auditEnabled = !!(me?.eftSettings as any)?.auditEnabled;
  }

  // Parse search params - Next.js 15 requires awaiting searchParams
  const params = await searchParams;
  const status = params.status as string | undefined;
  const merchantId = params.merchantId as string | undefined;
  const bankId = params.bankId as string | undefined;
  const paymentMethod = params.paymentMethod as string | undefined;
  const fromDate = params.from as string | undefined;
  const toDate = params.to as string | undefined;
  const search = params.search as string | undefined;
  const page = parseInt(params.page as string) || 1;
  const limit = 50;
  const offset = (page - 1) * limit;

  // Build filter conditions (shared with the CSV export). `whereBase` excludes the
  // status filter so the status breakdown can count every bucket; `whereFull`
  // adds it and drives the table + pagination.
  const { whereBase, whereFull } = buildTxConditions(
    { status, merchantId, bankId, paymentMethod, from: fromDate, to: toDate, search },
    { isAdmin, userId: session.user.id }
  );

  // Fetch transactions with merchant info and bank info
  const transactionsQuery = db
    .select({
      transaction: eftTransactions,
      merchant: {
        id: users.id,
        name: users.name,
        email: users.email,
        companyName: users.companyName,
      },
      bank: {
        id: eftBanks.id,
        bankName: eftBanks.bankName,
        code: eftBanks.code,
      },
    })
    .from(eftTransactions)
    .leftJoin(users, eq(eftTransactions.merchantId, users.id))
    .leftJoin(eftBanks, eq(eftTransactions.eftBankId, eftBanks.id))
    .where(whereFull)
    .orderBy(desc(eftTransactions.createdAt))
    .limit(limit)
    .offset(offset);

  const [transactions, totalCount, merchants, banks, breakdown] = await Promise.all([
    transactionsQuery,
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(eftTransactions)
      .where(whereFull)
      .then((res) => res[0]?.count || 0),
    isAdmin
      ? db.select({ id: users.id, name: users.name, email: users.email, companyName: users.companyName }).from(users).where(eq(users.role, "merchant"))
      : Promise.resolve([]),
    db.select({ id: eftBanks.id, bankName: eftBanks.bankName, code: eftBanks.code }).from(eftBanks).where(eq(eftBanks.enabled, true)).orderBy(eftBanks.bankName),
    // Status breakdown — counts per bucket over the NON-status filters, so every
    // chip shows its count no matter which status is selected.
    db
      .select({
        not_started: sql<number>`COUNT(CASE WHEN ${eftTransactions.status} = 'not_started' THEN 1 END)::int`,
        pending: sql<number>`COUNT(CASE WHEN ${eftTransactions.status} IN ('initiated','pending') THEN 1 END)::int`,
        completed: sql<number>`COUNT(CASE WHEN ${eftTransactions.status} = 'completed' THEN 1 END)::int`,
        failed: sql<number>`COUNT(CASE WHEN ${eftTransactions.status} IN ('failed','aborted','expired') THEN 1 END)::int`,
        cancelled: sql<number>`COUNT(CASE WHEN ${eftTransactions.status} = 'cancelled' THEN 1 END)::int`,
        total: sql<number>`COUNT(*)::int`,
        totalAmount: sql<string>`COALESCE(SUM(CAST(${eftTransactions.amount} AS NUMERIC)), 0)`,
        completedAmount: sql<string>`COALESCE(SUM(CASE WHEN ${eftTransactions.status} = 'completed' THEN CAST(${eftTransactions.amount} AS NUMERIC) ELSE 0 END), 0)`,
      })
      .from(eftTransactions)
      .where(whereBase)
      .then((res) => res[0]),
  ]);

  const statusBreakdown = {
    not_started: breakdown?.not_started || 0,
    pending: breakdown?.pending || 0,
    completed: breakdown?.completed || 0,
    failed: breakdown?.failed || 0,
    cancelled: breakdown?.cancelled || 0,
    total: breakdown?.total || 0,
  };

  return (
    <TransactionsClient
      initialTransactions={transactions}
      initialStats={{
        totalAmount: parseFloat(breakdown?.totalAmount || "0"),
        completedAmount: parseFloat(breakdown?.completedAmount || "0"),
        completedCount: statusBreakdown.completed,
        pendingCount: statusBreakdown.pending,
        failedCount: statusBreakdown.failed,
        totalCount: statusBreakdown.total,
      }}
      statusBreakdown={statusBreakdown}
      merchants={merchants}
      banks={banks}
      isAdmin={isAdmin}
      auditEnabled={auditEnabled}
      currentPage={page}
      totalPages={Math.ceil(totalCount / limit)}
    />
  );
}
