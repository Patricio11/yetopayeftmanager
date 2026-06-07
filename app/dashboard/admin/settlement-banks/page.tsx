"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Landmark, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface SettlementBank {
  id: string;
  bankName: string;
  fullName: string | null;
  code: string;
  color: string | null;
  branchCode: string | null;
  enabled: boolean;
  displayOrder: number;
}

export default function SettlementBanksPage() {
  const { toast } = useToast();
  const [banks, setBanks] = useState<SettlementBank[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SettlementBank | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const [bankName, setBankName] = useState("");
  const [fullName, setFullName] = useState("");
  const [code, setCode] = useState("");
  const [color, setColor] = useState("#0066B3");
  const [branchCode, setBranchCode] = useState("");
  const [enabled, setEnabled] = useState(true);

  const fetchBanks = async () => {
    try {
      const res = await fetch("/api/admin/settlement-banks");
      const data = await res.json();
      if (data.success) setBanks(data.data);
    } catch {
      toast({ title: "Error", description: "Failed to load banks", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBanks(); }, []);

  const resetForm = () => {
    setBankName("");
    setFullName("");
    setCode("");
    setColor("#0066B3");
    setBranchCode("");
    setEnabled(true);
    setEditing(null);
  };

  const openAdd = () => { resetForm(); setDialogOpen(true); };

  const openEdit = (bank: SettlementBank) => {
    setEditing(bank);
    setBankName(bank.bankName);
    setFullName(bank.fullName || "");
    setCode(bank.code);
    setColor(bank.color || "#0066B3");
    setBranchCode(bank.branchCode || "");
    setEnabled(bank.enabled);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!bankName || !code) {
      toast({ title: "Error", description: "Bank name and code are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = { bankName, fullName: fullName || undefined, code: code.toLowerCase().replace(/\s+/g, "_"), color, branchCode: branchCode || undefined, enabled };
      const url = editing ? `/api/admin/settlement-banks/${editing.id}` : "/api/admin/settlement-banks";
      const method = editing ? "PATCH" : "POST";

      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();

      if (data.success) {
        toast({ title: editing ? "Bank updated" : "Bank added", description: `${bankName} has been ${editing ? "updated" : "added"}.` });
        setDialogOpen(false);
        fetchBanks();
      } else {
        toast({ title: "Error", description: data.error || "Failed to save", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to save bank", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (bank: SettlementBank) => {
    if (!confirm(`Delete ${bank.bankName}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/settlement-banks/${bank.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Deleted", description: `${bank.bankName} has been removed.` });
        fetchBanks();
      } else {
        toast({ title: "Error", description: data.error || "Failed to delete", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete bank", variant: "destructive" });
    }
  };

  const handleToggle = async (bank: SettlementBank) => {
    try {
      await fetch(`/api/admin/settlement-banks/${bank.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !bank.enabled }),
      });
      fetchBanks();
    } catch {
      toast({ title: "Error", description: "Failed to toggle bank", variant: "destructive" });
    }
  };

  const filtered = banks.filter(b =>
    b.bankName.toLowerCase().includes(search.toLowerCase()) ||
    b.code.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-slate-200 rounded" />
          <div className="h-64 bg-slate-200 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Settlement Banks</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Banks where merchants can receive payments</p>
        </div>
        <Button onClick={openAdd} className="bg-gradient-to-r from-amber-500 to-pink-600 hover:from-amber-600 hover:to-pink-700 text-white">
          <Plus className="w-4 h-4 mr-2" /> Add Bank
        </Button>
      </div>

      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search banks..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Bank</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Code</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Branch Code</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Enabled</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filtered.map(bank => (
                <tr key={bank.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: bank.color || "#6B7280" }}
                      >
                        <Landmark className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <span className="font-medium text-slate-900 dark:text-white">{bank.bankName}</span>
                        {bank.fullName && <p className="text-xs text-slate-400">{bank.fullName}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500 font-mono">{bank.code}</td>
                  <td className="px-4 py-3 text-sm text-slate-500 font-mono">{bank.branchCode || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <Switch checked={bank.enabled} onCheckedChange={() => handleToggle(bank)} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(bank)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(bank)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    {search ? "No banks match your search" : "No settlement banks configured yet"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-slate-400 mt-3">
        {banks.length} bank{banks.length !== 1 ? "s" : ""} total &middot; {banks.filter(b => b.enabled).length} enabled
      </p>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Bank" : "Add Settlement Bank"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Bank Name</Label>
              <Input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="e.g. FNB" />
            </div>

            <div className="space-y-2">
              <Label>Full Name <span className="text-slate-400 font-normal">(optional)</span></Label>
              <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g. First National Bank" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Code</Label>
                <Input
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  placeholder="e.g. capitec"
                  disabled={!!editing}
                />
              </div>
              <div className="space-y-2">
                <Label>Branch Code</Label>
                <Input value={branchCode} onChange={e => setBranchCode(e.target.value)} placeholder="e.g. 470010" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Brand Color</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={color}
                  onChange={e => setColor(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer"
                />
                <Input value={color} onChange={e => setColor(e.target.value)} className="flex-1 font-mono" />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label>Enabled</Label>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-amber-500 to-pink-600 hover:from-amber-600 hover:to-pink-700 text-white"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editing ? "Save Changes" : "Add Bank"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
