'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Building2, Mail, Phone, Users, CheckCircle, XCircle, Clock,
  Shield, Save, Percent, ChevronRight, FileText, Settings, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

type Tab = 'overview' | 'merchants' | 'commission' | 'invoices' | 'settings';

interface Partner {
  id: string;
  name: string;
  email: string;
  companyName?: string;
  phone?: string;
  isActive: boolean;
  kycStatus: string;
  commissionMode?: string;
  accountMode?: string;
  merchantCount?: number;
  createdAt: string;
  stats?: {
    merchantCount: number;
    totalTransactions: number;
    totalVolume: string;
  };
}

interface Merchant {
  id: string;
  name: string;
  email: string;
  companyName?: string;
  isActive: boolean;
  createdAt: string;
}

interface CommissionConfig {
  commissionMode: string;
  feeType: string;
  feeValue: string;
  vatEnabled: boolean;
  vatRate: string;
}

export default function PartnerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [partner, setPartner] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPartner = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/partners/${id}`);
      const data = await res.json();
      if (data.success) setPartner(data.data);
      else toast({ title: 'Error', description: 'Partner not found', variant: 'destructive' });
    } catch {
      toast({ title: 'Error', description: 'Failed to load partner', variant: 'destructive' });
    } finally { setLoading(false); }
  }, [id, toast]);

  useEffect(() => { fetchPartner(); }, [fetchPartner]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-48 bg-slate-200 dark:bg-slate-700 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 text-center">
        <p className="text-slate-500">Partner not found.</p>
        <Link href="/dashboard/admin/partners"><Button className="mt-4">Back to Partners</Button></Link>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'overview', label: 'Overview', icon: Building2 },
    { key: 'merchants', label: 'Merchants', icon: Users },
    { key: 'commission', label: 'Commission', icon: Percent },
    { key: 'invoices', label: 'Invoices', icon: FileText },
    { key: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Back */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard/admin/partners">
          <Button variant="ghost" size="sm" className="gap-1"><ArrowLeft className="w-4 h-4" />Back</Button>
        </Link>
      </div>

      {/* Partner Header Card */}
      <Card className="p-6 mb-6 bg-white/80 dark:bg-slate-800/80 border-white/20 dark:border-slate-700/50">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
              {(partner.companyName || partner.name || '?')[0].toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{partner.companyName || partner.name}</h1>
              <p className="text-slate-500">{partner.email}</p>
              <div className="flex items-center gap-3 mt-2">
                {partner.isActive
                  ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"><div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />Active</span>
                  : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400">Inactive</span>}
                {partner.kycStatus === 'approved'
                  ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"><CheckCircle className="w-3 h-3" />KYC Approved</span>
                  : partner.kycStatus === 'rejected'
                  ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"><XCircle className="w-3 h-3" />KYC Rejected</span>
                  : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"><Clock className="w-3 h-3" />KYC Pending</span>}
                {partner.commissionMode === 'commission'
                  ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"><Percent className="w-3 h-3" />Commission</span>
                  : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400">Handle Outside</span>}
                {partner.accountMode === 'live'
                  ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">LIVE</span>
                  : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">DEMO</span>}
              </div>
            </div>
          </div>
          <div className="text-right text-sm text-slate-500">
            <p>Created {new Date(partner.createdAt).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Quick Stats */}
        {partner.stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-slate-700/50">
            <div><p className="text-2xl font-bold text-slate-900 dark:text-white">{partner.stats.merchantCount}</p><p className="text-xs text-slate-500">Merchants</p></div>
            <div><p className="text-2xl font-bold text-slate-900 dark:text-white">{partner.stats.totalTransactions}</p><p className="text-xs text-slate-500">Transactions</p></div>
            <div><p className="text-2xl font-bold text-amber-500">R {parseFloat(partner.stats.totalVolume || '0').toLocaleString()}</p><p className="text-xs text-slate-500">Total Volume</p></div>
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
                ? 'bg-white dark:bg-slate-700 text-amber-500 dark:text-amber-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4" />{tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab partner={partner} />}
      {activeTab === 'merchants' && <MerchantsTab partnerId={id} />}
      {activeTab === 'commission' && <CommissionTab partnerId={id} />}
      {activeTab === 'invoices' && <InvoicesTab />}
      {activeTab === 'settings' && <SettingsTab partner={partner} onUpdate={fetchPartner} />}
    </div>
  );
}

/* ─── Info Row Helper ─── */
function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-slate-700/30 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-900 dark:text-white">{value || '\u2014'}</span>
    </div>
  );
}

/* ─── Overview Tab ─── */
function OverviewTab({ partner }: { partner: Partner }) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="p-6 bg-white/80 dark:bg-slate-800/80 border-white/20 dark:border-slate-700/50">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2"><Building2 className="w-5 h-5 text-purple-600" />Partner Information</h3>
        <div className="space-y-1">
          <InfoRow label="Company Name" value={partner.companyName} />
          <InfoRow label="Contact Name" value={partner.name} />
          <InfoRow label="Email" value={partner.email} />
          <InfoRow label="Phone" value={partner.phone} />
          <InfoRow label="Created" value={new Date(partner.createdAt).toLocaleDateString()} />
        </div>
      </Card>

      <Card className="p-6 bg-white/80 dark:bg-slate-800/80 border-white/20 dark:border-slate-700/50">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2"><Shield className="w-5 h-5 text-amber-600" />Account Status</h3>
        <div className="space-y-1">
          <InfoRow label="Account Status" value={partner.isActive ? 'Active' : 'Inactive'} />
          <InfoRow label="KYC Status" value={partner.kycStatus} />
          <InfoRow label="Account Mode" value={partner.accountMode || 'demo'} />
          <InfoRow label="Commission Mode" value={partner.commissionMode || 'handle_outside'} />
          <InfoRow label="Merchants" value={partner.merchantCount != null ? String(partner.merchantCount) : '\u2014'} />
        </div>
      </Card>

      {partner.stats && (
        <Card className="p-6 md:col-span-2 bg-white/80 dark:bg-slate-800/80 border-white/20 dark:border-slate-700/50">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2"><Percent className="w-5 h-5 text-amber-500" />Performance Summary</h3>
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{partner.stats.merchantCount}</p>
              <p className="text-sm text-slate-500 mt-1">Total Merchants</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{partner.stats.totalTransactions}</p>
              <p className="text-sm text-slate-500 mt-1">Total Transactions</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-amber-500">R {parseFloat(partner.stats.totalVolume || '0').toLocaleString()}</p>
              <p className="text-sm text-slate-500 mt-1">Total Volume</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

/* ─── Merchants Tab ─── */
function MerchantsTab({ partnerId }: { partnerId: string }) {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/admin/partners/${partnerId}/merchants`);
        const data = await res.json();
        if (data.success) setMerchants(data.data || []);
      } catch { /* ignore */ } finally { setLoading(false); }
    })();
  }, [partnerId]);

  if (loading) {
    return (
      <Card className="bg-white/80 dark:bg-slate-800/80 border-white/20 dark:border-slate-700/50 overflow-hidden">
        <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-4 flex items-center gap-4 animate-pulse">
              <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-3 w-56 bg-slate-200 dark:bg-slate-700 rounded" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (merchants.length === 0) {
    return (
      <Card className="p-12 text-center bg-white/80 dark:bg-slate-800/80 border-white/20 dark:border-slate-700/50">
        <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
        <p className="text-slate-500">No merchants linked to this partner yet.</p>
      </Card>
    );
  }

  return (
    <Card className="bg-white/80 dark:bg-slate-800/80 border-white/20 dark:border-slate-700/50 overflow-hidden">
      {/* Table Header */}
      <div className="hidden md:grid grid-cols-5 gap-4 px-4 py-3 bg-slate-50 dark:bg-slate-700/30 text-xs font-medium text-slate-500 uppercase tracking-wider">
        <span className="col-span-2">Merchant</span>
        <span>Email</span>
        <span>Status</span>
        <span>Created</span>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
        {merchants.map((m) => (
          <div key={m.id} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-pink-600 flex items-center justify-center text-white font-bold shrink-0">
                {(m.companyName || m.name || '?')[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1 md:grid md:grid-cols-4 md:gap-4 md:items-center">
                <div className="md:col-span-1">
                  <p className="font-semibold text-slate-900 dark:text-white truncate">{m.companyName || m.name}</p>
                </div>
                <div className="md:col-span-1">
                  <p className="text-sm text-slate-500 truncate">{m.email}</p>
                </div>
                <div className="md:col-span-1">
                  {m.isActive
                    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"><CheckCircle className="w-3 h-3" />Active</span>
                    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400"><XCircle className="w-3 h-3" />Inactive</span>}
                </div>
                <div className="md:col-span-1 hidden md:block">
                  <span className="text-sm text-slate-500">{new Date(m.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            <Link href={`/dashboard/admin/merchants/${m.id}`}>
              <Button size="sm" variant="outline" className="gap-1 ml-4">View<ChevronRight className="w-3 h-3" /></Button>
            </Link>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ─── Commission Tab ─── */
function CommissionTab({ partnerId }: { partnerId: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<CommissionConfig>({
    commissionMode: 'handle_outside',
    feeType: 'percentage',
    feeValue: '',
    vatEnabled: false,
    vatRate: '15',
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/admin/partners/${partnerId}/commission`);
        const data = await res.json();
        if (data.success && data.data) {
          setConfig({
            commissionMode: data.data.commissionMode || 'handle_outside',
            feeType: data.data.feeType || 'percentage',
            feeValue: data.data.feeValue?.toString() || '',
            vatEnabled: data.data.vatEnabled || false,
            vatRate: data.data.vatRate?.toString() || '15',
          });
        }
      } catch { /* ignore */ } finally { setLoading(false); }
    })();
  }, [partnerId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/partners/${partnerId}/commission`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commissionMode: config.commissionMode,
          feeType: config.feeType,
          feeValue: parseFloat(config.feeValue) || 0,
          vatEnabled: config.vatEnabled,
          vatRate: parseFloat(config.vatRate) || 15,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Saved', description: 'Commission configuration updated' });
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to save', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to save commission config', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <Card className="p-6 bg-white/80 dark:bg-slate-800/80 border-white/20 dark:border-slate-700/50">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-10 w-full bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-10 w-full bg-slate-200 dark:bg-slate-700 rounded" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-white/80 dark:bg-slate-800/80 border-white/20 dark:border-slate-700/50">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
        <Percent className="w-5 h-5 text-purple-600" />Commission Configuration
      </h3>

      <div className="space-y-6 max-w-xl">
        {/* Commission Mode */}
        <div>
          <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 block">Commission Mode</Label>
          <div className="flex gap-4">
            <label className={`flex-1 flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
              config.commissionMode === 'handle_outside'
                ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-400'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
            }`}>
              <input
                type="radio"
                name="commissionMode"
                value="handle_outside"
                checked={config.commissionMode === 'handle_outside'}
                onChange={(e) => setConfig({ ...config, commissionMode: e.target.value })}
                className="sr-only"
              />
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Handle Outside</p>
                <p className="text-xs text-slate-500">Commissions managed externally</p>
              </div>
            </label>
            <label className={`flex-1 flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
              config.commissionMode === 'commission'
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-400'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
            }`}>
              <input
                type="radio"
                name="commissionMode"
                value="commission"
                checked={config.commissionMode === 'commission'}
                onChange={(e) => setConfig({ ...config, commissionMode: e.target.value })}
                className="sr-only"
              />
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Commission</p>
                <p className="text-xs text-slate-500">Automatic commission tracking</p>
              </div>
            </label>
          </div>
        </div>

        {/* Commission Details (visible when mode is "commission") */}
        {config.commissionMode === 'commission' && (
          <div className="space-y-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-700">
            {/* Fee Type */}
            <div>
              <Label>Fee Type</Label>
              <select
                value={config.feeType}
                onChange={(e) => setConfig({ ...config, feeType: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
              >
                <option value="fixed">Fixed (R per transaction)</option>
                <option value="percentage">Percentage (%)</option>
                <option value="volume">Volume-based</option>
              </select>
            </div>

            {/* Fee Value */}
            <div>
              <Label>
                {config.feeType === 'fixed' ? 'Fee Amount (R)' : config.feeType === 'percentage' ? 'Fee Percentage (%)' : 'Volume Fee (% of total volume)'}
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={config.feeValue}
                onChange={(e) => setConfig({ ...config, feeValue: e.target.value })}
                placeholder={config.feeType === 'fixed' ? '5.00' : config.feeType === 'percentage' ? '2.5' : '2.00'}
                className="mt-1"
              />
            </div>

            {/* VAT */}
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">VAT Enabled</p>
                <p className="text-xs text-slate-500">Apply VAT to commission fees</p>
              </div>
              <button
                type="button"
                onClick={() => setConfig({ ...config, vatEnabled: !config.vatEnabled })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  config.vatEnabled ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.vatEnabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {config.vatEnabled && (
              <div>
                <Label>VAT Rate (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={config.vatRate}
                  onChange={(e) => setConfig({ ...config, vatRate: e.target.value })}
                  placeholder="15"
                  className="mt-1"
                />
              </div>
            )}
          </div>
        )}

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="gap-2 bg-gradient-to-r from-amber-500 to-pink-600 text-white"
        >
          <Save className="w-4 h-4" />{saving ? 'Saving...' : 'Save Commission Config'}
        </Button>
      </div>
    </Card>
  );
}

/* ─── Invoices Tab ─── */
function InvoicesTab() {
  return (
    <Card className="p-12 text-center bg-white/80 dark:bg-slate-800/80 border-white/20 dark:border-slate-700/50">
      <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
      <p className="text-lg font-medium text-slate-700 dark:text-slate-300">Partner Invoices</p>
      <p className="text-slate-500 mt-1">Partner invoices will appear here once generated.</p>
    </Card>
  );
}

/* ─── Settings Tab ─── */
function SettingsTab({ partner, onUpdate }: { partner: Partner; onUpdate: () => void }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(partner.name || '');
  const [companyName, setCompanyName] = useState(partner.companyName || '');
  const [phone, setPhone] = useState(partner.phone || '');
  const [kycStatus, setKycStatus] = useState(partner.kycStatus || 'pending');
  const [isActive, setIsActive] = useState(partner.isActive);
  const [accountMode, setAccountMode] = useState(partner.accountMode || 'demo');
  const [deactivating, setDeactivating] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/partners/${partner.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, companyName, phone, kycStatus, isActive, accountMode }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Saved', description: 'Partner settings updated' });
        onUpdate();
      } else {
        toast({ title: 'Error', description: data.message || 'Failed to save', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to save settings', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleDeactivate = async () => {
    setDeactivating(true);
    try {
      const res = await fetch(`/api/admin/partners/${partner.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Deactivated', description: 'Partner has been deactivated' });
        onUpdate();
      } else {
        toast({ title: 'Error', description: data.message || 'Failed', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to deactivate partner', variant: 'destructive' });
    } finally { setDeactivating(false); }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Partner Info */}
      <Card className="p-6 bg-white/80 dark:bg-slate-800/80 border-white/20 dark:border-slate-700/50">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-purple-600" />Partner Information
        </h3>
        <div className="space-y-4">
          <div>
            <Label>Contact Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Company Name</Label>
            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={partner.email} disabled className="mt-1 opacity-60" />
            <p className="text-xs text-slate-500 mt-1">Email cannot be changed from here</p>
          </div>
        </div>
      </Card>

      {/* Account Controls */}
      <Card className="p-6 bg-white/80 dark:bg-slate-800/80 border-white/20 dark:border-slate-700/50">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-amber-600" />Account Controls
        </h3>
        <div className="space-y-4">
          <div>
            <Label>Account Status</Label>
            <select
              value={isActive ? 'active' : 'inactive'}
              onChange={(e) => setIsActive(e.target.value === 'active')}
              className="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div>
            <Label>KYC Status</Label>
            <select
              value={kycStatus}
              onChange={(e) => setKycStatus(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm"
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div>
            <Label>Account Mode</Label>
            <select
              value={accountMode}
              onChange={(e) => setAccountMode(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm"
            >
              <option value="demo">Demo (Test Transactions)</option>
              <option value="live">Live (Real Transactions)</option>
            </select>
            <p className="text-xs text-slate-500 mt-1">
              {accountMode === 'demo'
                ? 'Partner and their merchants can only create test transactions.'
                : 'Partner and their merchants process real EFT transactions.'}
            </p>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-gradient-to-r from-amber-500 to-pink-600 text-white gap-2"
          >
            <Save className="w-4 h-4" />{saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card className="p-6 bg-white/80 dark:bg-slate-800/80 border-white/20 dark:border-slate-700/50">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />Danger Zone
        </h3>
        <div className="p-4 border border-red-200 dark:border-red-800 rounded-lg bg-red-50/50 dark:bg-red-900/10">
          <p className="text-sm font-medium text-red-800 dark:text-red-400">Deactivate Partner</p>
          <p className="text-xs text-red-600 dark:text-red-500 mt-1">
            This will disable the partner&apos;s access to the platform. Their merchants will remain but won&apos;t be able to process new transactions.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 text-red-600 border-red-300 hover:bg-red-50"
            onClick={handleDeactivate}
            disabled={deactivating}
          >
            {deactivating ? 'Deactivating...' : 'Deactivate Partner'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
