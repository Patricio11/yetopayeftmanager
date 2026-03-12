"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileText, Search, Eye, DollarSign, Clock, CheckCircle, AlertCircle,
  Receipt, RefreshCw, X, Send, Calendar, Hash, Building2, Mail, MapPin,
  ArrowUpRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitAmount: string;
  totalAmount: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  periodStart: string;
  periodEnd: string;
  subtotalAmount: string;
  vatAmount: string;
  totalAmount: string;
  transactionCount: number;
  transactionVolume: string;
  feeType: string;
  feeValue: string;
  vatRate: string;
  vatEnabled: boolean;
  status: string;
  dueDate: string | null;
  paidAt: string | null;
  sentAt: string | null;
  notes: string | null;
  createdAt: string;
  items?: InvoiceItem[];
}

const formatCurrency = (val: string | number) => {
  const num = typeof val === "string" ? parseFloat(val) : val;
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(num || 0);
};

const formatDate = (d: string | null) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
};

const formatDateLong = (d: string | null) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
};

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  draft: { label: "Draft", color: "text-slate-600", bg: "bg-slate-100 border-slate-200", icon: FileText },
  sent: { label: "Sent", color: "text-blue-600", bg: "bg-blue-50 border-blue-200", icon: Send },
  paid: { label: "Paid", color: "text-amber-500", bg: "bg-amber-50 border-amber-200", icon: CheckCircle },
  overdue: { label: "Overdue", color: "text-red-600", bg: "bg-red-50 border-red-200", icon: AlertCircle },
  cancelled: { label: "Cancelled", color: "text-gray-500", bg: "bg-gray-50 border-gray-200", icon: X },
};

export default function MerchantInvoicesPage() {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/merchant/invoices?status=${statusFilter}`);
      const data = await res.json();
      if (data.success) setInvoices(data.data || []);
    } catch {
      console.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const viewInvoiceDetail = async (invoice: Invoice) => {
    try {
      const res = await fetch(`/api/merchant/invoices/${invoice.id}`);
      const data = await res.json();
      if (data.success) setSelectedInvoice(data.data);
    } catch {
      toast({ title: "Error", description: "Failed to load invoice", variant: "destructive" });
    }
  };

  const filtered = invoices.filter((inv) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return inv.invoiceNumber?.toLowerCase().includes(s);
  });

  // Summary stats
  const totalOwed = invoices
    .filter((i) => ["sent", "overdue"].includes(i.status))
    .reduce((sum, i) => sum + parseFloat(i.totalAmount), 0);
  const totalPaid = invoices
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + parseFloat(i.totalAmount), 0);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
          My Invoices
        </h1>
        <p className="text-slate-500 mt-1">View your Pay By Bank transaction fee invoices</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="relative overflow-hidden border-0 shadow-lg shadow-amber-500/5">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-500/10 to-transparent rounded-bl-full" />
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <span className="text-sm font-medium text-slate-500">Amount Due</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalOwed)}</p>
            <p className="text-xs text-amber-600 mt-1">
              {invoices.filter((i) => ["sent", "overdue"].includes(i.status)).length} outstanding invoices
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-lg shadow-amber-500/5">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-500/10 to-transparent rounded-bl-full" />
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-amber-500" />
              </div>
              <span className="text-sm font-medium text-slate-500">Total Paid</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalPaid)}</p>
            <p className="text-xs text-amber-500 mt-1 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" />
              {invoices.filter((i) => i.status === "paid").length} invoices paid
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-lg shadow-blue-500/5">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-transparent rounded-bl-full" />
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Receipt className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-slate-500">Total Invoices</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{invoices.length}</p>
            <p className="text-xs text-blue-600 mt-1">all time</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-lg">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Search by invoice number..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
            <div className="flex gap-2 flex-wrap">
              {["all", "sent", "paid", "overdue"].map((s) => (
                <Button key={s} variant={statusFilter === s ? "default" : "outline"} size="sm"
                  onClick={() => setStatusFilter(s)} className={statusFilter === s ? "bg-slate-900 text-white" : ""}>
                  {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                </Button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => fetchInvoices()}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Invoice List */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Invoice</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Period</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Transactions</th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Due Date</th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <>
                  {[...Array(5)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4"><div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" /></td>
                      <td className="px-6 py-4"><div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded" /></td>
                      <td className="px-6 py-4"><div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded" /></td>
                      <td className="px-6 py-4"><div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded" /></td>
                      <td className="px-6 py-4"><div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded-full" /></td>
                      <td className="px-6 py-4"><div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" /></td>
                      <td className="px-6 py-4"><div className="h-8 w-16 bg-slate-200 dark:bg-slate-700 rounded" /></td>
                    </tr>
                  ))}
                </>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-16 text-center">
                  <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">No invoices yet</p>
                  <p className="text-slate-400 text-sm mt-1">Your invoices will appear here once generated</p>
                </td></tr>
              ) : filtered.map((inv) => {
                const sc = statusConfig[inv.status] || statusConfig.draft;
                const StatusIcon = sc.icon;
                return (
                  <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <button onClick={() => viewInvoiceDetail(inv)} className="text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline">
                        {inv.invoiceNumber}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {formatDate(inv.periodStart)} – {formatDate(inv.periodEnd)}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-900">{inv.transactionCount}</p>
                      <p className="text-xs text-slate-500">Vol: {formatCurrency(inv.transactionVolume)}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-sm font-bold text-slate-900">{formatCurrency(inv.totalAmount)}</p>
                      {inv.vatEnabled && <p className="text-xs text-slate-500">incl. {formatCurrency(inv.vatAmount)} VAT</p>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${sc.bg} ${sc.color}`}>
                        <StatusIcon className="w-3 h-3" />{sc.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{formatDate(inv.dueDate)}</td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm" onClick={() => viewInvoiceDetail(inv)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* View Invoice Modal */}
      {selectedInvoice && (
        <MerchantViewInvoiceDialog invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />
      )}
    </div>
  );
}

