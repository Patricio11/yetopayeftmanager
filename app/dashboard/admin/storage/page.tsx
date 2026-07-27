'use client';

import { useState, useEffect, useCallback } from 'react';
import { HardDrive, CheckCircle, XCircle, Loader2, Save, Zap, Power, AlertTriangle, Cloud, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

const SECRET_MASK = '••••••••';

interface CredentialField {
  key: string;
  label: string;
  secret: boolean;
  placeholder?: string;
  optional?: boolean;
  hint?: string;
}
interface ProviderDef {
  key: string;
  label: string;
  description: string;
  writeSupported: boolean;
  credentialFields: CredentialField[];
}
interface ProviderConfigState {
  provider: string;
  config: Record<string, string>; // masked
  isActive: boolean;
  lastTestOk: boolean | null;
  lastTestMessage: string | null;
  lastTestedAt: string | null;
}

const PROVIDER_ICON: Record<string, typeof Cloud> = {
  s3: Cloud,
  supabase: Database,
  postgres: Database,
};

export default function AdminStoragePage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<ProviderDef[]>([]);
  const [configs, setConfigs] = useState<Record<string, ProviderConfigState>>({});
  const [activeProvider, setActiveProvider] = useState<string | null>(null);

  const [selected, setSelected] = useState<string>('s3');
  // Draft field values per provider. Secret fields start blank ("leave blank to keep").
  const [draft, setDraft] = useState<Record<string, Record<string, string>>>({});
  const [busy, setBusy] = useState<'' | 'save' | 'test' | 'activate'>('');
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/storage');
      const j = await res.json();
      if (!j.success) throw new Error(j.message || 'Failed to load');
      setProviders(j.providers);
      const byKey: Record<string, ProviderConfigState> = {};
      const initDraft: Record<string, Record<string, string>> = {};
      for (const c of j.configs as ProviderConfigState[]) {
        byKey[c.provider] = c;
        const def = (j.providers as ProviderDef[]).find((p) => p.key === c.provider)!;
        // Prefill non-secret fields; leave secrets blank (they show a "saved" hint).
        const d: Record<string, string> = {};
        for (const f of def.credentialFields) {
          if (!f.secret) d[f.key] = c.config[f.key] || '';
          else d[f.key] = '';
        }
        initDraft[c.provider] = d;
      }
      setConfigs(byKey);
      setDraft(initDraft);
      setActiveProvider(j.activeProvider);
      if (j.activeProvider) setSelected(j.activeProvider);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to load storage config', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const def = providers.find((p) => p.key === selected);
  const state = configs[selected];

  const setField = (key: string, value: string) => {
    setDraft((prev) => ({ ...prev, [selected]: { ...(prev[selected] || {}), [key]: value } }));
    setTestResult(null);
  };

  const secretIsSaved = (fieldKey: string) => state?.config?.[fieldKey] === SECRET_MASK;

  const save = async () => {
    setBusy('save');
    try {
      const res = await fetch('/api/admin/storage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: selected, config: draft[selected] || {} }),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.message || 'Save failed');
      toast({ title: 'Saved', description: `${def?.label} configuration saved.` });
      await load();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setBusy('');
    }
  };

  const test = async () => {
    setBusy('test');
    setTestResult(null);
    try {
      const res = await fetch('/api/admin/storage/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: selected, config: draft[selected] || {} }),
      });
      const j = await res.json();
      setTestResult({ ok: !!j.ok, message: j.message || (j.ok ? 'OK' : 'Failed') });
      if (j.ok) toast({ title: 'Connection OK', description: j.message });
      else toast({ title: 'Connection failed', description: j.message, variant: 'destructive' });
    } catch (e: any) {
      setTestResult({ ok: false, message: e.message });
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setBusy('');
    }
  };

  const activate = async () => {
    setBusy('activate');
    try {
      const res = await fetch('/api/admin/storage/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: selected }),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.message || 'Activate failed');
      toast({
        title: 'Activated',
        description: j.writeSupported
          ? j.message
          : `${j.message} Note: the EFT service can't write to this provider yet.`,
      });
      await load();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setBusy('');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-500 p-8">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Loading storage configuration…</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center">
          <HardDrive className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Storage</h1>
          <p className="text-sm text-slate-500">
            Where EFT transaction logs & screenshots are stored and read from in the audit view.
          </p>
        </div>
      </div>

      {/* Active provider banner */}
      <Card className="p-4 flex items-center gap-3 border-slate-100">
        <Power className={`w-5 h-5 ${activeProvider ? 'text-green-600' : 'text-slate-400'}`} />
        <div className="text-sm">
          <span className="text-slate-500">Active provider: </span>
          {activeProvider ? (
            <span className="font-semibold text-slate-900">
              {providers.find((p) => p.key === activeProvider)?.label}
            </span>
          ) : (
            <span className="font-medium text-amber-600">None — falling back to environment variables</span>
          )}
        </div>
      </Card>

      {/* Provider selector */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {providers.map((p) => {
          const Icon = PROVIDER_ICON[p.key] || HardDrive;
          const isSel = selected === p.key;
          const isActive = activeProvider === p.key;
          return (
            <button
              key={p.key}
              onClick={() => { setSelected(p.key); setTestResult(null); }}
              className={`text-left p-4 rounded-xl border transition-colors ${
                isSel ? 'border-green-500 bg-green-50/50 ring-1 ring-green-500' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <Icon className={`w-5 h-5 ${isSel ? 'text-green-600' : 'text-slate-500'}`} />
                {isActive && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-100 text-green-700">Active</span>
                )}
              </div>
              <p className="mt-2 font-medium text-slate-900">{p.label}</p>
            </button>
          );
        })}
      </div>

      {/* Selected provider config */}
      {def && (
        <Card className="p-6 space-y-5">
          <div>
            <h2 className="font-semibold text-slate-900">{def.label}</h2>
            <p className="text-sm text-slate-500 mt-0.5">{def.description}</p>
          </div>

          {!def.writeSupported && (
            <div className="flex items-start gap-2 text-sm bg-amber-50 text-amber-800 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                The EFT service can't yet <strong>write</strong> to this provider — activating it will make the audit
                view read from here, but new artifacts won't be stored until write support is wired.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {def.credentialFields.map((f) => (
              <div key={f.key} className={f.hint ? 'sm:col-span-2' : ''}>
                <Label htmlFor={f.key} className="text-sm">
                  {f.label}
                  {f.optional && <span className="text-slate-400 font-normal"> (optional)</span>}
                </Label>
                <Input
                  id={f.key}
                  type={f.secret ? 'password' : 'text'}
                  value={draft[selected]?.[f.key] ?? ''}
                  onChange={(e) => setField(f.key, e.target.value)}
                  placeholder={f.secret && secretIsSaved(f.key) ? 'saved · leave blank to keep' : f.placeholder}
                  autoComplete="off"
                  className="mt-1"
                />
                {f.hint && <p className="text-xs text-slate-400 mt-1">{f.hint}</p>}
              </div>
            ))}
          </div>

          {/* Test result */}
          {testResult && (
            <div
              className={`flex items-start gap-2 text-sm rounded-lg p-3 ${
                testResult.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'
              }`}
            >
              {testResult.ok ? <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" /> : <XCircle className="w-4 h-4 mt-0.5 shrink-0" />}
              <span>{testResult.message}</span>
            </div>
          )}
          {!testResult && state?.lastTestMessage && (
            <div className="text-xs text-slate-400">
              Last test: {state.lastTestOk ? '✓' : '✗'} {state.lastTestMessage}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button variant="outline" onClick={test} disabled={busy !== ''}>
              {busy === 'test' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
              Test connection
            </Button>
            <Button variant="outline" onClick={save} disabled={busy !== ''}>
              {busy === 'save' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save
            </Button>
            <Button
              onClick={activate}
              disabled={busy !== '' || activeProvider === selected}
              className="bg-green-600 hover:bg-green-700"
            >
              {busy === 'activate' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Power className="w-4 h-4 mr-2" />}
              {activeProvider === selected ? 'Active' : 'Activate'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
