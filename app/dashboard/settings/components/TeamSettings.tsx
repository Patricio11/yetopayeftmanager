"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  UserPlus, Mail, Shield, Users, Trash2, Send, X,
  Check, Loader2, ShieldCheck,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/hooks/use-toast";

const TEAM_ROLES = {
  admin: { label: "Admin", description: "Can manage settings, team, and transactions" },
  user: { label: "User", description: "Can view transactions and create payment links" },
};

const ALL_PERMISSIONS = [
  { key: "transactions.view", label: "View Transactions" },
  { key: "transactions.create", label: "Create Transactions" },
  { key: "settings.view", label: "View Settings" },
  { key: "settings.edit", label: "Edit Settings" },
  { key: "api-keys.manage", label: "Manage API Keys" },
  { key: "webhooks.manage", label: "Manage Webhooks" },
  { key: "bank-accounts.manage", label: "Manage Bank Accounts" },
  { key: "payment-links.create", label: "Create Payment Links" },
  { key: "analytics.view", label: "View Analytics" },
  { key: "team.manage", label: "Manage Team" },
];

const ALL_PERMISSION_KEYS = ALL_PERMISSIONS.map((p) => p.key);

const ROLE_DEFAULTS: Record<string, string[]> = {
  admin: [
    "transactions.view", "transactions.create", "settings.view", "settings.edit",
    "bank-accounts.manage", "payment-links.create", "analytics.view", "team.manage",
  ],
  user: [
    "transactions.view", "transactions.create", "payment-links.create", "analytics.view",
  ],
};

const isFullAccess = (perms: string[] | null) =>
  perms != null && ALL_PERMISSION_KEYS.every((k) => perms.includes(k));

interface TeamMember {
  id: string;
  userId: string;
  role: string;
  permissions: string[] | null;
  status: string;
  invitedAt: string | null;
  acceptedAt: string | null;
  userName: string | null;
  userEmail: string | null;
  userImage: string | null;
  userActive: boolean | null;
}

