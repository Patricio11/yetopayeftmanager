import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { eftTransactions, eftBanks, users } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { buildTxConditions } from "@/lib/transactions-filter";
import { STATUS_BUCKETS } from "@/lib/transaction-status";
import ExcelJS from "exceljs";

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

const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

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

const methodLabel = (m: string | null) => (m === "card" ? "Card" : m === "eft_direct" ? "EFT" : m || "-");

/**
 * GET /api/transactions/export?format=xlsx|csv&<same filters as the transactions page>
 * Exports EVERY row matching the current filters (not just the visible page). XLSX
 * (default) has a Summary sheet (status breakdown) + a Transactions sheet; CSV puts
 * the summary as a header block. Admins export any merchant; others are scoped to self.
 */
export async function GET(request: NextRequest) {
  const session = await requireAuth();
  const isAdmin = (session.user.role || "merchant") === "admin";

  const sp = request.nextUrl.searchParams;
  const fileFormat = (sp.get("format") || "xlsx").toLowerCase() === "csv" ? "csv" : "xlsx";
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

  const filterDesc =
    [
      filters.status && filters.status !== "all" ? `Status: ${filters.status}` : null,
      filters.merchantId && isAdmin ? `Merchant: ${filters.merchantId}` : null,
      filters.bankId ? `Bank: ${filters.bankId}` : null,
      filters.paymentMethod ? `Method: ${filters.paymentMethod}` : null,
      filters.from ? `From: ${filters.from}` : null,
      filters.to ? `To: ${filters.to}` : null,
      filters.search ? `Search: ${filters.search}` : null,
    ]
      .filter(Boolean)
      .join("; ") || "None";

  const totalVolume = parseFloat(breakdown?.totalAmount || "0");
  const successVolume = parseFloat(breakdown?.completedAmount || "0");
  const generated = `${fmtDateTime(new Date())} SAST`;

  const detailHeaders = [
    "Date", "Completed At", "Reference", "Merchant Reference", "Bank", "Method",
    "Amount", "Status", "Failure Reason", "Customer", "Email", "Description",
    ...(isAdmin ? ["Merchant"] : []),
  ];

  const detailRow = (r: any) => {
    const t = r.transaction;
    const merchantRef = (t.metadata as any)?.merchantReference || "";
    return [
      fmtDateTime(t.createdAt),
      fmtDateTime(t.completedAt),
      t.reference || "-",
      merchantRef || "-",
      r.bankName || "-",
      methodLabel(t.paymentMethod),
      parseFloat(t.amount),
      t.status || "-",
      failureReason(t),
      t.customerName || "-",
      t.customerEmail || "-",
      t.description || "-",
      ...(isAdmin ? [r.merchantName || r.merchantFallback || "-"] : []),
    ];
  };

  const stamp = new Intl.DateTimeFormat("en-CA", { timeZone: ZA_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

  // ── CSV ──────────────────────────────────────────────────────────────────
  if (fileFormat === "csv") {
    const lines: string[] = [];
    lines.push("YetoPay Transactions Export");
    lines.push(`Generated,${generated}`);
    lines.push(`Filters,${esc(filterDesc)}`);
    lines.push("");
    lines.push("Status Breakdown,Count");
    for (const b of STATUS_BUCKETS) lines.push(`${b.label},${(breakdown as any)?.[b.key] ?? 0}`);
    lines.push(`Total,${breakdown?.total ?? 0}`);
    lines.push(`Total Volume (R),${totalVolume.toFixed(2)}`);
    lines.push(`Successful Volume (R),${successVolume.toFixed(2)}`);
    lines.push("");
    lines.push(detailHeaders.join(","));
    for (const r of rows) {
      lines.push(
        detailRow(r)
          .map((v) => (typeof v === "number" ? `R ${v.toFixed(2)}` : esc(String(v))))
          .join(",")
      );
    }
    if (rows.length >= MAX_ROWS) {
      lines.push("");
      lines.push(`# Export capped at ${MAX_ROWS} rows — narrow the filters for a complete export.`);
    }
    return new NextResponse("﻿" + lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv;charset=utf-8",
        "Content-Disposition": `attachment; filename="transactions-${stamp}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  // ── XLSX ─────────────────────────────────────────────────────────────────
  const wb = new ExcelJS.Workbook();
  wb.creator = "YetoPay";
  wb.created = new Date();

  // Summary sheet
  const s = wb.addWorksheet("Summary", { properties: { defaultColWidth: 22 } });
  s.mergeCells("A1:B1");
  const title = s.getCell("A1");
  title.value = "YetoPay Transactions Export";
  title.font = { bold: true, size: 14, color: { argb: "FF065F46" } };
  s.addRow([]);
  s.addRow(["Generated", generated]);
  s.addRow(["Filters", filterDesc]);
  s.addRow([]);
  const bhead = s.addRow(["Status", "Count"]);
  bhead.font = { bold: true };
  bhead.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
  });
  const toneArgb: Record<string, string> = {
    slate: "FF64748B", amber: "FFF59E0B", green: "FF16A34A", red: "FFDC2626", orange: "FFF97316",
  };
  for (const b of STATUS_BUCKETS) {
    const row = s.addRow([b.label, (breakdown as any)?.[b.key] ?? 0]);
    row.getCell(1).font = { color: { argb: toneArgb[b.tone] || "FF334155" }, bold: true };
  }
  const totalRow = s.addRow(["Total", breakdown?.total ?? 0]);
  totalRow.font = { bold: true };
  s.addRow([]);
  s.addRow(["Total Volume (R)", totalVolume]);
  s.addRow(["Successful Volume (R)", successVolume]);
  s.getColumn(2).numFmt = "#,##0";
  // amounts on the last two rows as currency
  s.getCell(`B${s.rowCount - 1}`).numFmt = '"R" #,##0.00';
  s.getCell(`B${s.rowCount}`).numFmt = '"R" #,##0.00';
  s.getColumn(1).width = 24;

  // Transactions sheet
  const tx = wb.addWorksheet("Transactions", { views: [{ state: "frozen", ySplit: 1 }] });
  tx.columns = detailHeaders.map((h) => ({
    header: h,
    width: h === "Description" || h === "Failure Reason" || h === "Email" ? 30 : h === "Reference" || h === "Merchant Reference" ? 22 : 16,
  }));
  const headerRow = tx.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF065F46" } };
  headerRow.alignment = { vertical: "middle" };
  const amountCol = detailHeaders.indexOf("Amount") + 1;
  for (const r of rows) {
    const added = tx.addRow(detailRow(r));
    added.getCell(amountCol).numFmt = '"R" #,##0.00';
  }
  tx.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: detailHeaders.length } };

  const buffer = await wb.xlsx.writeBuffer();
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="transactions-${stamp}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
