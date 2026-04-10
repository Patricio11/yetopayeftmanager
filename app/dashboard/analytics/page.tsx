"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DollarSign, TrendingUp, TrendingDown, Activity, CheckCircle, XCircle,
  Calendar, ArrowUpRight, ArrowDownRight, BarChart3, PieChart as PieChartIcon,
  Clock, Banknote, Target, AlertTriangle, RefreshCw, Download,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format, subDays, startOfWeek, startOfMonth, startOfQuarter, endOfDay } from "date-fns";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

// ─── Types ─────────────────────────────────────────────────────────────────
interface AnalyticsData {
  period: { from: string; to: string };
  kpis: {
    revenue: number;
    revenueGrowth: number;
    transactionCount: number;
    volumeGrowth: number;
    completedCount: number;
    failedCount: number;
    pendingCount: number;
    successRate: number;
    successRateChange: number;
    avgTransactionValue: number;
    maxTransaction: number;
    minTransaction: number;
    totalVolume: number;
  };
  allTime: {
    totalTransactions: number;
    totalRevenue: number;
    completedTransactions: number;
  };
  dailyBreakdown: {
    date: string;
    completed: number;
    failed: number;
    pending: number;
    total: number;
    revenue: number;
    volume: number;
  }[];
  hourlyBreakdown: { hour: number; dayOfWeek: number; count: number; completed: number }[];
  bankPerformance: {
    bankName: string;
    bankCode: string | null;
    totalCount: number;
    completedCount: number;
    failedCount: number;
    successRate: number;
    revenue: number;
  }[];
  topFailureReasons: { reason: string; count: number }[];
}

type PeriodKey = "today" | "7d" | "30d" | "90d" | "custom";

const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 Days" },
  { key: "30d", label: "30 Days" },
  { key: "90d", label: "90 Days" },
];

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(v);

const formatCompact = (v: number) => {
  if (v >= 1_000_000) return `R${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R${(v / 1_000).toFixed(1)}K`;
  return formatCurrency(v);
};

