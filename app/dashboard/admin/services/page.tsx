"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Building2, CreditCard, QrCode, Ticket, Coins, Wallet,
  Settings2, RefreshCw, Plus, Shield, Globe, Loader2,
  CheckCircle, XCircle, Eye, EyeOff, X, ExternalLink,
  ChevronRight, Zap, ToggleLeft, ToggleRight, Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface PaymentService {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string;
  provider: string;
  providerConfig: Record<string, any> | null;
  icon: string | null;
  isActive: boolean;
  requiresSetup: boolean;
  displayOrder: number;
  metadata: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

const CATEGORY_META: Record<string, { label: string; icon: any; color: string }> = {
  eft: { label: "EFT", icon: Building2, color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400" },
  card: { label: "Card", icon: CreditCard, color: "text-violet-600 bg-violet-50 dark:bg-violet-900/20 dark:text-violet-400" },
  qr: { label: "QR", icon: QrCode, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400" },
  voucher: { label: "Voucher", icon: Ticket, color: "text-green-700 bg-green-50 dark:bg-green-900/20 dark:text-green-400" },
  crypto: { label: "Crypto", icon: Coins, color: "text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400" },
  wallet: { label: "Wallet", icon: Wallet, color: "text-green-500 bg-emerald-50 dark:bg-emerald-900/20 dark:text-green-400" },
};

const PROVIDER_LABEL: Record<string, string> = {
  internal: "YetoPay Direct",
  callpay: "CallPay",
};

export default function AdminServicesPage() {
  const { toast } = useToast();
  const [services, setServices] = useState<PaymentService[]>([]);
  const [loading, setLoading] = useState(true);
  const [configuring, setConfiguring] = useState<PaymentService | null>(null);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/services");
      const data = await res.json();
      if (data.success) setServices(data.data || []);
    } catch {
      toast({ title: "Error", description: "Failed to load services", variant: "destructive" });
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { fetchServices(); }, [fetchServices]);

  const toggleService = async (service: PaymentService) => {
    if (!service.isActive && service.requiresSetup && service.provider !== "internal") {
      const config = service.providerConfig || {};
      if (!config.orgId || !config.salt) {
        toast({
          title: "Configuration required",
          description: "Please configure provider credentials before enabling this service.",
          variant: "destructive",
        });
        setConfiguring(service);
        return;
      }
    }

    try {
      const res = await fetch(`/api/admin/services/${service.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !service.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        setServices((prev) =>
          prev.map((s) => (s.id === service.id ? { ...s, isActive: !s.isActive } : s))
        );
        toast({
          title: !service.isActive ? "Service enabled" : "Service disabled",
          description: `${service.name} is now ${!service.isActive ? "active" : "inactive"}`,
        });
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update service", variant: "destructive" });
    }
  };

  const getCategoryMeta = (category: string) =>
    CATEGORY_META[category] || { label: category, icon: Zap, color: "text-slate-600 bg-slate-50" };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Payment Services</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage payment methods available to merchants</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchServices} className="gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" />Refresh
        </Button>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
        <div className="flex gap-3">
          <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-300">
            <p className="font-medium">Service Management</p>
            <p className="mt-1">
              Enable or disable payment methods globally. Merchants can only use services you activate here.
              External providers (like CallPay) require API credentials to be configured before activation.
            </p>
          </div>
        </div>
      </div>

      {/* Services Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="h-3 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : services.length === 0 ? (
        <div className="text-center py-16">
          <Zap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No services configured</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services.map((service) => {
            const cat = getCategoryMeta(service.category);
            const CatIcon = cat.icon;
            const providerLabel = PROVIDER_LABEL[service.provider] || service.provider;
            const config = service.providerConfig || {};
            const isConfigured = service.provider === "internal" || (config.orgId && config.salt);

            return (
              <div
                key={service.id}
                className={`relative bg-white dark:bg-slate-800/80 border rounded-xl overflow-hidden transition-all ${
                  service.isActive
                    ? "border-emerald-200 dark:border-emerald-800 shadow-sm"
                    : "border-slate-200 dark:border-slate-700"
                }`}
              >
                {/* Status indicator strip */}
                <div className={`absolute top-0 left-0 right-0 h-1 ${service.isActive ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"}`} />

                <div className="p-5">
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${cat.color}`}>
                        <CatIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">{service.name}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-slate-500">{providerLabel}</span>
                          <span className="text-slate-300 dark:text-slate-600">·</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${cat.color}`}>{cat.label}</span>
                        </div>
                      </div>
                    </div>

                    {/* Toggle */}
                    <button
                      onClick={() => toggleService(service)}
                      className={`shrink-0 relative w-12 h-7 rounded-full transition-colors ${
                        service.isActive
                          ? "bg-emerald-500"
                          : "bg-slate-300 dark:bg-slate-600"
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                          service.isActive ? "left-6" : "left-1"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Description */}
                  {service.description && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">{service.description}</p>
                  )}

                  {/* Status pills */}
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      service.isActive
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                    }`}>
                      {service.isActive ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {service.isActive ? "Active" : "Inactive"}
                    </span>

                    {service.provider !== "internal" && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        isConfigured
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                          : "bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                      }`}>
                        {isConfigured ? <CheckCircle className="w-3 h-3" /> : <Settings2 className="w-3 h-3" />}
                        {isConfigured ? "Configured" : "Setup Required"}
                      </span>
                    )}

                    <span className="text-[11px] text-slate-400 font-mono">{service.code}</span>
                  </div>

                  {/* Configure button for external providers */}
                  {service.provider !== "internal" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConfiguring(service)}
                      className="w-full gap-1.5"
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                      Configure {providerLabel}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Provider Configuration Modal */}
      {configuring && (
        <ProviderConfigModal
          service={configuring}
          onClose={() => setConfiguring(null)}
          onSaved={(updated) => {
            setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
            setConfiguring(null);
          }}
          toast={toast}
        />
      )}
    </div>
  );
}

function ProviderConfigModal({
  service,
  onClose,
  onSaved,
  toast,
}: {
  service: PaymentService;
  onClose: () => void;
  onSaved: (updated: PaymentService) => void;
  toast: any;
}) {
  const config = (service.providerConfig || {}) as Record<string, any>;
  const [orgId, setOrgId] = useState(config.orgId || "");
  const [salt, setSalt] = useState(config.salt || "");
  const [apiUrl, setApiUrl] = useState(config.apiUrl || "https://services.callpay.com/api/v2");
  const [showSalt, setShowSalt] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const handleSave = async () => {
    if (!orgId.trim() || !salt.trim()) {
      toast({ title: "Missing fields", description: "Organisation ID and Salt are required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/services/${service.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerConfig: {
            orgId: orgId.trim(),
            salt: salt.trim(),
            apiUrl: apiUrl.trim(),
            webhookIps: ["54.72.191.28", "54.194.139.201"],
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Saved", description: "Provider credentials updated" });
        onSaved(data.data);
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to save", variant: "destructive" });
    }
    setSaving(false);
  };

  const handleTestConnection = async () => {
    if (!orgId.trim() || !salt.trim()) {
      setTestResult({ ok: false, msg: "Organisation ID and Salt are required" });
      return;
    }
    setTesting(true);
    setTestResult(null);

    // Simple validation — check format, no actual API call yet
    const orgIdValid = /^\d+$/.test(orgId.trim());
    const saltValid = salt.trim().length >= 8;

    if (!orgIdValid) {
      setTestResult({ ok: false, msg: "Organisation ID should be numeric" });
    } else if (!saltValid) {
      setTestResult({ ok: false, msg: "Salt seems too short (expected 8+ characters)" });
    } else {
      setTestResult({ ok: true, msg: "Credentials format looks valid. Save and enable the service to start processing." });
    }
    setTesting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Configure {service.name}</h2>
            <p className="text-xs text-slate-500 mt-0.5">Provider: {PROVIDER_LABEL[service.provider] || service.provider}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              API Base URL
            </label>
            <Input
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://services.callpay.com/api/v2"
              className="bg-slate-50 dark:bg-slate-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Organisation ID
            </label>
            <Input
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              placeholder="e.g. 123"
              className="bg-slate-50 dark:bg-slate-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              API Salt
            </label>
            <div className="relative">
              <Input
                type={showSalt ? "text" : "password"}
                value={salt}
                onChange={(e) => setSalt(e.target.value)}
                placeholder="Your CallPay API salt"
                className="bg-slate-50 dark:bg-slate-900 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowSalt(!showSalt)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showSalt ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Webhook IPs info */}
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 text-xs text-slate-500 dark:text-slate-400">
            <p className="font-medium text-slate-700 dark:text-slate-300 mb-1">Webhook IPs (auto-configured)</p>
            <code>54.72.191.28</code>, <code>54.194.139.201</code>
          </div>

          {/* Test result */}
          {testResult && (
            <div className={`rounded-lg p-3 text-sm ${
              testResult.ok
                ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"
            }`}>
              <div className="flex items-center gap-2">
                {testResult.ok ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                {testResult.msg}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/50">
          <Button variant="outline" size="sm" onClick={handleTestConnection} disabled={testing} className="gap-1.5">
            {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
            Test
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5 bg-green-500 hover:bg-green-700 text-white">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save Credentials
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
