"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExternalLink, Info, CheckCircle, XCircle, Ban, Bell, LayoutTemplate, Layers, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";

export function EftUrlSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [notifyUrl, setNotifyUrl] = useState("");
  const [successUrl, setSuccessUrl] = useState("");
  const [failureUrl, setFailureUrl] = useState("");
  const [cancelledUrl, setCancelledUrl] = useState("");
  const [paymentLayout, setPaymentLayout] = useState<"full" | "banks_plain">("full");
  const [plainShowCancel, setPlainShowCancel] = useState(true);
  const [plainShowTerms, setPlainShowTerms] = useState(false);
  const [plainBackground, setPlainBackground] = useState("#ffffff");

  useEffect(() => {
    fetch("/api/merchant/settings")
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data.eftSettings) {
          const eft = data.data.eftSettings;
          setNotifyUrl(eft.notifyUrl || "");
          setSuccessUrl(eft.successUrl || "");
          setFailureUrl(eft.failureUrl || "");
          setCancelledUrl(eft.cancelledUrl || "");
          setPaymentLayout(eft.paymentLayout === "banks_plain" ? "banks_plain" : "full");
          setPlainShowCancel(eft.plainShowCancel !== false);
          setPlainShowTerms(eft.plainShowTerms === true);
          setPlainBackground(eft.plainBackground || "#ffffff");
        }
      })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/merchant/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eftSettings: {
            notifyUrl, successUrl, failureUrl, cancelledUrl,
            paymentLayout, plainShowCancel, plainShowTerms, plainBackground,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Saved", description: "Payment page settings updated successfully." });
      } else {
        toast({ title: "Error", description: data.error || "Failed to save", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to save settings", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="space-y-6">
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800/50 p-6">
          <div className="space-y-2 mb-6">
            <div className="h-5 w-36 bg-slate-200 dark:bg-slate-700 animate-pulse rounded" />
            <div className="h-4 w-80 bg-slate-100 dark:bg-slate-700/50 animate-pulse rounded" />
          </div>
          <div className="space-y-5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 animate-pulse rounded" />
                <div className="h-10 w-full bg-slate-100 dark:bg-slate-700/50 animate-pulse rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const urlFields = [
    {
      id: "notifyUrl",
      label: "Notify URL",
      value: notifyUrl,
      setter: setNotifyUrl,
      placeholder: "https://your-website.com/api/eft/notify",
      description: "Receives a POST with transaction status updates. Used if set per-transaction or as a default fallback.",
      icon: Bell,
      iconBg: "from-violet-500 to-purple-600",
    },
    {
      id: "successUrl",
      label: "Success Redirect URL",
      value: successUrl,
      setter: setSuccessUrl,
      placeholder: "https://your-website.com/payment/success",
      description: "Customer is redirected here after a successful payment.",
      icon: CheckCircle,
      iconBg: "from-emerald-500 to-teal-600",
    },
    {
      id: "failureUrl",
      label: "Failure Redirect URL",
      value: failureUrl,
      setter: setFailureUrl,
      placeholder: "https://your-website.com/payment/failed",
      description: "Customer is redirected here if the payment fails.",
      icon: XCircle,
      iconBg: "from-red-500 to-rose-600",
    },
    {
      id: "cancelledUrl",
      label: "Cancelled Redirect URL",
      value: cancelledUrl,
      setter: setCancelledUrl,
      placeholder: "https://your-website.com/payment/cancelled",
      description: "Customer is redirected here if they cancel the payment.",
      icon: Ban,
      iconBg: "from-green-600 to-green-700",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Payment Page Layout */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800/50 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white">
              <LayoutTemplate className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Payment Page Layout</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">How the payment page looks for your customers</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPaymentLayout("full")}
              className={`relative p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
                paymentLayout === "full"
                  ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                  : "border-slate-200 dark:border-slate-600 hover:border-slate-300"
              }`}
            >
              {paymentLayout === "full" && (
                <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-green-600 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </span>
              )}
              <div className="flex items-center gap-2 mb-1">
                <Layers className={`w-4 h-4 ${paymentLayout === "full" ? "text-green-600" : "text-slate-400"}`} />
                <span className="font-medium text-sm text-slate-900 dark:text-white">Full Layout</span>
              </div>
              <p className="text-xs text-slate-500">
                The complete payment page: header brand, merchant card with amount and reference, steps, and payment flow.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setPaymentLayout("banks_plain")}
              className={`relative p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
                paymentLayout === "banks_plain"
                  ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                  : "border-slate-200 dark:border-slate-600 hover:border-slate-300"
              }`}
            >
              {paymentLayout === "banks_plain" && (
                <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-green-600 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </span>
              )}
              <div className="flex items-center gap-2 mb-1">
                <LayoutTemplate className={`w-4 h-4 ${paymentLayout === "banks_plain" ? "text-green-600" : "text-slate-400"}`} />
                <span className="font-medium text-sm text-slate-900 dark:text-white">Banks Plain (Embed)</span>
              </div>
              <p className="text-xs text-slate-500">
                Minimal theme for iframes: no branding, no amount card — just the steps and bank flow with tight padding. Ideal when your platform already shows the payment details.
              </p>
            </button>
          </div>

          {paymentLayout === "banks_plain" && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-600 p-4 space-y-4 bg-slate-50/50 dark:bg-slate-800/30">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Embed Options</p>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Show cancel button</p>
                  <p className="text-xs text-slate-500">Let customers cancel the payment from inside the embed</p>
                </div>
                <Switch checked={plainShowCancel} onCheckedChange={setPlainShowCancel} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Show terms &amp; conditions</p>
                  <p className="text-xs text-slate-500">Ask customers to accept T&amp;Cs before paying</p>
                </div>
                <Switch checked={plainShowTerms} onCheckedChange={setPlainShowTerms} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Background color</p>
                  <p className="text-xs text-slate-500">Match your platform&apos;s background (default white)</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={plainBackground}
                    onChange={(e) => setPlainBackground(e.target.value)}
                    className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-600 cursor-pointer bg-transparent"
                  />
                  <Input
                    value={plainBackground}
                    onChange={(e) => setPlainBackground(e.target.value)}
                    className="w-28 font-mono text-sm"
                    maxLength={7}
                  />
                </div>
              </div>
            </div>
          )}

          <p className="text-xs text-slate-400">
            Partners: this layout applies to the payment pages of all your connector merchants.
          </p>
        </div>
      </div>

      <div className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800/50 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white">
              <ExternalLink className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Default Redirect URLs</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Configure where customers are sent after payment</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {urlFields.map((field) => {
            const Icon = field.icon;
            return (
              <div key={field.id} className="space-y-2">
                <Label htmlFor={field.id} className="flex items-center gap-2 text-slate-700 dark:text-slate-300 text-sm">
                  <div className={`w-5 h-5 rounded bg-gradient-to-br ${field.iconBg} flex items-center justify-center text-white`}>
                    <Icon className="w-3 h-3" />
                  </div>
                  {field.label}
                </Label>
                <Input
                  id={field.id}
                  type="url"
                  placeholder={field.placeholder}
                  value={field.value}
                  onChange={(e) => field.setter(e.target.value)}
                />
                <p className="text-xs text-slate-400 dark:text-slate-500">{field.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex gap-3">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800 dark:text-blue-300">
          <p className="font-medium mb-1">How these URLs work</p>
          <p className="text-blue-700 dark:text-blue-400/80">
            When creating a payment link via the API, you can pass these URLs per-transaction. If not provided,
            these default URLs will be used. The <strong>Notify URL</strong> receives
            server-to-server POST callbacks. For event-based webhooks, use the <strong>Webhooks</strong> section instead.
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button size="sm" onClick={handleSave} disabled={loading} className="bg-gradient-to-r from-green-700 to-green-500 hover:from-green-800 hover:to-green-600 text-white border-0">
          {loading ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
