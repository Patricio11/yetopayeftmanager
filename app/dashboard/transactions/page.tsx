import { requireAuth } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { eftTransactions, eftBanks, users } from "@/lib/db/schema";
import { eq, desc, and, gte, lte, ilike, or, sql } from "drizzle-orm";
import { TransactionsClient } from "@/components/dashboard/TransactionsClient";

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

  // Build conditions
  const conditions = [];
  
  // Role-based access
  if (!isAdmin) {
    conditions.push(eq(eftTransactions.merchantId, session.user.id));
  } else if (merchantId) {
    conditions.push(eq(eftTransactions.merchantId, merchantId));
  }

  // Status filter
  if (status && status !== "all") {
    conditions.push(eq(eftTransactions.status, status as any));
  }

  // Date range
  if (fromDate) {
    conditions.push(gte(eftTransactions.createdAt, new Date(fromDate)));
  }
  if (toDate) {
    const endDate = new Date(toDate);
    endDate.setHours(23, 59, 59, 999);
    conditions.push(lte(eftTransactions.createdAt, endDate));
  }

  // Search — matches reference, customer email/name, and the transaction ID
  if (search) {
    conditions.push(
      or(
        ilike(eftTransactions.reference, `%${search}%`),
        ilike(eftTransactions.customerEmail, `%${search}%`),
        ilike(eftTransactions.customerName, `%${search}%`),
        sql`${eftTransactions.id}::text ILIKE ${`%${search}%`}`
      )
    );
  }

  // Bank filter
  if (bankId && bankId !== "all") {
    conditions.push(eq(eftTransactions.eftBankId, bankId));
  }

  // Payment method filter
  if (paymentMethod && paymentMethod !== "all") {
    conditions.push(eq(eftTransactions.paymentMethod, paymentMethod));
  }

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
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(eftTransactions.createdAt))
    .limit(limit)
    .offset(offset);

  const [transactions, totalCount, merchants, banks] = await Promise.all([
    transactionsQuery,
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(eftTransactions)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .then((res) => res[0]?.count || 0),
    isAdmin
      ? db.select({ id: users.id, name: users.name, email: users.email, companyName: users.companyName }).from(users).where(eq(users.role, "merchant"))
      : Promise.resolve([]),
    db.select({ id: eftBanks.id, bankName: eftBanks.bankName, code: eftBanks.code }).from(eftBanks).where(eq(eftBanks.enabled, true)).orderBy(eftBanks.bankName),
  ]);

  // Get statistics for the filtered data
  const stats = await db
    .select({
      totalAmount: sql<string>`COALESCE(SUM(CAST(${eftTransactions.amount} AS NUMERIC)), 0)`,
      completedAmount: sql<string>`COALESCE(SUM(CASE WHEN ${eftTransactions.status} = 'completed' THEN CAST(${eftTransactions.amount} AS NUMERIC) ELSE 0 END), 0)`,
      completedCount: sql<number>`COUNT(CASE WHEN ${eftTransactions.status} = 'completed' THEN 1 END)::int`,
      pendingCount: sql<number>`COUNT(CASE WHEN ${eftTransactions.status} = 'initiated' THEN 1 END)::int`,
      failedCount: sql<number>`COUNT(CASE WHEN ${eftTransactions.status} IN ('failed', 'cancelled', 'aborted', 'expired') THEN 1 END)::int`,
    })
    .from(eftTransactions)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .then((res) => res[0]);

  return (
    <TransactionsClient
      initialTransactions={transactions}
      initialStats={{
        totalAmount: parseFloat(stats?.totalAmount || "0"),
        completedAmount: parseFloat(stats?.completedAmount || "0"),
        completedCount: stats?.completedCount || 0,
        pendingCount: stats?.pendingCount || 0,
        failedCount: stats?.failedCount || 0,
        totalCount,
      }}
      merchants={merchants}
      banks={banks}
      isAdmin={isAdmin}
      auditEnabled={auditEnabled}
      currentPage={page}
      totalPages={Math.ceil(totalCount / limit)}
    />
  );
}
