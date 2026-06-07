"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Building, Users, Upload, ArrowRight, ArrowLeft, CheckCircle, Loader2,
  FileText, Download, Trash2, AlertTriangle, Shield, Phone, Mail, Globe,
  Hash, MapPin, Briefcase, CreditCard, User, Calendar, Clock, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const INDUSTRIES = [
  "Retail", "E-Commerce", "Hospitality", "Travel & Tourism", "Financial Services",
  "Healthcare", "Education", "Technology", "Professional Services", "Manufacturing",
  "Construction", "Agriculture", "Transport & Logistics", "Entertainment", "Non-Profit", "Other",
];

const MONTHLY_VOLUMES = [
  "R0 - R50,000", "R50,001 - R100,000", "R100,001 - R500,000",
  "R500,001 - R1,000,000", "R1,000,001 - R5,000,000", "R5,000,001+",
];

const BANKS = [
  "ABSA", "Capitec", "FNB (First National Bank)", "Nedbank", "Standard Bank",
  "Investec", "African Bank", "TymeBank", "Discovery Bank", "Bank Zero", "Other",
];

const COUNTRIES = [
  { code: "ZA", name: "South Africa" },
  { code: "BW", name: "Botswana" },
  { code: "LS", name: "Lesotho" },
  { code: "MZ", name: "Mozambique" },
  { code: "NA", name: "Namibia" },
  { code: "SZ", name: "Eswatini" },
  { code: "ZW", name: "Zimbabwe" },
  { code: "KE", name: "Kenya" },
  { code: "NG", name: "Nigeria" },
  { code: "GH", name: "Ghana" },
  { code: "GB", name: "United Kingdom" },
  { code: "US", name: "United States" },
];

interface Requirement {
  id: string;
  name: string;
  description: string | null;
  required: boolean;
  templateUrl: string | null;
  templateOriginalName: string | null;
}

interface ExistingDoc {
  requirementId: string | null;
  originalName: string;
  url: string;
}

const STEPS = [
  { id: 1, label: "Business Information", icon: Building },
  { id: 2, label: "Contact Details", icon: Users },
  { id: 3, label: "Upload KYC", icon: Upload },
];

