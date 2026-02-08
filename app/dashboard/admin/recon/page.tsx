"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileText, Plus, Search, Send, Eye, Trash2,
  DollarSign, TrendingUp, Clock, CheckCircle, AlertCircle, Receipt,
  RefreshCw, X, ArrowUpRight, Percent
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { GenerateInvoiceDialog } from "@/components/dashboard/recon/generate-invoice-dialog";
import { ViewInvoiceDialog } from "@/components/dashboard/recon/view-invoice-dialog";
import { FeeSettingsDialog } from "@/components/dashboard/recon/fee-settings-dialog";

interface Invoice {
  id: string;
  invoiceNumber: string;
  merchantId: string;
  merchantName: string | null;
  merchantEmail: string | null;
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
  items?: any[];
  merchantPhone?: string;
  merchantAddress?: any;
}

interface Merchant {
  id: string;
  name: string;
  companyName: string | null;
  email: string;
}

interface SystemFees {
  fixedFeeValue: string;
  percentageFeeValue: string;
  vatEnabled: boolean;
  vatRate: string;
}

const formatCurrency = (val: string | number) => {
  const num = typeof val === "string" ? parseFloat(val) : val;
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(num || 0);
};

const formatDate = (d: string | null) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
};

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  draft: { label: "Draft", color: "text-slate-600", bg: "bg-slate-100 border-slate-200", icon: FileText },
  sent: { label: "Sent", color: "text-blue-600", bg: "bg-blue-50 border-blue-200", icon: Send },
  paid: { label: "Paid", color: "text-green-600", bg: "bg-green-50 border-green-200", icon: CheckCircle },
  overdue: { label: "Overdue", color: "text-red-600", bg: "bg-red-50 border-red-200", icon: AlertCircle },
  cancelled: { label: "Cancelled", color: "text-gray-500", bg: "bg-gray-50 border-gray-200", icon: X },
};

