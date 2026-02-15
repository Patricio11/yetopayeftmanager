"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Plus, Pencil, Trash2, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

export function BankAccountsSettings() {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);

  // Form state
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
        fetch("/api/merchant/banks").then(r => r.json()),
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

  const openAddDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (account: BankAccount) => {
    setEditingAccount(account);
    setSelectedBankId(account.eftBanksId || "");
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
    if (bank?.branchCode) {
      setBranchCode(bank.branchCode);
    }
  };

  const handleSave = async () => {
    if (!selectedBankId || !accountHolderName || !accountNumber) {
      toast({ title: "Error", description: "Bank, account holder name, and account number are required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        eftBanksId: selectedBankId || undefined,
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
        toast({
          title: editingAccount ? "Account updated" : "Account added",
          description: data.message,
        });
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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-5 w-32 bg-slate-200 dark:bg-slate-700 animate-pulse rounded" />
              <div className="h-4 w-64 bg-slate-200 dark:bg-slate-700 animate-pulse rounded" />
            </div>
            <div className="h-9 w-28 bg-slate-200 dark:bg-slate-700 animate-pulse rounded-md" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 animate-pulse rounded-lg" />
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 animate-pulse rounded" />
                  <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 animate-pulse rounded" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-6 w-16 bg-slate-200 dark:bg-slate-700 animate-pulse rounded-full" />
                <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 animate-pulse rounded" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Bank Accounts
              </CardTitle>
              <CardDescription>
                Manage your bank accounts for receiving EFT payments
              </CardDescription>
            </div>
            <Button onClick={openAddDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Add Account
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 mb-4">No bank accounts configured</p>
              <Button onClick={openAddDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Bank Account
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {accounts.map((account) => (
                <div key={account.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          {account.bankColor && (
                            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: account.bankColor }} />
                          )}
                          <p className="font-semibold">{account.bankName || "Unknown Bank"}</p>
                        </div>
                        {account.isPrimary && (
                          <Badge className="bg-blue-50 text-blue-700 border-blue-200" variant="outline">
                            <Star className="w-3 h-3 mr-1" />
                            Primary
                          </Badge>
                        )}
                        {account.isVerified && (
                          <Badge className="bg-green-50 text-green-700 border-green-200" variant="outline">
                            Verified
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-gray-600">
                        <div>
                          <p className="text-xs text-gray-400">Account Holder</p>
                          <p className="font-medium text-gray-900">{account.accountHolderName}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Account Number</p>
                          <p className="font-mono font-medium text-gray-900">{maskAccountNumber(account.accountNumber)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Account Type</p>
                          <p className="capitalize font-medium text-gray-900">{account.accountType || "Cheque"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Branch Code</p>
                          <p className="font-mono font-medium text-gray-900">{account.branchCode || "-"}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-3 mt-3 border-t">
                    {!account.isPrimary && (
                      <Button size="sm" variant="outline" onClick={() => handleSetPrimary(account.id)}>
                        <Star className="w-4 h-4 mr-1" />
                        Set Primary
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => openEditDialog(account)}>
                      <Pencil className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(account.id)}>
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setDialogOpen(false); resetForm(); } else { setDialogOpen(true); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingAccount ? "Edit Bank Account" : "Add Bank Account"}</DialogTitle>
            <DialogDescription>
              {editingAccount ? "Update your bank account details" : "Link a bank account for receiving EFT payments"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Bank</Label>
              <Select value={selectedBankId} onValueChange={handleBankChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a bank" />
                </SelectTrigger>
                <SelectContent>
                  {banks.map((bank) => (
                    <SelectItem key={bank.id} value={bank.id}>
                      <div className="flex items-center gap-2">
                        {bank.color && (
                          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: bank.color }} />
                        )}
                        {bank.bankName}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="holder-name">Account Holder Name</Label>
              <Input id="holder-name" placeholder="John Doe" value={accountHolderName} onChange={(e) => setAccountHolderName(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="acc-number">Account Number</Label>
              <Input id="acc-number" placeholder="62123456789" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="acc-name">Account Name (optional)</Label>
              <Input id="acc-name" placeholder="e.g., Business Account" value={accountName} onChange={(e) => setAccountName(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Account Type</Label>
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
                <Label htmlFor="branch-code">Branch Code</Label>
                <Input id="branch-code" placeholder="250655" value={branchCode} onChange={(e) => setBranchCode(e.target.value)} />
                <p className="text-xs text-gray-500">Auto-filled from bank</p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 border rounded-lg">
              <input type="checkbox" id="is-primary" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} />
              <Label htmlFor="is-primary" className="cursor-pointer">Set as primary account</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editingAccount ? "Update Account" : "Add Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
