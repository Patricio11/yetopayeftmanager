"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Activity, Search, CheckCircle, XCircle, Clock, AlertCircle,
  Filter, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Merchant {
  id: string;
  name: string;
  companyName: string | null;
}

interface Transaction {
  id: string;
  reference: string;
  merchantName: string;
  amount: number;
  status: string;
  customerEmail: string | null;
  customerName: string | null;
  createdAt: string;
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
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Load merchants for filter dropdown
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
    fetchMerchants();
  }, []);

  const buildQuery = useCallback(
    (currentOffset: number) => {
      const params = new URLSearchParams();
      if (merchantId) params.set("merchantId", merchantId);
      if (statusFilter) params.set("status", statusFilter);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      params.set("limit", LIMIT.toString());
      params.set("offset", currentOffset.toString());
      return params.toString();
    },
    [merchantId, statusFilter, dateFrom, dateTo]
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
  }, [merchantId, statusFilter, dateFrom, dateTo]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
          Transactions
        </h1>
        <p className="text-slate-500 mt-1">View transactions across all your merchants</p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Merchant Filter */}
          <div className="relative flex-1">
            <select
              value={merchantId}
              onChange={(e) => setMerchantId(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none bg-white pr-8"
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
              className="w-full sm:w-40 px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none bg-white pr-8"
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

          {/* Date From */}
          <div>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="From"
              className="w-full sm:w-40 px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Date To */}
          <div>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="To"
              className="w-full sm:w-40 px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
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
                  <td colSpan={6} className="px-6 py-16 text-center">
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
                      <span className="text-sm text-slate-600">
                        {txn.customerName || txn.customerEmail || "—"}
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
    </div>
  );
}
