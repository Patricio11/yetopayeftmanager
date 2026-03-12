"use client";

import { useState, useEffect } from "react";
import { Mail, MessageSquare, Hash, Save, Loader2, Info, AlertTriangle } from "lucide-react";

export function MonitoringSettings() {
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
      <div className="flex items-center gap-2 text-gray-500 py-8">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading monitoring settings…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-base font-semibold text-gray-900">Bank Health Monitoring</h3>
        <p className="text-sm text-gray-500 mt-1">
          Configure alert destinations for automatic bank failure notifications.
          Alerts are sent when a bank records{" "}
          <strong>10 consecutive failed transactions</strong> and the bank is
          automatically disabled.
        </p>
      </div>

      {/* How it works */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
        <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800 space-y-1">
          <p className="font-medium">How it works</p>
          <ul className="list-disc list-inside space-y-0.5 text-blue-700">
            <li>After every transaction finalises, the system checks the last 10 outcomes for that bank.</li>
            <li>If all 10 are non-successful, the bank is auto-disabled and alerts are sent.</li>
            <li>A 2-hour cooldown prevents duplicate alert spam per bank.</li>
            <li>When an admin re-enables a bank, recovery notifications are sent automatically.</li>
          </ul>
        </div>
      </div>

      {/* Alert Emails */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
            <Mail className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Email Alerts</p>
            <p className="text-xs text-gray-500">Comma-separated list of recipient email addresses</p>
          </div>
        </div>
        <textarea
          value={alertEmails}
          onChange={(e) => setAlertEmails(e.target.value)}
          placeholder="admin@example.com, ops@example.com"
          rows={3}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent font-mono resize-none"
        />
        <p className="text-xs text-gray-400">
          Requires SMTP configuration in environment variables (SMTP_HOST, SMTP_USER, SMTP_PASS).
        </p>
      </div>

      {/* SMS Numbers */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-blue-700" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">SMS Alerts (Twilio)</p>
            <p className="text-xs text-gray-500">Comma-separated E.164 numbers, e.g. +27821234567</p>
          </div>
        </div>
        <textarea
          value={alertSmsNumbers}
          onChange={(e) => setAlertSmsNumbers(e.target.value)}
          placeholder="+27821234567, +27831234567"
          rows={2}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent font-mono resize-none"
        />
        <p className="text-xs text-gray-400">
          Requires Twilio credentials: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER.
        </p>
      </div>

      {/* Slack Webhook */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
            <Hash className="w-4 h-4 text-purple-700" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Slack Webhook</p>
            <p className="text-xs text-gray-500">Incoming Webhook URL from your Slack app configuration</p>
          </div>
        </div>
        <input
          type="url"
          value={alertSlackWebhookUrl}
          onChange={(e) => setAlertSlackWebhookUrl(e.target.value)}
          placeholder="https://hooks.slack.com/services/..."
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent font-mono"
        />
        <p className="text-xs text-gray-400">
          Create an Incoming Webhook in your Slack workspace app settings and paste the URL here.
        </p>
      </div>

      {/* No channels warning */}
      {!alertEmails.trim() && !alertSmsNumbers.trim() && !alertSlackWebhookUrl.trim() && (
        <div className="flex items-start gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p className="text-sm">
            No alert channels configured. Bank failures will still auto-disable the bank, but no
            notifications will be sent.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Save */}
      <div className="flex items-center justify-between pt-2">
        {savedAt ? (
          <p className="text-xs text-amber-500">
            Saved at {savedAt.toLocaleTimeString()}
          </p>
        ) : (
          <span />
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? "Saving…" : "Save Monitoring Settings"}
        </button>
      </div>
    </div>
  );
}
