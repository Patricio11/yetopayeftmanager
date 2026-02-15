"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExternalLink, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function EftUrlSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [notifyUrl, setNotifyUrl] = useState("");
  const [successUrl, setSuccessUrl] = useState("");
  const [failureUrl, setFailureUrl] = useState("");
  const [cancelledUrl, setCancelledUrl] = useState("");

  useEffect(() => {
    fetch("/api/merchant/settings")
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data.eftSettings) {
          const eft = data.data.eftSettings;
          setNotifyUrl(eft.notifyUrl || "");
          setSuccessUrl(eft.successUrl || "");
          setFailureUrl(eft.failureUrl || "");
          setCancelledUrl(eft.cancelledUrl || "");
        }
      })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/merchant/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eftSettings: { notifyUrl, successUrl, failureUrl, cancelledUrl },
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Saved", description: "EFT URL settings updated successfully." });
      } else {
        toast({ title: "Error", description: data.error || "Failed to save", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to save EFT settings", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <Card>
        <CardHeader>
          <div className="h-5 w-36 bg-slate-200 dark:bg-slate-700 animate-pulse rounded" />
          <div className="h-4 w-80 bg-slate-200 dark:bg-slate-700 animate-pulse rounded mt-2" />
        </CardHeader>
        <CardContent className="space-y-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 animate-pulse rounded" />
              <div className="h-10 w-full bg-slate-200 dark:bg-slate-700 animate-pulse rounded-md" />
              <div className="h-3 w-64 bg-slate-200 dark:bg-slate-700 animate-pulse rounded" />
            </div>
          ))}
          <div className="h-10 w-32 bg-slate-200 dark:bg-slate-700 animate-pulse rounded-md" />
        </CardContent>
      </Card>
    );
  }

  const urlFields = [
    {
      id: "notifyUrl",
      label: "Notify URL",
      value: notifyUrl,
      setter: setNotifyUrl,
      placeholder: "https://your-domain.com/api/eft/notify",
      description: "Legacy notification URL. Receives a POST with transaction status updates. Used if set per-transaction or as a default fallback.",
      color: "text-purple-600",
    },
    {
      id: "successUrl",
      label: "Success Redirect URL",
      value: successUrl,
      setter: setSuccessUrl,
      placeholder: "https://your-domain.com/payment/success",
      description: "Customer is redirected here after a successful EFT payment.",
      color: "text-green-600",
    },
    {
      id: "failureUrl",
      label: "Failure Redirect URL",
      value: failureUrl,
      setter: setFailureUrl,
      placeholder: "https://your-domain.com/payment/failed",
      description: "Customer is redirected here if the EFT payment fails.",
      color: "text-red-600",
    },
    {
      id: "cancelledUrl",
      label: "Cancelled Redirect URL",
      value: cancelledUrl,
      setter: setCancelledUrl,
      placeholder: "https://your-domain.com/payment/cancelled",
      description: "Customer is redirected here if they cancel the EFT payment.",
      color: "text-amber-600",
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="w-5 h-5 text-blue-600" />
            Default EFT URLs
          </CardTitle>
          <CardDescription>
            Set default callback and redirect URLs for your EFT payment transactions. These are used as fallbacks when URLs are not provided per-transaction via the API.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {urlFields.map((field) => (
            <div key={field.id} className="space-y-2">
              <Label htmlFor={field.id} className={`flex items-center gap-2 font-medium ${field.color}`}>
                {field.label}
              </Label>
              <Input
                id={field.id}
                type="url"
                placeholder={field.placeholder}
                value={field.value}
                onChange={(e) => field.setter(e.target.value)}
              />
              <p className="text-xs text-gray-500">{field.description}</p>
            </div>
          ))}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">How these URLs work</p>
              <p className="text-blue-800">
                When creating a payment link via the API, you can pass these URLs per-transaction. If not provided,
                these default URLs will be used. The <strong>Notify URL</strong> receives
                server-to-server POST callbacks. The <strong>Success</strong>, <strong>Failure</strong>, and <strong>Cancelled</strong> URLs
                are where the customer&apos;s browser is redirected after the payment flow.
                For event-based webhooks, use the <strong>Webhooks</strong> section instead.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : "Save EFT Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
