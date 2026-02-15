'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Search, Plus, Building2, CheckCircle, XCircle, Clock, RefreshCw, Mail, Copy, Shield, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
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
  balance?: string;
  createdAt: string;
}

export default function AdminMerchantsPage() {
  const { toast } = useToast();
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [form, setForm] = useState({ name: '', email: '', companyName: '' });

  const fetchMerchants = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/merchants');
      const data = await res.json();
      if (data.success) setMerchants(data.data || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchMerchants(); }, [fetchMerchants]);

  const filtered = merchants.filter(m => {
    const s = search.toLowerCase();
    const matchSearch = !search || m.name?.toLowerCase().includes(s) || m.email?.toLowerCase().includes(s) || m.companyName?.toLowerCase().includes(s);
    const matchStatus = statusFilter === 'all' || (statusFilter === 'active' ? m.isActive : !m.isActive);
    return matchSearch && matchStatus;
  });

  const stats = {
    total: merchants.length,
    active: merchants.filter(m => m.isActive).length,
    inactive: merchants.filter(m => !m.isActive).length,
    kycPending: merchants.filter(m => m.kycStatus === 'pending').length,
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch('/api/admin/merchants', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Success', description: 'Merchant created' });
        setInviteLink(data.invitation?.link || '');
        setForm({ name: '', email: '', companyName: '' });
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

  const kycBadge = (s: string) => {
    if (s === 'approved') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400"><CheckCircle className="w-3 h-3" />Approved</span>;
    if (s === 'rejected') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"><XCircle className="w-3 h-3" />Rejected</span>;
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"><Clock className="w-3 h-3" />Pending</span>;
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Merchant Management</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Manage all merchants, accounts, and KYC</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={fetchMerchants} className="gap-2"><RefreshCw className="w-4 h-4" />Refresh</Button>
          <Button onClick={() => { setShowCreate(true); setInviteLink(''); }} className="gap-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white"><Plus className="w-4 h-4" />Add Merchant</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Merchants', value: stats.total, icon: Building2, bg: 'bg-blue-100 dark:bg-blue-900/30', fg: 'text-blue-600 dark:text-blue-400' },
          { label: 'Active', value: stats.active, icon: CheckCircle, bg: 'bg-green-100 dark:bg-green-900/30', fg: 'text-green-600 dark:text-green-400' },
          { label: 'Inactive', value: stats.inactive, icon: XCircle, bg: 'bg-slate-100 dark:bg-slate-800', fg: 'text-slate-600 dark:text-slate-400' },
          { label: 'KYC Pending', value: stats.kycPending, icon: Clock, bg: 'bg-amber-100 dark:bg-amber-900/30', fg: 'text-amber-600 dark:text-amber-400' },
        ].map((s) => (
          <Card key={s.label} className="p-4 bg-white/80 dark:bg-slate-800/80 border-white/20 dark:border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}><s.icon className={`w-5 h-5 ${s.fg}`} /></div>
              <div><p className="text-2xl font-bold text-slate-900 dark:text-white">{s.value}</p><p className="text-xs text-slate-500">{s.label}</p></div>
            </div>
          </Card>
        ))}
      </div>

      {/* Search */}
      <Card className="p-4 mb-6 bg-white/80 dark:bg-slate-800/80 border-white/20 dark:border-slate-700/50">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search merchants..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </Card>

      {/* Merchant List */}
      <Card className="bg-white/80 dark:bg-slate-800/80 border-white/20 dark:border-slate-700/50 overflow-hidden">
        {loading ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="p-4 flex items-center gap-4 animate-pulse">
                <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="h-3 w-56 bg-slate-200 dark:bg-slate-700 rounded" />
                </div>
                <div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded-full" />
                <div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded-full" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No merchants found</div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {filtered.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
                    {(m.companyName || m.name || '?')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900 dark:text-white truncate">{m.companyName || m.name}</p>
                      {m.isActive
                        ? <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" title="Active" />
                        : <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" title="Inactive" />}
                    </div>
                    <p className="text-sm text-slate-500 truncate">{m.email}</p>
                  </div>
                </div>
                <div className="hidden md:flex items-center gap-4">
                  {kycBadge(m.kycStatus)}
                  <span className="text-sm text-slate-500">{new Date(m.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button size="sm" variant="ghost" onClick={() => toggleStatus(m.id, m.isActive)} className={m.isActive ? 'text-amber-600 hover:text-amber-700' : 'text-green-600 hover:text-green-700'}>
                    {m.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Link href={`/dashboard/admin/merchants/${m.id}`}>
                    <Button size="sm" variant="outline" className="gap-1">View<ChevronRight className="w-3 h-3" /></Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-6" onClick={() => setShowCreate(false)}>
          <Card className="w-full max-w-lg p-6 bg-white dark:bg-slate-800 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Create New Merchant</h2>
            {inviteLink ? (
              <div>
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg mb-4">
                  <p className="text-sm font-medium text-green-800 dark:text-green-400 mb-2">Merchant created! Send this invitation link:</p>
                  <div className="flex gap-2">
                    <Input value={inviteLink} readOnly className="text-xs" />
                    <Button size="sm" onClick={() => { navigator.clipboard.writeText(inviteLink); toast({ title: 'Copied!' }); }}><Copy className="w-4 h-4" /></Button>
                  </div>
                </div>
                <Button onClick={() => setShowCreate(false)} className="w-full">Done</Button>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="space-y-4">
                <div><Label>Full Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="John Doe" /></div>
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required placeholder="john@company.com" /></div>
                <div><Label>Company Name</Label><Input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} required placeholder="Company (Pty) Ltd" /></div>
                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowCreate(false)} className="flex-1">Cancel</Button>
                  <Button type="submit" disabled={creating} className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white">{creating ? 'Creating...' : 'Create & Invite'}</Button>
                </div>
              </form>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
