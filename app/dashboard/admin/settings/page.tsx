'use client';

import { useState, useEffect } from 'react';
import { Save, Globe, Plus, X, AlertCircle, CheckCircle, Shield, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

function isValidDomain(value: string): boolean {
  // Accept domains like example.com, *.example.com, https://example.com
  const cleaned = value.replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();
  if (!cleaned) return false;
  // Allow wildcard prefix
  const domain = cleaned.startsWith('*.') ? cleaned.slice(2) : cleaned;
  return /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/.test(domain);
}

function normalizeDomain(value: string): string {
  // Strip protocol and path, keep domain (with optional wildcard)
  let cleaned = value.replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim().toLowerCase();
  return cleaned;
}

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Iframe domains
  const [domains, setDomains] = useState<string[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [domainError, setDomainError] = useState('');

  // T&C settings
  const [tcEnabled, setTcEnabled] = useState(false);
  const [tcTitle, setTcTitle] = useState('');
  const [tcContent, setTcContent] = useState('');

  // Alert settings
  const [alertEmails, setAlertEmails] = useState('');
  const [alertSmsNumbers, setAlertSmsNumbers] = useState('');
  const [alertSlackWebhook, setAlertSlackWebhook] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings/platform');
      const data = await res.json();
      if (data.success) {
        const s = data.settings;
        setTcEnabled(s.eft_tc_enabled === 'true');
        setTcTitle(s.eft_tc_title || '');
        setTcContent(s.eft_tc_content || '');
        setAlertEmails(s.alert_emails || '');
        setAlertSmsNumbers(s.alert_sms_numbers || '');
        setAlertSlackWebhook(s.alert_slack_webhook_url || '');
        const raw = s.allowed_iframe_domains || '';
        setDomains(raw.split(',').map((d: string) => d.trim()).filter(Boolean));
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load settings', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddDomain = () => {
    setDomainError('');
    const normalized = normalizeDomain(newDomain);
    if (!normalized) return;
    if (!isValidDomain(normalized)) {
      setDomainError('Invalid domain format. Use: example.com or *.example.com');
      return;
    }
    if (domains.includes(normalized)) {
      setDomainError('This domain is already in the list');
      return;
    }
    setDomains([...domains, normalized]);
    setNewDomain('');
  };

  const handleRemoveDomain = (domain: string) => {
    setDomains(domains.filter(d => d !== domain));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings/platform', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eft_tc_enabled: tcEnabled,
          eft_tc_title: tcTitle,
          eft_tc_content: tcContent,
          alert_emails: alertEmails,
          alert_sms_numbers: alertSmsNumbers,
          alert_slack_webhook_url: alertSlackWebhook,
          allowed_iframe_domains: domains.join(','),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Settings saved', description: 'Platform settings have been updated.' });
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to save', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to save settings', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Platform Settings</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">Manage global platform configuration</p>
      </div>

      {/* Iframe Domain Whitelist */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
            <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Iframe Domain Whitelist</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Domains allowed to embed the payment page in an iframe. Changes take effect within 60 seconds.
            </p>
          </div>
        </div>

        {/* Current domains */}
        <div className="space-y-2 mb-4">
          {domains.length === 0 ? (
            <div className="text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-lg p-4 text-center">
              No domains configured — payment page allows embedding from any origin.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {domains.map(domain => (
                <span
                  key={domain}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium border border-blue-200 dark:border-blue-800"
                >
                  <Globe className="w-3.5 h-3.5" />
                  {domain}
                  <button
                    onClick={() => handleRemoveDomain(domain)}
                    className="ml-1 hover:text-red-500 transition-colors"
                    title="Remove domain"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Add domain */}
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              placeholder="example.com or *.partner.com"
              value={newDomain}
              onChange={e => { setNewDomain(e.target.value); setDomainError(''); }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddDomain(); } }}
            />
          </div>
          <Button onClick={handleAddDomain} variant="outline" className="shrink-0">
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        </div>
        {domainError && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" /> {domainError}
          </p>
        )}
        <p className="mt-2 text-xs text-slate-400">
          Use <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">*.example.com</code> to allow all subdomains.
          When no domains are configured, embedding is allowed from any origin.
        </p>
      </Card>

      {/* Terms & Conditions */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-amber-500 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Terms & Conditions</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Global T&C content shown on payment pages (when enabled per merchant)
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="tc-enabled" className="font-medium">Enable T&C globally</Label>
            <button
              id="tc-enabled"
              role="switch"
              aria-checked={tcEnabled}
              onClick={() => setTcEnabled(!tcEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                tcEnabled ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                tcEnabled ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tc-title">Title</Label>
            <Input
              id="tc-title"
              placeholder="Terms & Conditions"
              value={tcTitle}
              onChange={e => setTcTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tc-content">Content (Markdown supported)</Label>
            <textarea
              id="tc-content"
              className="w-full min-h-[200px] rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-mono"
              placeholder="# Terms&#10;&#10;**Bold text**, *italic text*, - list items"
              value={tcContent}
              onChange={e => setTcContent(e.target.value)}
            />
            <p className="text-xs text-slate-400">
              Supports: <code># heading</code>, <code>**bold**</code>, <code>*italic*</code>, <code>- list items</code>
            </p>
          </div>
        </div>
      </Card>

      {/* Alert Settings */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Alert Notifications</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Configure where to send system alerts and notifications
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="alert-emails">Alert Email Addresses</Label>
            <Input
              id="alert-emails"
              placeholder="admin@example.com, ops@example.com"
              value={alertEmails}
              onChange={e => setAlertEmails(e.target.value)}
            />
            <p className="text-xs text-slate-400">Comma-separated email addresses</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="alert-sms">Alert SMS Numbers</Label>
            <Input
              id="alert-sms"
              placeholder="+27821234567, +27831234567"
              value={alertSmsNumbers}
              onChange={e => setAlertSmsNumbers(e.target.value)}
            />
            <p className="text-xs text-slate-400">Comma-separated phone numbers</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="alert-slack">Slack Webhook URL</Label>
            <Input
              id="alert-slack"
              type="url"
              placeholder="https://hooks.slack.com/services/..."
              value={alertSlackWebhook}
              onChange={e => setAlertSlackWebhook(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-amber-500 hover:bg-amber-600 text-white px-8"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save All Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
