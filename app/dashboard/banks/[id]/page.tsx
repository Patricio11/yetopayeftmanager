import { requireAuth } from "@/lib/auth-server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { eftBanks, eftTransactions } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { ArrowLeft, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

const fmtR = (v: number) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(v);

export default async function BankDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAuth();
  if ((session.user.role || "merchant") !== "admin") redirect("/dashboard");

  const { id } = await params;

  const bank = await db.query.eftBanks.findFirst({ where: eq(eftBanks.id, id) });
  if (!bank) notFound();

  const [statusRows, recent] = await Promise.all([
    db
      .select({ status: eftTransactions.status, count: sql<number>`COUNT(*)::int` })
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
      .limit(20),
  ]);

  const by: Record<string, number> = {};
  for (const r of statusRows) by[r.status || "unknown"] = r.count;
  const total = statusRows.reduce((s, r) => s + r.count, 0);
  const completed = by["completed"] || 0;
  const failed = by["failed"] || 0;
  const cancelled = by["cancelled"] || 0;
  const expired = by["expired"] || 0;
  const aborted = by["aborted"] || 0;
  const notStarted = by["not_started"] || 0;
  const initiated = by["initiated"] || 0;
  const pending = by["pending"] || 0;
  const attempts = total - notStarted - initiated;
  const successRate = attempts > 0 ? Math.round((completed / attempts) * 100) : 0;
  const failRate = attempts > 0 ? Math.round(((failed + cancelled + expired + aborted) / attempts) * 100) : 0;

  const txnUrl = (status?: string) =>
    `/dashboard/transactions?bankId=${id}${status ? `&status=${status}` : ""}`;

  // Clickable breakdown cards → drill into the transactions page (with actions).
  const cards: { label: string; value: number; status?: string; cls: string }[] = [
    { label: "Completed", value: completed, status: "completed", cls: "text-emerald-600" },
    { label: "Failed", value: failed, status: "failed", cls: "text-red-600" },
    { label: "Cancelled", value: cancelled, status: "cancelled", cls: "text-amber-600" },
    { label: "Expired", value: expired, status: "expired", cls: "text-slate-500" },
    { label: "Not started", value: notStarted, status: "not_started", cls: "text-slate-500" },
    { label: "Pending", value: pending, status: "pending", cls: "text-blue-600" },
  ];

  const statusColor = (s: string | null) =>
    s === "completed" ? "text-emerald-600"
    : s === "failed" || s === "aborted" ? "text-red-600"
    : s === "cancelled" ? "text-amber-600"
    : s === "pending" || s === "initiated" ? "text-blue-600"
    : "text-slate-500";

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link href="/dashboard/banks" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-green-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Banks
      </Link>

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center font-bold text-white text-lg shrink-0"
          style={{ backgroundColor: bank.color || "#10b981" }}
        >
          {bank.bankName.substring(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{bank.bankName}</h1>
          <p className="text-sm text-slate-500">
            Code <span className="font-mono">{bank.code}</span>
            {bank.branchCode ? <> · Branch {bank.branchCode}</> : null}
            {" · "}
            {bank.enabled ? <span className="text-green-600 font-medium">Active</span> : <span className="text-red-600 font-medium">Disabled</span>}
          </p>
        </div>
        <Link
          href={txnUrl()}
          className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-green-700 to-green-500 text-white text-sm font-medium hover:from-green-800 hover:to-green-600"
        >
          View all transactions <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Totals + rates */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Link href={txnUrl()} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:border-green-400 transition-colors">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total Transactions</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{total}</p>
          <p className="text-[11px] text-slate-400 mt-1">{attempts} started attempts</p>
        </Link>
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Success rate</p>
          <p className="text-3xl font-bold text-emerald-600 mt-1">{successRate}%</p>
          <p className="text-[11px] text-slate-400 mt-1">of started attempts</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide text-red-700 dark:text-red-400">Fail rate</p>
          <p className="text-3xl font-bold text-red-600 mt-1">{failRate}%</p>
          <p className="text-[11px] text-slate-400 mt-1">failed / cancelled / expired</p>
        </div>
        <Link href={txnUrl("completed")} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:border-green-400 transition-colors">
          <p className="text-xs uppercase tracking-wide text-slate-500">Completed volume</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{completed}</p>
          <p className="text-[11px] text-slate-400 mt-1">click to view</p>
        </Link>
      </div>

      {/* Breakdown — each card drills into the filtered transactions page */}
      <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Transaction breakdown</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={txnUrl(c.status)}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:border-green-400 hover:shadow-sm transition-all group"
          >
            <p className="text-[11px] uppercase tracking-wide text-slate-500">{c.label}</p>
            <p className={`text-2xl font-bold mt-1 ${c.cls}`}>{c.value}</p>
            <p className="text-[10px] text-slate-400 mt-1 group-hover:text-green-600">View →</p>
          </Link>
        ))}
      </div>

      {/* Recent transactions — click any row to open it in the transactions page (with actions) */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Recent transactions</h2>
        <Link href={txnUrl()} className="text-xs text-green-700 hover:underline">View all →</Link>
      </div>
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        {recent.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-10">No transactions for this bank yet.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {recent.map((t) => (
              <Link
                key={t.id}
                href={`/dashboard/transactions?search=${encodeURIComponent(t.reference)}`}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-mono text-sm text-slate-800 dark:text-slate-200 truncate">{t.reference}</p>
                  <p className="text-xs text-slate-400 truncate">
                    {t.customerName || "—"}
                    {t.statusReason ? <> · {t.statusReason}</> : null}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{fmtR(parseFloat(t.amount))}</p>
                  <p className={`text-xs font-medium ${statusColor(t.status)}`}>{t.status}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
