"use client";

import { useState, useMemo } from "react";
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
  FileSpreadsheet,
  FileText,
  Calendar,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";

type Transaction = {
  transaction: {
    id: string;
    reference: string;
    amount: string;
    status: string | null;
    createdAt: Date;
    completedAt: Date | null;
    customerEmail: string | null;
    customerName: string | null;
    description: string | null;
  };
  merchant: {
    id: string;
    name: string;
    email: string;
    companyName: string | null;
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

interface TransactionsClientProps {
  initialTransactions: Transaction[];
  initialStats: Stats;
  merchants: Merchant[];
  isAdmin: boolean;
  currentPage: number;
  totalPages: number;
}

export function TransactionsClient({
  initialTransactions,
  initialStats,
  merchants,
  isAdmin,
  currentPage,
  totalPages,
}: TransactionsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [showFilters, setShowFilters] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchParams.get("search") || "");
  const [sortField, setSortField] = useState<"date" | "amount">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

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

  const handleExportCSV = () => {
    const headers = ["Date", "Reference", "Amount", "Status", "Customer", "Email", isAdmin ? "Merchant" : ""].filter(Boolean);
    const rows = sortedTransactions.map((t) => [
      format(new Date(t.transaction.createdAt), "yyyy-MM-dd HH:mm:ss"),
      t.transaction.reference,
      `R ${parseFloat(t.transaction.amount).toFixed(2)}`,
      t.transaction.status,
      t.transaction.customerName || "-",
      t.transaction.customerEmail || "-",
      isAdmin ? (t.merchant?.companyName || t.merchant?.name || "-") : "",
    ].filter(Boolean));

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="p-6 bg-gradient-to-br from-white to-blue-50/50 dark:from-slate-800 dark:to-blue-900/10 border-slate-200/50 dark:border-slate-700/50 hover:shadow-xl transition-all duration-300 cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">
              Total Volume
            </h3>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              R {initialStats.totalAmount.toFixed(2)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
              {initialStats.totalCount} transactions
            </p>
          </Card>

        <Card className="p-6 bg-gradient-to-br from-white to-green-50/50 dark:from-slate-800 dark:to-green-900/10 border-slate-200/50 dark:border-slate-700/50 hover:shadow-xl transition-all duration-300 cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">
              Completed
            </h3>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              R {initialStats.completedAmount.toFixed(2)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
              {initialStats.completedCount} successful
            </p>
          </Card>

        <Card className="p-6 bg-gradient-to-br from-white to-amber-50/50 dark:from-slate-800 dark:to-amber-900/10 border-slate-200/50 dark:border-slate-700/50 hover:shadow-xl transition-all duration-300 cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                <Clock className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">
              Pending
            </h3>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {initialStats.pendingCount}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
              Awaiting payment
            </p>
          </Card>

        <Card className="p-6 bg-gradient-to-br from-white to-red-50/50 dark:from-slate-800 dark:to-red-900/10 border-slate-200/50 dark:border-slate-700/50 hover:shadow-xl transition-all duration-300 cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg">
                <XCircle className="w-6 h-6 text-white" />
              </div>
              <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">
              Failed
            </h3>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {initialStats.failedCount}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
              Unsuccessful attempts
            </p>
          </Card>
        </div>

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
                      placeholder="Search by reference, email, or name..."
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
                      Status
                    </label>
                    <Select
                      value={searchParams.get("status") || "all"}
                      onValueChange={(value) => updateFilters("status", value)}
                    >
                      <SelectTrigger className="cursor-pointer">
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent className="cursor-pointer">
                        <SelectItem value="all" className="cursor-pointer">All Statuses</SelectItem>
                        <SelectItem value="completed" className="cursor-pointer">Completed</SelectItem>
                        <SelectItem value="initiated" className="cursor-pointer">Pending</SelectItem>
                        <SelectItem value="failed" className="cursor-pointer">Failed</SelectItem>
                        <SelectItem value="cancelled" className="cursor-pointer">Cancelled</SelectItem>
                        <SelectItem value="expired" className="cursor-pointer">Expired</SelectItem>
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

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Date</TableHead>
                  <TableHead>Reference</TableHead>
                  {isAdmin && <TableHead>Merchant</TableHead>}
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={isAdmin ? 7 : 6}
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
                      <TableCell className="font-medium">
                        <div>
                          <div className="text-sm">
                            {format(new Date(item.transaction.createdAt), "MMM dd, yyyy")}
                          </div>
                          <div className="text-xs text-slate-500">
                            {format(new Date(item.transaction.createdAt), "HH:mm:ss")}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-sm">{item.transaction.reference}</div>
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          <div>
                            <div className="font-medium text-sm">
                              {item.merchant?.companyName || item.merchant?.name || "-"}
                            </div>
                            <div className="text-xs text-slate-500">{item.merchant?.email}</div>
                          </div>
                        </TableCell>
                      )}
                      <TableCell>
                        <div>
                          <div className="text-sm">
                            {item.transaction.customerName || "-"}
                          </div>
                          <div className="text-xs text-slate-500">
                            {item.transaction.customerEmail || "-"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-bold text-slate-900 dark:text-white">
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
                      <TableCell>
                        <div className="text-sm text-slate-600 dark:text-slate-400 max-w-xs truncate">
                          {item.transaction.description || "-"}
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
    </main>
  );
}
