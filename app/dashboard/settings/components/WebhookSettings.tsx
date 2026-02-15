"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Copy,
  Trash2,
  Plus,
  Check,
  AlertCircle,
  Shield,
  Webhook,
  RefreshCw,
  ExternalLink,
  Activity,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function WebhookSettings() {
  const { toast } = useToast();
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<any>(null);
  const [showDeliveries, setShowDeliveries] = useState(false);
  const [deliveries, setDeliveries] = useState<any[]>([]);

  // Secret modal state
  const [secretModalOpen, setSecretModalOpen] = useState(false);
  const [secretModalValue, setSecretModalValue] = useState("");
  const [secretCopied, setSecretCopied] = useState(false);

  // Form state
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);

  const availableEvents = [
    { value: '*', label: 'All Events (Wildcard)', description: 'Subscribe to all current and future events - recommended for simplicity', highlight: true },
    { value: 'payment.completed', label: 'Payment Completed', description: 'When a payment is successfully completed' },
    { value: 'payment.failed', label: 'Payment Failed', description: 'When a payment fails' },
    { value: 'payment.cancelled', label: 'Payment Cancelled', description: 'When a payment is cancelled by user or system' },
    { value: 'payment.pending', label: 'Payment Pending', description: 'When a payment is pending verification' },
    { value: 'transaction.created', label: 'Transaction Created', description: 'When a new transaction is created' },
    { value: 'transaction.updated', label: 'Transaction Updated', description: 'When a transaction is updated' },
  ];

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const fetchWebhooks = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/webhooks');
      const data = await response.json();
      if (data.success) {
        setWebhooks(data.data.webhooks);
      }
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
    }
  };

  const handleDeleteWebhook = async (webhookId: string) => {
    if (!confirm('Are you sure you want to delete this webhook?')) return;
    try {
      const response = await fetch(`/api/webhooks?id=${webhookId}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        toast({ title: "Success", description: "Webhook deleted successfully" });
        fetchWebhooks();
      } else {
        toast({ title: "Error", description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete webhook", variant: "destructive" });
    }
  };

  const handleTestWebhook = async (webhookId: string) => {
    try {
      const response = await fetch('/api/webhooks/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookId }),
      });
      const data = await response.json();
      if (data.success && data.data.test.success) {
        toast({ title: "Success", description: `Webhook test successful! Response time: ${data.data.test.responseTime}ms` });
      } else {
        toast({ title: "Test Failed", description: data.data.test.errorMessage || "Webhook endpoint returned an error", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to test webhook", variant: "destructive" });
    }
  };

  const handleRegenerateSecret = async (webhookId: string) => {
    if (!confirm('Are you sure? This will invalidate the current secret.')) return;
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
        toast({ title: "Success", description: "Secret regenerated successfully" });
      } else {
        toast({ title: "Error", description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to regenerate secret", variant: "destructive" });
    }
  };

  const viewDeliveries = async (webhookId: string) => {
    try {
      const response = await fetch(`/api/webhooks/deliveries?webhookId=${webhookId}&limit=20`);
      const data = await response.json();
      if (data.success) {
        setDeliveries(data.data.deliveries);
        setShowDeliveries(true);
      }
    } catch {
      toast({ title: "Error", description: "Failed to fetch deliveries", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-5 w-40 bg-slate-200 dark:bg-slate-700 animate-pulse rounded" />
              <div className="h-4 w-64 bg-slate-200 dark:bg-slate-700 animate-pulse rounded" />
            </div>
            <div className="h-9 w-32 bg-slate-200 dark:bg-slate-700 animate-pulse rounded-md" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-6 w-6 bg-slate-200 dark:bg-slate-700 animate-pulse rounded" />
                  <div className="h-4 w-48 bg-slate-200 dark:bg-slate-700 animate-pulse rounded" />
                </div>
                <div className="h-6 w-16 bg-slate-200 dark:bg-slate-700 animate-pulse rounded-full" />
              </div>
              <div className="flex gap-2">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="h-5 w-24 bg-slate-200 dark:bg-slate-700 animate-pulse rounded-full" />
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="w-5 h-5" />
                Webhook Endpoints
              </CardTitle>
              <CardDescription>
                Subscribe to events and receive real-time notifications
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Webhook
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {webhooks.length === 0 ? (
            <div className="text-center py-8">
              <Webhook className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 mb-4">No webhooks configured</p>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Webhook
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {webhooks.map((webhook) => (
                <div key={webhook.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-medium">{webhook.url}</p>
                        <Badge variant={webhook.isActive ? "default" : "secondary"}>
                          {webhook.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        Secret: <code className="bg-gray-100 px-2 py-1 rounded text-gray-400">whsec_&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;</code>
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {(webhook.events as string[]).map((event) => (
                          <Badge key={event} variant="outline" className="text-xs">
                            {event}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-3 border-t">
                    <Button size="sm" variant="outline" onClick={() => handleTestWebhook(webhook.id)}>
                      <Activity className="w-4 h-4 mr-1" />
                      Test
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => viewDeliveries(webhook.id)}>
                      <ExternalLink className="w-4 h-4 mr-1" />
                      View Logs
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleRegenerateSecret(webhook.id)}>
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Regenerate Secret
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDeleteWebhook(webhook.id)}>
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Webhook Modal */}
      {showCreateModal && (
        <Card className="border-2 border-blue-500">
          <CardHeader>
            <CardTitle>Create New Webhook</CardTitle>
            <CardDescription>Configure a new webhook endpoint</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="webhook-url">Endpoint URL</Label>
              <Input id="webhook-url" type="url" placeholder="https://your-domain.com/webhooks/payment" value={url} onChange={(e) => setUrl(e.target.value)} />
              <p className="text-xs text-gray-600">The URL where webhook events will be sent</p>
            </div>

            <div className="space-y-2">
              <Label>Events to Subscribe</Label>
              <div className="space-y-2">
                {availableEvents.map((event) => (
                  <div
                    key={event.value}
                    className={`flex items-start gap-3 p-3 border rounded-lg ${event.highlight ? 'bg-blue-50 border-blue-300 dark:bg-blue-900/20 dark:border-blue-700' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedEvents.includes(event.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          if (event.value === '*') {
                            setSelectedEvents(['*']);
                          } else {
                            const newEvents = selectedEvents.filter(ev => ev !== '*');
                            setSelectedEvents([...newEvents, event.value]);
                          }
                        } else {
                          setSelectedEvents(selectedEvents.filter(ev => ev !== event.value));
                        }
                      }}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <p className={`font-medium text-sm ${event.highlight ? 'text-blue-700 dark:text-blue-300' : ''}`}>{event.label}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{event.description}</p>
                      {event.highlight && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-medium">
                          Recommended: Automatically receive all events without managing individual subscriptions
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              <div>
                <p className="font-medium text-sm">Active</p>
                <p className="text-xs text-gray-600">Start receiving events immediately</p>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button onClick={handleCreateWebhook}>Create Webhook</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Webhook Secret Modal */}
      {secretModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-600" />
                Webhook Secret
              </CardTitle>
              <CardDescription>Copy and store this secret securely. It will not be shown again.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Secret Key</Label>
                <div className="flex gap-2">
                  <Input value={secretModalValue} readOnly className="font-mono text-sm" />
                  <Button
                    variant="outline"
                    size="sm"
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

              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-900">
                  <p className="font-medium mb-1">Save this secret now</p>
                  <p className="text-red-800">
                    This is the only time you will see this secret. Store it in a secure
                    location like a password manager or environment variables.
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={() => setSecretModalOpen(false)}>Done</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Deliveries Modal */}
      {showDeliveries && (
        <Card className="border-2 border-green-500">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Webhook Deliveries</CardTitle>
              <Button variant="outline" onClick={() => setShowDeliveries(false)}>Close</Button>
            </div>
          </CardHeader>
          <CardContent>
            {deliveries.length === 0 ? (
              <p className="text-center text-gray-600 py-4">No deliveries yet</p>
            ) : (
              <div className="space-y-2">
                {deliveries.map((delivery) => (
                  <div key={delivery.id} className="border rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant={delivery.success ? "default" : "destructive"}>
                        {delivery.success ? "Success" : "Failed"}
                      </Badge>
                      <span className="text-xs text-gray-600">{new Date(delivery.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-sm font-medium">{delivery.event}</p>
                    {delivery.statusCode && <p className="text-xs text-gray-600">Status: {delivery.statusCode}</p>}
                    {delivery.errorMessage && <p className="text-xs text-red-600 mt-1">{delivery.errorMessage}</p>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Documentation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Webhook Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Verifying Webhook Signatures</h4>
            <p className="text-sm text-gray-600 mb-3">
              All webhook requests include an <code className="bg-gray-100 px-1 rounded">X-Webhook-Signature</code> header.
              Verify this signature to ensure the request came from YetoPayEFT.
            </p>
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto">
              <pre>{`const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// In your webhook handler
app.post('/webhooks/payment', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = JSON.stringify(req.body);

  if (!verifySignature(payload, signature, YOUR_SECRET)) {
    return res.status(401).send('Invalid signature');
  }

  // Process webhook...
  res.status(200).send('OK');
});`}</pre>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">Webhook Headers</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>&bull; <code className="bg-gray-100 px-1 rounded">X-Webhook-Signature</code> - HMAC signature</li>
              <li>&bull; <code className="bg-gray-100 px-1 rounded">X-Webhook-Timestamp</code> - Unix timestamp</li>
              <li>&bull; <code className="bg-gray-100 px-1 rounded">X-Webhook-ID</code> - Unique event ID</li>
              <li>&bull; <code className="bg-gray-100 px-1 rounded">X-Webhook-Event</code> - Event type</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-2">Best Practices</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>Always verify webhook signatures</li>
              <li>Return 200 OK quickly (process async)</li>
              <li>Use HTTPS endpoints only</li>
              <li>Implement idempotency (check event IDs)</li>
              <li>Handle retries gracefully</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
