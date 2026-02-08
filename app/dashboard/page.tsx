import { requireAuth } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { eftTransactions } from "@/lib/db/schema";
import { eq, desc, count, sum, and, gte, lte, sql } from "drizzle-orm";
import { 
  CreditCard, TrendingUp, DollarSign, Clock, 
  Plus, ArrowUpRight, CheckCircle, XCircle, Zap, Activity 
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { QuickPaymentLinkModal } from "@/components/dashboard/QuickPaymentLinkModal";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { format, subDays } from "date-fns";

export default async function DashboardPage() {
  const session = await requireAuth();
  const userId = session.user.id;

  // Fetch statistics
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    totalTransactions,
    completedTransactions,
    pendingTransactions,
    recentTransactions,
  ] = await Promise.all([
    // Total transactions
    db
      .select({ count: count() })
      .from(eftTransactions)
      .where(eq(eftTransactions.merchantId, userId)),
    
    // Completed transactions
    db
      .select({ 
        count: count(),
        total: sum(eftTransactions.amount)
      })
      .from(eftTransactions)
      .where(
        and(
          eq(eftTransactions.merchantId, userId),
          eq(eftTransactions.status, "completed")
        )
      ),
    
    // Pending transactions
    db
      .select({ count: count() })
      .from(eftTransactions)
      .where(
        and(
          eq(eftTransactions.merchantId, userId),
          eq(eftTransactions.status, "initiated")
        )
      ),
    
    // Recent transactions (last 10)
    db
      .select()
      .from(eftTransactions)
      .where(eq(eftTransactions.merchantId, userId))
      .orderBy(desc(eftTransactions.createdAt))
      .limit(10),
  ]);

  const stats = {
    total: totalTransactions[0]?.count || 0,
    completed: completedTransactions[0]?.count || 0,
    pending: pendingTransactions[0]?.count || 0,
    revenue: parseFloat(completedTransactions[0]?.total || "0"),
  };

  // Fetch chart data - Last 30 days in a SINGLE aggregation query (fixes N+1)
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = subDays(new Date(), 29 - i);
    return format(date, "yyyy-MM-dd");
  });

  const startDate = new Date(last30Days[0]);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(last30Days[last30Days.length - 1]);
  endDate.setHours(23, 59, 59, 999);

  const dailyAggregation = await db
    .select({
      day: sql<string>`TO_CHAR(${eftTransactions.createdAt}, 'YYYY-MM-DD')`,
      completed: sql<number>`COUNT(CASE WHEN ${eftTransactions.status} = 'completed' THEN 1 END)::int`,
      pending: sql<number>`COUNT(CASE WHEN ${eftTransactions.status} = 'initiated' THEN 1 END)::int`,
      failed: sql<number>`COUNT(CASE WHEN ${eftTransactions.status} IN ('failed', 'cancelled', 'aborted', 'expired') THEN 1 END)::int`,
      revenue: sql<string>`COALESCE(SUM(CASE WHEN ${eftTransactions.status} = 'completed' THEN CAST(${eftTransactions.amount} AS NUMERIC) ELSE 0 END), 0)`,
    })
    .from(eftTransactions)
    .where(
      and(
        eq(eftTransactions.merchantId, userId),
        gte(eftTransactions.createdAt, startDate),
        lte(eftTransactions.createdAt, endDate)
      )
    )
    .groupBy(sql`TO_CHAR(${eftTransactions.createdAt}, 'YYYY-MM-DD')`);

  // Build lookup map from aggregation results
  const dailyMap = new Map(dailyAggregation.map(d => [d.day, d]));

  const dailyStats = last30Days.map(date => {
    const dayData = dailyMap.get(date);
    return {
      date: format(new Date(date), "MMM dd"),
      completed: dayData?.completed || 0,
      pending: dayData?.pending || 0,
      failed: dayData?.failed || 0,
      revenue: parseFloat(dayData?.revenue || "0"),
    };
  });

  // Calculate status distribution
  const statusData = [
    {
      name: "Completed",
      value: stats.completed,
      color: "#10b981",
    },
    {
      name: "Pending",
      value: stats.pending,
      color: "#f59e0b",
    },
    {
      name: "Failed",
      value: stats.total - stats.completed - stats.pending,
      color: "#ef4444",
    },
  ].filter(item => item.value > 0);

  const chartData = {
    dailyData: dailyStats,
    statusData,
    monthlyRevenue: dailyStats.map(stat => ({
      month: stat.date,
      revenue: stat.revenue,
    })),
  };

  return (
    <main className="max-w-7xl mx-auto px-6 py-8">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
          Welcome back, {session.user.name}
        </h1>
        <p className="text-slate-600 dark:text-slate-400 flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          Your dashboard overview
        </p>
      </div>
      {/* Quick Actions */}
      <div className="mb-8 flex justify-end gap-3">
        <QuickPaymentLinkModal />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Total Revenue */}
          <Card className="p-5 bg-gradient-to-br from-white to-green-50/50 dark:from-slate-800 dark:to-green-900/10 border-slate-200/50 dark:border-slate-700/50 hover:shadow-xl transition-all duration-300 cursor-pointer">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-9 h-9 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    Total Revenue
                  </h3>
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  R {stats.revenue.toFixed(2)}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                  All time earnings
                </p>
              </div>
              <TrendingUp className="w-4 h-4 text-green-500 mt-1" />
            </div>
          </Card>

          {/* Total Transactions */}
          <Card className="p-5 bg-gradient-to-br from-white to-blue-50/50 dark:from-slate-800 dark:to-blue-900/10 border-slate-200/50 dark:border-slate-700/50 hover:shadow-xl transition-all duration-300 cursor-pointer">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    Total Transactions
                  </h3>
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {stats.total}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                  Lifetime count
                </p>
              </div>
            </div>
          </Card>

          {/* Completed */}
          <Card className="p-5 bg-gradient-to-br from-white to-emerald-50/50 dark:from-slate-800 dark:to-emerald-900/10 border-slate-200/50 dark:border-slate-700/50 hover:shadow-xl transition-all duration-300 cursor-pointer">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    Completed
                  </h3>
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {stats.completed}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                  {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}% success rate
                </p>
              </div>
            </div>
          </Card>

          {/* Pending */}
          <Card className="p-5 bg-gradient-to-br from-white to-amber-50/50 dark:from-slate-800 dark:to-amber-900/10 border-slate-200/50 dark:border-slate-700/50 hover:shadow-xl transition-all duration-300 cursor-pointer">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    Pending
                  </h3>
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {stats.pending}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                  Awaiting payment
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="mb-8">
          <DashboardCharts data={chartData} />
        </div>

        {/* Recent Transactions */}
        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50 shadow-xl">
          <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Recent Transactions
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Latest payment activity</p>
              </div>
              <Link href="/dashboard/transactions">
                <Button variant="outline" size="sm" className="hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400 hover:border-green-300 dark:hover:border-green-700 transition-colors">
                  View All
                  <ArrowUpRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
          
          <div className="divide-y divide-slate-200/50 dark:divide-slate-700/50">
            {recentTransactions.length === 0 ? (
              <div className="p-16 text-center">
                <div className="relative inline-block mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 rounded-3xl flex items-center justify-center shadow-xl">
                    <CreditCard className="w-10 h-10 text-slate-400" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <Plus className="w-4 h-4 text-white" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No transactions yet</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto">Start accepting payments by creating your first payment link. It only takes a few seconds!</p>
                <QuickPaymentLinkModal trigger="empty" />
              </div>
            ) : (
              recentTransactions.map((transaction) => (
                <div key={transaction.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        transaction.status === 'completed' 
                          ? 'bg-green-100 dark:bg-green-900/20' 
                          : transaction.status === 'failed'
                          ? 'bg-red-100 dark:bg-red-900/20'
                          : 'bg-orange-100 dark:bg-orange-900/20'
                      }`}>
                        {transaction.status === 'completed' ? (
                          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                        ) : transaction.status === 'failed' ? (
                          <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                        ) : (
                          <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{transaction.reference}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {new Date(transaction.createdAt).toLocaleDateString('en-ZA', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900 dark:text-white">
                        R {parseFloat(transaction.amount).toFixed(2)}
                      </p>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        transaction.status === 'completed'
                          ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                          : transaction.status === 'failed'
                          ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                          : 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400'
                      }`}>
                        {transaction.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </main>
  );
}
