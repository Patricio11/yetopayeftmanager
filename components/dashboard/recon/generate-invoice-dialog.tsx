"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Calendar, Building2, FileText, AlertCircle, Search, ChevronDown, Check, X } from "lucide-react";
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
  const [merchantSearch, setMerchantSearch] = useState("");
  const [merchantDropdownOpen, setMerchantDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredMerchants = useMemo(() => {
    if (!merchantSearch.trim()) return merchants;
    const q = merchantSearch.toLowerCase();
    return merchants.filter(
      (m) =>
        (m.companyName || "").toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q)
    );
  }, [merchants, merchantSearch]);

  const selectedMerchant = merchants.find((m) => m.id === merchantId);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMerchantDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (merchantDropdownOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [merchantDropdownOpen]);

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [merchantSearch]);

  const handleMerchantKeyDown = (e: React.KeyboardEvent) => {
    if (!merchantDropdownOpen) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, filteredMerchants.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      const m = filteredMerchants[highlightedIndex];
      if (m) {
        setMerchantId(m.id);
        setMerchantSearch("");
        setMerchantDropdownOpen(false);
      }
    } else if (e.key === "Escape") {
      setMerchantDropdownOpen(false);
    }
  };
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-pink-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle>Generate Invoice</CardTitle>
              <CardDescription>Create a new invoice based on completed transactions</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Merchant Search Select */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400" />
              Merchant
            </Label>
            <div className="relative" ref={dropdownRef} onKeyDown={handleMerchantKeyDown}>
              {/* Trigger */}
              <button
                type="button"
                onClick={() => setMerchantDropdownOpen(!merchantDropdownOpen)}
                className={`w-full h-10 px-3 rounded-md border text-sm text-left flex items-center justify-between transition-all ${
                  merchantDropdownOpen
                    ? "border-amber-500 ring-2 ring-amber-500/20"
                    : "border-slate-200 hover:border-slate-300"
                } bg-white dark:bg-slate-800 dark:border-slate-700`}
              >
                {selectedMerchant ? (
                  <span className="truncate text-slate-900 dark:text-white">
                    {selectedMerchant.companyName || selectedMerchant.name}{" "}
                    <span className="text-slate-400">({selectedMerchant.email})</span>
                  </span>
                ) : (
                  <span className="text-slate-400">Search or select a merchant...</span>
                )}
                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                  {selectedMerchant && (
                    <span
                      role="button"
                      onClick={(e) => { e.stopPropagation(); setMerchantId(""); }}
                      className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      <X className="w-3.5 h-3.5 text-slate-400" />
                    </span>
                  )}
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${merchantDropdownOpen ? "rotate-180" : ""}`} />
                </div>
              </button>

              {/* Dropdown */}
              {merchantDropdownOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl overflow-hidden">
                  {/* Search input */}
                  <div className="p-2 border-b border-slate-100 dark:border-slate-700">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={merchantSearch}
                        onChange={(e) => setMerchantSearch(e.target.value)}
                        placeholder="Search by name or email..."
                        className="w-full h-9 pl-8 pr-3 text-sm rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Results */}
                  <div className="max-h-52 overflow-y-auto">
                    {filteredMerchants.length === 0 ? (
                      <div className="px-3 py-6 text-center text-sm text-slate-400">
                        No merchants found
                      </div>
                    ) : (
                      filteredMerchants.map((m, idx) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setMerchantId(m.id);
                            setMerchantSearch("");
                            setMerchantDropdownOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                            idx === highlightedIndex
                              ? "bg-amber-50 dark:bg-amber-900/20"
                              : "hover:bg-slate-50 dark:hover:bg-slate-700/50"
                          } ${m.id === merchantId ? "bg-amber-50/50 dark:bg-amber-900/10" : ""}`}
                        >
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-pink-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {(m.companyName || m.name || "?")[0].toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                              {m.companyName || m.name}
                            </p>
                            <p className="text-xs text-slate-500 truncate">{m.email}</p>
                          </div>
                          {m.id === merchantId && (
                            <Check className="w-4 h-4 text-amber-500 flex-shrink-0" />
                          )}
                        </button>
                      ))
                    )}
                  </div>

                  {/* Count */}
                  {merchants.length > 5 && (
                    <div className="px-3 py-1.5 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-400">
                      {filteredMerchants.length} of {merchants.length} merchants
                    </div>
                  )}
                </div>
              )}
            </div>
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
              className="w-full px-3 py-2 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
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
              className="bg-gradient-to-r from-amber-500 to-pink-600 hover:from-amber-600 hover:to-pink-700 text-white"
            >
              {generating ? "Generating..." : "Generate Invoice"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
