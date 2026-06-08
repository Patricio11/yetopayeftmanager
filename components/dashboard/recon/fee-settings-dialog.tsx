"use client";

import { useState } from "react";
import { Percent, DollarSign, AlertCircle, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface SystemFees {
  fixedFeeValue: string;
  percentageFeeValue: string;
  volumeFeeValue: string;
  vatEnabled: boolean;
  vatRate: string;
}

interface FeeSettingsDialogProps {
  currentFees: SystemFees | null;
  onClose: () => void;
  onSaved: () => void;
}

export function FeeSettingsDialog({ currentFees, onClose, onSaved }: FeeSettingsDialogProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [fixedFeeValue, setFixedFeeValue] = useState(currentFees?.fixedFeeValue || "5.00");
  const [percentageFeeValue, setPercentageFeeValue] = useState(currentFees?.percentageFeeValue || "2.50");
  const [volumeFeeValue, setVolumeFeeValue] = useState(currentFees?.volumeFeeValue || "2.00");
  const [vatEnabled, setVatEnabled] = useState(currentFees?.vatEnabled ?? true);
  const [vatRate, setVatRate] = useState(currentFees?.vatRate || "15.00");

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/recon/fees", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fixedFeeValue, percentageFeeValue, volumeFeeValue, vatEnabled, vatRate }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Settings Saved", description: "Default fee settings updated successfully" });
        onSaved();
      } else {
        toast({ title: "Error", description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to save settings", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md shadow-2xl border-0">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Percent className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle>Default Pay By Bank Fee Settings</CardTitle>
              <CardDescription>Set both fixed and percentage rates — each merchant is assigned one</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Fixed Fee */}
          <div className="space-y-2">
            <Label htmlFor="fixedFee" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-600" />
              Fixed Fee per Transaction (ZAR)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">R</span>
              <Input
                id="fixedFee"
                type="number"
                step="0.01"
                min="0"
                value={fixedFeeValue}
                onChange={(e) => setFixedFeeValue(e.target.value)}
                className="pl-8"
              />
            </div>
            <p className="text-xs text-slate-500">Flat rand amount charged per completed Pay By Bank transaction</p>
          </div>

          {/* Percentage Fee */}
          <div className="space-y-2">
            <Label htmlFor="percentageFee" className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-blue-600" />
              Percentage Fee (%)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
              <Input
                id="percentageFee"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={percentageFeeValue}
                onChange={(e) => setPercentageFeeValue(e.target.value)}
                className="pl-8"
              />
            </div>
            <p className="text-xs text-slate-500">Percentage of each transaction amount charged as fee</p>
          </div>

          {/* Volume Fee */}
          <div className="space-y-2">
            <Label htmlFor="volumeFee" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-green-700" />
              Volume Fee (%)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
              <Input
                id="volumeFee"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={volumeFeeValue}
                onChange={(e) => setVolumeFeeValue(e.target.value)}
                className="pl-8"
              />
            </div>
            <p className="text-xs text-slate-500">Percentage of total transaction volume for the billing period (e.g. 2%)</p>
          </div>

          {/* VAT Toggle */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Include VAT on Fees</Label>
              <button
                onClick={() => setVatEnabled(!vatEnabled)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  vatEnabled ? "bg-green-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    vatEnabled ? "translate-x-5" : ""
                  }`}
                />
              </button>
            </div>

            {vatEnabled && (
              <div className="space-y-2">
                <Label htmlFor="vatRate">VAT Rate (%)</Label>
                <Input
                  id="vatRate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={vatRate}
                  onChange={(e) => setVatRate(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex gap-3">
            <AlertCircle className="w-4 h-4 text-green-700 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-green-800">
              Set all three rates here. On each merchant&apos;s profile, you assign whether they use the <strong>fixed</strong>, <strong>percentage</strong>, or <strong>volume</strong> fee.
              Merchants can also have custom fee values that override these defaults.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
            >
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
