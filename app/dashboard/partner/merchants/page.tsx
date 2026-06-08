"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Building2, Search, Plus, Mail, Copy, CheckCircle, XCircle,
  Clock, AlertCircle, X, Users, ChevronDown, Loader2, Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

interface Merchant {
  id: string;
  name: string;
  email: string;
  companyName: string | null;
  status: string;
  isActive?: boolean;
  emailVerified?: boolean;
  kycStatus: string | null;
  lastActivity: string | null;
  createdAt: string;
}

const statusBadge = (status: string) => {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-700 border-green-200";
    case "suspended":
    case "inactive":
      return "bg-red-100 text-red-700 border-red-200";
    case "pending":
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
};

export default function PartnerMerchantsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const fetchMerchants = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/partner/merchants");
      const json = await res.json();
      if (json.success) {
        setMerchants(json.data || []);
      } else {
        setError(json.error || "Failed to load merchants");
      }
    } catch {
      setError("Failed to load merchants");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMerchants();
  }, [fetchMerchants]);

  const resendInvitation = async (e: React.MouseEvent, id: string, email: string) => {
    e.stopPropagation();
    setResendingId(id);
    try {
      const res = await fetch(`/api/partner/merchants/${id}/resend-invitation`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Invitation Resent', description: `Invitation email sent to ${email}` });
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to resend', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to resend invitation', variant: 'destructive' });
    } finally { setResendingId(null); }
  };

  const filtered = merchants.filter((m) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      m.name?.toLowerCase().includes(s) ||
      m.email?.toLowerCase().includes(s) ||
      m.companyName?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
            My Merchants
          </h1>
          <p className="text-slate-500 mt-1">Manage your merchant portfolio</p>
        </div>
        <Button onClick={() => setShowInviteModal(true)} className="bg-green-600 hover:bg-green-700 text-white">
          <Plus className="w-4 h-4 mr-2" />
          Invite Merchant
        </Button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
          />
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-white rounded-xl border border-red-200 p-8 shadow-sm text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-slate-900 font-medium">{error}</p>
          <Button variant="outline" className="mt-4" onClick={fetchMerchants}>Retry</Button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <div className="space-y-3 animate-pulse">
                <div className="h-5 w-40 bg-slate-200 rounded" />
                <div className="h-4 w-56 bg-slate-100 rounded" />
                <div className="h-6 w-20 bg-slate-100 rounded-full" />
                <div className="h-3 w-32 bg-slate-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Merchant Cards */}
      {!loading && !error && (
        <>
          {filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-16 shadow-sm text-center">
              <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                {search ? "No merchants found" : "No merchants yet"}
              </h3>
              <p className="text-slate-500 mb-6">
                {search
                  ? "Try adjusting your search terms"
                  : "Invite your first merchant to get started"}
              </p>
              {!search && (
                <Button onClick={() => setShowInviteModal(true)} className="bg-green-600 hover:bg-green-700 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Invite Merchant
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((merchant) => (
                <div
                  key={merchant.id}
                  onClick={() => router.push(`/dashboard/partner/merchants/${merchant.id}`)}
                  className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-lg hover:border-green-200 transition-all duration-200 cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-700 to-green-500 rounded-lg flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">
                          {merchant.companyName || merchant.name}
                        </h3>
                        <p className="text-xs text-slate-500">{merchant.name}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusBadge(merchant.status)}`}>
                      {merchant.status}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{merchant.email}</span>
                    </div>
                    {merchant.lastActivity && (
                      <div className="flex items-center gap-2 text-slate-500">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-xs">
                          Last active:{" "}
                          {new Date(merchant.lastActivity).toLocaleDateString("en-ZA", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                  {!merchant.isActive && !merchant.emailVerified && (
                    <div className="pt-3 mt-3 border-t border-slate-100">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => resendInvitation(e, merchant.id, merchant.email)}
                        disabled={resendingId === merchant.id}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 gap-1.5 w-full justify-center"
                      >
                        <Send className="w-3.5 h-3.5" />
                        {resendingId === merchant.id ? 'Sending...' : 'Resend Invitation'}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteMerchantModal
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => {
            fetchMerchants();
          }}
        />
      )}
    </div>
  );
}

// ─── Invite Merchant Modal ────────────────────────────────────────────────
function InviteMerchantModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [showLink, setShowLink] = useState(false);
  const [copied, setCopied] = useState(false);
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);

  useEffect(() => {
    fetch("/api/merchant/services")
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          const enabled = data.data.filter((s: any) => s.isEnabled);
          setAvailableServices(enabled);
          setSelectedServices(enabled.map((s: any) => s.code));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingServices(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/partner/merchants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email: email.toLowerCase(), companyName, services: selectedServices }),
      });
      const json = await res.json();
      if (json.success) {
        setInviteLink(json.invitation?.link || "");
        setInviteEmail(email);
        setShowLink(false);
        onSuccess();
      } else {
        setError(json.error || "Failed to invite merchant");
      }
    } catch {
      setError("Failed to send invitation");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Invite Merchant</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {inviteEmail ? (
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-200">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Merchant Invited!</h3>
            <p className="text-sm text-slate-500 mb-4">Invitation has been sent successfully</p>
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl mb-4 text-left">
              <div className="flex items-center gap-2 mb-1.5">
                <Mail className="w-4 h-4 text-emerald-600" />
                <p className="text-sm font-medium text-emerald-700">Email sent to {inviteEmail}</p>
              </div>
              <p className="text-xs text-emerald-600">They&apos;ll receive a link to set up their password. Expires in 7 days.</p>
            </div>
            {inviteLink && (
              <>
                <button
                  type="button"
                  onClick={() => setShowLink(!showLink)}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 mx-auto mb-3 transition-colors"
                >
                  <ChevronDown className={`w-3 h-3 transition-transform ${showLink ? "rotate-180" : ""}`} />
                  {showLink ? "Hide backup link" : "Show backup link"}
                </button>
                {showLink && (
                  <div className="bg-slate-50 rounded-lg p-3 flex items-center gap-2 mb-4">
                    <input
                      readOnly
                      value={inviteLink}
                      className="flex-1 bg-transparent text-sm text-slate-700 outline-none truncate"
                    />
                    <Button size="sm" variant="outline" onClick={handleCopy} className="shrink-0">
                      {copied ? <><CheckCircle className="w-3.5 h-3.5 mr-1" /> Copied</> : <><Copy className="w-3.5 h-3.5 mr-1" /> Copy</>}
                    </Button>
                  </div>
                )}
              </>
            )}
            <Button onClick={onClose} className="w-full bg-green-600 hover:bg-green-700 text-white">Done</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contact person name"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="merchant@company.com"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Company (Pty) Ltd"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Payment Services</label>
              <p className="text-xs text-slate-400 mb-2">Select which payment methods this merchant can use</p>
              {loadingServices ? (
                <div className="flex items-center gap-2 text-xs text-slate-400 py-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading services...</div>
              ) : availableServices.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">No services available</p>
              ) : (
                <div className="space-y-2">
                  {availableServices.map((svc: any) => (
                    <div key={svc.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedServices.includes(svc.code) ? 'bg-green-100' : 'bg-slate-100'}`}>
                          {svc.category === 'card' ? <span className="text-sm">💳</span> : <span className="text-sm">🏦</span>}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-700">{svc.name}</p>
                          <p className="text-xs text-slate-400">{svc.code}</p>
                        </div>
                      </div>
                      <Switch
                        checked={selectedServices.includes(svc.code)}
                        onCheckedChange={(checked) => {
                          setSelectedServices(prev =>
                            checked ? [...prev, svc.code] : prev.filter(c => c !== svc.code)
                          );
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button
                type="submit"
                disabled={submitting || selectedServices.length === 0}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {submitting ? "Sending..." : "Send Invitation"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
