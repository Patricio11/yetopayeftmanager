"use client";

import { useState } from "react";
import { Calendar, Building2, FileText, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface Merchant {
  id: string;
  name: string;
  companyName: string | null;
  email: string;
}

interface GenerateInvoiceDialogProps {
  merchants: Merchant[];
  onClose: () => void;
  onGenerated: () => void;
}

export function GenerateInvoiceDialog({ merchants, onClose, onGenerated }: GenerateInvoiceDialogProps) {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [merchantId, setMerchantId] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");

  // Default period: previous month
  const now = new Date();
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const [periodStart, setPeriodStart] = useState(prevMonthStart.toISOString().split("T")[0]);
  const [periodEnd, setPeriodEnd] = useState(prevMonthEnd.toISOString().split("T")[0]);

  const handleGenerate = async () => {
    if (!merchantId) {
      toast({ title: "Error", description: "Please select a merchant", variant: "destructive" });
      return;
    }
    if (!periodStart || !periodEnd) {
      toast({ title: "Error", description: "Please select a billing period", variant: "destructive" });
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch("/api/admin/recon/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantId,
          periodStart: new Date(periodStart).toISOString(),
          periodEnd: new Date(periodEnd + "T23:59:59").toISOString(),
          notes: notes || undefined,
          dueDate: dueDate || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({
          title: "Invoice Generated",
          description: `Invoice ${data.data.invoiceNumber} created successfully`,
        });
        onGenerated();
      } else {
        toast({ title: "Error", description: data.message || "Failed to generate invoice", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to generate invoice", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg shadow-2xl border-0">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/30">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle>Generate Invoice</CardTitle>
              <CardDescription>Create a new invoice based on completed transactions</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Merchant Select */}
          <div className="space-y-2">
            <Label htmlFor="merchant" className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400" />
              Merchant
            </Label>
            <select
              id="merchant"
              value={merchantId}
              onChange={(e) => setMerchantId(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">Select a merchant...</option>
              {merchants.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.companyName || m.name} ({m.email})
                </option>
              ))}
            </select>
          </div>

          {/* Billing Period */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="periodStart" className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                Period Start
              </Label>
              <Input
                id="periodStart"
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="periodEnd">Period End</Label>
              <Input
                id="periodEnd"
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date (optional, defaults to 30 days)</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
              placeholder="Any additional notes for this invoice..."
            />
          </div>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-3">
            <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-800">
              The invoice will be generated based on completed transactions in the selected period using the merchant&apos;s
              configured fee (or system default). The invoice is created as a <strong>draft</strong>.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={onClose} disabled={generating}>
              Cancel
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
            >
              {generating ? "Generating..." : "Generate Invoice"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
