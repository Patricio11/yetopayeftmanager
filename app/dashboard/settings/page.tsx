"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Key, 
  Bell, 
  Shield, 
  Building2, 
  CreditCard,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  Plus,
  Check,
  AlertCircle,
  Lock,
  Webhook,
  RefreshCw,
  ExternalLink,
  Activity
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function SettingsContent() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("profile");
  const [isClient, setIsClient] = useState(false);

  // Ensure we're on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Update tab when URL parameter changes (only on client)
  useEffect(() => {
    if (isClient) {
      const tabParam = searchParams.get("tab");
      if (tabParam) {
        setActiveTab(tabParam);
        
        // Show toast notification
        if (tabParam === "api-keys") {
          toast({
            title: "API Keys",
            description: "Create and manage your API keys here.",
          });
        }
      }
    }
  }, [isClient, searchParams, toast]);

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Manage your account settings and preferences</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-8 gap-2">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Lock className="w-4 h-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
          <TabsTrigger value="api-keys" className="flex items-center gap-2">
            <Key className="w-4 h-4" />
            <span className="hidden sm:inline">API Keys</span>
          </TabsTrigger>
          <TabsTrigger value="company" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            <span className="hidden sm:inline">Company</span>
          </TabsTrigger>
          <TabsTrigger value="banking" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            <span className="hidden sm:inline">Banking</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="flex items-center gap-2">
            <Webhook className="w-4 h-4" />
            <span className="hidden sm:inline">Webhooks</span>
          </TabsTrigger>
          <TabsTrigger value="eft-settings" className="flex items-center gap-2">
            <ExternalLink className="w-4 h-4" />
            <span className="hidden sm:inline">EFT URLs</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <ProfileSettings />
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <SecuritySettings />
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="api-keys">
          <ApiKeysSettings />
        </TabsContent>

        {/* Company Tab */}
        <TabsContent value="company">
          <CompanySettings />
        </TabsContent>

        {/* Banking Tab */}
        <TabsContent value="banking">
          <BankingSettings />
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <NotificationSettings />
        </TabsContent>

        {/* Webhooks Tab */}
        <TabsContent value="webhooks">
          <WebhookSettings />
        </TabsContent>

        {/* EFT Settings Tab */}
        <TabsContent value="eft-settings">
          <EftUrlSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Profile Settings Component
function ProfileSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    fetch("/api/merchant/settings")
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setName(data.data.profile.fullName || data.data.profile.name || "");
          setEmail(data.data.profile.email || "");
          setPhone(data.data.profile.phone || "");
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
        body: JSON.stringify({ name, fullName: name, phone }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Profile updated", description: "Your profile has been updated successfully." });
      } else {
        toast({ title: "Error", description: data.error || "Failed to update profile", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update profile", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <Card><CardContent className="py-8 text-center text-gray-500">Loading profile...</CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
        <CardDescription>Update your personal information and contact details</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" placeholder="John Merchant" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" type="email" value={email} disabled className="bg-gray-50" />
            <p className="text-xs text-gray-500">Email cannot be changed here</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input id="phone" type="tel" placeholder="+27 12 345 6789" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => window.location.reload()}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Security Settings Component
function SecuritySettings() {
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handlePasswordReset = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({ title: "Error", description: "All password fields are required", variant: "destructive" });
      return;
    }
    if (newPassword.length < 8) {
      toast({ title: "Error", description: "New password must be at least 8 characters", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "New passwords do not match", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Password updated", description: "Your password has been changed successfully." });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast({ title: "Error", description: data.message || "Failed to update password", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update password", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Update your password to keep your account secure</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Current Password</Label>
            <div className="relative">
              <Input 
                id="current-password" 
                type={showPassword ? "text" : "password"} 
                placeholder="Enter current password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input 
              id="new-password" 
              type={showPassword ? "text" : "password"} 
              placeholder="Enter new password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <Input 
              id="confirm-password" 
              type={showPassword ? "text" : "password"} 
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
            <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">Password Requirements:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li>At least 8 characters long</li>
                <li>Contains uppercase and lowercase letters</li>
                <li>Contains at least one number</li>
                <li>Contains at least one special character</li>
              </ul>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline">Cancel</Button>
            <Button onClick={handlePasswordReset} disabled={loading}>
              {loading ? "Updating..." : "Update Password"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication */}
      <Card>
        <CardHeader>
          <CardTitle>Two-Factor Authentication</CardTitle>
          <CardDescription>Add an extra layer of security to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <Shield className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="font-medium">Two-Factor Authentication</p>
                <p className="text-sm text-gray-600">Not enabled</p>
              </div>
            </div>
            <Button variant="outline">Enable 2FA</Button>
          </div>
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
          <CardDescription>Manage your active sessions across devices</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Current Session</p>
                <p className="text-sm text-gray-600">Windows • Chrome • Johannesburg, South Africa</p>
                <p className="text-xs text-gray-500 mt-1">Last active: Just now</p>
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Active
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// API Keys Settings Component
function ApiKeysSettings() {
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
    toast({
      title: "Copied to clipboard",
      description: "API key prefix copied successfully.",
    });
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
      {/* Header */}
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

      {/* Info Banner */}
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

      {/* API Keys List */}
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
                    <code className="text-sm bg-gray-100 px-3 py-1 rounded font-mono">
                      {key.keyPrefix}
                    </code>
                    <button
                      onClick={() => handleCopy(key.keyPrefix)}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                    >
                      <Copy className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>Created: {key.created}</span>
                    <span>•</span>
                    <span>Last used: {key.lastUsed}</span>
                  </div>
                </div>

                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => handleRevoke(key.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Revoke
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create API Key Modal */}
      {showCreateModal && (
        <CreateApiKeyModal onClose={() => { setShowCreateModal(false); fetchApiKeys(); }} />
      )}

      {/* Documentation Link */}
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
              <Button variant="outline" size="sm">
                View API Documentation
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Create API Key Modal
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
                    <Input 
                      value={generatedKey.apiKey} 
                      readOnly 
                      className="font-mono text-sm"
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleCopy(generatedKey.apiKey, "API Key")}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>API Secret</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={generatedKey.apiSecret} 
                      readOnly 
                      className="font-mono text-sm"
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleCopy(generatedKey.apiSecret, "API Secret")}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-900">
                  <p className="font-medium mb-1">⚠️ Save These Credentials Now</p>
                  <p className="text-red-800">
                    This is the only time you'll see these credentials. Store them in a secure location like 
                    a password manager or environment variables. If you lose them, you'll need to create a new API key.
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

// Company Settings Component
function CompanySettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [companyName, setCompanyName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [website, setWebsite] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");

  useEffect(() => {
    fetch("/api/merchant/settings")
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const c = data.data.company;
          setCompanyName(c.companyName || "");
          setRegistrationNumber(c.registrationNumber || "");
          setVatNumber(c.vatNumber || "");
          setWebsite(c.website || "");
          const addr = c.address || {};
          setStreet(addr.street || "");
          setCity(addr.city || "");
          setProvince(addr.state || "");
          setPostalCode(addr.postal_code || "");
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
          companyName,
          registrationNumber,
          vatNumber,
          website: website || undefined,
          address: { street, city, state: province, postal_code: postalCode, country: "South Africa" },
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Company updated", description: "Your company details have been saved." });
      } else {
        toast({ title: "Error", description: data.error || "Failed to update", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update company details", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <Card><CardContent className="py-8 text-center text-gray-500">Loading company details...</CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company Information</CardTitle>
        <CardDescription>Update your company details and business information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="company-name">Company Name</Label>
            <Input id="company-name" value={companyName} onChange={e => setCompanyName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="registration">Registration Number</Label>
            <Input id="registration" placeholder="2024/123456/07" value={registrationNumber} onChange={e => setRegistrationNumber(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vat">VAT Number</Label>
            <Input id="vat" placeholder="4123456789" value={vatNumber} onChange={e => setVatNumber(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input id="website" type="url" placeholder="https://example.com" value={website} onChange={e => setWebsite(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Business Address</Label>
          <Input id="address" placeholder="123 Main Street" value={street} onChange={e => setStreet(e.target.value)} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input id="city" placeholder="Johannesburg" value={city} onChange={e => setCity(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="province">Province</Label>
            <Input id="province" placeholder="Gauteng" value={province} onChange={e => setProvince(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="postal">Postal Code</Label>
            <Input id="postal" placeholder="2000" value={postalCode} onChange={e => setPostalCode(e.target.value)} />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => window.location.reload()}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Banking Settings Component
function BankingSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountType, setAccountType] = useState("");
  const [branchCode, setBranchCode] = useState("");
  const [accountHolder, setAccountHolder] = useState("");

  useEffect(() => {
    fetch("/api/merchant/settings")
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const b = data.data.banking.bankAccount || {};
          setBankName(b.bank_name || "");
          setAccountNumber(b.account_number || "");
          setAccountType(b.account_type || "cheque");
          setBranchCode(b.branch_code || "");
          setAccountHolder(b.account_holder || "");
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
          bankAccount: {
            bank_name: bankName,
            account_number: accountNumber,
            account_type: accountType || "cheque",
            branch_code: branchCode,
            account_holder: accountHolder,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Banking updated", description: "Your bank account details have been saved." });
      } else {
        toast({ title: "Error", description: data.error || "Failed to update", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update bank details", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <Card><CardContent className="py-8 text-center text-gray-500">Loading bank details...</CardContent></Card>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Bank Account Details</CardTitle>
          <CardDescription>Manage your bank account for receiving payments</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="account-holder">Account Holder Name</Label>
              <Input id="account-holder" placeholder="John Merchant" value={accountHolder} onChange={e => setAccountHolder(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank">Bank Name</Label>
              <Input id="bank" placeholder="FNB (First National Bank)" value={bankName} onChange={e => setBankName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account-number">Account Number</Label>
              <Input id="account-number" placeholder="62123456789" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account-type">Account Type</Label>
              <select
                id="account-type"
                value={accountType}
                onChange={e => setAccountType(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="cheque">Cheque</option>
                <option value="savings">Savings</option>
                <option value="transmission">Transmission</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch-code">Branch Code</Label>
              <Input id="branch-code" placeholder="250655" value={branchCode} onChange={e => setBranchCode(e.target.value)} />
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-900">
              <p className="font-medium">Important</p>
              <p className="text-yellow-800">This bank account will be used for EFT payments. Customers will pay into this account via the EFT payment flow.</p>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => window.location.reload()}>Cancel</Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : "Update Account"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Notification Settings Component
function NotificationSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [prefs, setPrefs] = useState({
    payment_completed: true,
    payment_failed: true,
    weekly_summary: false,
    security_alerts: true,
  });

  useEffect(() => {
    fetch("/api/merchant/settings")
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const np = data.data.notifications.notificationPreferences || {};
          setPrefs(p => ({ ...p, ...np }));
        }
      })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, []);

  const togglePref = (key: keyof typeof prefs) => {
    setPrefs(p => ({ ...p, [key]: !p[key] }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/merchant/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationPreferences: prefs }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Preferences saved", description: "Your notification preferences have been updated." });
      } else {
        toast({ title: "Error", description: data.error || "Failed to save", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to save preferences", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <Card><CardContent className="py-8 text-center text-gray-500">Loading preferences...</CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>Manage how you receive notifications</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Payment Notifications</p>
              <p className="text-sm text-gray-600">Receive notifications when payments are completed</p>
            </div>
            <input type="checkbox" checked={prefs.payment_completed} onChange={() => togglePref("payment_completed")} className="w-4 h-4" />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Failed Payment Alerts</p>
              <p className="text-sm text-gray-600">Get notified when payments fail</p>
            </div>
            <input type="checkbox" checked={prefs.payment_failed} onChange={() => togglePref("payment_failed")} className="w-4 h-4" />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Weekly Summary</p>
              <p className="text-sm text-gray-600">Receive weekly transaction summaries</p>
            </div>
            <input type="checkbox" checked={prefs.weekly_summary} onChange={() => togglePref("weekly_summary")} className="w-4 h-4" />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Security Alerts</p>
              <p className="text-sm text-gray-600">Important security notifications</p>
            </div>
            <input type="checkbox" checked={prefs.security_alerts} onChange={() => togglePref("security_alerts")} className="w-4 h-4" />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => window.location.reload()}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save Preferences"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// EFT URL Settings Component
function EftUrlSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [notifyUrl, setNotifyUrl] = useState("");
  const [successUrl, setSuccessUrl] = useState("");
  const [failureUrl, setFailureUrl] = useState("");
  const [cancelledUrl, setCancelledUrl] = useState("");

  useEffect(() => {
    fetch("/api/merchant/settings")
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data.eftSettings) {
          const eft = data.data.eftSettings;
          setWebhookUrl(eft.webhookUrl || "");
          setNotifyUrl(eft.notifyUrl || "");
          setSuccessUrl(eft.successUrl || "");
          setFailureUrl(eft.failureUrl || "");
          setCancelledUrl(eft.cancelledUrl || "");
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
          eftSettings: { webhookUrl, notifyUrl, successUrl, failureUrl, cancelledUrl },
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Saved", description: "EFT URL settings updated successfully." });
      } else {
        toast({ title: "Error", description: data.error || "Failed to save", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to save EFT settings", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <Card><CardContent className="py-8 text-center text-gray-500">Loading EFT settings...</CardContent></Card>;
  }

  const urlFields = [
    {
      id: "webhookUrl",
      label: "Webhook URL",
      value: webhookUrl,
      setter: setWebhookUrl,
      placeholder: "https://your-domain.com/webhooks/eft",
      description: "Receives POST notifications for all payment events (completed, failed, cancelled). This is the primary callback URL.",
      color: "text-blue-600",
    },
    {
      id: "notifyUrl",
      label: "Notify URL",
      value: notifyUrl,
      setter: setNotifyUrl,
      placeholder: "https://your-domain.com/api/eft/notify",
      description: "Legacy notification URL. Receives a POST with transaction status updates. Used if set per-transaction or as a default fallback.",
      color: "text-purple-600",
    },
    {
      id: "successUrl",
      label: "Success Redirect URL",
      value: successUrl,
      setter: setSuccessUrl,
      placeholder: "https://your-domain.com/payment/success",
      description: "Customer is redirected here after a successful EFT payment.",
      color: "text-green-600",
    },
    {
      id: "failureUrl",
      label: "Failure Redirect URL",
      value: failureUrl,
      setter: setFailureUrl,
      placeholder: "https://your-domain.com/payment/failed",
      description: "Customer is redirected here if the EFT payment fails.",
      color: "text-red-600",
    },
    {
      id: "cancelledUrl",
      label: "Cancelled Redirect URL",
      value: cancelledUrl,
      setter: setCancelledUrl,
      placeholder: "https://your-domain.com/payment/cancelled",
      description: "Customer is redirected here if they cancel the EFT payment.",
      color: "text-amber-600",
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="w-5 h-5 text-blue-600" />
            Default EFT URLs
          </CardTitle>
          <CardDescription>
            Set default callback and redirect URLs for your EFT payment transactions. These are used as fallbacks when URLs are not provided per-transaction via the API.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {urlFields.map((field) => (
            <div key={field.id} className="space-y-2">
              <Label htmlFor={field.id} className={`flex items-center gap-2 font-medium ${field.color}`}>
                {field.label}
              </Label>
              <Input
                id={field.id}
                type="url"
                placeholder={field.placeholder}
                value={field.value}
                onChange={(e) => field.setter(e.target.value)}
              />
              <p className="text-xs text-gray-500">{field.description}</p>
            </div>
          ))}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">How these URLs work</p>
              <p className="text-blue-800">
                When creating a payment link via the API, you can pass these URLs per-transaction. If not provided,
                these default URLs will be used. The <strong>Webhook URL</strong> and <strong>Notify URL</strong> receive
                server-to-server POST callbacks. The <strong>Success</strong>, <strong>Failure</strong>, and <strong>Cancelled</strong> URLs
                are where the customer&apos;s browser is redirected after the payment flow.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : "Save EFT Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Webhook Settings Component
function WebhookSettings() {
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
    { value: '*', label: '⭐ All Events (Wildcard)', description: 'Subscribe to all current and future events - recommended for simplicity', highlight: true },
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
      toast({
        title: "Error",
        description: "URL and at least one event are required",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          events: selectedEvents,
          isActive,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: "Webhook created successfully. Save your secret key!",
        });
        
        // Show secret in secure modal with copy button
        setSecretModalValue(data.data.webhook.secret);
        setSecretCopied(false);
        setSecretModalOpen(true);
        
        setShowCreateModal(false);
        setUrl("");
        setSelectedEvents([]);
        setIsActive(true);
        fetchWebhooks();
      } else {
        toast({
          title: "Error",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create webhook",
        variant: "destructive",
      });
    }
  };

  const handleDeleteWebhook = async (webhookId: string) => {
    if (!confirm('Are you sure you want to delete this webhook?')) {
      return;
    }

    try {
      const response = await fetch(`/api/webhooks?id=${webhookId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: "Webhook deleted successfully",
        });
        fetchWebhooks();
      } else {
        toast({
          title: "Error",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete webhook",
        variant: "destructive",
      });
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
        toast({
          title: "Success",
          description: `Webhook test successful! Response time: ${data.data.test.responseTime}ms`,
        });
      } else {
        toast({
          title: "Test Failed",
          description: data.data.test.errorMessage || "Webhook endpoint returned an error",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to test webhook",
        variant: "destructive",
      });
    }
  };

  const handleRegenerateSecret = async (webhookId: string) => {
    if (!confirm('Are you sure? This will invalidate the current secret.')) {
      return;
    }

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
        toast({
          title: "Success",
          description: "Secret regenerated successfully",
        });
      } else {
        toast({
          title: "Error",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to regenerate secret",
        variant: "destructive",
      });
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
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch deliveries",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-gray-600">Loading webhooks...</div>
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
                        Secret: <code className="bg-gray-100 px-2 py-1 rounded">{webhook.secret}</code>
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
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTestWebhook(webhook.id)}
                    >
                      <Activity className="w-4 h-4 mr-1" />
                      Test
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => viewDeliveries(webhook.id)}
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      View Logs
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRegenerateSecret(webhook.id)}
                    >
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Regenerate Secret
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteWebhook(webhook.id)}
                    >
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
              <Input
                id="webhook-url"
                type="url"
                placeholder="https://your-domain.com/webhooks/payment"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <p className="text-xs text-gray-600">
                The URL where webhook events will be sent
              </p>
            </div>

            <div className="space-y-2">
              <Label>Events to Subscribe</Label>
              <div className="space-y-2">
                {availableEvents.map((event) => (
                  <div 
                    key={event.value} 
                    className={`flex items-start gap-3 p-3 border rounded-lg ${
                      event.highlight ? 'bg-blue-50 border-blue-300 dark:bg-blue-900/20 dark:border-blue-700' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedEvents.includes(event.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          // If wildcard is selected, clear other selections
                          if (event.value === '*') {
                            setSelectedEvents(['*']);
                          } else {
                            // If selecting specific event, remove wildcard
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
                      <p className={`font-medium text-sm ${event.highlight ? 'text-blue-700 dark:text-blue-300' : ''}`}>
                        {event.label}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{event.description}</p>
                      {event.highlight && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-medium">
                          💡 Recommended: Automatically receive all events without managing individual subscriptions
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              <div>
                <p className="font-medium text-sm">Active</p>
                <p className="text-xs text-gray-600">Start receiving events immediately</p>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateWebhook}>
                Create Webhook
              </Button>
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
              <CardDescription>
                Copy and store this secret securely. It will not be shown again.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Secret Key</Label>
                <div className="flex gap-2">
                  <Input
                    value={secretModalValue}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(secretModalValue);
                      setSecretCopied(true);
                      toast({
                        title: "Copied!",
                        description: "Webhook secret copied to clipboard.",
                      });
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
                <Button onClick={() => setSecretModalOpen(false)}>
                  Done
                </Button>
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
              <Button variant="outline" onClick={() => setShowDeliveries(false)}>
                Close
              </Button>
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
                      <span className="text-xs text-gray-600">
                        {new Date(delivery.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm font-medium">{delivery.event}</p>
                    {delivery.statusCode && (
                      <p className="text-xs text-gray-600">Status: {delivery.statusCode}</p>
                    )}
                    {delivery.errorMessage && (
                      <p className="text-xs text-red-600 mt-1">{delivery.errorMessage}</p>
                    )}
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
              <li>• <code className="bg-gray-100 px-1 rounded">X-Webhook-Signature</code> - HMAC signature</li>
              <li>• <code className="bg-gray-100 px-1 rounded">X-Webhook-Timestamp</code> - Unix timestamp</li>
              <li>• <code className="bg-gray-100 px-1 rounded">X-Webhook-ID</code> - Unique event ID</li>
              <li>• <code className="bg-gray-100 px-1 rounded">X-Webhook-Event</code> - Event type</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-2">Best Practices</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>✓ Always verify webhook signatures</li>
              <li>✓ Return 200 OK quickly (process async)</li>
              <li>✓ Use HTTPS endpoints only</li>
              <li>✓ Implement idempotency (check event IDs)</li>
              <li>✓ Handle retries gracefully</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}
