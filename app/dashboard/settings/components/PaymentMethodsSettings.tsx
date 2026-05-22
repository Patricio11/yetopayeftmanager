"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Building2, CreditCard, QrCode, Ticket, Coins, Wallet,
  CheckCircle, XCircle, Zap, Loader2, Info,
} from "lucide-react";
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
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-6 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-200 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-40 bg-gray-200 rounded" />
                <div className="h-3 w-64 bg-gray-200 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="text-center py-16 bg-white border border-gray-200 rounded-xl">
        <Zap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">No payment methods available</p>
        <p className="text-sm text-gray-400 mt-1">Contact your administrator to enable payment services</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-medium">Payment Methods</p>
          <p className="mt-1">
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
            className={`bg-white border rounded-xl overflow-hidden transition-all ${
              service.isEnabled
                ? "border-emerald-200 shadow-sm"
                : "border-gray-200"
            }`}
          >
            <div className="p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{service.name}</h3>
                      {service.isEnabled && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                          <CheckCircle className="w-3 h-3" />Active
                        </span>
                      )}
                    </div>
                    {service.description && (
                      <p className="text-sm text-gray-500 mt-0.5">{service.description}</p>
                    )}
                    {service.fee && (
                      <p className="text-xs text-gray-400 mt-1">
                        Fee: {formatFee(service.fee)}
                        {service.fee.vatEnabled && " + VAT"}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => toggleService(service)}
                  disabled={isToggling}
                  className={`shrink-0 relative w-14 h-8 rounded-full transition-colors ${
                    service.isEnabled
                      ? "bg-emerald-500"
                      : "bg-gray-300"
                  } ${isToggling ? "opacity-50" : ""}`}
                >
                  {isToggling ? (
                    <Loader2 className="w-4 h-4 animate-spin absolute top-2 left-5 text-white" />
                  ) : (
                    <span
                      className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${
                        service.isEnabled ? "left-7" : "left-1"
                      }`}
                    />
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
