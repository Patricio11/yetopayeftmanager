"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Bell, CheckCircle, AlertTriangle, BarChart3, Shield, UserPlus } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { useToast } from "@/hooks/use-toast";

const NOTIFICATION_OPTIONS = [
  {
    key: "payment_completed" as const,
    label: "Payment Notifications",
    description: "Receive notifications when payments are completed",
    icon: CheckCircle,
    iconBg: "from-emerald-500 to-teal-600",
  },
  {
    key: "payment_failed" as const,
    label: "Failed Payment Alerts",
    description: "Get notified when payments fail",
    icon: AlertTriangle,
    iconBg: "from-red-500 to-rose-600",
  },
  {
    key: "weekly_summary" as const,
    label: "Weekly Summary",
    description: "Receive weekly transaction summaries",
    icon: BarChart3,
    iconBg: "from-blue-500 to-indigo-600",
  },
  {
    key: "security_alerts" as const,
    label: "Security Alerts",
    description: "Important security notifications",
    icon: Shield,
    iconBg: "from-violet-500 to-purple-600",
  },
];

export function NotificationSettings() {
  const { toast } = useToast();
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "admin";
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [prefs, setPrefs] = useState({
    payment_completed: true,
    payment_failed: true,
    weekly_summary: false,
    security_alerts: true,
  });

  const [registrationEmails, setRegistrationEmails] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminFetching, setAdminFetching] = useState(true);

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

  useEffect(() => {
    if (!isAdmin) { setAdminFetching(false); return; }
    fetch("/api/admin/settings/platform")
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setRegistrationEmails(data.settings.registration_notification_emails || "");
        }
      })
      .catch(() => {})
      .finally(() => setAdminFetching(false));
  }, [isAdmin]);

  const handleSaveRegistrationEmails = async () => {
    setAdminLoading(true);
    try {
      const res = await fetch("/api/admin/settings/platform", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registration_notification_emails: registrationEmails }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Saved", description: "Registration notification emails updated." });
      } else {
        toast({ title: "Error", description: data.error || "Failed to save", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to save settings", variant: "destructive" });
    } finally {
      setAdminLoading(false);
    }
  };

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
    return (
      <div className="space-y-6">
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800/50 p-6">
          <div className="space-y-2 mb-6">
            <div className="h-5 w-44 bg-slate-200 dark:bg-slate-700 animate-pulse rounded" />
            <div className="h-4 w-56 bg-slate-100 dark:bg-slate-700/50 animate-pulse rounded" />
          </div>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 border border-slate-100 dark:border-slate-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-slate-200 dark:bg-slate-700 animate-pulse rounded-lg" />
                  <div className="space-y-1.5">
                    <div className="h-4 w-36 bg-slate-200 dark:bg-slate-700 animate-pulse rounded" />
                    <div className="h-3 w-52 bg-slate-100 dark:bg-slate-700/50 animate-pulse rounded" />
                  </div>
                </div>
                <div className="h-6 w-10 bg-slate-200 dark:bg-slate-700 animate-pulse rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notification Preferences */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800/50 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-pink-600 flex items-center justify-center text-white">
              <Bell className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Notification Preferences</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Choose how you want to be notified</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-3">
          {NOTIFICATION_OPTIONS.map(({ key, label, description, icon: Icon, iconBg }) => (
            <div
              key={key}
              className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
                prefs[key]
                  ? "border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800"
                  : "border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${iconBg} flex items-center justify-center text-white opacity-${prefs[key] ? "100" : "40"} transition-opacity`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
                </div>
              </div>
              <Switch checked={prefs[key]} onCheckedChange={() => togglePref(key)} />
            </div>
          ))}
        </div>

        <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-700/50 flex justify-end gap-3">
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={loading} className="bg-gradient-to-r from-amber-500 to-pink-600 hover:from-amber-600 hover:to-pink-700 text-white border-0">
            {loading ? "Saving..." : "Save Preferences"}
          </Button>
        </div>
      </div>

      {/* Admin: Registration notification emails */}
      {isAdmin && (
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800/50 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white">
                <UserPlus className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">User Registration Notifications</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Get notified when new users register and verify their email</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {adminFetching ? (
              <div className="space-y-2">
                <div className="h-4 w-48 bg-slate-200 dark:bg-slate-700 animate-pulse rounded" />
                <div className="h-10 w-full bg-slate-100 dark:bg-slate-700/50 animate-pulse rounded-lg" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="registration-emails" className="text-slate-700 dark:text-slate-300 text-sm">Notification Email Addresses</Label>
                  <Input
                    id="registration-emails"
                    placeholder="admin@yetopay.co.za, ops@yetopay.co.za"
                    value={registrationEmails}
                    onChange={e => setRegistrationEmails(e.target.value)}
                  />
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Comma-separated emails. These addresses receive notifications when a new user registers and when they verify their email.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-700/50 flex justify-end">
            <Button size="sm" onClick={handleSaveRegistrationEmails} disabled={adminLoading} className="bg-gradient-to-r from-amber-500 to-pink-600 hover:from-amber-600 hover:to-pink-700 text-white border-0">
              {adminLoading ? "Saving..." : "Save Notification Emails"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
