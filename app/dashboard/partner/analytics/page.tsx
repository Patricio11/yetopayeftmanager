"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Activity, DollarSign, TrendingUp, Target, AlertCircle,
  Calendar, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface AnalyticsData {
  totalTransactions: number;
  totalVolume: number;
  successRate: number;
  growth: number;
  merchantBreakdown: {
    merchantId: string;
    merchantName: string;
    transactions: number;
    volume: number;
    successRate: number;
  }[];
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(val);

function getDefaultDates() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return {
    from: from.toISOString().split("T")[0],
    to: to.toISOString().split("T")[0],
  };
}

export default function PartnerAnalyticsPage() {
  const defaults = getDefaultDates();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dateFrom, setDateFrom] = useState(defaults.from);
  const [dateTo, setDateTo] = useState(defaults.to);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      const res = await fetch(`/api/partner/analytics?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error || "Failed to load analytics");
      }
    } catch {
      setError("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading && !data) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="h-8 w-48 bg-slate-200 animate-pulse rounded mb-2" />
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

  if (error && !data) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl border border-red-200 p-8 shadow-sm text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Error Loading Analytics</h2>
          <p className="text-slate-500 mb-4">{error}</p>
          <Button onClick={fetchAnalytics}>Retry</Button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const kpiCards = [
    {
      title: "Total Transactions",
      value: data.totalTransactions.toLocaleString(),
      icon: Activity,
      iconBg: "from-blue-500 to-indigo-600",
      cardBg: "to-blue-50/50",
    },
    {
      title: "Total Volume",
      value: formatCurrency(data.totalVolume),
      icon: DollarSign,
      iconBg: "from-fyro-navy to-fyro-gold",
      cardBg: "to-amber-50/50",
    },
    {
      title: "Success Rate",
      value: `${data.successRate}%`,
      icon: Target,
      iconBg: "from-pink-500 to-teal-600",
      cardBg: "to-pink-50/50",
    },
    {
      title: "Growth",
      value: `${data.growth > 0 ? "+" : ""}${data.growth}%`,
      icon: TrendingUp,
      iconBg: "from-violet-500 to-purple-600",
      cardBg: "to-violet-50/50",
    },
  ];

  // Sort merchant breakdown by volume descending
  const sortedMerchants = [...data.merchantBreakdown].sort((a, b) => b.volume - a.volume);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
            Analytics
          </h1>
          <p className="text-slate-500 mt-1">Aggregated performance across your merchants</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAnalytics} disabled={loading}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Date Range Picker */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="font-medium">Date Range</span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
            <span className="text-slate-400 text-sm">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className={`bg-gradient-to-br from-white ${card.cardBg} rounded-xl border border-slate-200/50 p-5 shadow-sm hover:shadow-xl transition-all duration-300`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-9 h-9 bg-gradient-to-br ${card.iconBg} rounded-lg flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xs font-medium text-slate-600">{card.title}</h3>
              </div>
              <p className="text-2xl font-bold text-slate-900 tracking-tight">{card.value}</p>
            </div>
          );
        })}
      </div>

      {/* Per-Merchant Breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Per-Merchant Breakdown</h2>
          <p className="text-sm text-slate-500 mt-1">Performance metrics sorted by volume</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Merchant Name</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Transactions</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Volume</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Success Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedMerchants.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center">
                    <Activity className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">No merchant data available</p>
                    <p className="text-slate-400 text-sm mt-1">Data will appear once merchants process transactions</p>
                  </td>
                </tr>
              ) : (
                sortedMerchants.map((merchant) => (
                  <tr key={merchant.merchantId} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-slate-900">{merchant.merchantName}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm text-slate-700">{merchant.transactions.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-bold text-slate-900">{formatCurrency(merchant.volume)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-pink-400 rounded-full"
                            style={{ width: `${merchant.successRate}%` }}
                          />
                        </div>
                        <span className={`text-sm font-medium ${
                          merchant.successRate >= 80 ? "text-amber-500" :
                          merchant.successRate >= 50 ? "text-yellow-600" : "text-red-600"
                        }`}>
                          {merchant.successRate}%
                        </span>
                      </div>
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
