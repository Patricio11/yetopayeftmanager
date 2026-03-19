'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Search, Plus, Users, CheckCircle, XCircle, RefreshCw, Copy, ChevronRight, Percent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface Partner {
  id: string;
  name: string;
  email: string;
  companyName?: string;
  phone?: string;
  isActive: boolean;
  kycStatus: string;
  commissionMode?: string;
  merchantCount?: number;
  createdAt: string;
}

export default function AdminPartnersPage() {
  const { toast } = useToast();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [form, setForm] = useState({ name: '', email: '', companyName: '' });

  const fetchPartners = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/partners');
      const data = await res.json();
      if (data.success) setPartners(data.data || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPartners(); }, [fetchPartners]);

  const filtered = partners.filter(p => {
    const s = search.toLowerCase();
    return !search || p.name?.toLowerCase().includes(s) || p.email?.toLowerCase().includes(s) || p.companyName?.toLowerCase().includes(s);
  });

  const stats = {
    total: partners.length,
    active: partners.filter(p => p.isActive).length,
    inactive: partners.filter(p => !p.isActive).length,
    commission: partners.filter(p => p.commissionMode === 'commission').length,
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch('/api/admin/partners', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Success', description: 'Partner created' });
        setInviteLink(data.invitation?.link || '');
        setForm({ name: '', email: '', companyName: '' });
        fetchPartners();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to create partner', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to create partner', variant: 'destructive' });
    } finally { setCreating(false); }
  };

  const toggleStatus = async (id: string, isActive: boolean) => {
    try {
      await fetch(`/api/admin/partners/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });
      toast({ title: 'Updated', description: `Partner ${!isActive ? 'activated' : 'deactivated'}` });
      fetchPartners();
    } catch {
      toast({ title: 'Error', description: 'Failed to update partner', variant: 'destructive' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Partners</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Manage partner accounts, commissions, and merchants</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={fetchPartners} className="gap-2"><RefreshCw className="w-4 h-4" />Refresh</Button>
          <Button onClick={() => { setShowCreate(true); setInviteLink(''); }} className="gap-2 bg-gradient-to-r from-fyro-navy to-fyro-gold text-white"><Plus className="w-4 h-4" />Invite Partner</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Partners', value: stats.total, icon: Users, bg: 'bg-purple-100 dark:bg-purple-900/30', fg: 'text-purple-600 dark:text-purple-400' },
          { label: 'Active', value: stats.active, icon: CheckCircle, bg: 'bg-amber-100 dark:bg-amber-900/30', fg: 'text-amber-500 dark:text-amber-400' },
          { label: 'Inactive', value: stats.inactive, icon: XCircle, bg: 'bg-slate-100 dark:bg-slate-800', fg: 'text-slate-600 dark:text-slate-400' },
          { label: 'Commission Mode', value: stats.commission, icon: Percent, bg: 'bg-amber-100 dark:bg-amber-900/30', fg: 'text-amber-600 dark:text-amber-400' },
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
            <Input placeholder="Search by name, email, or company..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
        </div>
      </Card>

      {/* Partner List */}
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
          <div className="p-12 text-center text-slate-500">No partners found</div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {filtered.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
                    {(p.companyName || p.name || '?')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900 dark:text-white truncate">{p.companyName || p.name}</p>
                      {p.isActive
                        ? <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" title="Active" />
                        : <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" title="Inactive" />}
                    </div>
                    <p className="text-sm text-slate-500 truncate">{p.email}</p>
                  </div>
                </div>
                <div className="hidden md:flex items-center gap-4">
                  <span className="text-sm text-slate-500">{p.merchantCount != null ? `${p.merchantCount} merchants` : '\u2014'}</span>
                  {p.commissionMode === 'commission'
                    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">Commission</span>
                    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400">Handle Outside</span>}
                  <span className="text-sm text-slate-500">{new Date(p.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button size="sm" variant="ghost" onClick={() => toggleStatus(p.id, p.isActive)} className={p.isActive ? 'text-amber-600 hover:text-amber-700' : 'text-amber-500 hover:text-amber-600'}>
                    {p.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Link href={`/dashboard/admin/partners/${p.id}`}>
                    <Button size="sm" variant="outline" className="gap-1">View<ChevronRight className="w-3 h-3" /></Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Create/Invite Partner Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-6" onClick={() => setShowCreate(false)}>
          <Card className="w-full max-w-lg p-6 bg-white dark:bg-slate-800 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Invite Partner</h2>
            {inviteLink ? (
              <div>
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg mb-4">
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-2">Partner created! Send this invitation link:</p>
                  <div className="flex gap-2">
                    <Input value={inviteLink} readOnly className="text-xs" />
                    <Button size="sm" onClick={() => { navigator.clipboard.writeText(inviteLink); toast({ title: 'Copied!' }); }}><Copy className="w-4 h-4" /></Button>
                  </div>
                </div>
                <Button onClick={() => setShowCreate(false)} className="w-full">Done</Button>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="space-y-4">
                <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Jane Doe" /></div>
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required placeholder="jane@partner.com" /></div>
                <div><Label>Company Name</Label><Input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} required placeholder="Partner Co (Pty) Ltd" /></div>
                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowCreate(false)} className="flex-1">Cancel</Button>
                  <Button type="submit" disabled={creating} className="flex-1 bg-gradient-to-r from-fyro-navy to-fyro-gold text-white">{creating ? 'Creating...' : 'Create & Invite'}</Button>
                </div>
              </form>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
