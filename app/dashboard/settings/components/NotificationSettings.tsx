"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { useToast } from "@/hooks/use-toast";

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

  // Admin-only: registration notification emails
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
      <Card>
        <CardHeader>
          <div className="h-5 w-44 bg-slate-200 dark:bg-slate-700 animate-pulse rounded" />
          <div className="h-4 w-56 bg-slate-200 dark:bg-slate-700 animate-pulse rounded mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-2">
                <div className="h-4 w-36 bg-slate-200 dark:bg-slate-700 animate-pulse rounded" />
                <div className="h-3 w-56 bg-slate-200 dark:bg-slate-700 animate-pulse rounded" />
              </div>
              <div className="h-4 w-4 bg-slate-200 dark:bg-slate-700 animate-pulse rounded" />
            </div>
          ))}
          <div className="h-10 w-40 bg-slate-200 dark:bg-slate-700 animate-pulse rounded-md mt-2" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
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

    {isAdmin && (
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <CardTitle>User Registration Notifications</CardTitle>
              <CardDescription>Get notified when new users register and verify their email</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {adminFetching ? (
            <div className="space-y-2">
              <div className="h-4 w-48 bg-slate-200 dark:bg-slate-700 animate-pulse rounded" />
              <div className="h-10 w-full bg-slate-200 dark:bg-slate-700 animate-pulse rounded-md" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="registration-emails">Notification Email Addresses</Label>
                <Input
                  id="registration-emails"
                  placeholder="admin@yetopay.co.za, ops@yetopay.co.za"
                  value={registrationEmails}
                  onChange={e => setRegistrationEmails(e.target.value)}
                />
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Comma-separated emails. These addresses receive notifications when a new user registers and when they verify their email.
                </p>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveRegistrationEmails} disabled={adminLoading}>
                  {adminLoading ? "Saving..." : "Save Notification Emails"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    )}
    </>
  );
}
