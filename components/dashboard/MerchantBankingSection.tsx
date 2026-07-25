"use client";

import { useState, useEffect, useCallback } from "react";
import { CreditCard, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditBankAccountModal, type SettlementBankOption } from "@/components/dashboard/EditBankAccountModal";

/**
 * Merchant payout bank accounts with edit. `endpoint` serves GET (returns
 * { data: accounts, banks }) and PATCH (edit an account). Account numbers are
 * shown in FULL — never masked. Used on the partner merchant page (and reusable
 * for admin). Editing is allowed for whoever the endpoint authorises.
 */
export function MerchantBankingSection({ endpoint }: { endpoint: string }) {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [banks, setBanks] = useState<SettlementBankOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [editAccount, setEditAccount] = useState<any | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(endpoint);
      const j = await res.json();
      if (j.success) {
        setAccounts(j.data || []);
        if (Array.isArray(j.banks)) setBanks(j.banks);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-green-600" />
          Merchant Bank Accounts
        </h3>
        <p className="text-sm text-slate-500 mt-0.5">Bank accounts this merchant receives payments into</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-500 p-6">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading bank accounts…</span>
        </div>
      ) : accounts.length === 0 ? (
        <div className="p-10 text-center text-slate-500 text-sm">No bank accounts found</div>
      ) : (
        <div className="divide-y divide-slate-100">
          {accounts.map((a) => (
            <div key={a.id} className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: a.bankColor || "#059669" }}>
                    {(a.bankName || a.bankCode || "?")[0]}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{a.bankName || a.bankCode}</p>
                    <p className="text-sm text-slate-500">{a.accountHolderName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {a.isPrimary && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">Primary</span>}
                  {a.isVerified
                    ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700"><CheckCircle className="w-3 h-3 inline mr-1" />Verified</span>
                    : <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-800">Unverified</span>}
                  <Button variant="outline" size="sm" onClick={() => setEditAccount(a)} className="h-7 px-2 text-xs">Edit</Button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div><p className="text-xs text-slate-500">Account No.</p><p className="text-sm font-mono text-slate-900">{a.accountNumber || "—"}</p></div>
                <div><p className="text-xs text-slate-500">Type</p><p className="text-sm text-slate-900 capitalize">{a.accountType || "—"}</p></div>
                <div><p className="text-xs text-slate-500">Branch</p><p className="text-sm text-slate-900">{a.branchCode || "—"}</p></div>
                <div><p className="text-xs text-slate-500">Added</p><p className="text-sm text-slate-900">{a.createdAt ? new Date(a.createdAt).toLocaleDateString() : "—"}</p></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editAccount && (
        <EditBankAccountModal
          account={editAccount}
          banks={banks}
          patchUrl={endpoint}
          onClose={() => setEditAccount(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
