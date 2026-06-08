'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Search, Plus, Users, CheckCircle, XCircle, RefreshCw, Copy, ChevronRight, Percent, Mail, Send, ChevronDown, Eye, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';

interface Partner {
  id: string;
  name: string;
  email: string;
  companyName?: string;
  phone?: string;
  isActive: boolean;
  emailVerified: boolean;
  kycStatus: string;
  commissionMode?: string;
  merchantCount?: number;
  createdAt: string;
}

export default function AdminPartnersPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [showLink, setShowLink] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', companyName: '' });
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);

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

  const fetchPartners = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/partners');
      const data = await res.json();
      if (data.success) setPartners(data.data || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPartners(); }, [fetchPartners]);

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
        body: JSON.stringify({ ...form, services: selectedServices }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Success', description: 'Partner created and invitation email sent' });
        setInviteLink(data.invitation?.link || '');
        setInviteEmail(form.email);
        setShowLink(false);
        setForm({ name: '', email: '', companyName: '' });
        setSelectedServices(availableServices.map((s: any) => s.code));
        fetchPartners();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to create partner', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to create partner', variant: 'destructive' });
    } finally { setCreating(false); }
  };

  const resendInvitation = async (id: string, email: string) => {
    setResendingId(id);
    try {
      const res = await fetch(`/api/admin/partners/${id}/resend-invitation`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Invitation Resent', description: `Invitation email sent to ${email}` });
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to resend', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to resend invitation', variant: 'destructive' });
    } finally { setResendingId(null); }
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Partners</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Manage partner accounts, commissions, and merchants</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={fetchPartners} className="gap-2"><RefreshCw className="w-4 h-4" />Refresh</Button>
          <Button onClick={() => { setShowCreate(true); setInviteLink(''); }} className="gap-2 bg-gradient-to-r from-green-700 to-green-500 text-white"><Plus className="w-4 h-4" />Invite Partner</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Partners', value: stats.total, icon: Users, bg: 'bg-purple-100 dark:bg-purple-900/30', fg: 'text-purple-600 dark:text-purple-400' },
          { label: 'Active', value: stats.active, icon: CheckCircle, bg: 'bg-green-100 dark:bg-green-900/30', fg: 'text-green-500 dark:text-green-400' },
          { label: 'Inactive', value: stats.inactive, icon: XCircle, bg: 'bg-slate-100 dark:bg-slate-800', fg: 'text-slate-600 dark:text-slate-400' },
          { label: 'Commission Mode', value: stats.commission, icon: Percent, bg: 'bg-green-100 dark:bg-green-900/30', fg: 'text-green-700 dark:text-green-400' },
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
                        ? <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" title="Active" />
                        : <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" title="Inactive" />}
                      {!p.isActive && !p.emailVerified && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Pending</span>
                      )}
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
                  {!p.isActive && !p.emailVerified && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => resendInvitation(p.id, p.email)}
                      disabled={resendingId === p.id}
                      className="text-blue-600 hover:text-blue-700 gap-1"
                    >
                      <Send className="w-3 h-3" />
                      {resendingId === p.id ? 'Sending...' : 'Resend'}
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => handleImpersonate(p.id, p.companyName || p.name)} className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 gap-1">
                    <Eye className="w-3 h-3" />
                    Impersonate
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => toggleStatus(p.id, p.isActive)} className={p.isActive ? 'text-green-700 hover:text-green-800' : 'text-green-500 hover:text-green-700'}>
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
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">Invitation email sent to {inviteEmail}</p>
                  </div>
                  <p className="text-xs text-green-600 dark:text-green-500">The partner will receive an email with a link to set up their password. The link expires in 7 days.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLink(!showLink)}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-3 transition-colors"
                >
                  <ChevronDown className={`w-3 h-3 transition-transform ${showLink ? 'rotate-180' : ''}`} />
                  {showLink ? 'Hide invitation link' : 'Show invitation link (backup)'}
                </button>
                {showLink && (
                  <div className="flex gap-2 mb-4">
                    <Input value={inviteLink} readOnly className="text-xs" />
                    <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(inviteLink); toast({ title: 'Copied!' }); }}><Copy className="w-4 h-4" /></Button>
                  </div>
                )}
                <Button onClick={() => setShowCreate(false)} className="w-full">Done</Button>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="space-y-4">
                <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Jane Doe" /></div>
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required placeholder="jane@partner.com" /></div>
                <div><Label>Company Name</Label><Input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} required placeholder="Partner Co (Pty) Ltd" /></div>
                <div>
                  <Label>Payment Services</Label>
                  <p className="text-xs text-slate-400 mb-2">Select which payment methods this partner can offer</p>
                  {loadingServices ? (
                    <div className="flex items-center gap-2 text-xs text-slate-400 py-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading services...</div>
                  ) : availableServices.length === 0 ? (
                    <p className="text-xs text-slate-400 py-2">No services available</p>
                  ) : (
                    <div className="space-y-2">
                      {availableServices.map((svc: any) => (
                        <div key={svc.id} className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedServices.includes(svc.code) ? 'bg-green-100 dark:bg-green-900/30' : 'bg-slate-100 dark:bg-slate-700'}`}>
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
                  <Button type="submit" disabled={creating || selectedServices.length === 0} className="flex-1 bg-gradient-to-r from-green-700 to-green-500 text-white">{creating ? 'Creating...' : 'Create & Invite'}</Button>
                </div>
              </form>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