// ─── Component ─────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const getDateRange = useCallback((): { from: string; to: string } => {
    const now = new Date();
    const todayEnd = endOfDay(now);
    switch (period) {
      case "today":
        return { from: format(now, "yyyy-MM-dd"), to: format(todayEnd, "yyyy-MM-dd'T'HH:mm:ss") };
      case "7d":
        return { from: format(subDays(now, 6), "yyyy-MM-dd"), to: format(todayEnd, "yyyy-MM-dd'T'HH:mm:ss") };
      case "90d":
        return { from: format(subDays(now, 89), "yyyy-MM-dd"), to: format(todayEnd, "yyyy-MM-dd'T'HH:mm:ss") };
      case "custom":
        return { from: customFrom || format(subDays(now, 29), "yyyy-MM-dd"), to: customTo || format(todayEnd, "yyyy-MM-dd") };
      default: // 30d
        return { from: format(subDays(now, 29), "yyyy-MM-dd"), to: format(todayEnd, "yyyy-MM-dd'T'HH:mm:ss") };
    }
  }, [period, customFrom, customTo]);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const range = getDateRange();
      const res = await fetch(`/api/merchant/analytics?from=${range.from}&to=${range.to}`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
    } finally {
      setLoading(false);
    }
  }, [getDateRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Fill missing days for smooth charts
  const chartData = (() => {
    if (!data) return [];
    const range = getDateRange();
    const start = new Date(range.from);
    const end = new Date(range.to);
    const map = new Map(data.dailyBreakdown.map(d => [d.date, d]));
    const result = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = format(d, "yyyy-MM-dd");
      const existing = map.get(key);
      result.push({
        date: format(d, "MMM dd"),
        rawDate: key,
        completed: existing?.completed || 0,
        failed: existing?.failed || 0,
        pending: existing?.pending || 0,
        total: existing?.total || 0,
        revenue: existing?.revenue || 0,
      });
    }
    return result;
  })();

  // Peak hours heatmap data
  const peakHours = (() => {
    if (!data) return [];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const grid: { day: string; hour: number; count: number }[] = [];
    for (let dow = 0; dow < 7; dow++) {
      for (let h = 6; h < 22; h++) {
        const match = data.hourlyBreakdown.find(x => x.dayOfWeek === dow && x.hour === h);
        grid.push({
          day: dayNames[dow],
          hour: h,
          count: match?.count || 0,
        });
      }
    }
    return grid;
  })();

  const maxHeatCount = Math.max(...peakHours.map(p => p.count), 1);

  // Status pie data
  const statusPie = data
    ? [
        { name: "Completed", value: data.kpis.completedCount, color: "#10b981" },
        { name: "Pending", value: data.kpis.pendingCount, color: "#f59e0b" },
        { name: "Failed", value: data.kpis.failedCount, color: "#ef4444" },
      ].filter(s => s.value > 0)
    : [];

  // Download analytics CSV
  const handleExportAnalytics = () => {
    if (!data) return;
    const headers = ["Date", "Completed", "Failed", "Pending", "Total", "Revenue"];
    const rows = data.dailyBreakdown.map(d => [
      d.date, d.completed, d.failed, d.pending, d.total, d.revenue.toFixed(2),
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  // ─── Render ────────────────────────────────────────────────────────────
  if (loading && !data) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="h-8 w-48 bg-slate-200 animate-pulse rounded mb-2" />
          <div className="h-4 w-72 bg-slate-200 animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-5"><div className="h-20 bg-slate-100 animate-pulse rounded" /></Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}><div className="h-64 bg-slate-100 animate-pulse rounded m-4" /></Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const k = data.kpis;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
            Analytics
          </h1>
          <p className="text-slate-500 mt-1">Track your payment performance and growth</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {PERIOD_OPTIONS.map(opt => (
            <Button
              key={opt.key}
              variant={period === opt.key ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod(opt.key)}
              className={period === opt.key ? "bg-slate-900 text-white" : ""}
            >
              {opt.label}
            </Button>
          ))}
          <Button
            variant={period === "custom" ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriod("custom")}
            className={period === "custom" ? "bg-slate-900 text-white" : ""}
          >
            <Calendar className="w-3.5 h-3.5 mr-1" /> Custom
          </Button>
          <Button variant="outline" size="sm" onClick={fetchAnalytics} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportAnalytics}>
            <Download className="w-3.5 h-3.5 mr-1" /> Export
          </Button>
        </div>
      </div>

      {/* Custom date range */}
      {period === "custom" && (
        <div className="flex items-center gap-3 bg-slate-50 border rounded-lg p-3">
          <label className="text-sm font-medium text-slate-600">From</label>
          <input
            type="date"
            value={customFrom}
            onChange={e => setCustomFrom(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          />
          <label className="text-sm font-medium text-slate-600">To</label>
          <input
            type="date"
            value={customTo}
            onChange={e => setCustomTo(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          />
          <Button size="sm" onClick={fetchAnalytics}>Apply</Button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue */}
        <KpiCard
          title="Revenue"
          value={formatCurrency(k.revenue)}
          change={k.revenueGrowth}
          subtitle="vs previous period"
          icon={DollarSign}
          iconBg="from-amber-500 to-pink-600"
          cardBg="to-amber-50/50"
        />

        {/* Transactions */}
        <KpiCard
          title="Transactions"
          value={k.transactionCount.toString()}
          change={k.volumeGrowth}
          subtitle="vs previous period"
          icon={Activity}
          iconBg="from-blue-500 to-indigo-600"
          cardBg="to-blue-50/50"
        />

        {/* Success Rate */}
        <KpiCard
          title="Success Rate"
          value={`${k.successRate}%`}
          change={k.successRateChange}
          subtitle="vs previous period"
          icon={Target}
          iconBg="from-pink-500 to-teal-600"
          cardBg="to-pink-50/50"
        />

        {/* Avg Transaction */}
        <KpiCard
          title="Avg Transaction"
          value={formatCurrency(k.avgTransactionValue)}
          subtitle={`Max: ${formatCurrency(k.maxTransaction)}`}
          icon={Banknote}
          iconBg="from-violet-500 to-purple-600"
          cardBg="to-violet-50/50"
        />
      </div>

      {/* All-time stats bar */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 bg-slate-50 border-0">
          <p className="text-xs text-slate-500 font-medium">Lifetime Revenue</p>
          <p className="text-lg font-bold text-slate-900">{formatCompact(data.allTime.totalRevenue)}</p>
        </Card>
        <Card className="p-4 bg-slate-50 border-0">
          <p className="text-xs text-slate-500 font-medium">Lifetime Transactions</p>
          <p className="text-lg font-bold text-slate-900">{data.allTime.totalTransactions.toLocaleString()}</p>
        </Card>
        <Card className="p-4 bg-slate-50 border-0">
          <p className="text-xs text-slate-500 font-medium">Lifetime Success Rate</p>
          <p className="text-lg font-bold text-slate-900">
            {data.allTime.totalTransactions > 0
              ? `${Math.round((data.allTime.completedTransactions / data.allTime.totalTransactions) * 100)}%`
              : "—"}
          </p>
        </Card>
      </div>

      {/* Charts Row 1: Revenue Trend + Transaction Volume */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-500" /> Revenue Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={v => formatCompact(v)} />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                  contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fill="url(#revenueGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Transaction Volume */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" /> Transaction Volume
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }} />
                <Legend />
                <Bar dataKey="completed" stackId="a" fill="#10b981" name="Completed" radius={[0, 0, 0, 0]} />
                <Bar dataKey="failed" stackId="a" fill="#ef4444" name="Failed" />
                <Bar dataKey="pending" stackId="a" fill="#f59e0b" name="Pending" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2: Status Distribution + Bank Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-violet-600" /> Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statusPie.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={statusPie}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusPie.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number, name: string) => [`${value} transactions`, name]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-slate-400">
                No transaction data for this period
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bank Performance */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-amber-500" /> Bank Performance
            </CardTitle>
            <CardDescription>Success rate by bank</CardDescription>
          </CardHeader>
          <CardContent>
            {data.bankPerformance.length > 0 ? (
              <div className="space-y-3 max-h-[280px] overflow-y-auto">
                {data.bankPerformance.map((bank, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-24 text-sm font-medium text-slate-700 truncate">{bank.bankName}</div>
                    <div className="flex-1">
                      <div className="relative h-6 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500 to-pink-400 rounded-full transition-all duration-500"
                          style={{ width: `${bank.successRate}%` }}
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-slate-700">
                          {bank.successRate}%
                        </span>
                      </div>
                    </div>
                    <div className="text-right min-w-[80px]">
                      <p className="text-xs font-semibold text-slate-900">{bank.totalCount} txns</p>
                      <p className="text-xs text-slate-500">{formatCompact(bank.revenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-slate-400">
                No bank data for this period
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Peak Hours Heatmap + Top Failure Reasons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Peak Hours */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" /> Peak Transaction Hours
            </CardTitle>
            <CardDescription>When your customers pay most</CardDescription>
          </CardHeader>
          <CardContent>
            {peakHours.some(p => p.count > 0) ? (
              <div className="overflow-x-auto">
                <div className="min-w-[500px]">
                  {/* Hour labels */}
                  <div className="flex ml-10 mb-1">
                    {Array.from({ length: 16 }, (_, i) => i + 6).map(h => (
                      <div key={h} className="flex-1 text-center text-[10px] text-slate-400">
                        {h}h
                      </div>
                    ))}
                  </div>
                  {/* Grid */}
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => {
                    const dayIdx = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(day);
                    return (
                      <div key={day} className="flex items-center gap-1 mb-0.5">
                        <div className="w-9 text-right text-[10px] text-slate-500 font-medium pr-1">{day}</div>
                        <div className="flex flex-1 gap-0.5">
                          {Array.from({ length: 16 }, (_, i) => i + 6).map(h => {
                            const cell = peakHours.find(p => p.day === ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dayIdx] && p.hour === h);
                            const intensity = cell ? cell.count / maxHeatCount : 0;
                            return (
                              <div
                                key={h}
                                className="flex-1 h-5 rounded-sm transition-colors"
                                style={{
                                  backgroundColor: intensity > 0
                                    ? `rgba(16, 185, 129, ${Math.max(0.1, intensity)})`
                                    : "#f1f5f9",
                                }}
                                title={`${day} ${h}:00 — ${cell?.count || 0} transactions`}
                              />
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  {/* Legend */}
                  <div className="flex items-center justify-end gap-1.5 mt-2">
                    <span className="text-[10px] text-slate-400">Less</span>
                    {[0.1, 0.3, 0.5, 0.7, 1].map(v => (
                      <div key={v} className="w-3 h-3 rounded-sm" style={{ backgroundColor: `rgba(16, 185, 129, ${v})` }} />
                    ))}
                    <span className="text-[10px] text-slate-400">More</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-slate-400">
                No hourly data for this period
              </div>
            )}
          </CardContent>
        </Card>

        {/* Failure Reasons */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" /> Top Failure Reasons
            </CardTitle>
            <CardDescription>Why transactions don&apos;t complete</CardDescription>
          </CardHeader>
          <CardContent>
            {data.topFailureReasons.length > 0 ? (
              <div className="space-y-3">
                {data.topFailureReasons.map((fr, i) => {
                  const maxCount = data.topFailureReasons[0].count;
                  const pct = (fr.count / maxCount) * 100;
                  return (
                    <div key={i} className="group">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-slate-700 truncate max-w-[240px]" title={fr.reason}>
                          {fr.reason}
                        </span>
                        <span className="text-sm font-semibold text-slate-900 ml-2">{fr.count}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-red-400 to-red-500 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-slate-400 flex-col gap-2">
                <CheckCircle className="w-8 h-8 text-amber-300" />
                <span>No failures in this period</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── KPI Card Sub-Component ────────────────────────────────────────────────
function KpiCard({
  title, value, change, subtitle, icon: Icon, iconBg, cardBg,
}: {
  title: string;
  value: string;
  change?: number;
  subtitle: string;
  icon: any;
  iconBg: string;
  cardBg: string;
}) {
  return (
    <Card className={`p-5 bg-gradient-to-br from-white ${cardBg} border-slate-200/50 hover:shadow-xl transition-all duration-300`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-9 h-9 bg-gradient-to-br ${iconBg} rounded-lg flex items-center justify-center`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xs font-medium text-slate-600">{title}</h3>
          </div>
          <p className="text-2xl font-bold text-slate-900 tracking-tight">{value}</p>
          <div className="flex items-center gap-1 mt-1">
            {change !== undefined && change !== 0 && (
              <>
                {change > 0 ? (
                  <ArrowUpRight className="w-3 h-3 text-amber-500" />
                ) : (
                  <ArrowDownRight className="w-3 h-3 text-red-500" />
                )}
                <span className={`text-xs font-semibold ${change > 0 ? "text-amber-500" : "text-red-500"}`}>
                  {change > 0 ? "+" : ""}{change}%
                </span>
              </>
            )}
            <span className="text-xs text-slate-500">{subtitle}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
