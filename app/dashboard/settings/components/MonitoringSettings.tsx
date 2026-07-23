"use client";

import { useState, useEffect } from "react";
import { Mail, MessageSquare, Hash, Save, Loader2, Info, AlertTriangle, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MonitoringSettings() {
  const [autoDisableEnabled, setAutoDisableEnabled] = useState(false);
  const [alertEmails, setAlertEmails] = useState("");
  const [alertSmsNumbers, setAlertSmsNumbers] = useState("");
  const [alertSlackWebhookUrl, setAlertSlackWebhookUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings/platform")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setAutoDisableEnabled(data.settings.bank_auto_disable_enabled === "true");
          setAlertEmails(data.settings.alert_emails ?? "");
          setAlertSmsNumbers(data.settings.alert_sms_numbers ?? "");
          setAlertSlackWebhookUrl(data.settings.alert_slack_webhook_url ?? "");
        }
      })
      .catch(() => setError("Failed to load monitoring settings"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings/platform", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bank_auto_disable_enabled: autoDisableEnabled,
          alert_emails: alertEmails.trim(),
          alert_sms_numbers: alertSmsNumbers.trim(),
          alert_slack_webhook_url: alertSlackWebhookUrl.trim(),
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Save failed");
      setSavedAt(new Date());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 py-8">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading monitoring settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Auto-disable toggle */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800/50 p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Automatic Bank Disabling</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Take a bank offline automatically after 10 consecutive failed transactions. Off by default.
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={autoDisableEnabled}
            onClick={() => setAutoDisableEnabled((v) => !v)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
              autoDisableEnabled ? "bg-green-600" : "bg-slate-300 dark:bg-slate-600"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                autoDisableEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex gap-3">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
          <p className="font-medium">How it works</p>
          <ul className="list-disc list-inside space-y-0.5 text-blue-700 dark:text-blue-400/80">
            <li>Only active when Automatic Bank Disabling is switched on (it is off by default).</li>
            <li>After every transaction, the system checks the last 10 outcomes for that bank.</li>
            <li>If all 10 are non-successful, the bank is auto-disabled and alerts are sent.</li>
            <li>A 2-hour cooldown prevents duplicate alert spam per bank.</li>
            <li>When an admin re-enables a bank, recovery notifications are sent automatically.</li>
          </ul>
        </div>
      </div>

      {/* Alert Channels */}
      {[
        {
          icon: Mail,
          iconBg: "from-green-600 to-green-700",
          title: "Email Alerts",
          subtitle: "Comma-separated list of recipient email addresses",
          value: alertEmails,
          setter: setAlertEmails,
          placeholder: "admin@example.com, ops@example.com",
          rows: 3,
          hint: "Requires SMTP configuration in environment variables (SMTP_HOST, SMTP_USER, SMTP_PASS).",
        },
        {
          icon: MessageSquare,
          iconBg: "from-blue-500 to-indigo-600",
          title: "SMS Alerts (Twilio)",
          subtitle: "Comma-separated E.164 numbers, e.g. +27821234567",
          value: alertSmsNumbers,
          setter: setAlertSmsNumbers,
          placeholder: "+27821234567, +27831234567",
          rows: 2,
          hint: "Requires Twilio credentials: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER.",
        },
        {
          icon: Hash,
          iconBg: "from-violet-500 to-purple-600",
          title: "Slack Webhook",
          subtitle: "Incoming Webhook URL from your Slack app configuration",
          value: alertSlackWebhookUrl,
          setter: setAlertSlackWebhookUrl,
          placeholder: "https://hooks.slack.com/services/...",
          rows: 1,
          hint: "Create an Incoming Webhook in your Slack workspace app settings and paste the URL here.",
        },
      ].map(({ icon: Icon, iconBg, title, subtitle, value, setter, placeholder, rows, hint }) => (
        <div key={title} className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800/50 overflow-hidden">
          <div className="p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${iconBg} flex items-center justify-center text-white`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
              </div>
            </div>
            {rows > 1 ? (
              <textarea
                value={value}
                onChange={(e) => setter(e.target.value)}
                placeholder={placeholder}
                rows={rows}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent font-mono resize-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600"
              />
            ) : (
              <input
                type="url"
                value={value}
                onChange={(e) => setter(e.target.value)}
                placeholder={placeholder}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent font-mono bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600"
              />
            )}
            <p className="text-xs text-slate-400 dark:text-slate-500">{hint}</p>
          </div>
        </div>
      ))}

      {/* No channels warning */}
      {autoDisableEnabled && !alertEmails.trim() && !alertSmsNumbers.trim() && !alertSlackWebhookUrl.trim() && (
        <div className="flex items-start gap-2 text-green-800 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p className="text-sm">
            No alert channels configured. Bank failures will still auto-disable the bank, but no
            notifications will be sent.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      {/* Save */}
      <div className="flex items-center justify-between">
        {savedAt ? (
          <p className="text-xs text-emerald-600 dark:text-emerald-400">
            Saved at {savedAt.toLocaleTimeString()}
          </p>
        ) : (
          <span />
        )}
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving}
          className="bg-gradient-to-r from-green-700 to-green-500 hover:from-green-800 hover:to-green-600 text-white border-0"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          {saving ? "Saving..." : "Save Monitoring Settings"}
        </Button>
      </div>
    </div>
  );
}
