"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export function NotificationSettings() {
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
