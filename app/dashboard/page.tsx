import { requireAuth } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { eftTransactions } from "@/lib/db/schema";
import { eq, desc, count, sum, and, gte } from "drizzle-orm";
import { 
  CreditCard, TrendingUp, DollarSign, Clock, 
  Plus, ArrowUpRight, CheckCircle, XCircle 
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-green-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-slate-600 rounded-xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">Welcome back, {session.user.name}</p>
              </div>
            </div>
            <Link href="/dashboard/payment-links/create">
              <Button className="bg-gradient-to-r from-green-600 to-slate-600 hover:from-green-700 hover:to-slate-700 text-white shadow-lg">
                <Plus className="w-4 h-4 mr-2" />
                Create Payment Link
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Revenue */}
          <Card className="bg-white dark:bg-slate-800 p-6 border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <span className="text-xs text-green-600 dark:text-green-400 font-medium">+12.5%</span>
            </div>
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Total Revenue</h3>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">
              R {stats.revenue.toFixed(2)}
            </p>
          </Card>

          {/* Total Transactions */}
          <Card className="bg-white dark:bg-slate-800 p-6 border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <span className="text-xs text-green-600 dark:text-green-400 font-medium">All time</span>
            </div>
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Total Transactions</h3>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
          </Card>

          {/* Completed */}
          <Card className="bg-white dark:bg-slate-800 p-6 border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <span className="text-xs text-green-600 dark:text-green-400 font-medium">Success</span>
            </div>
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Completed</h3>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.completed}</p>
          </Card>

          {/* Pending */}
          <Card className="bg-white dark:bg-slate-800 p-6 border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">Active</span>
            </div>
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Pending</h3>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.pending}</p>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Recent Transactions</h2>
              <Link href="/dashboard/transactions">
                <Button variant="outline" size="sm">
                  View All
                  <ArrowUpRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
          
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {recentTransactions.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No transactions yet</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6">Create your first payment link to get started</p>
                <Link href="/dashboard/payment-links/create">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Payment Link
                  </Button>
                </Link>
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
