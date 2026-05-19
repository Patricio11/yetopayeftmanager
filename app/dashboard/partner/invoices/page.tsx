"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileText, Receipt, CheckCircle, AlertCircle, Send, X, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Invoice {
  id: string;
  invoiceNumber: string;
  periodStart: string;
  periodEnd: string;
  totalAmount: string;
  status: string;
  dueDate: string | null;
  createdAt: string;
}

const formatCurrency = (val: string | number) => {
  const num = typeof val === "string" ? parseFloat(val) : val;
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(num || 0);
};

const formatDate = (d: string | null) => {
  if (!d) return "\u2014";
  return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
};

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  draft: { label: "Draft", color: "text-gray-600", bg: "bg-gray-100 border-gray-200", icon: FileText },
  sent: { label: "Sent", color: "text-blue-600", bg: "bg-blue-50 border-blue-200", icon: Send },
  paid: { label: "Paid", color: "text-amber-500", bg: "bg-amber-50 border-amber-200", icon: CheckCircle },
  overdue: { label: "Overdue", color: "text-red-600", bg: "bg-red-50 border-red-200", icon: AlertCircle },
  cancelled: { label: "Cancelled", color: "text-gray-500", bg: "bg-gray-50 border-gray-200", icon: X },
};

export default function PartnerInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/partner/invoices");
      const json = await res.json();
      if (json.success) {
        setInvoices(json.data || []);
      } else {
        setError(json.error || "Failed to load invoices");
      }
    } catch {
      setError("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
          Commission Invoices
        </h1>
        <p className="text-slate-500 mt-1">Your partner commission invoices and payment history</p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-white rounded-xl border border-red-200 p-8 shadow-sm text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-slate-900 font-medium">{error}</p>
          <Button variant="outline" className="mt-4" onClick={fetchInvoices}>Retry</Button>
        </div>
      )}

      {/* Invoice Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Invoice Number</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Period</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 w-28 bg-slate-200 rounded" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-40 bg-slate-200 rounded" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-24 bg-slate-200 rounded ml-auto" /></td>
                    <td className="px-6 py-4"><div className="h-6 w-20 bg-slate-200 rounded-full" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-28 bg-slate-200 rounded" /></td>
                  </tr>
                ))
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">No commission invoices yet.</p>
                    <p className="text-slate-400 text-sm mt-1">
                      Invoices will appear here once commission periods are processed
                    </p>
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const sc = statusConfig[inv.status] || statusConfig.draft;
                  const StatusIcon = sc.icon;
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-slate-900">{inv.invoiceNumber}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {formatDate(inv.periodStart)} &ndash; {formatDate(inv.periodEnd)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-bold text-slate-900">
                          {formatCurrency(inv.totalAmount)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${sc.bg} ${sc.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {formatDate(inv.dueDate)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
