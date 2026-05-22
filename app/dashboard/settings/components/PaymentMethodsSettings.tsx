"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Building2, CreditCard, QrCode, Ticket, Coins, Wallet,
  CheckCircle, Zap, Loader2, Info,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

interface MerchantService {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string;
  icon: string | null;
  isEnabled: boolean;
  fee: {
    feeType: string;
    fixedFeeValue: string | null;
    percentageFeeValue: string | null;
    volumeFeeValue: string | null;
    vatEnabled: boolean | null;
    vatRate: string | null;
  } | null;
}

const CATEGORY_ICONS: Record<string, any> = {
  eft: Building2,
  card: CreditCard,
  qr: QrCode,
  voucher: Ticket,
  crypto: Coins,
  wallet: Wallet,
};

const CATEGORY_COLORS: Record<string, string> = {
  eft: "from-blue-500 to-blue-600",
  card: "from-violet-500 to-violet-600",
  qr: "from-emerald-500 to-emerald-600",
  voucher: "from-amber-500 to-amber-600",
  crypto: "from-orange-500 to-orange-600",
  wallet: "from-pink-500 to-pink-600",
};

export function PaymentMethodsSettings() {
  const { toast } = useToast();
  const [services, setServices] = useState<MerchantService[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchServices = useCallback(async () => {
    try {
      const res = await fetch("/api/merchant/services");
      const data = await res.json();
      if (data.success) setServices(data.data || []);
    } catch {
      toast({ title: "Error", description: "Failed to load services", variant: "destructive" });
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { fetchServices(); }, [fetchServices]);

  const toggleService = async (service: MerchantService) => {
    setToggling(service.code);
    try {
      const res = await fetch(`/api/merchant/services/${service.code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEnabled: !service.isEnabled }),
      });
      const data = await res.json();
      if (data.success) {
        setServices((prev) =>
          prev.map((s) =>
            s.code === service.code ? { ...s, isEnabled: !s.isEnabled } : s
          )
        );
        toast({
          title: !service.isEnabled ? "Service enabled" : "Service disabled",
          description: data.message,
        });
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update", variant: "destructive" });
    }
    setToggling(null);
  };

  const formatFee = (fee: MerchantService["fee"]) => {
    if (!fee) return "Contact admin for pricing";
    switch (fee.feeType) {
      case "fixed":
        return `R${parseFloat(fee.fixedFeeValue || "0").toFixed(2)} per transaction`;
      case "percentage":
        return `${parseFloat(fee.percentageFeeValue || "0").toFixed(2)}% per transaction`;
      case "volume":
        return `${parseFloat(fee.volumeFeeValue || "0").toFixed(2)}% of volume`;
      default:
        return "See fee details";
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800/50 p-5 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-40 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-3 w-64 bg-slate-100 dark:bg-slate-700/50 rounded" />
              </div>
              <div className="h-6 w-10 bg-slate-200 dark:bg-slate-700 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="text-center py-16 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800/50">
        <Zap className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
        <p className="text-slate-500 dark:text-slate-400 font-medium">No payment methods available</p>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Contact your administrator to enable payment services</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex gap-3">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800 dark:text-blue-300">
          <p className="font-medium">Payment Methods</p>
          <p className="mt-1 text-blue-700 dark:text-blue-400/80">
            Enable or disable payment methods for your customers. Your payment page will automatically
            show all enabled methods. Fees are set by your administrator.
          </p>
        </div>
      </div>

      {services.map((service) => {
        const Icon = CATEGORY_ICONS[service.category] || Zap;
        const gradient = CATEGORY_COLORS[service.category] || "from-slate-500 to-slate-600";
        const isToggling = toggling === service.code;

        return (
          <div
            key={service.code}
            className={`border rounded-xl overflow-hidden transition-all ${
              service.isEnabled
                ? "border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-800/50 shadow-sm"
                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/30"
            }`}
          >
            <div className="p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-sm`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900 dark:text-white">{service.name}</h3>
                      {service.isEnabled && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                          <CheckCircle className="w-3 h-3" />Active
                        </span>
                      )}
                    </div>
                    {service.description && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{service.description}</p>
                    )}
                    {service.fee && (
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                        Fee: {formatFee(service.fee)}
                        {service.fee.vatEnabled && " + VAT"}
                      </p>
                    )}
                  </div>
                </div>

                {isToggling ? (
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                ) : (
                  <Switch
                    checked={service.isEnabled}
                    onCheckedChange={() => toggleService(service)}
                  />
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
