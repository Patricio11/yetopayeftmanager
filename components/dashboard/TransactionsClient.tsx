"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Download,
  Filter,
  Search,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CheckCircle,
  Clock,
  XCircle,
  ArrowUpDown,
  FileText,
  Calendar,
  RefreshCw,
  Eye,
  Pencil,
  Send,
  CreditCard,
  Landmark,
} from "lucide-react";
// Format dates/times in a FIXED timezone (SAST) so the server-rendered HTML and
// the client hydration always produce identical text. date-fns `format` uses the
// runtime's local zone — UTC on the server, the visitor's zone in the browser —
// which mismatches and throws React hydration error #418. Intl with an explicit
// IANA timeZone is deterministic on both. (Africa/Johannesburg has no DST.)
const ZA_TZ = "Africa/Johannesburg";
const zaDate = (d: string | number | Date) =>
  new Intl.DateTimeFormat("en-US", { timeZone: ZA_TZ, month: "short", day: "2-digit", year: "numeric" }).format(new Date(d));
const zaTime = (d: string | number | Date) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: ZA_TZ, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date(d));
import { useRouter, useSearchParams } from "next/navigation";
import {
  TransactionDetailDialog,
  UpdateStatusDialog,
  ResendWebhookDialog,
} from "./TransactionDialogs";
import { STATUS_BUCKETS, type StatusTone } from "@/lib/transaction-status";

type StatusBreakdown = {
  not_started: number;
  pending: number;
  completed: number;
  failed: number;
  cancelled: number;
  total: number;
};

// Tailwind classes per status tone, for the breakdown chips (active vs idle).
const TONE_CLASSES: Record<StatusTone, { active: string; idle: string; dot: string }> = {
  slate: {
    active: "bg-slate-600 text-white border-slate-600 shadow-sm",
    idle: "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400",
    dot: "bg-slate-400",
  },
  amber: {
    active: "bg-amber-500 text-white border-amber-500 shadow-sm",
    idle: "bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/40 hover:border-amber-400",
    dot: "bg-amber-500",
  },
  green: {
    active: "bg-green-600 text-white border-green-600 shadow-sm",
    idle: "bg-white dark:bg-slate-800 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900/40 hover:border-green-400",
    dot: "bg-green-600",
  },
  red: {
    active: "bg-red-600 text-white border-red-600 shadow-sm",
    idle: "bg-white dark:bg-slate-800 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/40 hover:border-red-400",
    dot: "bg-red-600",
  },
  orange: {
    active: "bg-orange-500 text-white border-orange-500 shadow-sm",
    idle: "bg-white dark:bg-slate-800 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-900/40 hover:border-orange-400",
    dot: "bg-orange-500",
  },
};

type Transaction = {
  transaction: {
    id: string;
    reference: string;
    amount: string;
    status: string | null;
    createdAt: Date;
    updatedAt: Date;
    completedAt: Date | null;
    customerEmail: string | null;
    customerName: string | null;
    description: string | null;
    statusReason: string | null;
    failureReason: string | null;
    paymentMethod: string | null;
    updatedBy: string | null;
    notifyUrl: string | null;
    successUrl: string | null;
    failureUrl: string | null;
    cancelledUrl: string | null;
    metadata: any;
  };
  merchant: {
    id: string;
    name: string;
    email: string;
    companyName: string | null;
  } | null;
  bank: {
    id: string;
    bankName: string;
    code: string;
  } | null;
};

type Stats = {
  totalAmount: number;
  completedAmount: number;
  completedCount: number;
  pendingCount: number;
  failedCount: number;
  totalCount: number;
};

type Merchant = {
  id: string;
  name: string;
  email: string;
  companyName: string | null;
};

type Bank = {
  id: string;
  bankName: string;
  code: string;
};

interface TransactionsClientProps {
  initialTransactions: Transaction[];
  initialStats: Stats;
  statusBreakdown: StatusBreakdown;
  merchants: Merchant[];
  banks: Bank[];
  isAdmin: boolean;
  auditEnabled?: boolean;
  currentPage: number;
  totalPages: number;
}

