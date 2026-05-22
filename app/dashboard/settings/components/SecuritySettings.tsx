"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Shield, Lock, Smartphone, Monitor, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function SecuritySettings() {
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const hasMinLength = newPassword.length >= 8;
  const hasUpperLower = /(?=.*[a-z])(?=.*[A-Z])/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  const handlePasswordReset = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({ title: "Error", description: "All password fields are required", variant: "destructive" });
      return;
    }
    if (!hasMinLength || !hasUpperLower || !hasNumber) {
      toast({ title: "Error", description: "Password does not meet requirements", variant: "destructive" });
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
        body: JSON.stringify({ currentPassword, newPassword }),
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

  const RequirementCheck = ({ met, label }: { met: boolean; label: string }) => (
    <div className="flex items-center gap-2">
      <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors ${met ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-600"}`}>
        {met && <CheckCircle className="w-3 h-3 text-white" />}
      </div>
      <span className={`text-xs transition-colors ${met ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}`}>{label}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Change Password */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800/50 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-pink-600 flex items-center justify-center text-white">
              <Lock className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Change Password</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Update your password to keep your account secure</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="current-password" className="text-slate-700 dark:text-slate-300 text-sm">Current Password</Label>
            <div className="relative">
              <Input
                id="current-password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter current password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-slate-700 dark:text-slate-300 text-sm">New Password</Label>
              <Input
                id="new-password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter new password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-slate-700 dark:text-slate-300 text-sm">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          {newPassword.length > 0 && (
            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-3">Password Requirements</p>
              <div className="grid grid-cols-2 gap-2">
                <RequirementCheck met={hasMinLength} label="At least 8 characters" />
                <RequirementCheck met={hasUpperLower} label="Upper & lowercase letters" />
                <RequirementCheck met={hasNumber} label="At least one number" />
                <RequirementCheck met={passwordsMatch} label="Passwords match" />
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-700/50 flex justify-end gap-3">
          <Button variant="outline" size="sm" onClick={() => { setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }}>Cancel</Button>
          <Button size="sm" onClick={handlePasswordReset} disabled={loading} className="bg-gradient-to-r from-amber-500 to-pink-600 hover:from-amber-600 hover:to-pink-700 text-white border-0">
            {loading ? "Updating..." : "Update Password"}
          </Button>
        </div>
      </div>

      {/* Two-Factor Authentication */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800/50 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white">
              <Smartphone className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Two-Factor Authentication</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Add an extra layer of security to your account</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                <Shield className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">Authenticator App</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Not enabled</p>
              </div>
            </div>
            <Button variant="outline" size="sm">Enable 2FA</Button>
          </div>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800/50 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white">
              <Monitor className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Active Sessions</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Manage your active sessions across devices</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50/50 dark:bg-slate-800">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">Current Session</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Windows &bull; Chrome &bull; South Africa</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Last active: Just now</p>
            </div>
            <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
              Active
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