export default function KycPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [kycStatus, setKycStatus] = useState("pending");
  const [adminNote, setAdminNote] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [uploaded, setUploaded] = useState<Record<string, ExistingDoc>>({});

  const [form, setForm] = useState({
    commencementDate: "",
    businessName: "",
    tradingName: "",
    vatNumber: "",
    storeName: "",
    registrationNumber: "",
    industry: "",
    monthlyVolume: "",
    companyAddress: "",
    city: "",
    country: "ZA",
    website: "",
    directorName: "",
    directorEmail: "",
    directorIdNumber: "",
    directorCapacity: "",
    directorHomeAddress: "",
    primaryContactName: "",
    primaryEmail: "",
    primaryPhone: "",
    financeContactSameAsPrimary: false,
    financeContactName: "",
    financeEmail: "",
    financePhone: "",
    technicalContactName: "",
    technicalEmail: "",
    technicalPhone: "",
    currentAcquiringBank: "",
    paymentServiceProvider: "",
    bankName: "",
    accountHolder: "",
    accountNumber: "",
    branchCode: "",
    currentPmsPlatform: "",
  });

  const update = (field: string, value: any) => setForm((p) => ({ ...p, [field]: value }));

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/kyc");
      const data = await res.json();
      if (data.success) {
        setKycStatus(data.data.kycStatus || "pending");
        setAdminNote(data.data.vettingAdminNote || null);
        setRejectionReason(data.data.vettingRejectionReason || null);
        setRequirements(data.requirements || []);

        const existing = data.data.kycData || {};
        setForm((prev) => ({
          ...prev,
          businessName: existing.businessName || data.data.companyName || "",
          registrationNumber: existing.registrationNumber || data.data.companyReg || "",
          vatNumber: existing.vatNumber || data.data.vatNumber || "",
          companyAddress: existing.companyAddress || data.data.companyAddress || "",
          primaryEmail: existing.primaryEmail || data.data.email || "",
          primaryContactName: existing.primaryContactName || data.data.name || "",
          primaryPhone: existing.primaryPhone || data.data.phone || "",
          bankName: existing.bankName || data.data.bankAccount?.bank_name || "",
          accountHolder: existing.accountHolder || data.data.bankAccount?.account_holder || "",
          accountNumber: existing.accountNumber || data.data.bankAccount?.account_number || "",
          branchCode: existing.branchCode || data.data.bankAccount?.branch_code || "",
          ...Object.fromEntries(
            Object.entries(existing).filter(([k]) => k in prev && !["businessName","registrationNumber","vatNumber","companyAddress","primaryEmail","primaryContactName","primaryPhone","bankName","accountHolder","accountNumber","branchCode"].includes(k))
          ),
        }));

        const docMap: Record<string, ExistingDoc> = {};
        for (const d of data.documents || []) {
          if (d.requirementId) docMap[d.requirementId] = d;
        }
        setUploaded(docMap);
      }
    } catch {
      toast({ title: "Error", description: "Failed to load KYC data", variant: "destructive" });
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleFile = (reqId: string, file: File | null) => {
    setFiles((prev) => ({ ...prev, [reqId]: file }));
    if (file) setUploaded((prev) => { const n = { ...prev }; delete n[reqId]; return n; });
  };

  const removeFile = (reqId: string) => {
    setFiles((prev) => { const n = { ...prev }; delete n[reqId]; return n; });
    setUploaded((prev) => { const n = { ...prev }; delete n[reqId]; return n; });
  };

  const handleSubmit = async () => {
    setSubmitting(true);

    try {
      const documents: any[] = [];

      for (const doc of Object.values(uploaded)) {
        documents.push({ requirementId: doc.requirementId, originalName: doc.originalName, url: doc.url });
      }

      const fileEntries = Object.entries(files).filter(([, f]) => f !== null);
      for (let i = 0; i < fileEntries.length; i++) {
        const [reqId, file] = fileEntries[i];
        if (!file) continue;
        setUploadProgress(`Uploading ${i + 1} of ${fileEntries.length}...`);

        const fd = new FormData();
        fd.append("file", file);

        const res = await fetch("/api/auth/onboarding/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || "Upload failed");

        documents.push({
          requirementId: reqId,
          originalName: data.data.originalName,
          storedName: data.data.storedName,
          url: data.data.url,
          mimeType: data.data.mimeType,
          sizeBytes: data.data.sizeBytes,
        });
      }

      setUploadProgress(null);

      const res = await fetch("/api/kyc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kycData: form, documents }),
      });

      const data = await res.json();

      if (!data.success) {
        toast({ title: "Validation Error", description: data.error, variant: "destructive" });
        setSubmitting(false);
        return;
      }

      toast({ title: "KYC Submitted", description: "Your application is now under review." });
      router.refresh();
      setKycStatus("pending_review");
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Something went wrong", variant: "destructive" });
    }
    setSubmitting(false);
    setUploadProgress(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (kycStatus === "approved") {
    return (
      <div className="max-w-lg mx-auto text-center py-20 px-4">
        <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">KYC Approved</h1>
        <p className="text-slate-600 dark:text-slate-400">Your account has been verified and is now live.</p>
      </div>
    );
  }

  if (kycStatus === "pending_review") {
    return (
      <div className="max-w-lg mx-auto text-center py-20 px-4">
        <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-6">
          <Clock className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">KYC Under Review</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-8">
          Your application has been submitted and is being reviewed. We&apos;ll notify you once it&apos;s complete.
        </p>
        <div className="space-y-3 text-left max-w-xs mx-auto">
          {["Business info submitted", "Contact details submitted", "Documents uploaded", "Admin review"].map((label, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                i < 3
                  ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600"
                  : "bg-amber-100 dark:bg-amber-900/30 text-amber-600 ring-2 ring-amber-300"
              }`}>
                {i < 3 ? <CheckCircle className="w-4 h-4" /> : (i + 1)}
              </div>
              <span className={`text-sm ${i < 3 ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400 font-medium"}`}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mx-auto mb-4">
          <Shield className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">KYC Verification</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Complete the form below to verify your account and start processing live transactions.
        </p>
      </div>

      {/* Admin note */}
      {adminNote && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-xl p-4 mb-6 max-w-2xl mx-auto">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Changes requested by our team</p>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">{adminNote}</p>
            </div>
          </div>
        </div>
      )}

      {kycStatus === "rejected" && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6 max-w-2xl mx-auto">
          <div className="flex gap-3">
            <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800 dark:text-red-300">Previous application was not approved</p>
              {rejectionReason && <p className="text-sm text-red-700 dark:text-red-400 mt-1">{rejectionReason}</p>}
              <p className="text-sm text-red-700 dark:text-red-400 mt-1">Please review and resubmit your information.</p>
            </div>
          </div>
        </div>
      )}

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = step === s.id;
          const isDone = step > s.id;
          return (
            <div key={s.id} className="flex items-center gap-2">
              {i > 0 && <div className={`w-8 h-0.5 ${isDone ? "bg-emerald-400" : "bg-slate-200 dark:bg-slate-700"}`} />}
              <button
                onClick={() => setStep(s.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700 shadow-sm"
                    : isDone
                    ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                {isDone ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                <span className="hidden sm:inline">{s.label}</span>
                <span className="sm:hidden">Step {s.id}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Step 1: Business Information */}
      {step === 1 && (
        <div className="max-w-2xl mx-auto space-y-6">
          <Card className="p-6 bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-5 flex items-center gap-2">
              <Building className="w-5 h-5 text-amber-600" />
              Business Details
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Commencement Date" icon={Calendar}>
                  <Input type="date" value={form.commencementDate} onChange={(e) => update("commencementDate", e.target.value)} className="pl-10" />
                </Field>
                <Field label="Business Name" required icon={Building}>
                  <Input value={form.businessName} onChange={(e) => update("businessName", e.target.value)} placeholder="Company (Pty) Ltd" className="pl-10" required />
                </Field>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Trading Name" required icon={Building}>
                  <Input value={form.tradingName} onChange={(e) => update("tradingName", e.target.value)} placeholder="Trading as..." className="pl-10" required />
                </Field>
                <Field label="Store Name" icon={Building}>
                  <Input value={form.storeName} onChange={(e) => update("storeName", e.target.value)} placeholder="Optional store name" className="pl-10" />
                </Field>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Registration Number" required icon={Hash}>
                  <Input value={form.registrationNumber} onChange={(e) => update("registrationNumber", e.target.value)} placeholder="2024/123456/07" className="pl-10" required />
                </Field>
                <Field label="VAT Number" icon={Hash}>
                  <Input value={form.vatNumber} onChange={(e) => update("vatNumber", e.target.value)} placeholder="4123456789" className="pl-10" />
                </Field>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Industry" required icon={Briefcase}>
                  <select value={form.industry} onChange={(e) => update("industry", e.target.value)} required className="w-full h-10 pl-10 pr-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white">
                    <option value="">Select industry</option>
                    {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                  </select>
                </Field>
                <Field label="Monthly Volume" required icon={CreditCard}>
                  <select value={form.monthlyVolume} onChange={(e) => update("monthlyVolume", e.target.value)} required className="w-full h-10 pl-10 pr-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white">
                    <option value="">Select volume</option>
                    {MONTHLY_VOLUMES.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Company Address" required icon={MapPin}>
                  <Input value={form.companyAddress} onChange={(e) => update("companyAddress", e.target.value)} placeholder="123 Main Street" className="pl-10" required />
                </Field>
                <Field label="City" required icon={MapPin}>
                  <Input value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="Johannesburg" className="pl-10" required />
                </Field>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Country" required icon={Globe}>
                  <select value={form.country} onChange={(e) => update("country", e.target.value)} required className="w-full h-10 pl-10 pr-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white">
                    <option value="">Select country</option>
                    {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select>
                </Field>
                <Field label="Website" icon={Globe}>
                  <Input value={form.website} onChange={(e) => update("website", e.target.value)} placeholder="https://example.com" className="pl-10" />
                </Field>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-5 flex items-center gap-2">
              <User className="w-5 h-5 text-amber-600" />
              Director Information
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Director Name" required icon={User}>
                  <Input value={form.directorName} onChange={(e) => update("directorName", e.target.value)} placeholder="Full name" className="pl-10" required />
                </Field>
                <Field label="Director Email" required icon={Mail}>
                  <Input type="email" value={form.directorEmail} onChange={(e) => update("directorEmail", e.target.value)} placeholder="director@company.com" className="pl-10" required />
                </Field>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Director ID Number" required icon={Hash}>
                  <Input value={form.directorIdNumber} onChange={(e) => update("directorIdNumber", e.target.value)} placeholder="ID number" className="pl-10" required />
                </Field>
                <Field label="Director Capacity" required icon={Briefcase}>
                  <Input value={form.directorCapacity} onChange={(e) => update("directorCapacity", e.target.value)} placeholder="e.g. Managing Director" className="pl-10" required />
                </Field>
              </div>
              <Field label="Director Home Address" required icon={MapPin}>
                <Input value={form.directorHomeAddress} onChange={(e) => update("directorHomeAddress", e.target.value)} placeholder="Residential address" className="pl-10" required />
              </Field>
            </div>
          </Card>

          <div className="flex justify-end">
            <Button onClick={() => setStep(2)} className="gap-2 bg-amber-500 hover:bg-amber-600 text-white">
              Next: Contact Details <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Contact Details */}
      {step === 2 && (
        <div className="max-w-2xl mx-auto space-y-6">
          <Card className="p-6 bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-5 flex items-center gap-2">
              <Phone className="w-5 h-5 text-amber-600" />
              Primary Contact
            </h2>
            <div className="space-y-4">
              <Field label="Contact Name" required icon={User}>
                <Input value={form.primaryContactName} onChange={(e) => update("primaryContactName", e.target.value)} placeholder="Full name" className="pl-10" required />
              </Field>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Email Address" required icon={Mail}>
                  <Input type="email" value={form.primaryEmail} onChange={(e) => update("primaryEmail", e.target.value)} placeholder="email@company.com" className="pl-10" required />
                </Field>
                <Field label="Phone Number" required icon={Phone}>
                  <Input value={form.primaryPhone} onChange={(e) => update("primaryPhone", e.target.value)} placeholder="+27 XX XXX XXXX" className="pl-10" required />
                </Field>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-600" />
                Finance Contact
              </h2>
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.financeContactSameAsPrimary}
                  onChange={(e) => {
                    update("financeContactSameAsPrimary", e.target.checked);
                    if (e.target.checked) {
                      update("financeContactName", form.primaryContactName);
                      update("financeEmail", form.primaryEmail);
                      update("financePhone", form.primaryPhone);
                    }
                  }}
                  className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                />
                Same as primary
              </label>
            </div>
            {!form.financeContactSameAsPrimary && (
              <div className="space-y-4">
                <Field label="Finance Contact Name" icon={User}>
                  <Input value={form.financeContactName} onChange={(e) => update("financeContactName", e.target.value)} placeholder="Full name" className="pl-10" />
                </Field>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Finance Email" icon={Mail}>
                    <Input type="email" value={form.financeEmail} onChange={(e) => update("financeEmail", e.target.value)} placeholder="finance@company.com" className="pl-10" />
                  </Field>
                  <Field label="Finance Phone" icon={Phone}>
                    <Input value={form.financePhone} onChange={(e) => update("financePhone", e.target.value)} placeholder="+27 XX XXX XXXX" className="pl-10" />
                  </Field>
                </div>
              </div>
            )}
          </Card>

          <Card className="p-6 bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-5 flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-600" />
              Technical Contact
            </h2>
            <div className="space-y-4">
              <Field label="Technical Contact Name" icon={User}>
                <Input value={form.technicalContactName} onChange={(e) => update("technicalContactName", e.target.value)} placeholder="Full name" className="pl-10" />
              </Field>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Technical Email" icon={Mail}>
                  <Input type="email" value={form.technicalEmail} onChange={(e) => update("technicalEmail", e.target.value)} placeholder="tech@company.com" className="pl-10" />
                </Field>
                <Field label="Technical Phone" icon={Phone}>
                  <Input value={form.technicalPhone} onChange={(e) => update("technicalPhone", e.target.value)} placeholder="+27 XX XXX XXXX" className="pl-10" />
                </Field>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-5 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-amber-600" />
              Banking Information
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Current Acquiring Bank" icon={Building}>
                  <Input value={form.currentAcquiringBank} onChange={(e) => update("currentAcquiringBank", e.target.value)} placeholder="e.g. Peach Payments" className="pl-10" />
                </Field>
                <Field label="Payment Service Provider" icon={Building}>
                  <Input value={form.paymentServiceProvider} onChange={(e) => update("paymentServiceProvider", e.target.value)} placeholder="e.g. PayFast" className="pl-10" />
                </Field>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Bank Name" required icon={Building}>
                  <select value={form.bankName} onChange={(e) => update("bankName", e.target.value)} required className="w-full h-10 pl-10 pr-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white">
                    <option value="">Select bank</option>
                    {BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </Field>
                <Field label="Account Holder" required icon={User}>
                  <Input value={form.accountHolder} onChange={(e) => update("accountHolder", e.target.value)} placeholder="Account holder name" className="pl-10" required />
                </Field>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Account Number" required icon={Hash}>
                  <Input value={form.accountNumber} onChange={(e) => update("accountNumber", e.target.value)} placeholder="Account number" className="pl-10" required />
                </Field>
                <Field label="Branch Code" required icon={Hash}>
                  <Input value={form.branchCode} onChange={(e) => update("branchCode", e.target.value)} placeholder="Branch code" className="pl-10" required />
                </Field>
              </div>
              <Field label="Current PMS / Platform Provider" icon={Building}>
                <Input value={form.currentPmsPlatform} onChange={(e) => update("currentPmsPlatform", e.target.value)} placeholder="e.g. Shopify, WooCommerce" className="pl-10" />
              </Field>
            </div>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
            <Button onClick={() => setStep(3)} className="gap-2 bg-amber-500 hover:bg-amber-600 text-white">
              Next: Upload Documents <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Upload KYC Documents */}
      {step === 3 && (
        <div className="max-w-2xl mx-auto space-y-6">
          {requirements.length > 0 ? (
            <Card className="p-6 bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-600" />
                Required Documents
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
                Upload clear, legible copies. Max 10MB per file. Accepted: PDF, JPEG, PNG, DOC.
              </p>
              <div className="space-y-4">
                {requirements.map((req) => {
                  const currentFile = files[req.id];
                  const existingFile = uploaded[req.id];
                  const hasFile = !!currentFile || !!existingFile;

                  return (
                    <div
                      key={req.id}
                      className={`border rounded-xl p-4 transition-colors ${
                        hasFile
                          ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/10"
                          : "border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-slate-900 dark:text-white">{req.name}</p>
                            {req.required ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 font-semibold">REQUIRED</span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400 font-semibold">OPTIONAL</span>
                            )}
                          </div>
                          {req.description && <p className="text-xs text-slate-500 mt-0.5">{req.description}</p>}
                        </div>
                        {hasFile && <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />}
                      </div>

                      {req.templateUrl && (
                        <a href={req.templateUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 mb-3">
                          <Download className="w-3 h-3" />
                          Download template{req.templateOriginalName ? ` (${req.templateOriginalName})` : ""}
                        </a>
                      )}

                      {hasFile ? (
                        <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2">
                          <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="text-xs text-slate-700 dark:text-slate-300 truncate flex-1">
                            {currentFile?.name || existingFile?.originalName}
                          </span>
                          <button type="button" onClick={() => removeFile(req.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex items-center justify-center gap-2 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg py-4 cursor-pointer hover:border-amber-400 dark:hover:border-amber-600 hover:bg-amber-50/50 dark:hover:bg-amber-900/10 transition-colors">
                          <Upload className="w-4 h-4 text-slate-400" />
                          <span className="text-sm text-slate-500">Choose file</span>
                          <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" onChange={(e) => handleFile(req.id, e.target.files?.[0] || null)} />
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          ) : (
            <Card className="p-8 bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-center">
              <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-900 dark:text-white">No document requirements configured</p>
              <p className="text-xs text-slate-500 mt-1">You can proceed to submit your application.</p>
            </Card>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)} className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold shadow-sm px-8"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {uploadProgress || "Submitting..."}
                </>
              ) : (
                <>
                  Submit KYC Application
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>

          <p className="text-xs text-center text-slate-400">
            By submitting, you confirm that the information provided is accurate and complete.
          </p>
        </div>
      )}
    </div>
  );
}

function Field({ label, required, icon: Icon, children }: {
  label: string;
  required?: boolean;
  icon: any;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
        {label} {required ? <span className="text-red-500">*</span> : <span className="text-slate-400 text-xs font-normal">(optional)</span>}
      </Label>
      <div className="relative mt-1">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        {children}
      </div>
    </div>
  );
}