export default function ReconPage() {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [systemFees, setSystemFees] = useState<SystemFees | null>(null);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showGenerate, setShowGenerate] = useState(false);
  const [showFeeSettings, setShowFeeSettings] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, statsRes, feeRes, mRes] = await Promise.all([
        fetch(`/api/admin/recon/invoices?status=${statusFilter}`),
        fetch("/api/admin/recon/stats"),
        fetch("/api/admin/recon/fees"),
        fetch("/api/admin/merchants"),
      ]);
      const [invData, statsData, feeData, mData] = await Promise.all([
        invRes.json(), statsRes.json(), feeRes.json(), mRes.json(),
      ]);
      if (invData.success) setInvoices(invData.data || []);
      if (statsData.success) setStats(statsData.data);
      if (feeData.success) setSystemFees(feeData.data);
      if (mData.success) setMerchants(mData.data || []);
    } catch (err) {
      console.error("Failed to load recon data:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/recon/invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Updated", description: `Invoice marked as ${newStatus}` });
        fetchAll();
      } else {
        toast({ title: "Error", description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update invoice", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this draft invoice?")) return;
    try {
      const res = await fetch(`/api/admin/recon/invoices/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Deleted", description: "Invoice deleted" });
        fetchAll();
      } else {
        toast({ title: "Error", description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete invoice", variant: "destructive" });
    }
  };

  const viewInvoiceDetail = async (invoice: Invoice) => {
    try {
      const res = await fetch(`/api/admin/recon/invoices/${invoice.id}`);
      const data = await res.json();
      if (data.success) setSelectedInvoice(data.data);
    } catch {
      toast({ title: "Error", description: "Failed to load invoice", variant: "destructive" });
    }
  };

  const filtered = invoices.filter((inv) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      inv.invoiceNumber?.toLowerCase().includes(s) ||
      inv.merchantName?.toLowerCase().includes(s) ||
      inv.merchantEmail?.toLowerCase().includes(s)
    );
  });

  const totalRevenue = stats?.totalRevenue || "0";
  const outstanding = stats?.outstanding || "0";
  const currentMonthTxns = stats?.currentMonth?.transactionCount || 0;
  const currentMonthVol = stats?.currentMonth?.transactionVolume || "0";

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
            Reconciliation
          </h1>
          <p className="text-slate-500 mt-1">Manage merchant invoices and EFT fee billing</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setShowFeeSettings(true)} className="gap-2">
            <Percent className="w-4 h-4" />
            Fee Settings
          </Button>
          <Button
            onClick={() => setShowGenerate(true)}
            className="gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg shadow-green-500/25"
          >
            <Plus className="w-4 h-4" />
            Generate Invoice
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatsCard icon={DollarSign} iconBg="bg-green-100" iconColor="text-green-600" shadowColor="shadow-green-500/5"
          gradientColor="from-green-500/10" label="Total Revenue" value={formatCurrency(totalRevenue)}
          sub={<span className="text-green-600 flex items-center gap-1"><ArrowUpRight className="w-3 h-3" />{stats?.totalRevenueCount || 0} paid invoices</span>} />
        <StatsCard icon={Clock} iconBg="bg-amber-100" iconColor="text-amber-600" shadowColor="shadow-amber-500/5"
          gradientColor="from-amber-500/10" label="Outstanding" value={formatCurrency(outstanding)}
          sub={<span className="text-amber-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{stats?.outstandingCount || 0} unpaid</span>} />
        <StatsCard icon={Receipt} iconBg="bg-blue-100" iconColor="text-blue-600" shadowColor="shadow-blue-500/5"
          gradientColor="from-blue-500/10" label="This Month Txns" value={String(currentMonthTxns)}
          sub={<span className="text-blue-600">transactions completed</span>} />
        <StatsCard icon={TrendingUp} iconBg="bg-purple-100" iconColor="text-purple-600" shadowColor="shadow-purple-500/5"
          gradientColor="from-purple-500/10" label="Monthly Volume" value={formatCurrency(currentMonthVol)}
          sub={<span className="text-purple-600">transaction volume</span>} />
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-lg">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Search invoices..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
            <div className="flex gap-2 flex-wrap">
              {["all", "draft", "sent", "paid", "overdue", "cancelled"].map((s) => (
                <Button key={s} variant={statusFilter === s ? "default" : "outline"} size="sm"
                  onClick={() => setStatusFilter(s)} className={statusFilter === s ? "bg-slate-900 text-white" : ""}>
                  {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                </Button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => fetchAll()} className="gap-2">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Table */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Invoice", "Merchant", "Period", "Txns", "Amount", "Status", "Due Date", "Actions"].map((h, i) => (
                  <th key={h} className={`${i === 4 || i === 7 ? "text-right" : "text-left"} px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={8} className="px-6 py-16 text-center">
                  <RefreshCw className="w-6 h-6 animate-spin text-slate-400 mx-auto mb-2" />
                  <p className="text-slate-500">Loading invoices...</p>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-16 text-center">
                  <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">No invoices found</p>
                  <p className="text-slate-400 text-sm mt-1">Generate your first invoice to get started</p>
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
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-900">{inv.merchantName || "—"}</p>
                      <p className="text-xs text-slate-500">{inv.merchantEmail}</p>
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
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => viewInvoiceDetail(inv)}><Eye className="w-4 h-4" /></Button>
                        {inv.status === "draft" && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => handleStatusChange(inv.id, "sent")}><Send className="w-4 h-4 text-blue-600" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(inv.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                          </>
                        )}
                        {inv.status === "sent" && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => handleStatusChange(inv.id, "paid")}><CheckCircle className="w-4 h-4 text-green-600" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => handleStatusChange(inv.id, "overdue")}><AlertCircle className="w-4 h-4 text-red-500" /></Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modals */}
      {showGenerate && (
        <GenerateInvoiceDialog merchants={merchants} onClose={() => setShowGenerate(false)} onGenerated={() => { setShowGenerate(false); fetchAll(); }} />
      )}
      {showFeeSettings && (
        <FeeSettingsDialog currentFees={systemFees} onClose={() => setShowFeeSettings(false)} onSaved={() => { setShowFeeSettings(false); fetchAll(); }} />
      )}
      {selectedInvoice && (
        <ViewInvoiceDialog invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} onStatusChange={(s) => { handleStatusChange(selectedInvoice.id, s); setSelectedInvoice(null); }} />
      )}
    </div>
  );
}

// ─── Stats Card ─────────────────────────────────────────────────────────────
function StatsCard({ icon: Icon, iconBg, iconColor, shadowColor, gradientColor, label, value, sub }: {
  icon: any; iconBg: string; iconColor: string; shadowColor: string; gradientColor: string;
  label: string; value: string; sub: React.ReactNode;
}) {
  return (
    <Card className={`relative overflow-hidden border-0 shadow-lg ${shadowColor}`}>
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${gradientColor} to-transparent rounded-bl-full`} />
      <CardContent className="pt-6">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
          <span className="text-sm font-medium text-slate-500">{label}</span>
        </div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-xs mt-1">{sub}</p>
      </CardContent>
    </Card>
  );
}
