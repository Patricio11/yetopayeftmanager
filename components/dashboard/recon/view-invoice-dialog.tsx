"use client";

import {
  FileText, Send, CheckCircle, AlertCircle, X, Download,
  Building2, Calendar, Hash, DollarSign, Mail, Phone, MapPin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

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
  merchantId: string;
  merchantName: string | null;
  merchantEmail: string | null;
  merchantPhone?: string;
  merchantAddress?: any;
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
  return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
};

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "Draft", color: "text-slate-600", bg: "bg-slate-100 border-slate-300" },
  sent: { label: "Sent", color: "text-blue-600", bg: "bg-blue-50 border-blue-300" },
  paid: { label: "Paid", color: "text-green-600", bg: "bg-green-50 border-green-300" },
  overdue: { label: "Overdue", color: "text-red-600", bg: "bg-red-50 border-red-300" },
  cancelled: { label: "Cancelled", color: "text-gray-500", bg: "bg-gray-50 border-gray-300" },
};

interface ViewInvoiceDialogProps {
  invoice: Invoice;
  onClose: () => void;
  onStatusChange: (status: string) => void;
}

export function ViewInvoiceDialog({ invoice, onClose, onStatusChange }: ViewInvoiceDialogProps) {
  const sc = statusConfig[invoice.status] || statusConfig.draft;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-2xl shadow-2xl border-0 my-8">
        {/* Header */}
        <CardHeader className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-t-xl pb-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Invoice</p>
              <h2 className="text-2xl font-bold">{invoice.invoiceNumber}</h2>
              <div className="flex items-center gap-3 mt-2">
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${sc.bg} ${sc.color}`}>
                  {sc.label}
                </span>
                <span className="text-slate-400 text-sm">
                  Created {formatDate(invoice.createdAt)}
                </span>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {/* Merchant Info + Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Bill To</h3>
              <div className="space-y-1.5">
                <p className="font-semibold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  {invoice.merchantName || "—"}
                </p>
                {invoice.merchantEmail && (
                  <p className="text-sm text-slate-600 flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    {invoice.merchantEmail}
                  </p>
                )}
                {invoice.merchantPhone && (
                  <p className="text-sm text-slate-600 flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {invoice.merchantPhone}
                  </p>
                )}
                {invoice.merchantAddress && (invoice.merchantAddress.street || invoice.merchantAddress.city) && (
                  <p className="text-sm text-slate-600 flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {[invoice.merchantAddress.street, invoice.merchantAddress.city, invoice.merchantAddress.state].filter(Boolean).join(", ")}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Invoice Details</h3>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Billing Period</span>
                  <span className="font-medium text-slate-900">
                    {formatDate(invoice.periodStart)} – {formatDate(invoice.periodEnd)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Due Date</span>
                  <span className="font-medium text-slate-900">{formatDate(invoice.dueDate)}</span>
                </div>
                {invoice.paidAt && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Paid On</span>
                    <span className="font-medium text-green-600">{formatDate(invoice.paidAt)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Fee Type</span>
                  <span className="font-medium text-slate-900">
                    {invoice.feeType === "fixed"
                      ? `Fixed — R${parseFloat(invoice.feeValue).toFixed(2)} / txn`
                      : `Percentage — ${parseFloat(invoice.feeValue)}%`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

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
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500">Unit Price</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item) => (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="px-4 py-3 text-slate-700">{item.description}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{item.quantity}</td>
                        <td className="px-4 py-3 text-right text-slate-600">
                          {invoice.feeType === "percentage"
                            ? formatCurrency(item.unitAmount)
                            : formatCurrency(item.unitAmount)}
                        </td>
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

          {/* Notes */}
          {invoice.notes && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-xs font-semibold text-green-800 uppercase tracking-wider mb-1">Notes</p>
              <p className="text-sm text-green-800">{invoice.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            {invoice.status === "draft" && (
              <>
                <Button variant="outline" onClick={() => onStatusChange("sent")} className="gap-2 text-blue-600 border-blue-200 hover:bg-blue-50">
                  <Send className="w-4 h-4" />
                  Mark as Sent
                </Button>
              </>
            )}
            {invoice.status === "sent" && (
              <>
                <Button variant="outline" onClick={() => onStatusChange("paid")} className="gap-2 text-green-600 border-green-200 hover:bg-green-50">
                  <CheckCircle className="w-4 h-4" />
                  Mark as Paid
                </Button>
                <Button variant="outline" onClick={() => onStatusChange("overdue")} className="gap-2 text-red-600 border-red-200 hover:bg-red-50">
                  <AlertCircle className="w-4 h-4" />
                  Mark Overdue
                </Button>
              </>
            )}
            {invoice.status === "overdue" && (
              <Button variant="outline" onClick={() => onStatusChange("paid")} className="gap-2 text-green-600 border-green-200 hover:bg-green-50">
                <CheckCircle className="w-4 h-4" />
                Mark as Paid
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
