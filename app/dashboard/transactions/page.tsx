import { requireAuth } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { eftTransactions, users } from "@/lib/db/schema";
import { eq, desc, and, gte, lte, like, or, sql } from "drizzle-orm";
import { TransactionsClient } from "@/components/dashboard/TransactionsClient";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await requireAuth();
  const isAdmin = session.user.role === "admin";

  // Parse search params - Next.js 15 requires awaiting searchParams
  const params = await searchParams;
  const status = params.status as string | undefined;
  const merchantId = params.merchantId as string | undefined;
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

  // Search
  if (search) {
    conditions.push(
      or(
        like(eftTransactions.reference, `%${search}%`),
        like(eftTransactions.customerEmail, `%${search}%`),
        like(eftTransactions.customerName, `%${search}%`)
      )
    );
  }

  // Fetch transactions with merchant info
  const transactionsQuery = db
    .select({
      transaction: eftTransactions,
      merchant: {
        id: users.id,
        name: users.name,
        email: users.email,
        companyName: users.companyName,
      },
    })
    .from(eftTransactions)
    .leftJoin(users, eq(eftTransactions.merchantId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(eftTransactions.createdAt))
    .limit(limit)
    .offset(offset);

  const [transactions, totalCount, merchants] = await Promise.all([
    transactionsQuery,
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(eftTransactions)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .then((res) => res[0]?.count || 0),
    isAdmin
      ? db.select({ id: users.id, name: users.name, email: users.email, companyName: users.companyName }).from(users).where(eq(users.role, "merchant"))
      : Promise.resolve([]),
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
      isAdmin={isAdmin}
      currentPage={page}
      totalPages={Math.ceil(totalCount / limit)}
    />
  );
}
