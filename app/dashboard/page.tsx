import { requireAuth } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { eftTransactions } from "@/lib/db/schema";
import { eq, desc, count, sum, and, gte } from "drizzle-orm";
import { 
  CreditCard, TrendingUp, DollarSign, Clock, 
  Plus, ArrowUpRight, CheckCircle, XCircle, Zap, Activity 
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { QuickPaymentLinkModal } from "@/components/dashboard/QuickPaymentLinkModal";

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-green-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/30">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white dark:border-slate-900 animate-pulse" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">YETOPAYEFT</h1>
                <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  Welcome back, {session.user.name}
                </p>
              </div>
            </div>
            <QuickPaymentLinkModal />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Revenue */}
          <Card className="group relative overflow-hidden bg-gradient-to-br from-white to-green-50/50 dark:from-slate-800 dark:to-green-900/10 p-6 border-slate-200/50 dark:border-slate-700/50 hover:shadow-xl hover:shadow-green-500/10 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/30">
                  <DollarSign className="w-7 h-7 text-white" />
                </div>
                <span className="text-xs text-green-600 dark:text-green-400 font-semibold bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">+12.5%</span>
              </div>
              <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wide">Total Revenue</h3>
              <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent">
                R {stats.revenue.toFixed(2)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">All time earnings</p>
            </div>
          </Card>

          {/* Total Transactions */}
          <Card className="group relative overflow-hidden bg-gradient-to-br from-white to-blue-50/50 dark:from-slate-800 dark:to-blue-900/10 p-6 border-slate-200/50 dark:border-slate-700/50 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <Activity className="w-7 h-7 text-white" />
                </div>
                <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-full">All time</span>
              </div>
              <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wide">Total Transactions</h3>
              <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">{stats.total}</p>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">Lifetime count</p>
            </div>
          </Card>

          {/* Completed */}
          <Card className="group relative overflow-hidden bg-gradient-to-br from-white to-emerald-50/50 dark:from-slate-800 dark:to-emerald-900/10 p-6 border-slate-200/50 dark:border-slate-700/50 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <CheckCircle className="w-7 h-7 text-white" />
                </div>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded-full">Success</span>
              </div>
              <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wide">Completed</h3>
              <p className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">{stats.completed}</p>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">{stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}% success rate</p>
            </div>
          </Card>

          {/* Pending */}
          <Card className="group relative overflow-hidden bg-gradient-to-br from-white to-amber-50/50 dark:from-slate-800 dark:to-amber-900/10 p-6 border-slate-200/50 dark:border-slate-700/50 hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                  <Clock className="w-7 h-7 text-white" />
                </div>
                <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                  Active
                </span>
              </div>
              <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wide">Pending</h3>
              <p className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 dark:from-amber-400 dark:to-orange-400 bg-clip-text text-transparent">{stats.pending}</p>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">Awaiting payment</p>
            </div>
          </Card>
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
                <div key={transaction.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
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
    </div>
  );
}