export function TeamSettings() {
  const { toast } = useToast();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [editMember, setEditMember] = useState<TeamMember | null>(null);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/merchant/team");
      const data = await res.json();
      if (data.success) {
        setMembers(data.data);
      }
    } catch {
      toast({ title: "Error", description: "Failed to load team members", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMembers(); }, []);

  const handleRemove = async (id: string) => {
    try {
      const res = await fetch(`/api/merchant/team/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setMembers(members.filter((m) => m.id !== id));
        toast({ title: "Removed", description: "Team member removed successfully" });
      } else {
        toast({ title: "Error", description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to remove team member", variant: "destructive" });
    }
    setConfirmRemoveId(null);
  };

  const handleResend = async (id: string) => {
    try {
      const res = await fetch(`/api/merchant/team/${id}`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Sent", description: data.message });
      } else {
        toast({ title: "Error", description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to resend invitation", variant: "destructive" });
    }
  };

  const roleBadge = (role: string, status: string) => {
    if (status === "pending") return <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">Pending</Badge>;
    if (status === "suspended") return <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50">Suspended</Badge>;
    if (role === "owner") return <Badge className="bg-purple-100 text-purple-700 border-purple-200">Owner</Badge>;
    if (role === "admin") return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Admin</Badge>;
    return <Badge variant="outline">User</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Team Members</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Invite people to your account and manage their permissions</p>
        </div>
        <Button
          onClick={() => setShowInvite(true)}
          className="bg-gradient-to-r from-green-700 to-green-500 hover:from-green-800 hover:to-green-600 text-white"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Invite Member
        </Button>
      </div>

      {/* Members list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="h-3 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : members.length === 0 ? (
        <div className="border border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-8 text-center">
          <Users className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600 dark:text-slate-400 font-medium">No team members yet</p>
          <p className="text-sm text-slate-500 mt-1">Invite people to help manage your account</p>
        </div>
      ) : (
        <div className="space-y-3">
          {members.map((member) => (
            <div
              key={member.id}
              className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800/50 p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-700 to-green-500 flex items-center justify-center text-white font-bold text-sm">
                    {(member.userName || member.userEmail || "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900 dark:text-white">
                        {member.userName || member.userEmail}
                      </p>
                      {roleBadge(member.role, member.status || "active")}
                      {member.role !== "owner" && isFullAccess(member.permissions) && (
                        <Badge className="bg-green-100 text-green-700 border-green-200">
                          <ShieldCheck className="w-3 h-3 mr-1" />
                          Full Access
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-500">{member.userEmail}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {member.status === "pending" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResend(member.id)}
                    >
                      <Send className="w-3.5 h-3.5 mr-1" />
                      Resend
                    </Button>
                  )}
                  {member.role !== "owner" && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditMember(member)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:bg-red-50 border-red-200"
                        onClick={() => setConfirmRemoveId(member.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
              {member.permissions && member.permissions.length > 0 && member.role !== "owner" && !isFullAccess(member.permissions) && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {member.permissions.map((p) => (
                    <span key={p} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      {ALL_PERMISSIONS.find((pp) => pp.key === p)?.label || p}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onSuccess={() => { setShowInvite(false); fetchMembers(); }}
        />
      )}

      {editMember && (
        <EditModal
          member={editMember}
          onClose={() => setEditMember(null)}
          onSuccess={() => { setEditMember(null); fetchMembers(); }}
        />
      )}

      <ConfirmDialog
        open={!!confirmRemoveId}
        onOpenChange={(open) => { if (!open) setConfirmRemoveId(null); }}
        title="Remove Team Member"
        description="Are you sure you want to remove this team member? They will lose access to your account immediately."
        confirmLabel="Remove"
        variant="danger"
        onConfirm={() => { if (confirmRemoveId) handleRemove(confirmRemoveId); }}
      />
    </div>
  );
}

function PermissionPicker({ permissions, onChange }: { permissions: string[]; onChange: (perms: string[]) => void }) {
  const fullAccess = isFullAccess(permissions);

  const toggleFullAccess = () => {
    onChange(fullAccess ? [] : [...ALL_PERMISSION_KEYS]);
  };

  const togglePermission = (key: string) => {
    onChange(
      permissions.includes(key)
        ? permissions.filter((p) => p !== key)
        : [...permissions, key]
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Label className="text-sm font-medium">Permissions</Label>
        <button
          type="button"
          onClick={toggleFullAccess}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
            fullAccess
              ? "bg-green-100 text-green-700 border border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700"
              : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600"
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          Full Access
        </button>
      </div>

      {fullAccess && (
        <div className="mb-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <p className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            This member will have access to all features and permissions.
          </p>
        </div>
      )}

      <div className={`grid grid-cols-2 gap-2 ${fullAccess ? "opacity-50 pointer-events-none" : ""}`}>
        {ALL_PERMISSIONS.map(({ key, label }) => (
          <label
            key={key}
            className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
              permissions.includes(key)
                ? "bg-green-50 dark:bg-green-900/20"
                : "hover:bg-slate-50 dark:hover:bg-slate-700/50"
            }`}
          >
            <div
              className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                permissions.includes(key)
                  ? "bg-green-600 border-green-600"
                  : "border-slate-300 dark:border-slate-500"
              }`}
              onClick={() => togglePermission(key)}
            >
              {permissions.includes(key) && <Check className="w-3 h-3 text-white" />}
            </div>
            <span className="text-sm text-slate-700 dark:text-slate-300" onClick={() => togglePermission(key)}>
              {label}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

function InviteModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"admin" | "user">("user");
  const [permissions, setPermissions] = useState<string[]>(ROLE_DEFAULTS.user);
  const [sending, setSending] = useState(false);

  const handleRoleChange = (newRole: "admin" | "user") => {
    setRole(newRole);
    setPermissions(ROLE_DEFAULTS[newRole]);
  };

  const handleInvite = async () => {
    if (!email.trim() || !name.trim()) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/merchant/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, role, permissions }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Invitation sent", description: data.message });
        onSuccess();
      } else {
        toast({ title: "Error", description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to send invitation", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-700 to-green-500 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Invite Team Member</h3>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Name</Label>
              <Input
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Email</Label>
              <Input
                type="email"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Role Selection */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Role</Label>
            <div className="grid grid-cols-2 gap-3">
              {(Object.entries(TEAM_ROLES) as [string, { label: string; description: string }][]).map(([key, { label, description }]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleRoleChange(key as "admin" | "user")}
                  className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                    role === key
                      ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                      : "border-slate-200 dark:border-slate-600 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className={`w-4 h-4 ${role === key ? "text-green-600" : "text-slate-400"}`} />
                    <span className="font-medium text-sm text-slate-900 dark:text-white">{label}</span>
                  </div>
                  <p className="text-xs text-slate-500">{description}</p>
                </button>
              ))}
            </div>
          </div>

          <PermissionPicker permissions={permissions} onChange={setPermissions} />
        </div>

        <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleInvite}
            disabled={sending}
            className="bg-gradient-to-r from-green-700 to-green-500 hover:from-green-800 hover:to-green-600 text-white"
          >
            {sending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
            ) : (
              <><Mail className="w-4 h-4 mr-2" /> Send Invitation</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function EditModal({ member, onClose, onSuccess }: { member: TeamMember; onClose: () => void; onSuccess: () => void }) {
  const { toast } = useToast();
  const [role, setRole] = useState<"admin" | "user">(member.role as "admin" | "user");
  const [permissions, setPermissions] = useState<string[]>(member.permissions || []);
  const [status, setStatus] = useState(member.status || "active");
  const [saving, setSaving] = useState(false);

  const handleRoleChange = (newRole: "admin" | "user") => {
    setRole(newRole);
    setPermissions(ROLE_DEFAULTS[newRole]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/merchant/team/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, permissions, status }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Updated", description: "Team member updated successfully" });
        onSuccess();
      } else {
        toast({ title: "Error", description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update team member", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Edit {member.userName || member.userEmail}
            </h3>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Role Selection */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Role</Label>
            <div className="grid grid-cols-2 gap-3">
              {(Object.entries(TEAM_ROLES) as [string, { label: string; description: string }][]).map(([key, { label, description }]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleRoleChange(key as "admin" | "user")}
                  className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                    role === key
                      ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                      : "border-slate-200 dark:border-slate-600 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className={`w-4 h-4 ${role === key ? "text-green-600" : "text-slate-400"}`} />
                    <span className="font-medium text-sm text-slate-900 dark:text-white">{label}</span>
                  </div>
                  <p className="text-xs text-slate-500">{description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          {member.status !== "pending" && (
            <div>
              <Label className="text-sm font-medium mb-2 block">Status</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setStatus("active")}
                  className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                    status === "active"
                      ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                      : "border-slate-200 dark:border-slate-600"
                  }`}
                >
                  <span className="font-medium text-sm text-slate-900 dark:text-white">Active</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatus("suspended")}
                  className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                    status === "suspended"
                      ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                      : "border-slate-200 dark:border-slate-600"
                  }`}
                >
                  <span className="font-medium text-sm text-slate-900 dark:text-white">Suspended</span>
                </button>
              </div>
            </div>
          )}

          <PermissionPicker permissions={permissions} onChange={setPermissions} />
        </div>

        <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-green-700 to-green-500 hover:from-green-800 hover:to-green-600 text-white"
          >
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
