"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Activity, Search, CheckCircle, XCircle, Clock, AlertCircle,
  Filter, ChevronDown, Eye, X, Hash, Building2, User, Landmark, Calendar,
  ScrollText, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuditTimeline } from "@/components/dashboard/AuditTimeline";

interface Merchant {
  id: string;
  name: string;
  companyName: string | null;
}

interface Bank {
  id: string;
  bankName: string;
}

interface Transaction {
  id: string;
  reference: string;
  merchantName: string;
  merchantCompany?: string | null;
  amount: number;
  status: string;
  description?: string | null;
  statusReason?: string | null;
  paymentMethod?: string | null;
  bankName?: string | null;
  customerEmail: string | null;
  customerName: string | null;
  createdAt: string;
  completedAt?: string | null;
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(val);

const statusBadge = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-700 border-green-200";
    case "failed":
      return "bg-red-100 text-red-700 border-red-200";
    case "pending":
    case "initiated":
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
};

const statusIcon = (status: string) => {
  switch (status) {
    case "completed":
      return <CheckCircle className="w-3.5 h-3.5" />;
    case "failed":
      return <XCircle className="w-3.5 h-3.5" />;
    case "pending":
    case "initiated":
      return <Clock className="w-3.5 h-3.5" />;
    default:
      return <AlertCircle className="w-3.5 h-3.5" />;
  }
};

const LIMIT = 50;

export default function PartnerTransactionsPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 text-slate-400">Loading...</div>}>
      <PartnerTransactionsInner />
    </Suspense>
  );
}

