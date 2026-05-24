'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Search, Plus, Building2, CheckCircle, XCircle, Clock, RefreshCw,
  Copy, ChevronRight, Eye, Users, ArrowUpDown, Filter,
  Mail, Wallet, Shield, Activity, MoreHorizontal, ExternalLink, Loader2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

interface Merchant {
  id: string;
  name: string;
  email: string;
  fullName?: string;
  phone?: string;
  companyName?: string;
  isActive: boolean;
  emailVerified: boolean;
  kycStatus: string;
  accountMode?: string;
  balance?: string;
  withdrawableBalance?: string;
  partnerId?: string;
  partnerName?: string;
  partnerEmail?: string;
  lastLogin?: string;
  createdAt: string;
}

type SortField = 'name' | 'createdAt' | 'balance' | 'kycStatus';
type SortDir = 'asc' | 'desc';

export default function AdminMerchantsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [kycFilter, setKycFilter] = useState('all');
  const [partnerFilter, setPartnerFilter] = useState('all');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [form, setForm] = useState({ name: '', email: '', companyName: '' });
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleImpersonate = async (userId: string, name: string) => {
    try {
      const res = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Impersonating', description: `Now viewing as ${name}` });
        router.push('/dashboard');
        router.refresh();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to impersonate', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to impersonate', variant: 'destructive' });
    }
  };

  const fetchMerchants = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/merchants');
      const data = await res.json();
      if (data.success) setMerchants(data.data || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchMerchants(); }, [fetchMerchants]);

  useEffect(() => {
    fetch('/api/admin/services')
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          const active = data.data.filter((s: any) => s.isActive);
          setAvailableServices(active);
          setSelectedServices(active.map((s: any) => s.code));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingServices(false));
  }, []);

  const uniquePartners = Array.from(
    new Map(
      merchants
        .filter(m => m.partnerId && m.partnerName)
        .map(m => [m.partnerId!, { id: m.partnerId!, name: m.partnerName! }])
    ).values()
  );

  const filtered = merchants
    .filter(m => {
      const s = search.toLowerCase();
      const matchSearch = !search
        || m.name?.toLowerCase().includes(s)
        || m.email?.toLowerCase().includes(s)
        || m.companyName?.toLowerCase().includes(s)
        || m.partnerName?.toLowerCase().includes(s);
      const matchStatus = statusFilter === 'all'
        || (statusFilter === 'active' ? m.isActive : !m.isActive);
      const matchKyc = kycFilter === 'all' || m.kycStatus === kycFilter;
      const matchPartner = partnerFilter === 'all'
        || (partnerFilter === 'none' ? !m.partnerId : m.partnerId === partnerFilter);
      return matchSearch && matchStatus && matchKyc && matchPartner;
    })
    .sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortField === 'name') return dir * (a.companyName || a.name || '').localeCompare(b.companyName || b.name || '');
      if (sortField === 'balance') return dir * (parseFloat(a.balance || '0') - parseFloat(b.balance || '0'));
      if (sortField === 'kycStatus') return dir * (a.kycStatus || '').localeCompare(b.kycStatus || '');
      return dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    });

  const stats = {
    total: merchants.length,
    active: merchants.filter(m => m.isActive).length,
    inactive: merchants.filter(m => !m.isActive).length,
    kycPending: merchants.filter(m => m.kycStatus === 'pending').length,
    kycApproved: merchants.filter(m => m.kycStatus === 'approved').length,
    withPartner: merchants.filter(m => m.partnerId).length,
    liveMode: merchants.filter(m => m.accountMode === 'live').length,
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch('/api/admin/merchants', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, services: selectedServices }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Success', description: 'Merchant created' });
        setInviteLink(data.invitation?.link || '');
        setForm({ name: '', email: '', companyName: '' });
        setSelectedServices(availableServices.map((s: any) => s.code));
        fetchMerchants();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to create', variant: 'destructive' });
    } finally { setCreating(false); }
  };

  const toggleStatus = async (id: string, isActive: boolean) => {
    try {
      await fetch(`/api/admin/merchants/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });
      toast({ title: 'Updated', description: `Merchant ${!isActive ? 'activated' : 'deactivated'}` });
      fetchMerchants();
    } catch {
      toast({ title: 'Error', description: 'Failed', variant: 'destructive' });
    }
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const kycBadge = (status: string) => {
    if (status === 'approved') return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-800">
        <CheckCircle className="w-3 h-3" />Approved
      </span>
    );
    if (status === 'rejected') return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-800">
        <XCircle className="w-3 h-3" />Rejected
      </span>
    );
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 ring-1 ring-amber-200 dark:ring-amber-800">
        <Clock className="w-3 h-3" />Pending
      </span>
    );
  };

  const formatBalance = (val?: string) => {
    const num = parseFloat(val || '0');
    return `R ${num.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Merchants</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {stats.total} total &middot; {stats.active} active &middot; {stats.kycPending} pending KYC
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchMerchants} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />Refresh
          </Button>
          <Button size="sm" onClick={() => { setShowCreate(true); setInviteLink(''); }} className="gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-sm">
            <Plus className="w-3.5 h-3.5" />Add Merchant
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total', value: stats.total, icon: Building2, color: 'text-slate-600 dark:text-slate-300', bg: 'bg-slate-100 dark:bg-slate-800' },
          { label: 'Active', value: stats.active, icon: CheckCircle, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
          { label: 'KYC Pending', value: stats.kycPending, icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30' },
          { label: 'With Partner', value: stats.withPartner, icon: Users, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/30' },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-3 p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/50">
            <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
              <s.icon className={`w-4.5 h-4.5 ${s.color}`} />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900 dark:text-white leading-none">{s.value}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by name, email, company, or partner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            value={kycFilter}
            onChange={(e) => setKycFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
          >
            <option value="all">All KYC</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <select
            value={partnerFilter}
            onChange={(e) => setPartnerFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
          >
            <option value="all">All Partners</option>
            <option value="none">No Partner</option>
            {uniquePartners.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/50 rounded-xl overflow-hidden shadow-sm">
        {/* Table Header */}
        <div className="hidden lg:grid lg:grid-cols-[1fr_140px_120px_130px_120px_60px] gap-4 px-5 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200/60 dark:border-slate-700/50 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          <button onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200 transition-colors text-left">
            Merchant <ArrowUpDown className="w-3 h-3" />
          </button>
          <span>Partner</span>
          <button onClick={() => toggleSort('kycStatus')} className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
            KYC <ArrowUpDown className="w-3 h-3" />
          </button>
          <button onClick={() => toggleSort('balance')} className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
            Balance <ArrowUpDown className="w-3 h-3" />
          </button>
          <button onClick={() => toggleSort('createdAt')} className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
            Joined <ArrowUpDown className="w-3 h-3" />
          </button>
          <span></span>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="px-5 py-4 flex items-center gap-4 animate-pulse">
                <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-36 bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="h-3 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
                </div>
                <div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded-full" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Building2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">No merchants found</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Try adjusting your filters or search</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700/30">
            {filtered.map((m) => (
              <div key={m.id} className="group">
                {/* Main Row */}
                <div className="lg:grid lg:grid-cols-[1fr_140px_120px_130px_120px_60px] gap-4 px-5 py-3.5 items-center hover:bg-slate-50/80 dark:hover:bg-slate-700/20 transition-colors">
                  {/* Merchant Info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 ${
                      m.isActive
                        ? 'bg-gradient-to-br from-amber-500 to-amber-600'
                        : 'bg-gradient-to-br from-slate-400 to-slate-500'
                    }`}>
                      {(m.companyName || m.name || '?')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                          {m.companyName || m.name}
                        </p>
                        {m.isActive
                          ? <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          : <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />}
                        {m.accountMode === 'demo' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">DEMO</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate">{m.email}</p>
                    </div>
                  </div>

                  {/* Partner */}
                  <div className="hidden lg:block">
                    {m.partnerId && m.partnerName ? (
                      <Link
                        href={`/dashboard/admin/partners/${m.partnerId}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/50 transition-colors ring-1 ring-violet-200/60 dark:ring-violet-800/60"
                      >
                        <Users className="w-3 h-3" />
                        <span className="truncate max-w-[90px]">{m.partnerName}</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-50" />
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-400 dark:text-slate-500">&mdash;</span>
                    )}
                  </div>

                  {/* KYC */}
                  <div className="hidden lg:block">
                    {kycBadge(m.kycStatus)}
                  </div>

                  {/* Balance */}
                  <div className="hidden lg:block">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{formatBalance(m.balance)}</p>
                    {m.withdrawableBalance && parseFloat(m.withdrawableBalance) > 0 && (
                      <p className="text-[11px] text-slate-400">{formatBalance(m.withdrawableBalance)} available</p>
                    )}
                  </div>

                  {/* Joined */}
                  <div className="hidden lg:block">
                    <p className="text-sm text-slate-600 dark:text-slate-300">{new Date(m.createdAt).toLocaleDateString('en-ZA')}</p>
                    {m.lastLogin && (
                      <p className="text-[11px] text-slate-400">Last seen {timeAgo(m.lastLogin)}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end mt-3 lg:mt-0 relative" ref={openMenu === m.id ? menuRef : undefined}>
                    <button
                      onClick={() => setOpenMenu(openMenu === m.id ? null : m.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    {openMenu === m.id && (
                      <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-20 py-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
                        <Link
                          href={`/dashboard/admin/merchants/${m.id}`}
                          onClick={() => setOpenMenu(null)}
                          className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                        >
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                          View Profile
                        </Link>
                        <button
                          onClick={() => { handleImpersonate(m.id, m.companyName || m.name); setOpenMenu(null); }}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          Impersonate
                        </button>
                        <div className="my-1.5 border-t border-slate-100 dark:border-slate-700/50" />
                        <button
                          onClick={() => { toggleStatus(m.id, m.isActive); setOpenMenu(null); }}
                          className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-sm transition-colors ${
                            m.isActive
                              ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                              : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                          }`}
                        >
                          {m.isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                          {m.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Mobile expanded details */}
                <div className="lg:hidden px-5 pb-3 flex flex-wrap gap-2">
                  {m.partnerId && m.partnerName && (
                    <Link
                      href={`/dashboard/admin/partners/${m.partnerId}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 ring-1 ring-violet-200/60 dark:ring-violet-800/60"
                    >
                      <Users className="w-3 h-3" />
                      {m.partnerName}
                      <ExternalLink className="w-2.5 h-2.5 opacity-50" />
                    </Link>
                  )}
                  {kycBadge(m.kycStatus)}
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    <Wallet className="w-3 h-3" />{formatBalance(m.balance)}
                  </span>
                  <span className="text-xs text-slate-400 py-1">
                    Joined {new Date(m.createdAt).toLocaleDateString('en-ZA')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Showing {filtered.length} of {merchants.length} merchants
            </p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-6" onClick={() => setShowCreate(false)}>
          <Card className="w-full max-w-lg p-6 bg-white dark:bg-slate-800 shadow-2xl border-slate-200 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Create New Merchant</h2>
            <p className="text-sm text-slate-500 mb-5">Send an invitation to set up their account</p>
            {inviteLink ? (
              <div>
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-lg mb-4">
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400 mb-2">Merchant created! Send this invitation link:</p>
                  <div className="flex gap-2">
                    <Input value={inviteLink} readOnly className="text-xs" />
                    <Button size="sm" onClick={() => { navigator.clipboard.writeText(inviteLink); toast({ title: 'Copied!' }); }}><Copy className="w-4 h-4" /></Button>
                  </div>
                </div>
                <Button onClick={() => setShowCreate(false)} className="w-full">Done</Button>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">Full Name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="John Doe" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required placeholder="john@company.com" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">Company Name</Label>
                  <Input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} required placeholder="Company (Pty) Ltd" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">Payment Services</Label>
                  <p className="text-xs text-slate-400 mb-2">Select which payment methods this merchant can use</p>
                  {loadingServices ? (
                    <div className="flex items-center gap-2 text-xs text-slate-400 py-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading services...</div>
                  ) : availableServices.length === 0 ? (
                    <p className="text-xs text-slate-400 py-2">No services available</p>
                  ) : (
                    <div className="space-y-2">
                      {availableServices.map((svc: any) => (
                        <div key={svc.id} className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedServices.includes(svc.code) ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-slate-100 dark:bg-slate-700'}`}>
                              {svc.category === 'card' ? <span className="text-sm">💳</span> : <span className="text-sm">🏦</span>}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{svc.name}</p>
                              <p className="text-xs text-slate-400">{svc.code}</p>
                            </div>
                          </div>
                          <Switch
                            checked={selectedServices.includes(svc.code)}
                            onCheckedChange={(checked) => {
                              setSelectedServices(prev =>
                                checked ? [...prev, svc.code] : prev.filter(c => c !== svc.code)
                              );
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowCreate(false)} className="flex-1">Cancel</Button>
                  <Button type="submit" disabled={creating || selectedServices.length === 0} className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white">
                    {creating ? 'Creating...' : 'Create & Invite'}
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
