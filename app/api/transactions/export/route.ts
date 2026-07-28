import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { eftTransactions, eftBanks, users } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { buildTxConditions } from "@/lib/transactions-filter";
import { STATUS_BUCKETS } from "@/lib/transaction-status";

export const dynamic = "force-dynamic";

const MAX_ROWS = 50_000;
const ZA_TZ = "Africa/Johannesburg";

const fmtDateTime = (d: Date | string | null) =>
  d
    ? new Intl.DateTimeFormat("en-GB", {
        timeZone: ZA_TZ,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
        .format(new Date(d))
        .replace(",", "")
    : "-";

const esc = (v: string) =>
  /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;

function failureReason(t: any): string {
  if (t.failureReason) return t.failureReason;
  if (t.statusReason) return t.statusReason;
  const meta = t.metadata as Record<string, any> | null;
  if (meta?.failure_reason) return meta.failure_reason;
  if (meta?.completion_message) return meta.completion_message;
  if (meta?.error) return typeof meta.error === "string" ? meta.error : JSON.stringify(meta.error);
  if (["failed", "cancelled", "aborted", "expired"].includes(t.status || "")) return t.status || "Unknown";
  return "-";
}

const methodLabel = (m: string | null) =>
  m === "card" ? "Card" : m === "eft_direct" ? "EFT" : m || "-";

/**
 * GET /api/transactions/export?<same filters as the transactions page>
 * Streams a CSV of EVERY row matching the current filters (not just the visible
 * page), prefixed with a status-breakdown summary. Admins export any merchant's
 * transactions; other roles are scoped to their own.
 */
export async function GET(request: NextRequest) {
  const session = await requireAuth();
  const isAdmin = (session.user.role || "merchant") === "admin";

  const sp = request.nextUrl.searchParams;
  const filters = {
    status: sp.get("status") || undefined,
    merchantId: sp.get("merchantId") || undefined,
    bankId: sp.get("bankId") || undefined,
    paymentMethod: sp.get("paymentMethod") || undefined,
    from: sp.get("from") || undefined,
    to: sp.get("to") || undefined,
    search: sp.get("search") || undefined,
  };

  const { whereBase, whereFull } = buildTxConditions(filters, { isAdmin, userId: session.user.id });

  const [rows, breakdown] = await Promise.all([
    db
      .select({
        transaction: eftTransactions,
        merchantName: users.companyName,
        merchantFallback: users.name,
        bankName: eftBanks.bankName,
      })
      .from(eftTransactions)
      .leftJoin(users, eq(eftTransactions.merchantId, users.id))
      .leftJoin(eftBanks, eq(eftTransactions.eftBankId, eftBanks.id))
      .where(whereFull)
      .orderBy(desc(eftTransactions.createdAt))
      .limit(MAX_ROWS),
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
      .then((r) => r[0]),
  ]);

  const lines: string[] = [];
  // ── Summary block ──────────────────────────────────────────────────────────
  lines.push("YetoPay Transactions Export");
  lines.push(`Generated,${fmtDateTime(new Date())} SAST`);
  const filterDesc = [
    filters.status && filters.status !== "all" ? `Status: ${filters.status}` : null,
    filters.merchantId && isAdmin ? `Merchant: ${filters.merchantId}` : null,
    filters.bankId ? `Bank: ${filters.bankId}` : null,
    filters.paymentMethod ? `Method: ${filters.paymentMethod}` : null,
    filters.from ? `From: ${filters.from}` : null,
    filters.to ? `To: ${filters.to}` : null,
    filters.search ? `Search: ${filters.search}` : null,
  ].filter(Boolean).join("; ") || "None";
  lines.push(`Filters,${esc(filterDesc)}`);
  lines.push("");
  lines.push("Status Breakdown,Count");
  for (const b of STATUS_BUCKETS) {
    lines.push(`${b.label},${(breakdown as any)?.[b.key] ?? 0}`);
  }
  lines.push(`Total,${breakdown?.total ?? 0}`);
  lines.push(`Total Volume (R),${parseFloat(breakdown?.totalAmount || "0").toFixed(2)}`);
  lines.push(`Successful Volume (R),${parseFloat(breakdown?.completedAmount || "0").toFixed(2)}`);
  lines.push("");

  // ── Detail table ───────────────────────────────────────────────────────────
  const headers = [
    "Date", "Completed At", "Reference", "Merchant Reference", "Bank", "Method",
    "Amount", "Status", "Failure Reason", "Customer", "Email", "Description",
    ...(isAdmin ? ["Merchant"] : []),
  ];
  lines.push(headers.join(","));

  for (const r of rows) {
    const t = r.transaction as any;
    const merchantRef = (t.metadata as any)?.merchantReference || "";
    lines.push(
      [
        esc(fmtDateTime(t.createdAt)),
        esc(fmtDateTime(t.completedAt)),
        esc(t.reference || "-"),
        esc(merchantRef || "-"),
        esc(r.bankName || "-"),
        esc(methodLabel(t.paymentMethod)),
        `R ${parseFloat(t.amount).toFixed(2)}`,
        esc(t.status || "-"),
        esc(failureReason(t)),
        esc(t.customerName || "-"),
        esc(t.customerEmail || "-"),
        esc(t.description || "-"),
        ...(isAdmin ? [esc(r.merchantName || r.merchantFallback || "-")] : []),
      ].join(",")
    );
  }

  if (rows.length >= MAX_ROWS) {
    lines.push("");
    lines.push(`# Export capped at ${MAX_ROWS} rows — narrow the filters for a complete export.`);
  }

  const csv = "﻿" + lines.join("\n"); // BOM for Excel
  const stamp = new Intl.DateTimeFormat("en-CA", { timeZone: ZA_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv;charset=utf-8",
      "Content-Disposition": `attachment; filename="transactions-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
