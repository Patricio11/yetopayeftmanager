"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface EditableAccount {
  id: string;
  accountNumber: string;
  accountHolderName: string;
  accountName?: string | null;
  accountType?: string | null;
  isPrimary?: boolean | null;
  settlementBankId?: string | null;
  bankName?: string | null;
}

export interface SettlementBankOption {
  id: string;
  bankName: string;
  fullName?: string | null;
  branchCode?: string | null;
}

const ACCOUNT_TYPES = ["cheque", "savings", "transmission", "bond", "investment"];

/**
 * Shared edit dialog for a merchant's payout bank account, used by both the
 * admin and partner merchant pages. PATCHes `patchUrl` with the account id and
 * changed fields. Account number is shown in full (never masked).
 */
export function EditBankAccountModal({
  account,
  banks,
  patchUrl,
  onClose,
  onSaved,
}: {
  account: EditableAccount;
  banks: SettlementBankOption[];
  patchUrl: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [settlementBankId, setSettlementBankId] = useState(account.settlementBankId || "");
  const [accountHolderName, setAccountHolderName] = useState(account.accountHolderName || "");
  const [accountNumber, setAccountNumber] = useState(account.accountNumber || "");
  const [accountType, setAccountType] = useState(account.accountType || "cheque");
  const [isPrimary, setIsPrimary] = useState(!!account.isPrimary);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!accountHolderName.trim() || !accountNumber.trim()) {
      setError("Account holder and number are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(patchUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: account.id,
          ...(settlementBankId ? { settlementBankId } : {}),
          accountHolderName: accountHolderName.trim(),
          accountNumber: accountNumber.trim(),
          accountType,
          isPrimary,
        }),
      });
      const j = await res.json();
      if (!res.ok || !j.success) throw new Error(j.message || "Failed to update account");
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message || "Failed to update account");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Edit bank account</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {banks.length > 0 && (
            <div>
              <Label htmlFor="eba-bank">Bank</Label>
              <select
                id="eba-bank"
                value={settlementBankId}
                onChange={(e) => setSettlementBankId(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm mt-1"
              >
                <option value="">{account.bankName || "Select bank"}</option>
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.fullName || b.bankName}{b.branchCode ? ` · ${b.branchCode}` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <Label htmlFor="eba-holder">Account holder</Label>
            <Input id="eba-holder" value={accountHolderName} onChange={(e) => setAccountHolderName(e.target.value)} className="mt-1" />
          </div>

          <div>
            <Label htmlFor="eba-number">Account number</Label>
            <Input id="eba-number" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className="mt-1 font-mono" inputMode="numeric" />
          </div>

          <div>
            <Label htmlFor="eba-type">Account type</Label>
            <select
              id="eba-type"
              value={accountType}
              onChange={(e) => setAccountType(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm mt-1 capitalize"
            >
              {ACCOUNT_TYPES.map((t) => (
                <option key={t} value={t} className="capitalize">{t}</option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} className="w-4 h-4" />
            <span className="text-sm text-slate-700 dark:text-slate-300">Primary payout account (payments settle here)</span>
          </label>

          {error && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{error}</p>}
        </div>

        <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="sm" onClick={save} disabled={saving} className="bg-gradient-to-r from-green-700 to-green-500 text-white border-0">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
