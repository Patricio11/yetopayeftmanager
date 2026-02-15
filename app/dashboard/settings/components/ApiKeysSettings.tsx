"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Key, Copy, Trash2, Plus, Check, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function CreateApiKeyModal({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [step, setStep] = useState<"form" | "success">("form");
  const [keyName, setKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [generatedKey, setGeneratedKey] = useState({
    apiKey: "",
    apiSecret: ""
  });

  const handleCreate = async () => {
    if (!keyName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a name for your API key.",
        variant: "destructive",
      });
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
        setGeneratedKey({
          apiKey: data.data.apiKey,
          apiSecret: data.data.apiSecret,
        });
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
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard.`,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>{step === "form" ? "Create API Key" : "API Key Created!"}</CardTitle>
          <CardDescription>
            {step === "form"
              ? "Create a new API key for server-to-server integration"
              : "Save these credentials securely - they won't be shown again"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "form" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="key-name">API Key Name</Label>
                <Input
                  id="key-name"
                  placeholder="e.g., Production Server, Mobile App Backend"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                />
                <p className="text-sm text-gray-600">
                  Choose a descriptive name to identify where this key will be used
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-900">
                  <p className="font-medium mb-1">Important Security Notice</p>
                  <p className="text-yellow-800">
                    Your API key and secret will only be shown once. Make sure to copy and store them securely
                    before closing this dialog.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button onClick={handleCreate}>Create API Key</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-center py-4">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <div className="flex gap-2">
                    <Input value={generatedKey.apiKey} readOnly className="font-mono text-sm" />
                    <Button variant="outline" size="sm" onClick={() => handleCopy(generatedKey.apiKey, "API Key")}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>API Secret</Label>
                  <div className="flex gap-2">
                    <Input value={generatedKey.apiSecret} readOnly className="font-mono text-sm" />
                    <Button variant="outline" size="sm" onClick={() => handleCopy(generatedKey.apiSecret, "API Secret")}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-900">
                  <p className="font-medium mb-1">Save These Credentials Now</p>
                  <p className="text-red-800">
                    This is the only time you&apos;ll see these credentials. Store them in a secure location like
                    a password manager or environment variables. If you lose them, you&apos;ll need to create a new API key.
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={onClose}>Done</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
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
      if (data.success) {
        setApiKeys(data.data || []);
      }
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>Manage your API keys for server-to-server integration</CardDescription>
            </div>
            <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create API Key
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900">
          <p className="font-medium mb-1">API Key Security</p>
          <p className="text-blue-800">
            API keys provide full access to your account. Keep them secure and never share them publicly.
            If a key is compromised, revoke it immediately and create a new one.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {apiKeys.map((key) => (
          <Card key={key.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">{key.name}</h3>
                    <Badge
                      variant="outline"
                      className={key.status === "active"
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-gray-50 text-gray-700 border-gray-200"
                      }
                    >
                      {key.status}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <code className="text-sm bg-gray-100 px-3 py-1 rounded font-mono">{key.keyPrefix}</code>
                    <button onClick={() => handleCopy(key.keyPrefix)} className="p-1 hover:bg-gray-100 rounded transition-colors">
                      <Copy className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>Created: {key.created}</span>
                    <span>&bull;</span>
                    <span>Last used: {key.lastUsed}</span>
                  </div>
                </div>

                <Button variant="ghost" size="sm" onClick={() => handleRevoke(key.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Revoke
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {showCreateModal && (
        <CreateApiKeyModal onClose={() => { setShowCreateModal(false); fetchApiKeys(); }} />
      )}

      <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
              <Key className="w-5 h-5 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Need help with API integration?</h3>
              <p className="text-sm text-gray-700 mb-3">
                Check out our comprehensive API documentation with code examples in multiple languages.
              </p>
              <Button variant="outline" size="sm">View API Documentation</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
