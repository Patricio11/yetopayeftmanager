"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Key, Copy, Trash2, Plus, Check, AlertCircle, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function CreateApiKeyModal({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [step, setStep] = useState<"form" | "success">("form");
  const [keyName, setKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [generatedKey, setGeneratedKey] = useState({ apiKey: "", apiSecret: "" });

  const handleCreate = async () => {
    if (!keyName.trim()) {
      toast({ title: "Error", description: "Please enter a name for your API key.", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/merchant/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: keyName }),
      });
      const data = await res.json();
      if (data.success) {
        setGeneratedKey({ apiKey: data.data.apiKey, apiSecret: data.data.apiSecret });
        setStep("success");
      } else {
        toast({ title: "Error", description: data.message || "Failed to create API key", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to create API key", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: `${label} copied to clipboard.` });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-2xl border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700/50">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            {step === "form" ? "Create API Key" : "API Key Created!"}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {step === "form"
              ? "Create a new API key for server-to-server integration"
              : "Save these credentials securely — they won't be shown again"
            }
          </p>
        </div>

        <div className="p-6">
          {step === "form" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="key-name" className="text-slate-700 dark:text-slate-300 text-sm">API Key Name</Label>
                <Input
                  id="key-name"
                  placeholder="e.g., Production Server, Mobile App Backend"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                />
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Choose a descriptive name to identify where this key will be used
                </p>
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-900 dark:text-amber-300">
                  <p className="font-medium mb-1">Important Security Notice</p>
                  <p className="text-amber-800 dark:text-amber-400/80">
                    Your API key and secret will only be shown once. Make sure to copy and store them securely
                    before closing this dialog.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
                <Button size="sm" onClick={handleCreate} disabled={creating} className="bg-gradient-to-r from-amber-500 to-pink-600 hover:from-amber-600 hover:to-pink-700 text-white border-0">
                  {creating ? "Creating..." : "Create API Key"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-center py-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-pink-600 flex items-center justify-center">
                  <Check className="w-8 h-8 text-white" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300 text-sm">API Key</Label>
                  <div className="flex gap-2">
                    <Input value={generatedKey.apiKey} readOnly className="font-mono text-sm bg-slate-50 dark:bg-slate-800" />
                    <Button variant="outline" size="icon" onClick={() => handleCopy(generatedKey.apiKey, "API Key")} className="shrink-0">
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300 text-sm">API Secret</Label>
                  <div className="flex gap-2">
                    <Input value={generatedKey.apiSecret} readOnly className="font-mono text-sm bg-slate-50 dark:bg-slate-800" />
                    <Button variant="outline" size="icon" onClick={() => handleCopy(generatedKey.apiSecret, "API Secret")} className="shrink-0">
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-900 dark:text-red-300">
                  <p className="font-medium mb-1">Save These Credentials Now</p>
                  <p className="text-red-800 dark:text-red-400/80">
                    This is the only time you&apos;ll see these credentials. Store them in a secure location like
                    a password manager or environment variables.
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button size="sm" onClick={onClose}>Done</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ApiKeysSettings() {
  const { toast } = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchApiKeys = async () => {
    try {
      const res = await fetch("/api/merchant/api-keys");
      const data = await res.json();
      if (data.success) setApiKeys(data.data || []);
    } catch {
      toast({ title: "Error", description: "Failed to load API keys", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchApiKeys(); }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard", description: "API key prefix copied successfully." });
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this API key? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/merchant/api-keys/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setApiKeys(apiKeys.filter(key => key.id !== id));
        toast({ title: "API key revoked", description: "The API key has been revoked successfully." });
      } else {
        toast({ title: "Error", description: data.message || "Failed to revoke key", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to revoke API key", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-2">
          <div className="h-5 w-32 bg-slate-200 dark:bg-slate-700 animate-pulse rounded" />
          <div className="h-9 w-32 bg-slate-200 dark:bg-slate-700 animate-pulse rounded-lg" />
        </div>
        {[...Array(2)].map((_, i) => (
          <div key={i} className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800/50 p-5 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-40 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-3 w-48 bg-slate-100 dark:bg-slate-700/50 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex gap-3">
        <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800 dark:text-blue-300">
          <p className="font-medium mb-1">API Key Security</p>
          <p className="text-blue-700 dark:text-blue-400/80">
            API keys provide full access to your account. Keep them secure and never share them publicly.
            If a key is compromised, revoke it immediately and create a new one.
          </p>
        </div>
      </div>

      {/* Create button */}
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowCreateModal(true)} className="bg-gradient-to-r from-amber-500 to-pink-600 hover:from-amber-600 hover:to-pink-700 text-white border-0">
          <Plus className="w-4 h-4 mr-2" />
          Create API Key
        </Button>
      </div>

      {/* Keys list */}
      {apiKeys.length === 0 ? (
        <div className="text-center py-12 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800/50">
          <Key className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">No API keys yet</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Create your first API key to get started with integrations</p>
        </div>
      ) : (
        <div className="space-y-3">
          {apiKeys.map((key) => (
            <div key={key.id} className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800/50 overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white">
                        <Key className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">{key.name}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <code className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded font-mono text-slate-600 dark:text-slate-300">{key.keyPrefix}</code>
                          <button onClick={() => handleCopy(key.keyPrefix)} className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors">
                            <Copy className="w-3.5 h-3.5 text-slate-400" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-3 ml-12">
                      <Badge
                        variant="outline"
                        className={key.status === "active"
                          ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                        }
                      >
                        {key.status}
                      </Badge>
                      <span>Created: {key.created}</span>
                      <span>Last used: {key.lastUsed}</span>
                    </div>
                  </div>

                  <Button variant="ghost" size="sm" onClick={() => handleRevoke(key.id)} className="text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20">
                    <Trash2 className="w-4 h-4 mr-1" />
                    Revoke
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateApiKeyModal onClose={() => { setShowCreateModal(false); fetchApiKeys(); }} />
      )}

      {/* Documentation CTA */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-xl bg-gradient-to-br from-violet-50 to-blue-50 dark:from-violet-900/20 dark:to-blue-900/20 overflow-hidden">
        <div className="p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center text-white flex-shrink-0">
              <Key className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Need help with API integration?</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                Check out our comprehensive API documentation with code examples in multiple languages.
              </p>
              <Button variant="outline" size="sm">View API Documentation</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