export function TransactionsClient({
  initialTransactions,
  initialStats,
  statusBreakdown,
  merchants,
  banks,
  isAdmin,
  auditEnabled = false,
  currentPage,
  totalPages,
}: TransactionsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [showFilters, setShowFilters] = useState(true);
  const [localSearch, setLocalSearch] = useState(searchParams.get("search") || "");
  const [sortField, setSortField] = useState<"date" | "amount">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Dialog state
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [updateStatusOpen, setUpdateStatusOpen] = useState(false);
  const [resendWebhookOpen, setResendWebhookOpen] = useState(false);

  // Sort transactions locally
  const sortedTransactions = useMemo(() => {
    const sorted = [...initialTransactions];
    sorted.sort((a, b) => {
      if (sortField === "date") {
        const dateA = new Date(a.transaction.createdAt).getTime();
        const dateB = new Date(b.transaction.createdAt).getTime();
        return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
      } else {
        const amountA = parseFloat(a.transaction.amount);
        const amountB = parseFloat(b.transaction.amount);
        return sortOrder === "asc" ? amountA - amountB : amountB - amountA;
      }
    });
    return sorted;
  }, [initialTransactions, sortField, sortOrder]);

  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page"); // Reset to first page when filtering
    router.push(`/dashboard/transactions?${params.toString()}`);
  };

  const handleSearch = () => {
    updateFilters("search", localSearch);
  };

  // Export ALL rows matching the current filters (not just this page) plus a
  // status breakdown summary \u2014 generated server-side so pagination doesn't limit it.
  const handleExportCSV = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    const a = document.createElement("a");
    a.href = `/api/transactions/export?${params.toString()}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400";
      case "initiated":
        return "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400";
      case "failed":
      case "cancelled":
      case "aborted":
      case "expired":
        return "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400";
      default:
        return "bg-slate-100 dark:bg-slate-900/20 text-slate-700 dark:text-slate-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4" />;
      case "initiated":
        return <Clock className="w-4 h-4" />;
      default:
        return <XCircle className="w-4 h-4" />;
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Transactions
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            View and manage all payment transactions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.refresh()}
            className="hover:bg-blue-50 dark:hover:bg-blue-900/20"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="hover:bg-green-50 dark:hover:bg-green-900/20"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </div>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-5 bg-gradient-to-br from-white to-blue-50/50 dark:from-slate-800 dark:to-blue-900/10 border-slate-200/50 dark:border-slate-700/50 hover:shadow-xl transition-all duration-300 cursor-pointer">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Total Volume
                </h3>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                R {initialStats.totalAmount.toFixed(2)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                {initialStats.totalCount} transactions
              </p>
            </div>
            <TrendingUp className="w-4 h-4 text-blue-500 mt-1" />
          </div>
        </Card>

        <Card className="p-5 bg-gradient-to-br from-white to-green-50/50 dark:from-slate-800 dark:to-green-900/10 border-slate-200/50 dark:border-slate-700/50 hover:shadow-xl transition-all duration-300 cursor-pointer">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-9 h-9 bg-gradient-to-br from-green-700 to-green-500 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Completed
                </h3>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                R {initialStats.completedAmount.toFixed(2)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                {initialStats.completedCount} successful
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5 bg-gradient-to-br from-white to-green-50/50 dark:from-slate-800 dark:to-green-900/10 border-slate-200/50 dark:border-slate-700/50 hover:shadow-xl transition-all duration-300 cursor-pointer">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-9 h-9 bg-gradient-to-br from-green-600 to-green-500 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Pending
                </h3>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {initialStats.pendingCount}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                Awaiting payment
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5 bg-gradient-to-br from-white to-red-50/50 dark:from-slate-800 dark:to-red-900/10 border-slate-200/50 dark:border-slate-700/50 hover:shadow-xl transition-all duration-300 cursor-pointer">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-9 h-9 bg-gradient-to-br from-red-500 to-rose-600 rounded-lg flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Failed
                </h3>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {initialStats.failedCount}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                Unsuccessful attempts
              </p>
            </div>
            <TrendingDown className="w-4 h-4 text-red-500 mt-1" />
          </div>
        </Card>
      </div>

        {/* Status breakdown — clickable chips with live counts for the current
            merchant/date/search selection. Click a chip to filter the table by it. */}
        <Card className="mb-6 p-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 mr-1">
              Status
            </span>
            {(() => {
              const activeStatus = searchParams.get("status") || "all";
              const chipBase =
                "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-colors cursor-pointer";
              const countBadge = (active: boolean) =>
                cn(
                  "text-xs px-1.5 py-0.5 rounded-full font-semibold tabular-nums",
                  active ? "bg-white/25" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                );
              const counts: Record<string, number> = {
                not_started: statusBreakdown.not_started,
                pending: statusBreakdown.pending,
                completed: statusBreakdown.completed,
                failed: statusBreakdown.failed,
                cancelled: statusBreakdown.cancelled,
              };
              return (
                <>
                  <button
                    onClick={() => updateFilters("status", "all")}
                    className={cn(
                      chipBase,
                      activeStatus === "all"
                        ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-sm"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                    )}
                  >
                    All
                    <span className={countBadge(activeStatus === "all")}>{statusBreakdown.total}</span>
                  </button>
                  {STATUS_BUCKETS.map((b) => {
                    const tone = TONE_CLASSES[b.tone];
                    const isActive = activeStatus === b.key;
                    return (
                      <button
                        key={b.key}
                        onClick={() => updateFilters("status", isActive ? "all" : b.key)}
                        className={cn(chipBase, isActive ? tone.active : tone.idle)}
                        title={`${b.label}: ${counts[b.key]}`}
                      >
                        <span className={cn("w-2 h-2 rounded-full", isActive ? "bg-white/80" : tone.dot)} />
                        {b.label}
                        <span className={countBadge(isActive)}>{counts[b.key]}</span>
                      </button>
                    );
                  })}
                </>
              );
            })()}
          </div>
        </Card>

        {/* Filters */}
        <Card className="mb-6 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Filter className="w-5 h-5 text-blue-600" />
                Filters
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                {showFilters ? "Hide" : "Show"} Filters
              </Button>
            </div>

            {showFilters && (
              <div className="space-y-4">
                {/* Search */}
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Search by reference, transaction ID, email, or name..."
                      value={localSearch}
                      onChange={(e) => setLocalSearch(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      className="pl-10"
                    />
                  </div>
                  <Button onClick={handleSearch}>Search</Button>
                </div>

                {/* Filters Row */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                      Bank
                    </label>
                    <Select
                      value={searchParams.get("bankId") || "all"}
                      onValueChange={(value) => updateFilters("bankId", value)}
                    >
                      <SelectTrigger className="cursor-pointer">
                        <SelectValue placeholder="All Banks" />
                      </SelectTrigger>
                      <SelectContent className="cursor-pointer">
                        <SelectItem value="all" className="cursor-pointer">All Banks</SelectItem>
                        {banks.map((bank) => (
                          <SelectItem key={bank.id} value={bank.id} className="cursor-pointer">
                            {bank.bankName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                      Method
                    </label>
                    <Select
                      value={searchParams.get("paymentMethod") || "all"}
                      onValueChange={(value) => updateFilters("paymentMethod", value)}
                    >
                      <SelectTrigger className="cursor-pointer">
                        <SelectValue placeholder="All Methods" />
                      </SelectTrigger>
                      <SelectContent className="cursor-pointer">
                        <SelectItem value="all" className="cursor-pointer">All Methods</SelectItem>
                        <SelectItem value="eft_direct" className="cursor-pointer">Pay by Bank</SelectItem>
                        <SelectItem value="card" className="cursor-pointer">Card Payment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {isAdmin && (
                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                        Merchant
                      </label>
                      <Select
                        value={searchParams.get("merchantId") || "all"}
                        onValueChange={(value) => updateFilters("merchantId", value)}
                      >
                        <SelectTrigger className="cursor-pointer">
                          <SelectValue placeholder="All Merchants" />
                        </SelectTrigger>
                        <SelectContent className="cursor-pointer">
                          <SelectItem value="all" className="cursor-pointer">All Merchants</SelectItem>
                          {merchants.map((merchant) => (
                            <SelectItem key={merchant.id} value={merchant.id} className="cursor-pointer">
                              {merchant.companyName || merchant.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                      From Date
                    </label>
                    <Input
                      type="date"
                      value={searchParams.get("from") || ""}
                      onChange={(e) => updateFilters("from", e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                      To Date
                    </label>
                    <Input
                      type="date"
                      value={searchParams.get("to") || ""}
                      onChange={(e) => updateFilters("to", e.target.value)}
                    />
                  </div>
                </div>

                {/* Clear Filters */}
                {(searchParams.toString() !== "") && (
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push("/dashboard/transactions")}
                    >
                      Clear All Filters
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Transactions Table */}
        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50 shadow-xl">
          <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Transaction List
              </h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSortField("date");
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                  }}
                  className={sortField === "date" ? "bg-blue-50 dark:bg-blue-900/20" : ""}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Date
                  <ArrowUpDown className="w-3 h-3 ml-2" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSortField("amount");
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                  }}
                  className={sortField === "amount" ? "bg-blue-50 dark:bg-blue-900/20" : ""}
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Amount
                  <ArrowUpDown className="w-3 h-3 ml-2" />
                </Button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto px-6">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-0">Date</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead>Method</TableHead>
                  {isAdmin && <TableHead>Merchant</TableHead>}
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-0 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={isAdmin ? 8 : 7}
                      className="text-center py-12 text-slate-500 dark:text-slate-400"
                    >
                      <div className="flex flex-col items-center gap-4">
                        <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600" />
                        <div>
                          <p className="font-semibold mb-1">No transactions found</p>
                          <p className="text-sm">Try adjusting your filters or search criteria</p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedTransactions.map((item) => (
                    <TableRow
                      key={item.transaction.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                    >
                      <TableCell className="font-medium pl-0">
                        <div>
                          <div className="text-sm font-semibold text-slate-900 dark:text-white">
                            {zaDate(item.transaction.createdAt)}
                          </div>
                          <div className="text-xs text-slate-500">
                            {zaTime(item.transaction.createdAt)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {/* Human-facing reference is the merchant's own (connector
                            links); the internal link reference is shown small below
                            for correlation/support. */}
                        <div className="font-mono text-sm text-slate-700 dark:text-slate-300">
                          {(item.transaction.metadata as any)?.merchantReference || item.transaction.reference}
                        </div>
                        {(item.transaction.metadata as any)?.merchantReference &&
                          (item.transaction.metadata as any).merchantReference !== item.transaction.reference && (
                            <div className="font-mono text-[11px] text-slate-400 truncate max-w-[180px]" title={item.transaction.reference}>
                              {item.transaction.reference}
                            </div>
                          )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {item.bank?.bankName || "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          item.transaction.paymentMethod === 'card'
                            ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400'
                            : item.transaction.paymentMethod === 'eft_direct'
                            ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                            : 'bg-slate-100 dark:bg-slate-900/20 text-slate-700 dark:text-slate-400'
                        }`}>
                          {item.transaction.paymentMethod === 'card' ? (
                            <><CreditCard className="w-3 h-3" /> Card</>
                          ) : item.transaction.paymentMethod === 'eft_direct' ? (
                            <><Landmark className="w-3 h-3" /> EFT</>
                          ) : (
                            item.transaction.paymentMethod || '-'
                          )}
                        </span>
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          <div>
                            <div className="font-medium text-sm text-slate-900 dark:text-white">
                              {item.merchant?.companyName || item.merchant?.name || "-"}
                            </div>
                            <div className="text-xs text-slate-500">{item.merchant?.email}</div>
                          </div>
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="font-bold text-lg text-slate-900 dark:text-white">
                          R {parseFloat(item.transaction.amount).toFixed(2)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                            item.transaction.status || "not_started"
                          )}`}
                        >
                          {getStatusIcon(item.transaction.status || "not_started")}
                          {item.transaction.status || "not_started"}
                        </span>
                      </TableCell>
                      <TableCell className="pr-0">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            title="View Details"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTransaction(item as any);
                              setDetailOpen(true);
                            }}
                          >
                            <Eye className="w-4 h-4 text-blue-600" />
                          </Button>
                          {isAdmin && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 hover:bg-green-50 dark:hover:bg-green-900/20"
                                title="Update Status"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTransaction(item as any);
                                  setUpdateStatusOpen(true);
                                }}
                              >
                                <Pencil className="w-4 h-4 text-green-700" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 hover:bg-green-50 dark:hover:bg-green-900/20"
                                title="Resend Webhook"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTransaction(item as any);
                                  setResendWebhookOpen(true);
                                }}
                              >
                                <Send className="w-4 h-4 text-green-600" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-6 border-t border-slate-200/50 dark:border-slate-700/50">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => {
                      const params = new URLSearchParams(searchParams.toString());
                      params.set("page", String(currentPage - 1));
                      router.push(`/dashboard/transactions?${params.toString()}`);
                    }}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => {
                      const params = new URLSearchParams(searchParams.toString());
                      params.set("page", String(currentPage + 1));
                      router.push(`/dashboard/transactions?${params.toString()}`);
                    }}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>

      {/* Dialogs */}
      <TransactionDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        transaction={selectedTransaction as any}
        isAdmin={isAdmin}
        auditEnabled={auditEnabled}
      />

      {isAdmin && (
        <>
          <UpdateStatusDialog
            open={updateStatusOpen}
            onOpenChange={setUpdateStatusOpen}
            transaction={selectedTransaction as any}
            onSuccess={() => router.refresh()}
          />
          <ResendWebhookDialog
            open={resendWebhookOpen}
            onOpenChange={setResendWebhookOpen}
            transaction={selectedTransaction as any}
          />
        </>
      )}
    </main>
  );
}
