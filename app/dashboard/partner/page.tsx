"use client";

import { useState, useEffect } from "react";
import {
  Building2, Users, Activity, DollarSign, TrendingUp,
  CheckCircle, XCircle, Clock, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface DashboardData {
  totalMerchants: number;
  activeMerchants: number;
  transactionsThisMonth: number;
  volumeThisMonth: number;
  recentTransactions: {
    id: string;
    reference: string;
    merchantName: string;
    amount: number;
    status: string;
    createdAt: string;
  }[];
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(val);

const statusBadge = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-amber-100 text-amber-600 border-amber-200";
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
      return <CheckCircle className="w-4 h-4 text-amber-500" />;
    case "failed":
      return <XCircle className="w-4 h-4 text-red-600" />;
    case "pending":
    case "initiated":
      return <Clock className="w-4 h-4 text-yellow-600" />;
    default:
      return <AlertCircle className="w-4 h-4 text-gray-500" />;
  }
};

export default function PartnerDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch("/api/partner/dashboard");
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        } else {
          setError(json.error || "Failed to load dashboard");
        }
      } catch {
        setError("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-8">
          <div className="h-8 w-56 bg-slate-200 animate-pulse rounded mb-2" />
          <div className="h-4 w-72 bg-slate-200 animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <div className="h-20 bg-slate-100 animate-pulse rounded" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="h-64 bg-slate-100 animate-pulse rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="bg-white rounded-xl border border-red-200 p-8 shadow-sm text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Error Loading Dashboard</h2>
          <p className="text-slate-500 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const summaryCards = [
    {
      title: "Total Merchants",
      value: data.totalMerchants.toString(),
      subtitle: "Registered merchants",
      icon: Building2,
      iconBg: "from-blue-500 to-indigo-600",
      cardBg: "to-blue-50/50",
    },
    {
      title: "Active Merchants",
      value: data.activeMerchants.toString(),
      subtitle: "Currently active",
      icon: Users,
      iconBg: "from-amber-500 to-pink-600",
      cardBg: "to-amber-50/50",
    },
    {
      title: "Transactions This Month",
      value: data.transactionsThisMonth.toLocaleString(),
      subtitle: "Current billing period",
      icon: Activity,
      iconBg: "from-violet-500 to-purple-600",
      cardBg: "to-violet-50/50",
    },
    {
      title: "Volume This Month",
      value: formatCurrency(data.volumeThisMonth),
      subtitle: "Total payment volume",
      icon: DollarSign,
      iconBg: "from-amber-500 to-orange-600",
      cardBg: "to-amber-50/50",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
          Partner Dashboard
        </h1>
        <p className="text-slate-500 mt-1 flex items-center gap-2">
          <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
          Overview of your merchant portfolio
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className={`bg-gradient-to-br from-white ${card.cardBg} rounded-xl border border-slate-200/50 p-5 shadow-sm hover:shadow-xl transition-all duration-300`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-9 h-9 bg-gradient-to-br ${card.iconBg} rounded-lg flex items-center justify-center`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-xs font-medium text-slate-600">{card.title}</h3>
                  </div>
                  <p className="text-2xl font-bold text-slate-900 tracking-tight">{card.value}</p>
                  <p className="text-xs text-slate-500 mt-1">{card.subtitle}</p>
                </div>
                <TrendingUp className="w-4 h-4 text-amber-500 mt-1" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-amber-500" />
                Recent Transactions
              </h2>
              <p className="text-sm text-slate-500 mt-1">Latest activity across your merchants</p>
            </div>
            <Link href="/dashboard/partner/transactions">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Reference</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Merchant</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.recentTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <Activity className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">No transactions yet</p>
                    <p className="text-slate-400 text-sm mt-1">Transactions from your merchants will appear here</p>
                  </td>
                </tr>
              ) : (
                data.recentTransactions.map((txn) => (
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
      </div>
    </div>
  );
}