// ─── Merchant Invoice View Dialog ───────────────────────────────────────────
function MerchantViewInvoiceDialog({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const sc = statusConfig[invoice.status] || statusConfig.draft;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-2xl shadow-2xl border-0 my-8">
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-t-xl p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Invoice</p>
              <h2 className="text-2xl font-bold">{invoice.invoiceNumber}</h2>
              <div className="flex items-center gap-3 mt-2">
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${sc.bg} ${sc.color}`}>
                  {sc.label}
                </span>
                <span className="text-slate-400 text-sm">Created {formatDate(invoice.createdAt)}</span>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <CardContent className="space-y-6 pt-6">
          {/* Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex justify-between"><span className="text-slate-500">Billing Period</span></div>
              <p className="font-medium text-slate-900">{formatDateLong(invoice.periodStart)} – {formatDateLong(invoice.periodEnd)}</p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between"><span className="text-slate-500">Due Date</span></div>
              <p className="font-medium text-slate-900">{formatDateLong(invoice.dueDate)}</p>
            </div>
          </div>

          {invoice.paidAt && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-amber-500" />
              <span className="text-sm text-amber-700 font-medium">Paid on {formatDateLong(invoice.paidAt)}</span>
            </div>
          )}

          {/* Transaction Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-lg p-4 text-center">
              <Hash className="w-5 h-5 text-slate-400 mx-auto mb-1" />
              <p className="text-2xl font-bold text-slate-900">{invoice.transactionCount}</p>
              <p className="text-xs text-slate-500">Transactions</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 text-center">
              <DollarSign className="w-5 h-5 text-slate-400 mx-auto mb-1" />
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(invoice.transactionVolume)}</p>
              <p className="text-xs text-slate-500">Total Volume</p>
            </div>
          </div>

          {/* Line Items */}
          {invoice.items && invoice.items.length > 0 && (
            <div>
              <h3 className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-3">Line Items</h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Description</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500">Qty</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500">Rate</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item) => (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="px-4 py-3 text-slate-700">{item.description}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{item.quantity}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(item.unitAmount)}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-900">{formatCurrency(item.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Totals */}
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-5 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-medium text-slate-700">{formatCurrency(invoice.subtotalAmount)}</span>
            </div>
            {invoice.vatEnabled && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">VAT ({parseFloat(invoice.vatRate)}%)</span>
                <span className="font-medium text-slate-700">{formatCurrency(invoice.vatAmount)}</span>
              </div>
            )}
            <Separator className="my-2" />
            <div className="flex justify-between">
              <span className="text-lg font-bold text-slate-900">Total</span>
              <span className="text-lg font-bold text-slate-900">{formatCurrency(invoice.totalAmount)}</span>
            </div>
          </div>

          {invoice.notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1">Notes</p>
              <p className="text-sm text-amber-800">{invoice.notes}</p>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
