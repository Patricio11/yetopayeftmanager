"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Building2, Mail, Phone, Shield, Calendar,
  CheckCircle, XCircle, Clock, AlertCircle, Activity,
  DollarSign, Save, Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface MerchantDetail {
  id: string;
  name: string;
  email: string;
  companyName: string | null;
  phone: string | null;
  status: string;
  kycStatus: string | null;
  createdAt: string;
  stats: {
    totalTransactions: number;
    completedTransactions: number;
    failedTransactions: number;
    totalVolume: number;
  };
  settings: {
    notifyUrl: string;
    successUrl: string;
    failureUrl: string;
    cancelledUrl: string;
  };
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(val);

const statusBadge = (status: string) => {
  switch (status) {
    case "active":
    case "completed":
    case "verified":
      return "bg-amber-100 text-amber-600 border-amber-200";
    case "suspended":
    case "inactive":
    case "failed":
    case "rejected":
      return "bg-red-100 text-red-700 border-red-200";
    case "pending":
    case "initiated":
    case "under_review":
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
};

export default function PartnerMerchantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const merchantId = params.id as string;

  const [merchant, setMerchant] = useState<MerchantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  // Editable fields
  const [formName, setFormName] = useState("");
  const [formCompanyName, setFormCompanyName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formWebsite, setFormWebsite] = useState("");
  const [formNotifyUrl, setFormNotifyUrl] = useState("");
  const [formSuccessUrl, setFormSuccessUrl] = useState("");
  const [formFailureUrl, setFormFailureUrl] = useState("");
  const [formCancelledUrl, setFormCancelledUrl] = useState("");

  useEffect(() => {
    const fetchMerchant = async () => {
      try {
        const res = await fetch(`/api/partner/merchants/${merchantId}`);
        const json = await res.json();
        if (json.success) {
          const data = json.data as MerchantDetail;
          setMerchant(data);
          setFormName(data.name || "");
          setFormCompanyName(data.companyName || "");
          setFormPhone(data.phone || "");
          setFormWebsite((json.data?.metadata as any)?.website || "");
          setFormNotifyUrl(data.settings?.notifyUrl || "");
          setFormSuccessUrl(data.settings?.successUrl || "");
          setFormFailureUrl(data.settings?.failureUrl || "");
          setFormCancelledUrl(data.settings?.cancelledUrl || "");
        } else {
          setError(json.error || "Failed to load merchant");
        }
      } catch {
        setError("Failed to load merchant details");
      } finally {
        setLoading(false);
      }
    };
    fetchMerchant();
  }, [merchantId]);

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage("");

    try {
      const res = await fetch(`/api/partner/merchants/${merchantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          companyName: formCompanyName,
          phone: formPhone,
          website: formWebsite || undefined,
          eftSettings: {
            notifyUrl: formNotifyUrl,
            successUrl: formSuccessUrl,
            failureUrl: formFailureUrl,
            cancelledUrl: formCancelledUrl,
          },
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSaveMessage("Changes saved successfully");
        setTimeout(() => setSaveMessage(""), 3000);
      } else {
        setSaveMessage(json.error || "Failed to save changes");
      }
    } catch {
      setSaveMessage("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="h-6 w-32 bg-slate-200 animate-pulse rounded mb-6" />
        <div className="h-8 w-64 bg-slate-200 animate-pulse rounded mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <div className="h-32 bg-slate-100 animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !merchant) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-8">
        <Link href="/dashboard/partner/merchants" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Merchants
        </Link>
        <div className="bg-white rounded-xl border border-red-200 p-8 shadow-sm text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Error</h2>
          <p className="text-slate-500">{error || "Merchant not found"}</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push("/dashboard/partner/merchants")}>
            Back to Merchants
          </Button>
        </div>
      </div>
    );
  }

  const stats = merchant.stats;
  const successRate = stats.totalTransactions > 0
    ? Math.round((stats.completedTransactions / stats.totalTransactions) * 100)
    : 0;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
      {/* Back Link */}
      <Link href="/dashboard/partner/merchants" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="w-4 h-4" /> Back to Merchants
      </Link>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-gradient-to-br from-fyro-navy to-fyro-gold rounded-xl flex items-center justify-center">
          <Building2 className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {merchant.companyName || merchant.name}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusBadge(merchant.status)}`}>
              {merchant.status}
            </span>
            {merchant.kycStatus && (
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusBadge(merchant.kycStatus)}`}>
                KYC: {merchant.kycStatus}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Merchant Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <Building2 className="w-4 h-4 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500">Company</p>
              <p className="text-sm font-medium text-slate-900">{merchant.companyName || "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Mail className="w-4 h-4 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500">Email</p>
              <p className="text-sm font-medium text-slate-900">{merchant.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Phone className="w-4 h-4 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500">Phone</p>
              <p className="text-sm font-medium text-slate-900">{merchant.phone || "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Shield className="w-4 h-4 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500">KYC Status</p>
              <p className="text-sm font-medium text-slate-900">{merchant.kycStatus || "Not submitted"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500">Created</p>
              <p className="text-sm font-medium text-slate-900">
                {new Date(merchant.createdAt).toLocaleDateString("en-ZA", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-medium text-slate-500">Total Transactions</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.totalTransactions.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-medium text-slate-500">Completed</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.completedTransactions.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-4 h-4 text-red-500" />
            <span className="text-xs font-medium text-slate-500">Failed</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.failedTransactions.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-medium text-slate-500">Total Volume</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats.totalVolume)}</p>
          <p className="text-xs text-slate-500 mt-1">{successRate}% success rate</p>
        </div>
      </div>

      {/* Settings Form */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-1">Merchant Settings</h2>
        <p className="text-sm text-slate-500 mb-6">Update merchant details and EFT callback URLs</p>

        {saveMessage && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${
            saveMessage.includes("success")
              ? "bg-amber-50 border border-amber-200 text-amber-600"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}>
            {saveMessage}
          </div>
        )}

        <div className="space-y-6">
          {/* Basic Info */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Basic Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Company Name</label>
                <input
                  type="text"
                  value={formCompanyName}
                  onChange={(e) => setFormCompanyName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Phone</label>
                <input
                  type="text"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="+27..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Website</label>
                <input
                  type="url"
                  value={formWebsite}
                  onChange={(e) => setFormWebsite(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* EFT Settings */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">EFT Callback URLs</h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Notify URL (Webhook)</label>
                <input
                  type="url"
                  value={formNotifyUrl}
                  onChange={(e) => setFormNotifyUrl(e.target.value)}
                  placeholder="https://example.com/webhook"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Success URL</label>
                <input
                  type="url"
                  value={formSuccessUrl}
                  onChange={(e) => setFormSuccessUrl(e.target.value)}
                  placeholder="https://example.com/success"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Failure URL</label>
                <input
                  type="url"
                  value={formFailureUrl}
                  onChange={(e) => setFormFailureUrl(e.target.value)}
                  placeholder="https://example.com/failure"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Cancelled URL</label>
                <input
                  type="url"
                  value={formCancelledUrl}
                  onChange={(e) => setFormCancelledUrl(e.target.value)}
                  placeholder="https://example.com/cancelled"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              Changes will be reviewed by admin
            </p>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
