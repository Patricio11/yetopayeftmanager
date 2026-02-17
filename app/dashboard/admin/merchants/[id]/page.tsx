'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Building2, Mail, Phone, MapPin, CreditCard, Users, Activity,
  CheckCircle, XCircle, Clock, Shield, Key, Globe, Edit, Save, X,
  ChevronRight, Copy, RefreshCw, AlertCircle, Landmark, Eye, EyeOff,
  Percent, DollarSign, Receipt, BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

type Tab = 'overview' | 'transactions' | 'team' | 'banking' | 'billing' | 'settings';

export default function MerchantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [merchant, setMerchant] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchMerchant = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/merchants/${id}`);
      const data = await res.json();
      if (data.success) setMerchant(data.data);
      else toast({ title: 'Error', description: 'Merchant not found', variant: 'destructive' });
    } catch {
      toast({ title: 'Error', description: 'Failed to load merchant', variant: 'destructive' });
    } finally { setLoading(false); }
  }, [id, toast]);

  useEffect(() => { fetchMerchant(); }, [fetchMerchant]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-48 bg-slate-200 dark:bg-slate-700 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8 text-center">
        <p className="text-slate-500">Merchant not found.</p>
        <Link href="/dashboard/admin/merchants"><Button className="mt-4">Back to Merchants</Button></Link>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'overview', label: 'Overview', icon: Building2 },
    { key: 'transactions', label: 'Transactions', icon: Activity },
    { key: 'team', label: 'Team', icon: Users },
    { key: 'banking', label: 'Banking', icon: Landmark },
    { key: 'billing', label: 'Billing', icon: Receipt },
    { key: 'settings', label: 'Settings', icon: Shield },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard/admin/merchants">
          <Button variant="ghost" size="sm" className="gap-1"><ArrowLeft className="w-4 h-4" />Back</Button>
        </Link>
      </div>

      {/* Merchant Header Card */}
      <Card className="p-6 mb-6 bg-white/80 dark:bg-slate-800/80 border-white/20 dark:border-slate-700/50">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
              {(merchant.companyName || merchant.name || '?')[0].toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{merchant.companyName || merchant.name}</h1>
              <p className="text-slate-500">{merchant.email}</p>
              <div className="flex items-center gap-3 mt-2">
                {merchant.isActive
                  ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400"><div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />Active</span>
                  : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400">Inactive</span>}
                {merchant.kycStatus === 'approved'
                  ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400"><CheckCircle className="w-3 h-3" />KYC Approved</span>
                  : merchant.kycStatus === 'rejected'
                  ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"><XCircle className="w-3 h-3" />KYC Rejected</span>
                  : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"><Clock className="w-3 h-3" />KYC Pending</span>}
                {merchant.emailVerified && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"><Mail className="w-3 h-3" />Verified</span>}
                {merchant.accountMode === 'live'
                  ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400">LIVE</span>
                  : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">DEMO</span>}
              </div>
            </div>
          </div>
          <div className="text-right text-sm text-slate-500">
            <p>Created {new Date(merchant.createdAt).toLocaleDateString()}</p>
            {merchant.lastLogin && <p>Last login {new Date(merchant.lastLogin).toLocaleDateString()}</p>}
          </div>
        </div>

        {/* Quick Stats */}
        {merchant.stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-slate-700/50">
            <div><p className="text-2xl font-bold text-slate-900 dark:text-white">{merchant.stats.transactions.total}</p><p className="text-xs text-slate-500">Transactions</p></div>
            <div><p className="text-2xl font-bold text-green-600">R {parseFloat(merchant.stats.transactions.totalAmount || '0').toLocaleString()}</p><p className="text-xs text-slate-500">Total Volume</p></div>
            <div><p className="text-2xl font-bold text-slate-900 dark:text-white">{merchant.stats.teamMembers}</p><p className="text-xs text-slate-500">Team Members</p></div>
            <div><p className="text-2xl font-bold text-slate-900 dark:text-white">{merchant.stats.bankAccounts}</p><p className="text-xs text-slate-500">Bank Accounts</p></div>
            <div><p className="text-2xl font-bold text-slate-900 dark:text-white">{merchant.stats.apiKeys}</p><p className="text-xs text-slate-500">API Keys</p></div>
          </div>
        )}
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl p-1 border border-slate-200/50 dark:border-slate-700/50">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-white dark:bg-slate-700 text-green-600 dark:text-green-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4" />{tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab merchant={merchant} onUpdate={fetchMerchant} />}
      {activeTab === 'transactions' && <TransactionsTab merchantId={id} />}
      {activeTab === 'team' && <TeamTab merchantId={id} />}
      {activeTab === 'banking' && <BankingTab merchantId={id} />}
      {activeTab === 'billing' && <BillingTab merchantId={id} />}
      {activeTab === 'settings' && <SettingsTab merchant={merchant} onUpdate={fetchMerchant} />}
    </div>
  );
}

function OverviewTab({ merchant, onUpdate }: { merchant: any; onUpdate: () => void }) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="p-6 bg-white/80 dark:bg-slate-800/80 border-white/20 dark:border-slate-700/50">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2"><Building2 className="w-5 h-5 text-green-600" />Company Information</h3>
        <div className="space-y-3">
          <InfoRow label="Company Name" value={merchant.companyName} />
          <InfoRow label="Contact Name" value={merchant.fullName || merchant.name} />
          <InfoRow label="Email" value={merchant.email} />
          <InfoRow label="Phone" value={merchant.phone} />
          <InfoRow label="Role" value={merchant.role} />
        </div>
      </Card>

      <Card className="p-6 bg-white/80 dark:bg-slate-800/80 border-white/20 dark:border-slate-700/50">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2"><MapPin className="w-5 h-5 text-blue-600" />Address</h3>
        <div className="space-y-3">
          <InfoRow label="Street" value={merchant.address?.street} />
          <InfoRow label="City" value={merchant.address?.city} />
          <InfoRow label="State/Province" value={merchant.address?.state} />
          <InfoRow label="Postal Code" value={merchant.address?.postal_code} />
          <InfoRow label="Country" value={merchant.address?.country} />
        </div>
      </Card>

      <Card className="p-6 bg-white/80 dark:bg-slate-800/80 border-white/20 dark:border-slate-700/50">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2"><CreditCard className="w-5 h-5 text-purple-600" />Primary Bank Account</h3>
        <div className="space-y-3">
          <InfoRow label="Account Holder" value={merchant.bankAccount?.account_holder} />
          <InfoRow label="Account Number" value={merchant.bankAccount?.account_number ? '••••' + merchant.bankAccount.account_number.slice(-4) : undefined} />
          <InfoRow label="Account Type" value={merchant.bankAccount?.account_type} />
          <InfoRow label="Bank Name" value={merchant.bankAccount?.bank_name} />
          <InfoRow label="Branch Code" value={merchant.bankAccount?.branch_code} />
        </div>
      </Card>

      <Card className="p-6 bg-white/80 dark:bg-slate-800/80 border-white/20 dark:border-slate-700/50">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2"><Shield className="w-5 h-5 text-amber-600" />Account Status</h3>
        <div className="space-y-3">
          <InfoRow label="Account Status" value={merchant.isActive ? 'Active' : 'Inactive'} />
          <InfoRow label="KYC Status" value={merchant.kycStatus} />
          <InfoRow label="Email Verified" value={merchant.emailVerified ? 'Yes' : 'No'} />
          <InfoRow label="MFA Enabled" value={merchant.mfaEnabled ? 'Yes' : 'No'} />
          <InfoRow label="Balance" value={`R ${parseFloat(merchant.balance || '0').toLocaleString()}`} />
          <InfoRow label="Withdrawable" value={`R ${parseFloat(merchant.withdrawableBalance || '0').toLocaleString()}`} />
        </div>
      </Card>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-900 dark:text-white">{value || '—'}</span>
    </div>
  );
}

function TransactionsTab({ merchantId }: { merchantId: string }) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchTx = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '15' });
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`/api/admin/merchants/${merchantId}/transactions?${params}`);
      const data = await res.json();
      if (data.success) {
        setTransactions(data.data || []);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [merchantId, page, search, statusFilter]);

  useEffect(() => { fetchTx(); }, [fetchTx]);

  const statusColor = (s: string) => {
    if (s === 'completed') return 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (s === 'failed') return 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    if (s === 'initiated') return 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400';
  };

  return (
    <Card className="bg-white/80 dark:bg-slate-800/80 border-white/20 dark:border-slate-700/50 overflow-hidden">
      <div className="p-4 border-b border-slate-100 dark:border-slate-700/50 flex gap-4">
        <div className="relative flex-1">
          <Activity className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search reference, customer..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-10" />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm">
          <option value="all">All Status</option>
          <option value="completed">Completed</option>
          <option value="initiated">Initiated</option>
          <option value="failed">Failed</option>
          <option value="not_started">Not Started</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {loading ? (
        <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 animate-pulse">
              <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="flex-1 space-y-1">
                <div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-3 w-36 bg-slate-200 dark:bg-slate-700 rounded" />
              </div>
              <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-5 w-16 bg-slate-200 dark:bg-slate-700 rounded-full" />
              <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded" />
            </div>
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="p-12 text-center text-slate-500">No transactions found</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Reference</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Customer</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-500">Amount</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-500">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Bank</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20">
                    <td className="px-4 py-3 font-mono text-xs">{tx.reference}</td>
                    <td className="px-4 py-3">
                      <p className="text-slate-900 dark:text-white">{tx.customerName || '—'}</p>
                      <p className="text-xs text-slate-500">{tx.customerEmail || ''}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">R {parseFloat(tx.amount).toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(tx.status)}`}>{tx.status}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{tx.bankName || '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(tx.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-slate-100 dark:border-slate-700/50">
              <p className="text-sm text-slate-500">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

function TeamTab({ merchantId }: { merchantId: string }) {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/admin/merchants/${merchantId}/team`);
        const data = await res.json();
        if (data.success) setMembers(data.data || []);
      } catch { /* ignore */ } finally { setLoading(false); }
    })();
  }, [merchantId]);

  const roleBadge = (role: string) => {
    if (role === 'owner') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">Owner</span>;
    if (role === 'admin') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Admin</span>;
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400">User</span>;
  };

  return (
    <Card className="bg-white/80 dark:bg-slate-800/80 border-white/20 dark:border-slate-700/50 overflow-hidden">
      <div className="p-4 border-b border-slate-100 dark:border-slate-700/50">
        <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2"><Users className="w-5 h-5 text-green-600" />Team Members</h3>
      </div>
      {loading ? (
        <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full" />
                <div className="space-y-2">
                  <div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="h-3 w-40 bg-slate-200 dark:bg-slate-700 rounded" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-5 w-14 bg-slate-200 dark:bg-slate-700 rounded-full" />
                <div className="h-5 w-14 bg-slate-200 dark:bg-slate-700 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : members.length === 0 ? (
        <div className="p-12 text-center text-slate-500">No team members found</div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                  {(m.userName || '?')[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">{m.userName || 'Unknown'}</p>
                  <p className="text-sm text-slate-500">{m.userEmail}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {roleBadge(m.role)}
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${m.status === 'active' ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                  {m.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function BankingTab({ merchantId }: { merchantId: string }) {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/admin/merchants/${merchantId}/banking`);
        const data = await res.json();
        if (data.success) setAccounts(data.data || []);
      } catch { /* ignore */ } finally { setLoading(false); }
    })();
  }, [merchantId]);

  return (
    <Card className="bg-white/80 dark:bg-slate-800/80 border-white/20 dark:border-slate-700/50 overflow-hidden">
      <div className="p-4 border-b border-slate-100 dark:border-slate-700/50">
        <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2"><Landmark className="w-5 h-5 text-green-600" />Bank Accounts</h3>
      </div>
      {loading ? (
        <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="p-4 animate-pulse">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-xl" />
                  <div className="space-y-2">
                    <div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded" />
                    <div className="h-3 w-36 bg-slate-200 dark:bg-slate-700 rounded" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="h-5 w-16 bg-slate-200 dark:bg-slate-700 rounded-full" />
                  <div className="h-5 w-16 bg-slate-200 dark:bg-slate-700 rounded-full" />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4 pl-13">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="space-y-1">
                    <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
                    <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <div className="p-12 text-center text-slate-500">No bank accounts found</div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
          {accounts.map((a) => (
            <div key={a.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: a.bankColor || '#059669' }}>
                    {(a.bankName || a.bankCode || '?')[0]}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{a.bankName || a.bankCode}</p>
                    <p className="text-sm text-slate-500">{a.accountHolderName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {a.isPrimary && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Primary</span>}
                  {a.isVerified
                    ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400"><CheckCircle className="w-3 h-3 inline mr-1" />Verified</span>
                    : <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Unverified</span>}
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 pl-13">
                <div><p className="text-xs text-slate-500">Account No.</p><p className="text-sm font-mono text-slate-900 dark:text-white">••••{a.accountNumber?.slice(-4)}</p></div>
                <div><p className="text-xs text-slate-500">Type</p><p className="text-sm text-slate-900 dark:text-white capitalize">{a.accountType || '—'}</p></div>
                <div><p className="text-xs text-slate-500">Branch</p><p className="text-sm text-slate-900 dark:text-white">{a.branchCode || '—'}</p></div>
                <div><p className="text-xs text-slate-500">Added</p><p className="text-sm text-slate-900 dark:text-white">{new Date(a.createdAt).toLocaleDateString()}</p></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function BillingTab({ merchantId }: { merchantId: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [merchantFee, setMerchantFee] = useState<any>(null);
  const [systemFees, setSystemFees] = useState<any>(null);

  // Form state
  const [feeType, setFeeType] = useState<'fixed' | 'percentage' | 'volume'>('fixed');
  const [useCustomFixed, setUseCustomFixed] = useState(false);
  const [useCustomPercentage, setUseCustomPercentage] = useState(false);
  const [useCustomVolume, setUseCustomVolume] = useState(false);
  const [customFixedValue, setCustomFixedValue] = useState('');
  const [customPercentageValue, setCustomPercentageValue] = useState('');
  const [customVolumeValue, setCustomVolumeValue] = useState('');
  const [useCustomVat, setUseCustomVat] = useState(false);
  const [vatEnabled, setVatEnabled] = useState(true);
  const [vatRate, setVatRate] = useState('15.00');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [mfRes, sfRes] = await Promise.all([
          fetch(`/api/admin/recon/merchant-fees/${merchantId}`),
          fetch('/api/admin/recon/fees'),
        ]);
        const [mfData, sfData] = await Promise.all([mfRes.json(), sfRes.json()]);
        if (sfData.success) setSystemFees(sfData.data);
        if (mfData.success && mfData.data) {
          const mf = mfData.data;
          setMerchantFee(mf);
          setFeeType(mf.feeType || 'fixed');
          setUseCustomFixed(mf.fixedFeeValue != null);
          setUseCustomPercentage(mf.percentageFeeValue != null);
          setUseCustomVolume(mf.volumeFeeValue != null);
          setCustomFixedValue(mf.fixedFeeValue || '');
          setCustomPercentageValue(mf.percentageFeeValue || '');
          setCustomVolumeValue(mf.volumeFeeValue || '');
          setUseCustomVat(mf.vatEnabled !== null);
          if (mf.vatEnabled !== null) setVatEnabled(mf.vatEnabled);
          if (mf.vatRate !== null) setVatRate(mf.vatRate);
        }
      } catch { /* ignore */ } finally { setLoading(false); }
    })();
  }, [merchantId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/recon/merchant-fees/${merchantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feeType,
          fixedFeeValue: useCustomFixed ? customFixedValue : null,
          percentageFeeValue: useCustomPercentage ? customPercentageValue : null,
          volumeFeeValue: useCustomVolume ? customVolumeValue : null,
          vatEnabled: useCustomVat ? vatEnabled : null,
          vatRate: useCustomVat ? vatRate : null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Saved', description: 'Merchant billing settings updated' });
        setMerchantFee(data.data);
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to save', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleReset = async () => {
    if (!confirm('Remove custom billing config? System defaults will apply.')) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/recon/merchant-fees/${merchantId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Reset', description: 'Merchant billing reset to system defaults' });
        setMerchantFee(null);
        setFeeType('fixed');
        setUseCustomFixed(false);
        setUseCustomPercentage(false);
        setUseCustomVolume(false);
        setCustomFixedValue('');
        setCustomPercentageValue('');
        setCustomVolumeValue('');
        setUseCustomVat(false);
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to reset', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div className="grid md:grid-cols-2 gap-6 animate-pulse">
      <Card className="p-6 bg-white/80 dark:bg-slate-800/80 border-white/20 dark:border-slate-700/50">
        <div className="h-5 w-24 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
        <div className="h-4 w-56 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-200 dark:bg-slate-700 rounded-xl" />
          ))}
        </div>
        <div className="space-y-3">
          <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-10 w-full bg-slate-200 dark:bg-slate-700 rounded-md" />
        </div>
      </Card>
      <Card className="p-6 bg-white/80 dark:bg-slate-800/80 border-white/20 dark:border-slate-700/50">
        <div className="h-5 w-20 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
        <div className="h-4 w-48 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-4 w-4 bg-slate-200 dark:bg-slate-700 rounded" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  const sysFixed = systemFees?.fixedFeeValue || '5.00';
  const sysPercentage = systemFees?.percentageFeeValue || '2.50';
  const sysVolume = systemFees?.volumeFeeValue || '0.0500';
  const sysVatEnabled = systemFees?.vatEnabled ?? true;
  const sysVatRate = systemFees?.vatRate || '15.00';

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Fee Type Assignment */}
      <Card className="p-6 bg-white/80 dark:bg-slate-800/80 border-white/20 dark:border-slate-700/50">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
          <Receipt className="w-5 h-5 text-green-600" />
          Fee Type
        </h3>
        <p className="text-sm text-slate-500 mb-4">Choose which fee model this merchant uses for EFT billing</p>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <button
            onClick={() => setFeeType('fixed')}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
              feeType === 'fixed'
                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
            }`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              feeType === 'fixed' ? 'bg-green-100 dark:bg-green-900/40' : 'bg-slate-100 dark:bg-slate-700'
            }`}>
              <DollarSign className={`w-5 h-5 ${feeType === 'fixed' ? 'text-green-600' : 'text-slate-400'}`} />
            </div>
            <span className={`text-sm font-semibold ${feeType === 'fixed' ? 'text-green-700 dark:text-green-400' : 'text-slate-600 dark:text-slate-400'}`}>
              Fixed
            </span>
            <span className="text-xs text-slate-500">R{useCustomFixed ? customFixedValue : sysFixed} / txn</span>
          </button>

          <button
            onClick={() => setFeeType('percentage')}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
              feeType === 'percentage'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
            }`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              feeType === 'percentage' ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-slate-100 dark:bg-slate-700'
            }`}>
              <Percent className={`w-5 h-5 ${feeType === 'percentage' ? 'text-blue-600' : 'text-slate-400'}`} />
            </div>
            <span className={`text-sm font-semibold ${feeType === 'percentage' ? 'text-blue-700 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'}`}>
              Percentage
            </span>
            <span className="text-xs text-slate-500">{useCustomPercentage ? customPercentageValue : sysPercentage}% per txn</span>
          </button>

          <button
            onClick={() => setFeeType('volume')}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
              feeType === 'volume'
                ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
            }`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              feeType === 'volume' ? 'bg-amber-100 dark:bg-amber-900/40' : 'bg-slate-100 dark:bg-slate-700'
            }`}>
              <BarChart3 className={`w-5 h-5 ${feeType === 'volume' ? 'text-amber-600' : 'text-slate-400'}`} />
            </div>
            <span className={`text-sm font-semibold ${feeType === 'volume' ? 'text-amber-700 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400'}`}>
              Volume
            </span>
            <span className="text-xs text-slate-500">{useCustomVolume ? customVolumeValue : sysVolume}% of vol</span>
          </button>
        </div>

        {/* System defaults info */}
        <div className="bg-slate-50 dark:bg-slate-900/30 rounded-lg p-3 text-xs text-slate-500 space-y-1">
          <p className="font-semibold text-slate-600 dark:text-slate-400">System Defaults</p>
          <p>Fixed: R{sysFixed} per transaction</p>
          <p>Percentage: {sysPercentage}% per transaction</p>
          <p>Volume: {sysVolume}% of total volume</p>
          <p>VAT: {sysVatEnabled ? `${sysVatRate}%` : 'Disabled'}</p>
        </div>
      </Card>

      {/* Custom Fee Overrides */}
      <Card className="p-6 bg-white/80 dark:bg-slate-800/80 border-white/20 dark:border-slate-700/50">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
          <Edit className="w-5 h-5 text-purple-600" />
          Custom Overrides
        </h3>
        <p className="text-sm text-slate-500 mb-4">Leave unchecked to use system defaults</p>

        <div className="space-y-5">
          {/* Custom Fixed Fee */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={useCustomFixed} onChange={(e) => setUseCustomFixed(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-green-600 focus:ring-green-500" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Custom Fixed Fee</span>
            </label>
            {useCustomFixed && (
              <div className="relative ml-6">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">R</span>
                <Input type="number" step="0.01" min="0" value={customFixedValue}
                  onChange={(e) => setCustomFixedValue(e.target.value)} className="pl-8" placeholder={sysFixed} />
              </div>
            )}
          </div>

          {/* Custom Percentage Fee */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={useCustomPercentage} onChange={(e) => setUseCustomPercentage(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Custom Percentage Fee</span>
            </label>
            {useCustomPercentage && (
              <div className="relative ml-6">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                <Input type="number" step="0.01" min="0" max="100" value={customPercentageValue}
                  onChange={(e) => setCustomPercentageValue(e.target.value)} className="pl-8" placeholder={sysPercentage} />
              </div>
            )}
          </div>

          {/* Custom Volume Fee */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={useCustomVolume} onChange={(e) => setUseCustomVolume(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Custom Volume Fee</span>
            </label>
            {useCustomVolume && (
              <div className="relative ml-6">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                <Input type="number" step="0.0001" min="0" max="100" value={customVolumeValue}
                  onChange={(e) => setCustomVolumeValue(e.target.value)} className="pl-8" placeholder={sysVolume} />
                <p className="text-xs text-slate-500 mt-1">Percentage of total transaction volume for the billing period</p>
              </div>
            )}
          </div>

          {/* Custom VAT */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={useCustomVat} onChange={(e) => setUseCustomVat(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Custom VAT Settings</span>
            </label>
            {useCustomVat && (
              <div className="ml-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">VAT Enabled</span>
                  <button onClick={() => setVatEnabled(!vatEnabled)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${vatEnabled ? 'bg-green-500' : 'bg-slate-300'}`}>
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${vatEnabled ? 'translate-x-5' : ''}`} />
                  </button>
                </div>
                {vatEnabled && (
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                    <Input type="number" step="0.01" min="0" max="100" value={vatRate}
                      onChange={(e) => setVatRate(e.target.value)} className="pl-8" placeholder={sysVatRate} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <Button onClick={handleSave} disabled={saving}
            className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white gap-2">
            <Save className="w-4 h-4" />{saving ? 'Saving...' : 'Save Billing Config'}
          </Button>
          {merchantFee && (
            <Button variant="outline" onClick={handleReset} disabled={saving}
              className="text-red-600 border-red-200 hover:bg-red-50">
              Reset
            </Button>
          )}
        </div>

        {/* Current effective config summary */}
        <div className="mt-4 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-3">
          <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">Effective Config for this Merchant</p>
          <p className="text-xs text-green-800 dark:text-green-300">
            Fee: {feeType === 'fixed'
              ? `R${useCustomFixed ? customFixedValue || sysFixed : sysFixed} per transaction (fixed)`
              : feeType === 'percentage'
                ? `${useCustomPercentage ? customPercentageValue || sysPercentage : sysPercentage}% per transaction (percentage)`
                : `${useCustomVolume ? customVolumeValue || sysVolume : sysVolume}% of total volume (volume)`
            }
            {' · '}
            VAT: {(useCustomVat ? vatEnabled : sysVatEnabled)
              ? `${useCustomVat ? vatRate : sysVatRate}%`
              : 'Disabled'
            }
          </p>
        </div>
      </Card>
    </div>
  );
}

function SettingsTab({ merchant, onUpdate }: { merchant: any; onUpdate: () => void }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [kycStatus, setKycStatus] = useState(merchant.kycStatus || 'pending');
  const [isActive, setIsActive] = useState(merchant.isActive);
  const [role, setRole] = useState(merchant.role || 'merchant');
  const [accountMode, setAccountMode] = useState(merchant.accountMode || 'demo');
  const [fnbVerifyResult, setFnbVerifyResult] = useState(merchant.eftSettings?.fnbVerifyResult || false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/merchants/${merchant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kycStatus, isActive, role, accountMode, eftSettings: { fnbVerifyResult } }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Saved', description: 'Merchant settings updated' });
        onUpdate();
      } else {
        toast({ title: 'Error', description: data.message || 'Failed', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to save', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="p-6 bg-white/80 dark:bg-slate-800/80 border-white/20 dark:border-slate-700/50">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Account Controls</h3>
        <div className="space-y-4">
          <div>
            <Label>Account Status</Label>
            <select value={isActive ? 'active' : 'inactive'} onChange={(e) => setIsActive(e.target.value === 'active')} className="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div>
            <Label>KYC Status</Label>
            <select value={kycStatus} onChange={(e) => setKycStatus(e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm">
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div>
            <Label>Role</Label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm">
              <option value="merchant">Merchant</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <Label>Account Mode</Label>
            <select value={accountMode} onChange={(e) => setAccountMode(e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm">
              <option value="demo">Demo (Test Transactions)</option>
              <option value="live">Live (Real Transactions)</option>
            </select>
            <p className="text-xs text-slate-500 mt-1">
              {accountMode === 'demo' ? 'Merchant can only create test transactions. No real bank connections.' : 'Merchant processes real EFT transactions.'}
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white gap-2">
            <Save className="w-4 h-4" />{saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </Card>

      <Card className="p-6 bg-white/80 dark:bg-slate-800/80 border-white/20 dark:border-slate-700/50">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">EFT Settings</h3>
        <div className="space-y-4">
          <label className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-all ${fnbVerifyResult ? 'border-green-300 bg-green-50/50 dark:border-green-700 dark:bg-green-900/10' : 'border-slate-200 dark:border-slate-700'}`}>
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">FNB Verify Result</p>
              <p className="text-xs text-slate-500 mt-1">For FNB transactions over R7,000, run additional payment verification via FNB&apos;s remittance validation</p>
            </div>
            <input type="checkbox" checked={fnbVerifyResult} onChange={(e) => setFnbVerifyResult(e.target.checked)} className="w-4 h-4 text-green-600 rounded" />
          </label>
        </div>
      </Card>

      <Card className="p-6 bg-white/80 dark:bg-slate-800/80 border-white/20 dark:border-slate-700/50">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Danger Zone</h3>
        <div className="space-y-4">
          <div className="p-4 border border-red-200 dark:border-red-800 rounded-lg bg-red-50/50 dark:bg-red-900/10">
            <p className="text-sm font-medium text-red-800 dark:text-red-400">Deactivate Merchant</p>
            <p className="text-xs text-red-600 dark:text-red-500 mt-1">This will disable the merchant&apos;s access to the platform and stop processing transactions.</p>
            <Button variant="outline" size="sm" className="mt-3 text-red-600 border-red-300 hover:bg-red-50" onClick={() => { setIsActive(false); handleSave(); }}>
              Deactivate Account
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
