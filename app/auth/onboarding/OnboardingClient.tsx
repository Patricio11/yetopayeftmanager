"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import YetoPayLogo from "@/components/brand/YetoPayLogo";
import {
  Mail, Send, Building, FileText, Upload, CheckCircle, XCircle,
  Clock, AlertTriangle, ArrowRight, Hash, MapPin, Loader2,
  Download, Trash2, Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

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

interface UserData {
  email: string;
  name: string;
  companyName: string;
  companyReg: string;
  companyAddress: string;
  vatNumber: string;
  role: string;
}

interface Props {
  status: string;
  user: UserData;
  adminNote: string | null;
  rejectionReason: string | null;
  requirements: Requirement[];
  existingDocs: ExistingDoc[];
}

export function OnboardingClient({ status, user, adminNote, rejectionReason, requirements, existingDocs }: Props) {
  if (status === "EMAIL_PENDING") return <EmailPendingScreen email={user.email} />;
  if (status === "PENDING_REVIEW") return <PendingReviewScreen companyName={user.companyName} />;
  if (status === "REJECTED") return <RejectedScreen reason={rejectionReason} />;
  if (status === "ONBOARDING_PENDING") {
    return (
      <OnboardingForm
        user={user}
        adminNote={adminNote}
        requirements={requirements}
        existingDocs={existingDocs}
      />
    );
  }
  return null;
}

function EmailPendingScreen({ email }: { email: string }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const resend = async () => {
    setSending(true);
    try {
      await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch { /* ignore */ }
    setSending(false);
  };

  return (
    <Shell>
      <div className="text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-6">
          <Mail className="w-8 h-8 text-amber-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Verify your email</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          We sent a verification link to <strong className="text-slate-900 dark:text-white">{email}</strong>.
          Check your inbox and click the link to continue.
        </p>
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6 text-left">
          <p className="text-sm text-blue-800 dark:text-blue-300 font-medium mb-1">Can&apos;t find the email?</p>
          <p className="text-xs text-blue-700 dark:text-blue-400">Check your spam or junk folder. Some email providers may delay delivery by a few minutes.</p>
        </div>
        {sent ? (
          <div className="flex items-center justify-center gap-2 text-emerald-600">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Verification email sent!</span>
          </div>
        ) : (
          <Button onClick={resend} disabled={sending} variant="outline" className="gap-2">
            <Send className="w-4 h-4" />
            {sending ? "Sending..." : "Resend verification email"}
          </Button>
        )}
      </div>
    </Shell>
  );
}

function PendingReviewScreen({ companyName }: { companyName: string }) {
  return (
    <Shell>
      <div className="text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-6">
          <Clock className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Application submitted</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-8">
          Thanks, <strong className="text-slate-900 dark:text-white">{companyName || "there"}</strong>!
          Your application is under review. We typically respond within one business day.
        </p>
        <div className="space-y-3 text-left">
          {[
            { step: "1", label: "Account created", done: true },
            { step: "2", label: "Email verified", done: true },
            { step: "3", label: "Documents submitted", done: true },
            { step: "4", label: "Admin review", active: true },
            { step: "5", label: "Account approved" },
          ].map((s) => (
            <div key={s.step} className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                s.done
                  ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600"
                  : s.active
                  ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 ring-2 ring-amber-300"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-400"
              }`}>
                {s.done ? <CheckCircle className="w-4 h-4" /> : s.step}
              </div>
              <span className={`text-sm ${s.done ? "text-emerald-700 dark:text-emerald-400" : s.active ? "text-amber-700 dark:text-amber-400 font-medium" : "text-slate-400"}`}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}

function RejectedScreen({ reason }: { reason: string | null }) {
  return (
    <Shell>
      <div className="text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-8 h-8 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Application not approved</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          Unfortunately your application was not approved at this time.
        </p>
        {reason && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6 text-left">
            <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">Reason</p>
            <p className="text-sm text-red-700 dark:text-red-400">{reason}</p>
          </div>
        )}
        <p className="text-sm text-slate-500">
          If you believe this is an error, please contact{" "}
          <a href="mailto:support@yetopay.co.za" className="text-amber-600 hover:underline">support@yetopay.co.za</a>
        </p>
      </div>
    </Shell>
  );
}

function OnboardingForm({
  user,
  adminNote,
  requirements,
  existingDocs,
}: {
  user: UserData;
  adminNote: string | null;
  requirements: Requirement[];
  existingDocs: ExistingDoc[];
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const [form, setForm] = useState({
    companyName: user.companyName,
    companyReg: user.companyReg,
    companyAddress: user.companyAddress,
    vatNumber: user.vatNumber,
  });

  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [uploaded, setUploaded] = useState<Record<string, ExistingDoc>>(() => {
    const map: Record<string, ExistingDoc> = {};
    for (const doc of existingDocs) {
      if (doc.requirementId) map[doc.requirementId] = doc;
    }
    return map;
  });

  const handleFile = (reqId: string, file: File | null) => {
    setFiles((prev) => ({ ...prev, [reqId]: file }));
    if (file) {
      setUploaded((prev) => {
        const next = { ...prev };
        delete next[reqId];
        return next;
      });
    }
  };

  const removeFile = (reqId: string) => {
    setFiles((prev) => {
      const next = { ...prev };
      delete next[reqId];
      return next;
    });
    setUploaded((prev) => {
      const next = { ...prev };
      delete next[reqId];
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const documents: any[] = [];

      for (const doc of Object.values(uploaded)) {
        documents.push({
          requirementId: doc.requirementId,
          originalName: doc.originalName,
          url: doc.url,
        });
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

      const res = await fetch("/api/auth/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, documents }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Submission failed");
        setSubmitting(false);
        return;
      }

      router.refresh();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setSubmitting(false);
      setUploadProgress(null);
    }
  };

  const hasFileForReq = (reqId: string) => !!files[reqId] || !!uploaded[reqId];

  return (
    <Shell wide>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Complete your profile</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            We need some information to verify your {user.role === "partner" ? "partner" : "merchant"} account
          </p>
        </div>

        {/* Admin note banner */}
        {adminNote && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-xl p-4 mb-6">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Changes requested by our team</p>
                <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">{adminNote}</p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Company Information */}
          <Card className="p-6 bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-5 flex items-center gap-2">
              <Building className="w-5 h-5 text-amber-600" />
              Company Information
            </h2>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Legal Company Name <span className="text-red-500">*</span></Label>
                <div className="relative mt-1">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    value={form.companyName}
                    onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                    required
                    placeholder="Your Company (Pty) Ltd"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Registration Number <span className="text-red-500">*</span></Label>
                  <div className="relative mt-1">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      value={form.companyReg}
                      onChange={(e) => setForm({ ...form, companyReg: e.target.value })}
                      required
                      placeholder="2024/123456/07"
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">VAT Number <span className="text-slate-400 text-xs font-normal">(optional)</span></Label>
                  <div className="relative mt-1">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      value={form.vatNumber}
                      onChange={(e) => setForm({ ...form, vatNumber: e.target.value })}
                      placeholder="4123456789"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Physical Address <span className="text-red-500">*</span></Label>
                <div className="relative mt-1">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <textarea
                    value={form.companyAddress}
                    onChange={(e) => setForm({ ...form, companyAddress: e.target.value })}
                    required
                    rows={3}
                    placeholder="123 Main Street, Sandton, Gauteng, 2196"
                    className="w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white resize-none"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Documents */}
          {requirements.length > 0 && (
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
                          {req.description && (
                            <p className="text-xs text-slate-500 mt-0.5">{req.description}</p>
                          )}
                        </div>
                        {hasFile && (
                          <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                        )}
                      </div>

                      {req.templateUrl && (
                        <a
                          href={req.templateUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 mb-3"
                        >
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
                          <button
                            type="button"
                            onClick={() => removeFile(req.id)}
                            className="text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex items-center justify-center gap-2 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg py-4 cursor-pointer hover:border-amber-400 dark:hover:border-amber-600 hover:bg-amber-50/50 dark:hover:bg-amber-900/10 transition-colors">
                          <Upload className="w-4 h-4 text-slate-400" />
                          <span className="text-sm text-slate-500">Choose file</span>
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                            onChange={(e) => handleFile(req.id, e.target.files?.[0] || null)}
                          />
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Submit */}
          <Button
            type="submit"
            disabled={submitting}
            className="w-full h-12 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold text-base gap-2 shadow-sm"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {uploadProgress || "Submitting..."}
              </>
            ) : (
              <>
                Submit Application
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </Button>

          <p className="text-xs text-center text-slate-400">
            By submitting, you confirm that the information provided is accurate and complete.
          </p>
        </form>
      </div>
    </Shell>
  );
}

function Shell({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-200/50 dark:border-slate-700/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center">
          <Link href="/" className="flex items-center">
            <YetoPayLogo size="md" />
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className={`flex-1 flex items-center justify-center px-4 py-12 ${wide ? "sm:px-6" : ""}`}>
        <div className={wide ? "w-full" : "w-full max-w-lg"}>
          {children}
        </div>
      </div>
    </div>
  );
}
