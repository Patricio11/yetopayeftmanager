import { eftTransactions } from "@/lib/db/schema";
import { and, gte, lte, ilike, or, eq, inArray, sql, type SQL } from "drizzle-orm";
import { statusesForBucket } from "./transaction-status";

/**
 * Shared transaction filter builder — used by the transactions page, the status
 * breakdown, and the CSV export so they always filter identically.
 *
 * Returns `base` (every filter EXCEPT status) and `full` (base + the status
 * filter). The status breakdown counts run over `base` so every bucket shows a
 * count regardless of which status is currently selected; the table + pagination
 * run over `full`.
 */
export interface TxFilterParams {
  status?: string;
  merchantId?: string;
  bankId?: string;
  paymentMethod?: string;
  from?: string;
  to?: string;
  search?: string;
}

export interface TxAccess {
  isAdmin: boolean;
  userId: string;
}

export function buildTxConditions(p: TxFilterParams, access: TxAccess) {
  const base: SQL[] = [];

  // Role scope: non-admins are pinned to their own transactions.
  if (!access.isAdmin) {
    base.push(eq(eftTransactions.merchantId, access.userId));
  } else if (p.merchantId && p.merchantId !== "all") {
    base.push(eq(eftTransactions.merchantId, p.merchantId));
  }

  if (p.from) base.push(gte(eftTransactions.createdAt, new Date(p.from)));
  if (p.to) {
    const end = new Date(p.to);
    end.setHours(23, 59, 59, 999);
    base.push(lte(eftTransactions.createdAt, end));
  }

  if (p.search) {
    base.push(
      or(
        ilike(eftTransactions.reference, `%${p.search}%`),
        ilike(eftTransactions.customerEmail, `%${p.search}%`),
        ilike(eftTransactions.customerName, `%${p.search}%`),
        sql`${eftTransactions.id}::text ILIKE ${`%${p.search}%`}`,
        sql`${eftTransactions.metadata}->>'merchantReference' ILIKE ${`%${p.search}%`}`
      ) as SQL
    );
  }

  if (p.bankId && p.bankId !== "all") base.push(eq(eftTransactions.eftBankId, p.bankId));
  if (p.paymentMethod && p.paymentMethod !== "all") {
    base.push(eq(eftTransactions.paymentMethod, p.paymentMethod));
  }

  const statuses = statusesForBucket(p.status);
  const statusCondition = statuses ? (inArray(eftTransactions.status, statuses as any) as SQL) : null;

  const full = statusCondition ? [...base, statusCondition] : base;

  return {
    base,
    full,
    whereBase: base.length ? and(...base) : undefined,
    whereFull: full.length ? and(...full) : undefined,
  };
}
