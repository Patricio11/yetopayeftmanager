"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Copy, Trash2, Plus, Check, AlertCircle, Shield,
  Webhook, RefreshCw, ExternalLink, Activity, X, Code,
  ChevronDown, ChevronRight, Clock, Loader2, Zap,
  CheckCircle, XCircle, ArrowUpDown,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/hooks/use-toast";

export function WebhookSettings() {
  const { toast } = useToast();
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [logsWebhookId, setLogsWebhookId] = useState<string | null>(null);
  const [logsWebhookUrl, setLogsWebhookUrl] = useState("");
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [deliveryStats, setDeliveryStats] = useState<any>(null);
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);
  const [expandedDelivery, setExpandedDelivery] = useState<string | null>(null);

  const [secretModalOpen, setSecretModalOpen] = useState(false);
  const [secretModalValue, setSecretModalValue] = useState("");
  const [secretCopied, setSecretCopied] = useState(false);

  const [testingId, setTestingId] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmRegenId, setConfirmRegenId] = useState<string | null>(null);

  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [creating, setCreating] = useState(false);

  const availableEvents = [
    { value: '*', label: 'All Events (Wildcard)', description: 'Subscribe to all current and future events', highlight: true },
    { value: 'payment.completed', label: 'Payment Completed', description: 'When a payment is successfully completed' },
    { value: 'payment.failed', label: 'Payment Failed', description: 'When a payment fails' },
    { value: 'payment.cancelled', label: 'Payment Cancelled', description: 'When a payment is cancelled by user or system' },
    { value: 'payment.pending', label: 'Payment Pending', description: 'When a payment is pending verification' },
    { value: 'transaction.created', label: 'Transaction Created', description: 'When a new transaction is created' },
    { value: 'transaction.updated', label: 'Transaction Updated', description: 'When a transaction is updated' },
  ];

  useEffect(() => { fetchWebhooks(); }, []);

  const fetchWebhooks = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/webhooks');
      const data = await response.json();
      if (data.success) setWebhooks(data.data.webhooks);
    } catch (error) {
      console.error('Error fetching webhooks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateWebhook = async () => {
    if (!url || selectedEvents.length === 0) {
      toast({ title: "Error", description: "URL and at least one event are required", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const response = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, events: selectedEvents, isActive }),
      });
      const data = await response.json();
      if (data.success) {
        toast({ title: "Success", description: "Webhook created successfully. Save your secret key!" });
        setSecretModalValue(data.data.webhook.secret);
        setSecretCopied(false);
        setSecretModalOpen(true);
        setShowCreateModal(false);
        setUrl("");
        setSelectedEvents([]);
        setIsActive(true);
        fetchWebhooks();
      } else {
        toast({ title: "Error", description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to create webhook", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteWebhook = async (webhookId: string) => {
    try {
      const response = await fetch(`/api/webhooks?id=${webhookId}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        toast({ title: "Deleted", description: "Webhook deleted successfully" });
        fetchWebhooks();
      } else {
        toast({ title: "Error", description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete webhook", variant: "destructive" });
    }
  };

  const handleTestWebhook = async (webhookId: string) => {
    setTestingId(webhookId);
    try {
      const response = await fetch('/api/webhooks/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookId }),
      });
      const data = await response.json();
      if (data.success && data.data.test.success) {
        toast({ title: "Test Passed", description: `Endpoint responded in ${data.data.test.responseTime}ms` });
      } else {
        toast({
          title: "Test Failed",
          description: data.data?.test?.errorMessage || data.message || "Webhook endpoint returned an error",
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: "Error", description: "Failed to test webhook", variant: "destructive" });
    } finally {
      setTestingId(null);
    }
  };

  const handleRegenerateSecret = async (webhookId: string) => {
    setRegeneratingId(webhookId);
    try {
      const response = await fetch('/api/webhooks/regenerate-secret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookId }),
      });
      const data = await response.json();
      if (data.success) {
        setSecretModalValue(data.data.secret);
        setSecretCopied(false);
        setSecretModalOpen(true);
        toast({ title: "Secret Regenerated", description: "Copy and save your new secret now" });
      } else {
        toast({ title: "Error", description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to regenerate secret", variant: "destructive" });
    } finally {
      setRegeneratingId(null);
    }
  };

  const viewDeliveries = async (webhookId: string, webhookUrl: string) => {
    setLogsWebhookId(webhookId);
    setLogsWebhookUrl(webhookUrl);
    setShowLogsModal(true);
    setLoadingDeliveries(true);
    setExpandedDelivery(null);
    try {
      const response = await fetch(`/api/webhooks/deliveries?webhookId=${webhookId}&limit=50`);
      const data = await response.json();
      if (data.success) {
        setDeliveries(data.data.deliveries);
        setDeliveryStats(data.data.stats);
      }
    } catch {
      toast({ title: "Error", description: "Failed to fetch deliveries", variant: "destructive" });
    } finally {
      setLoadingDeliveries(false);
    }
  };

  const refreshDeliveries = async () => {
    if (!logsWebhookId) return;
    setLoadingDeliveries(true);
    try {
      const response = await fetch(`/api/webhooks/deliveries?webhookId=${logsWebhookId}&limit=50`);
      const data = await response.json();
      if (data.success) {
        setDeliveries(data.data.deliveries);
        setDeliveryStats(data.data.stats);
      }
    } catch {
      toast({ title: "Error", description: "Failed to refresh", variant: "destructive" });
    } finally {
      setLoadingDeliveries(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-2">
          <div className="h-5 w-40 bg-slate-200 dark:bg-slate-700 animate-pulse rounded" />
          <div className="h-9 w-32 bg-slate-200 dark:bg-slate-700 animate-pulse rounded-lg" />
        </div>
        {[...Array(2)].map((_, i) => (
          <div key={i} className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800/50 p-5 animate-pulse">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-slate-200 dark:bg-slate-700 rounded-lg" />
                <div className="h-4 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
              </div>
              <div className="flex gap-2">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="h-5 w-24 bg-slate-100 dark:bg-slate-700/50 rounded-full" />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create button */}
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowCreateModal(true)} className="bg-gradient-to-r from-amber-500 to-pink-600 hover:from-amber-600 hover:to-pink-700 text-white border-0">
          <Plus className="w-4 h-4 mr-2" />
          Add Webhook
        </Button>
      </div>

      {/* Webhooks list */}
      {webhooks.length === 0 ? (
        <div className="text-center py-12 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800/50">
          <Webhook className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">No webhooks configured</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 mb-4">Create your first webhook to receive real-time event notifications</p>
          <Button size="sm" onClick={() => setShowCreateModal(true)} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Webhook
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((webhook) => (
            <div key={webhook.id} className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800/50 overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white">
                      <Webhook className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-900 dark:text-white text-sm break-all">{webhook.url}</p>
                        <Badge
                          variant="outline"
                          className={webhook.isActive
                            ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 shrink-0"
                            : "bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 shrink-0"
                          }
                        >
                          {webhook.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                        Secret: <code className="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-400 dark:text-slate-500">whsec_&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;</code>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 ml-12 mb-1">
                  {(webhook.events as string[]).map((event) => (
                    <Badge key={event} variant="outline" className="text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                      {event}
                    </Badge>
                  ))}
                </div>

                {webhook.createdAt && (
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 ml-12 mt-2">
                    Created {new Date(webhook.createdAt).toLocaleDateString("en-ZA", { year: "numeric", month: "short", day: "numeric" })}
                  </p>
                )}
              </div>

              <div className="px-5 py-3 bg-slate-50/50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-700/50 flex flex-wrap gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleTestWebhook(webhook.id)}
                  disabled={testingId === webhook.id}
                  className="text-xs h-8 gap-1.5"
                >
                  {testingId === webhook.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Zap className="w-3.5 h-3.5" />
                  )}
                  {testingId === webhook.id ? "Testing..." : "Test"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => viewDeliveries(webhook.id, webhook.url)}
                  className="text-xs h-8 gap-1.5"
                >
                  <Activity className="w-3.5 h-3.5" />
                  View Logs
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setConfirmRegenId(webhook.id)}
                  disabled={regeneratingId === webhook.id}
                  className="text-xs h-8 gap-1.5"
                >
                  {regeneratingId === webhook.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  {regeneratingId === webhook.id ? "Regenerating..." : "Regenerate Secret"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setConfirmDeleteId(webhook.id)}
                  className="text-xs h-8 gap-1.5 text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Webhook Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">Create New Webhook</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Configure a new webhook endpoint</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="webhook-url" className="text-slate-700 dark:text-slate-300 text-sm">Endpoint URL</Label>
                <Input id="webhook-url" type="url" placeholder="https://your-website.com/webhooks/payment" value={url} onChange={(e) => setUrl(e.target.value)} />
                <p className="text-xs text-slate-400 dark:text-slate-500">The URL where webhook events will be sent</p>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300 text-sm">Events to Subscribe</Label>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {availableEvents.map((event) => (
                    <label
                      key={event.value}
                      className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        event.highlight
                          ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                          : selectedEvents.includes(event.value)
                            ? "border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10"
                            : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedEvents.includes(event.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            if (event.value === '*') {
                              setSelectedEvents(['*']);
                            } else {
                              setSelectedEvents([...selectedEvents.filter(ev => ev !== '*'), event.value]);
                            }
                          } else {
                            setSelectedEvents(selectedEvents.filter(ev => ev !== event.value));
                          }
                        }}
                        className="mt-1 rounded"
                      />
                      <div className="flex-1">
                        <p className={`font-medium text-sm ${event.highlight ? "text-blue-700 dark:text-blue-300" : "text-slate-900 dark:text-white"}`}>
                          {event.label}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{event.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Active</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Start receiving events immediately</p>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-700/50 flex justify-end gap-3">
              <Button variant="outline" size="sm" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button size="sm" onClick={handleCreateWebhook} disabled={creating} className="bg-gradient-to-r from-amber-500 to-pink-600 hover:from-amber-600 hover:to-pink-700 text-white border-0">
                {creating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> : "Create Webhook"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Webhook Secret Modal */}
      {secretModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700/50">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">Webhook Secret</h3>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Copy and store this secret securely. It will not be shown again.</p>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300 text-sm">Secret Key</Label>
                <div className="flex gap-2">
                  <Input value={secretModalValue} readOnly className="font-mono text-sm bg-slate-50 dark:bg-slate-800" />
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={() => {
                      navigator.clipboard.writeText(secretModalValue);
                      setSecretCopied(true);
                      toast({ title: "Copied!", description: "Webhook secret copied to clipboard." });
                    }}
                  >
                    {secretCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-900 dark:text-red-300">
                  <p className="font-medium mb-1">Save this secret now</p>
                  <p className="text-red-800 dark:text-red-400/80">
                    This is the only time you will see this secret. Store it in a secure
                    location like a password manager or environment variables.
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button size="sm" onClick={() => setSecretModalOpen(false)}>Done</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Webhook Logs Modal */}
      {showLogsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-3xl border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">Webhook Delivery Logs</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-md">{logsWebhookUrl}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={refreshDeliveries} disabled={loadingDeliveries} className="h-8 gap-1.5">
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingDeliveries ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
                <button onClick={() => setShowLogsModal(false)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
            </div>

            {/* Stats */}
            {deliveryStats && !loadingDeliveries && deliveries.length > 0 && (
              <div className="px-6 py-3 bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700/50 shrink-0">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-slate-400" />
                    <span className="text-xs text-slate-600 dark:text-slate-400">Total: <span className="font-semibold text-slate-900 dark:text-white">{deliveryStats.total}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-xs text-slate-600 dark:text-slate-400">Delivered: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{deliveryStats.successful}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-xs text-slate-600 dark:text-slate-400">Failed: <span className="font-semibold text-red-600 dark:text-red-400">{deliveryStats.failed}</span></span>
                  </div>
                  <span className="text-xs text-slate-400 dark:text-slate-500">Success rate: {deliveryStats.successRate}</span>
                </div>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {loadingDeliveries ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 text-slate-400 animate-spin mb-3" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">Loading delivery logs...</p>
                </div>
              ) : deliveries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Activity className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
                  <p className="text-slate-500 dark:text-slate-400 font-medium">No deliveries yet</p>
                  <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Logs will appear here when events are sent to your endpoint</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-4 gap-1.5"
                    onClick={() => {
                      if (logsWebhookId) {
                        setShowLogsModal(false);
                        handleTestWebhook(logsWebhookId);
                      }
                    }}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Send Test Event
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {deliveries.map((delivery) => (
                    <div key={delivery.id}>
                      {/* Row */}
                      <button
                        onClick={() => setExpandedDelivery(expandedDelivery === delivery.id ? null : delivery.id)}
                        className="w-full px-6 py-3.5 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
                      >
                        {/* Status icon */}
                        {delivery.success ? (
                          <CheckCircle className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
                        ) : (
                          <XCircle className="w-4.5 h-4.5 text-red-500 shrink-0" />
                        )}

                        {/* Event */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-white">{delivery.event}</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                            {new Date(delivery.createdAt).toLocaleString("en-ZA", {
                              year: "numeric", month: "short", day: "numeric",
                              hour: "2-digit", minute: "2-digit", second: "2-digit",
                            })}
                          </p>
                        </div>

                        {/* Status code */}
                        <div className="flex items-center gap-3 shrink-0">
                          {delivery.statusCode && (
                            <Badge
                              variant="outline"
                              className={`text-xs font-mono ${
                                delivery.statusCode >= 200 && delivery.statusCode < 300
                                  ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                                  : delivery.statusCode >= 400
                                    ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800"
                                    : "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                              }`}
                            >
                              {delivery.statusCode}
                            </Badge>
                          )}
                          {delivery.attemptNumber && delivery.attemptNumber > 1 && (
                            <span className="text-xs text-slate-400 dark:text-slate-500">Attempt #{delivery.attemptNumber}</span>
                          )}
                          <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${expandedDelivery === delivery.id ? "rotate-90" : ""}`} />
                        </div>
                      </button>

                      {/* Expanded details */}
                      {expandedDelivery === delivery.id && (
                        <div className="px-6 pb-4 bg-slate-50/50 dark:bg-slate-800/30">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Request payload */}
                            <div>
                              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Request Payload</p>
                              <div className="bg-slate-900 dark:bg-slate-950 rounded-lg p-3 overflow-x-auto">
                                <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap break-all">
                                  {delivery.payload ? JSON.stringify(delivery.payload, null, 2) : "No payload recorded"}
                                </pre>
                              </div>
                            </div>

                            {/* Response */}
                            <div>
                              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Response</p>
                              <div className="bg-slate-900 dark:bg-slate-950 rounded-lg p-3 overflow-x-auto">
                                <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap break-all">
                                  {delivery.response ? JSON.stringify(delivery.response, null, 2) : delivery.errorMessage || "No response recorded"}
                                </pre>
                              </div>
                            </div>
                          </div>

                          {/* Extra info */}
                          <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-500 dark:text-slate-400">
                            {delivery.deliveredAt && (
                              <span>Delivered: {new Date(delivery.deliveredAt).toLocaleString("en-ZA")}</span>
                            )}
                            {delivery.nextRetryAt && (
                              <span className="text-amber-600 dark:text-amber-400">Next retry: {new Date(delivery.nextRetryAt).toLocaleString("en-ZA")}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Webhook Security Documentation */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800/50 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white">
              <Code className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Webhook Security</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Verify webhook signatures to ensure requests come from YetoPay</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-2">Verifying Webhook Signatures</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
              All webhook requests include an <code className="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-xs text-slate-600 dark:text-slate-300">X-Webhook-Signature</code> header.
            </p>
            <div className="bg-slate-900 dark:bg-slate-950 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto font-mono">
              <pre>{`const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}`}</pre>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-2">Webhook Headers</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[
                { header: "X-Webhook-Signature", desc: "HMAC signature" },
                { header: "X-Webhook-Timestamp", desc: "Unix timestamp" },
                { header: "X-Webhook-ID", desc: "Unique event ID" },
                { header: "X-Webhook-Event", desc: "Event type" },
              ].map(({ header, desc }) => (
                <div key={header} className="flex items-center gap-2 text-sm">
                  <code className="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-xs text-slate-600 dark:text-slate-300 shrink-0">{header}</code>
                  <span className="text-slate-500 dark:text-slate-400 text-xs">{desc}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-2">Best Practices</h4>
            <ul className="text-sm text-slate-500 dark:text-slate-400 space-y-1.5">
              <li className="flex items-start gap-2"><span className="w-1 h-1 rounded-full bg-slate-400 mt-2 shrink-0" />Always verify webhook signatures</li>
              <li className="flex items-start gap-2"><span className="w-1 h-1 rounded-full bg-slate-400 mt-2 shrink-0" />Return 200 OK quickly (process async)</li>
              <li className="flex items-start gap-2"><span className="w-1 h-1 rounded-full bg-slate-400 mt-2 shrink-0" />Use HTTPS endpoints only</li>
              <li className="flex items-start gap-2"><span className="w-1 h-1 rounded-full bg-slate-400 mt-2 shrink-0" />Implement idempotency (check event IDs)</li>
              <li className="flex items-start gap-2"><span className="w-1 h-1 rounded-full bg-slate-400 mt-2 shrink-0" />Handle retries gracefully</li>
            </ul>
          </div>
        </div>
      </div>
      <ConfirmDialog
        open={!!confirmDeleteId}
        onOpenChange={(open) => { if (!open) setConfirmDeleteId(null); }}
        title="Delete Webhook"
        description="Are you sure you want to delete this webhook? This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => { if (confirmDeleteId) { handleDeleteWebhook(confirmDeleteId); setConfirmDeleteId(null); } }}
      />

      <ConfirmDialog
        open={!!confirmRegenId}
        onOpenChange={(open) => { if (!open) setConfirmRegenId(null); }}
        title="Regenerate Secret"
        description="The current secret will be invalidated immediately. You will need to update your server with the new secret."
        confirmLabel="Regenerate"
        variant="warning"
        onConfirm={() => { if (confirmRegenId) { handleRegenerateSecret(confirmRegenId); setConfirmRegenId(null); } }}
      />
    </div>
  );
}
