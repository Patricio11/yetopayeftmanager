"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Mail, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function ProfileSettings() {
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
    return (
      <div className="space-y-6">
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800/50 p-6">
          <div className="space-y-2 mb-6">
            <div className="h-5 w-40 bg-slate-200 dark:bg-slate-700 animate-pulse rounded" />
            <div className="h-4 w-64 bg-slate-100 dark:bg-slate-700/50 animate-pulse rounded" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 animate-pulse rounded" />
                <div className="h-10 w-full bg-slate-100 dark:bg-slate-700/50 animate-pulse rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800/50 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-green-700 to-green-500 flex items-center justify-center text-white">
              <User className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Personal Information</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Update your name and contact details</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-700 dark:text-slate-300 text-sm">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="name"
                  placeholder="John Merchant"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700 dark:text-slate-300 text-sm">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  className="pl-10 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                />
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500">Email cannot be changed here</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-slate-700 dark:text-slate-300 text-sm">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+27 12 345 6789"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-700/50 flex justify-end gap-3">
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={loading} className="bg-gradient-to-r from-green-700 to-green-500 hover:from-green-800 hover:to-green-600 text-white border-0">
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
