"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Switch } from "@/components/ui/switch";
import { CreditCard, Plus, Pencil, Trash2, Star, Landmark, ChevronsUpDown, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface BankAccount {
  id: string;
  accountNumber: string;
  accountHolderName: string;
  accountName: string | null;
  accountType: string | null;
  branchCode: string | null;
  branchName: string | null;
  bankCode: string | null;
  isPrimary: boolean | null;
  isVerified: boolean | null;
  createdAt: string;
  updatedAt: string;
  eftBanksId: string | null;
  settlementBankId: string | null;
  bankName: string | null;
  bankColor: string | null;
}

interface Bank {
  id: string;
  bankName: string;
  code: string;
  color: string | null;
  branchCode: string | null;
}

function BankCombobox({ banks, value, onChange }: { banks: Bank[]; value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const selected = banks.find(b => b.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selected ? (
            <div className="flex items-center gap-2 truncate">
              {selected.color && (
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: selected.color }} />
              )}
              <span className="truncate">{selected.bankName}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">Select a bank...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search banks..." />
          <CommandList>
            <CommandEmpty>No bank found.</CommandEmpty>
            <CommandGroup>
              {banks.map((bank) => (
                <CommandItem
                  key={bank.id}
                  value={bank.bankName}
                  onSelect={() => { onChange(bank.id); setOpen(false); }}
                >
                  <div className="flex items-center gap-2 flex-1">
                    {bank.color && (
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: bank.color }} />
                    )}
                    <span>{bank.bankName}</span>
                  </div>
                  <Check className={cn("ml-auto h-4 w-4", value === bank.id ? "opacity-100" : "opacity-0")} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function BankAccountsSettings() {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);

  const [selectedBankId, setSelectedBankId] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState("cheque");
  const [branchCode, setBranchCode] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      const [accountsRes, banksRes] = await Promise.all([
        fetch("/api/merchant/bank-accounts").then(r => r.json()),
        fetch("/api/merchant/settlement-banks").then(r => r.json()),
      ]);
      if (accountsRes.success) setAccounts(accountsRes.data.accounts);
      if (banksRes.success) setBanks(banksRes.data.banks);
    } catch {
      toast({ title: "Error", description: "Failed to load bank accounts", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const resetForm = () => {
    setSelectedBankId("");
    setAccountHolderName("");
    setAccountNumber("");
    setAccountName("");
    setAccountType("cheque");
    setBranchCode("");
    setIsPrimary(false);
    setEditingAccount(null);
  };

  const openAddDialog = () => { resetForm(); setDialogOpen(true); };

  const openEditDialog = (account: BankAccount) => {
    setEditingAccount(account);
    setSelectedBankId(account.settlementBankId || account.eftBanksId || "");
    setAccountHolderName(account.accountHolderName);
    setAccountNumber(account.accountNumber);
    setAccountName(account.accountName || "");
    setAccountType(account.accountType || "cheque");
    setBranchCode(account.branchCode || "");
    setIsPrimary(account.isPrimary || false);
    setDialogOpen(true);
  };

  const handleBankChange = (bankId: string) => {
    setSelectedBankId(bankId);
    const bank = banks.find(b => b.id === bankId);
    if (bank?.branchCode) setBranchCode(bank.branchCode);
  };

  const handleSave = async () => {
    if (!selectedBankId || !accountHolderName || !accountNumber) {
      toast({ title: "Error", description: "Bank, account holder name, and account number are required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        settlementBankId: selectedBankId || undefined,
        accountHolderName,
        accountNumber,
        accountName: accountName || undefined,
        accountType,
        isPrimary,
      };

      let res;
      if (editingAccount) {
        res = await fetch(`/api/merchant/bank-accounts/${editingAccount.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/merchant/bank-accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (data.success) {
        toast({ title: editingAccount ? "Account updated" : "Account added", description: data.message });
        setDialogOpen(false);
        resetForm();
        fetchData();
      } else {
        toast({ title: "Error", description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to save bank account", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this bank account?")) return;
    try {
      const res = await fetch(`/api/merchant/bank-accounts/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Deleted", description: "Bank account deleted successfully" });
        fetchData();
      } else {
        toast({ title: "Error", description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete bank account", variant: "destructive" });
    }
  };

  const handleSetPrimary = async (id: string) => {
    try {
      const res = await fetch(`/api/merchant/bank-accounts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPrimary: true }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Updated", description: "Primary account updated" });
        fetchData();
      } else {
        toast({ title: "Error", description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update primary account", variant: "destructive" });
    }
  };

  const maskAccountNumber = (num: string) => {
    if (num.length <= 4) return num;
    return "****" + num.slice(-4);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-2">
          <div className="h-5 w-32 bg-slate-200 dark:bg-slate-700 animate-pulse rounded" />
          <div className="h-9 w-28 bg-slate-200 dark:bg-slate-700 animate-pulse rounded-lg" />
        </div>
        {[...Array(2)].map((_, i) => (
          <div key={i} className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800/50 p-5 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
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
      {/* Add button */}
      <div className="flex justify-end">
        <Button size="sm" onClick={openAddDialog} className="bg-gradient-to-r from-amber-500 to-pink-600 hover:from-amber-600 hover:to-pink-700 text-white border-0">
          <Plus className="w-4 h-4 mr-2" />
          Add Account
        </Button>
      </div>

      {accounts.length === 0 ? (
        <div className="text-center py-12 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800/50">
          <Landmark className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">No bank accounts configured</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 mb-4">Add your first bank account to start receiving payments</p>
          <Button size="sm" onClick={openAddDialog} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Add Your First Bank Account
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((account) => (
            <div key={account.id} className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800/50 overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: (account.bankColor || "#F59E0B") + "20" }}>
                      {account.bankColor ? (
                        <span className="w-5 h-5 rounded-full" style={{ backgroundColor: account.bankColor }} />
                      ) : (
                        <Landmark className="w-5 h-5 text-amber-500" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900 dark:text-white">{account.bankName || "Unknown Bank"}</p>
                        {account.isPrimary && (
                          <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                            <Star className="w-3 h-3 mr-1" />
                            Primary
                          </Badge>
                        )}
                        {account.isVerified && (
                          <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                            Verified
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{account.accountHolderName}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 ml-13 pl-13">
                  <div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">Account Number</p>
                    <p className="font-mono text-sm font-medium text-slate-900 dark:text-white mt-0.5">{maskAccountNumber(account.accountNumber)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">Account Type</p>
                    <p className="capitalize text-sm font-medium text-slate-900 dark:text-white mt-0.5">{account.accountType || "Cheque"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">Branch Code</p>
                    <p className="font-mono text-sm font-medium text-slate-900 dark:text-white mt-0.5">{account.branchCode || "-"}</p>
                  </div>
                </div>
              </div>

              <div className="px-5 py-3 bg-slate-50/50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-700/50 flex gap-2">
                {!account.isPrimary && (
                  <Button size="sm" variant="ghost" onClick={() => handleSetPrimary(account.id)} className="text-xs h-8">
                    <Star className="w-3.5 h-3.5 mr-1" />
                    Set Primary
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => openEditDialog(account)} className="text-xs h-8">
                  <Pencil className="w-3.5 h-3.5 mr-1" />
                  Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(account.id)} className="text-xs h-8 text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20">
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog – uses BankCombobox defined below */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setDialogOpen(false); resetForm(); } else { setDialogOpen(true); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingAccount ? "Edit Bank Account" : "Add Bank Account"}</DialogTitle>
            <DialogDescription>
              {editingAccount ? "Update your bank account details" : "Link a bank account for receiving payments"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300 text-sm">Bank</Label>
              <BankCombobox
                banks={banks}
                value={selectedBankId}
                onChange={handleBankChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="holder-name" className="text-slate-700 dark:text-slate-300 text-sm">Account Holder Name</Label>
              <Input id="holder-name" placeholder="John Doe" value={accountHolderName} onChange={(e) => setAccountHolderName(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="acc-number" className="text-slate-700 dark:text-slate-300 text-sm">Account Number</Label>
              <Input id="acc-number" placeholder="62123456789" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="acc-name" className="text-slate-700 dark:text-slate-300 text-sm">Account Name (optional)</Label>
              <Input id="acc-name" placeholder="e.g., Business Account" value={accountName} onChange={(e) => setAccountName(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300 text-sm">Account Type</Label>
                <Select value={accountType} onValueChange={setAccountType}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="savings">Savings</SelectItem>
                    <SelectItem value="transmission">Transmission</SelectItem>
                    <SelectItem value="bond">Bond</SelectItem>
                    <SelectItem value="investment">Investment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="branch-code" className="text-slate-700 dark:text-slate-300 text-sm">Branch Code</Label>
                <Input id="branch-code" placeholder="250655" value={branchCode} onChange={(e) => setBranchCode(e.target.value)} />
                <p className="text-xs text-slate-400 dark:text-slate-500">Auto-filled from bank</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg">
              <Label htmlFor="is-primary" className="cursor-pointer text-sm text-slate-700 dark:text-slate-300">Set as primary account</Label>
              <Switch id="is-primary" checked={isPrimary} onCheckedChange={setIsPrimary} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-amber-500 to-pink-600 hover:from-amber-600 hover:to-pink-700 text-white border-0">
              {saving ? "Saving..." : editingAccount ? "Update Account" : "Add Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