function PartnerTransactionsInner() {
  const urlSearch = useSearchParams().get("search") || "";
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  // Filters
  const [merchantId, setMerchantId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [bankFilter, setBankFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchInput, setSearchInput] = useState(urlSearch);
  const [search, setSearch] = useState(urlSearch);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [viewTxn, setViewTxn] = useState<Transaction | null>(null);
  const [auditTxn, setAuditTxn] = useState<Transaction | null>(null);
  const [auditEnabled, setAuditEnabled] = useState(false);

  // Load merchants + banks for the filter dropdowns
  useEffect(() => {
    const fetchMerchants = async () => {
      try {
        const res = await fetch("/api/partner/merchants");
        const json = await res.json();
        if (json.success) {
          setMerchants(json.data || []);
        }
      } catch {
        // Silently fail, filter just won't have merchants
      }
    };
    const fetchBanks = async () => {
      try {
        const res = await fetch("/api/merchant/banks");
        const json = await res.json();
        const list = json.data?.banks || [];
        if (Array.isArray(list)) {
          setBanks(list.map((b: any) => ({ id: b.id, bankName: b.bankName || b.name })));
        }
      } catch {
        // Silently fail, filter just won't have banks
      }
    };
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/partner/settings");
        const json = await res.json();
        if (json.success) setAuditEnabled(!!json.data.auditEnabled);
      } catch {
        // Silently fail — audit button just stays hidden
      }
    };
    fetchMerchants();
    fetchBanks();
    fetchSettings();
  }, []);

  const buildQuery = useCallback(
    (currentOffset: number) => {
      const params = new URLSearchParams();
      if (merchantId) params.set("merchantId", merchantId);
      if (statusFilter) params.set("status", statusFilter);
      if (bankFilter) params.set("bankId", bankFilter);
      if (methodFilter) params.set("paymentMethod", methodFilter);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      if (search) params.set("search", search);
      params.set("limit", LIMIT.toString());
      params.set("offset", currentOffset.toString());
      return params.toString();
    },
    [merchantId, statusFilter, bankFilter, methodFilter, dateFrom, dateTo, search]
  );

  const fetchTransactions = useCallback(
    async (reset = true) => {
      const currentOffset = reset ? 0 : offset;
      if (reset) {
        setLoading(true);
        setTransactions([]);
        setOffset(0);
      } else {
        setLoadingMore(true);
      }

      try {
        const res = await fetch(`/api/partner/transactions?${buildQuery(currentOffset)}`);
        const json = await res.json();
        if (json.success) {
          const newData = json.data || [];
          if (reset) {
            setTransactions(newData);
          } else {
            setTransactions((prev) => [...prev, ...newData]);
          }
          setHasMore(newData.length === LIMIT);
          setOffset(currentOffset + newData.length);
        } else {
          setError(json.error || "Failed to load transactions");
        }
      } catch {
        setError("Failed to load transactions");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [buildQuery, offset]
  );

  useEffect(() => {
    fetchTransactions(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchantId, statusFilter, bankFilter, methodFilter, dateFrom, dateTo, search]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
          Transactions
        </h1>
        <p className="text-slate-500 mt-1">View transactions across all your merchants</p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
        {/* Search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by reference, transaction ID, email, or name..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") setSearch(searchInput.trim()); }}
              className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
          </div>
          <Button
            onClick={() => setSearch(searchInput.trim())}
            className="bg-green-600 hover:bg-green-700 text-white shrink-0"
          >
            Search
          </Button>
          {search && (
            <Button
              variant="outline"
              onClick={() => { setSearchInput(""); setSearch(""); }}
              className="shrink-0"
            >
              Clear
            </Button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {/* Merchant Filter */}
          <div className="relative flex-1">
            <select
              value={merchantId}
              onChange={(e) => setMerchantId(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent appearance-none bg-white pr-8"
            >
              <option value="">All Merchants</option>
              {merchants.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.companyName || m.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-40 px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent appearance-none bg-white pr-8"
            >
              <option value="">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="initiated">Initiated</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
              <option value="expired">Expired</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Bank Filter */}
          <div className="relative">
            <select
              value={bankFilter}
              onChange={(e) => setBankFilter(e.target.value)}
              className="w-full sm:w-40 px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent appearance-none bg-white pr-8"
            >
              <option value="">All Banks</option>
              {banks.map((b) => (
                <option key={b.id} value={b.id}>{b.bankName}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Method Filter */}
          <div className="relative">
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="w-full sm:w-40 px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent appearance-none bg-white pr-8"
            >
              <option value="">All Methods</option>
              <option value="eft_direct">Pay by Bank</option>
              <option value="card">Card</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Date From */}
          <div>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="From"
              className="w-full sm:w-40 px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
          </div>

          {/* Date To */}
          <div>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="To"
              className="w-full sm:w-40 px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-white rounded-xl border border-red-200 p-8 shadow-sm text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-slate-900 font-medium">{error}</p>
          <Button variant="outline" className="mt-4" onClick={() => fetchTransactions(true)}>
            Retry
          </Button>
        </div>
      )}

      {/* Transactions Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Reference</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Merchant</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Bank</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 w-28 bg-slate-200 rounded" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-32 bg-slate-200 rounded" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-20 bg-slate-200 rounded ml-auto" /></td>
                    <td className="px-6 py-4"><div className="h-6 w-20 bg-slate-200 rounded-full" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-36 bg-slate-200 rounded" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-28 bg-slate-200 rounded" /></td>
                  </tr>
                ))
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <Activity className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">No transactions found</p>
                    <p className="text-slate-400 text-sm mt-1">Try adjusting your filters</p>
                  </td>
                </tr>
              ) : (
                transactions.map((txn) => (
                  <tr key={txn.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-slate-900">{txn.reference}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-700">{txn.merchantName}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-bold text-slate-900">
                        {formatCurrency(txn.amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusBadge(txn.status)}`}>
                        {statusIcon(txn.status)}
                        {txn.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600 inline-flex items-center gap-1.5">
                        {txn.bankName ? (
                          <>
                            <Landmark className="w-3.5 h-3.5 text-slate-400" />
                            {txn.bankName}
                          </>
                        ) : txn.paymentMethod === "card" ? (
                          "Card"
                        ) : (
                          "—"
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {new Date(txn.createdAt).toLocaleDateString("en-ZA", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setViewTxn(txn)}
                        className="p-2 rounded-lg text-slate-400 hover:text-green-700 hover:bg-green-50 transition-colors"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Load More */}
        {!loading && hasMore && transactions.length > 0 && (
          <div className="p-4 border-t border-slate-100 text-center">
            <Button
              variant="outline"
              onClick={() => fetchTransactions(false)}
              disabled={loadingMore}
            >
              {loadingMore ? "Loading..." : "Load More"}
            </Button>
          </div>
        )}

        {/* Results count */}
        {!loading && transactions.length > 0 && (
          <div className="px-6 py-3 border-t border-slate-100 text-xs text-slate-500">
            Showing {transactions.length} transaction{transactions.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Transaction Details Modal */}
      {viewTxn && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setViewTxn(null)}>
          <div
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Transaction Details</h3>
                <p className="text-xs text-slate-500 mt-0.5">Reference: {viewTxn.reference}</p>
              </div>
              <button onClick={() => setViewTxn(null)} className="p-1 rounded hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Amount + status */}
              <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Amount</p>
                  <p className="text-2xl font-bold text-slate-900">{formatCurrency(viewTxn.amount)}</p>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${statusBadge(viewTxn.status)}`}>
                  {statusIcon(viewTxn.status)}
                  {viewTxn.status}
                </span>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-start gap-2.5">
                  <Hash className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">Transaction ID</p>
                    <p className="font-mono text-xs text-slate-900 break-all">{viewTxn.id}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Building2 className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500">Merchant</p>
                    <p className="text-slate-900">{viewTxn.merchantCompany || viewTxn.merchantName}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <User className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">Customer</p>
                    <p className="text-slate-900">{viewTxn.customerName || "—"}</p>
                    {viewTxn.customerEmail && <p className="text-xs text-slate-500 break-all">{viewTxn.customerEmail}</p>}
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Landmark className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500">Bank / Method</p>
                    <p className="text-slate-900">
                      {viewTxn.bankName || "—"}
                      {viewTxn.paymentMethod ? ` · ${viewTxn.paymentMethod === "card" ? "Card" : "Pay by Bank"}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Calendar className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500">Created</p>
                    <p className="text-slate-900">
                      {new Date(viewTxn.createdAt).toLocaleString("en-ZA", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500">Completed</p>
                    <p className="text-slate-900">
                      {viewTxn.completedAt
                        ? new Date(viewTxn.completedAt).toLocaleString("en-ZA", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                        : "—"}
                    </p>
                  </div>
                </div>
              </div>

              {viewTxn.description && (
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-xs text-slate-500 mb-0.5">Description</p>
                  <p className="text-sm text-slate-900">{viewTxn.description}</p>
                </div>
              )}

              {viewTxn.statusReason && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs font-medium text-amber-700 mb-0.5">Status Reason</p>
                  <p className="text-sm text-amber-900">{viewTxn.statusReason}</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center">
              {auditEnabled ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setAuditTxn(viewTxn); setViewTxn(null); }}
                  className="gap-2"
                >
                  <ScrollText className="w-4 h-4" />
                  View Audit
                </Button>
              ) : <span />}
              <Button variant="outline" size="sm" onClick={() => setViewTxn(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Trail Dialog */}
      {auditTxn && (
        <AuditDialog txn={auditTxn} onClose={() => setAuditTxn(null)} />
      )}
    </div>
  );
}

// ─── Audit Trail Dialog ──────────────────────────────────────────────────────

interface AuditData {
  date: string | null;
  log: string | null;
  screenshots: { name: string; url: string }[];
  logFiles?: { name: string; url: string }[];
}

function AuditDialog({ txn, onClose }: { txn: Transaction; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [audit, setAudit] = useState<AuditData | null>(null);
  // Client-side fallback for large logs dropped from the API payload.
  const [fetchedLog, setFetchedLog] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setFetchedLog(null);
    fetch(`/api/partner/transactions/${txn.id}/audit`)
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setAudit(j.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [txn.id]);

  useEffect(() => {
    if (!audit || (audit.log && audit.log.length > 0)) return;
    const logFile = (audit.logFiles || []).find((f) => /transaction\.log$/i.test(f.name));
    if (!logFile) return;
    let cancelled = false;
    fetch(logFile.url)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((text) => { if (!cancelled) setFetchedLog(text); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [audit]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <ScrollText className="w-5 h-5 text-green-700" />
              Transaction Audit
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">The full story of this transaction · Ref {txn.reference}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-[320px] p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-slate-400 animate-spin mb-3" />
              <p className="text-sm text-slate-500">Loading audit trail...</p>
            </div>
          ) : (
            <AuditTimeline log={(audit?.log && audit.log.length > 0 ? audit.log : fetchedLog) ?? null} screenshots={audit?.screenshots || []} />
          )}
        </div>

        <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400">{audit?.date ? `Stored under ${audit.date}` : ""}</span>
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
