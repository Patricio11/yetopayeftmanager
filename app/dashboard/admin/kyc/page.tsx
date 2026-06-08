'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Search, RefreshCw, CheckCircle, XCircle, Clock, Mail, Shield,
  Building, FileText, Eye, ChevronRight, MoreHorizontal, Users,
  AlertTriangle, X, ExternalLink, Globe, Hash, MapPin, Loader2, Settings2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface Document {
  id: string;
  requirementId: string | null;
  requirementName: string;
  originalName: string;
  url: string;
  mimeType: string | null;
  sizeBytes: number | null;
}

interface KycUser {
  id: string;
  name: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  role: string;
  companyName: string | null;
  companyReg: string | null;
  companyAddress: string | null;
  companyCountry: string | null;
  vatNumber: string | null;
  emailVerified: boolean;
  isActive: boolean;
  kycStatus: string | null;
  kycData: Record<string, any> | null;
  kycSubmittedAt: string | null;
  accountMode: string | null;
  vettingStatus: string | null;
  vettingRejectionReason: string | null;
  vettingAdminNote: string | null;
  vettingReviewedAt: string | null;
  mfaEnabled: boolean;
  documents: Document[];
  documentCount: number;
  createdAt: string;
  updatedAt: string;
}

type Tab = 'pending_review' | 'pending' | 'approved' | 'rejected' | 'ALL';

const TABS: { id: Tab; label: string; icon: any; color: string }[] = [
  { id: 'pending_review', label: 'Pending Review', icon: Clock, color: 'text-green-700' },
  { id: 'pending', label: 'Not Submitted', icon: FileText, color: 'text-violet-600' },
  { id: 'approved', label: 'Approved', icon: CheckCircle, color: 'text-emerald-600' },
  { id: 'rejected', label: 'Rejected', icon: XCircle, color: 'text-red-600' },
  { id: 'ALL', label: 'All', icon: Users, color: 'text-slate-600' },
];

export default function AdminKycPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<KycUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('pending_review');
  const [selectedUser, setSelectedUser] = useState<KycUser | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/kyc');
      const data = await res.json();
      if (data.success) setUsers(data.data || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const counts = {
    pending_review: users.filter(u => u.kycStatus === 'pending_review').length,
    pending: users.filter(u => u.kycStatus === 'pending' || !u.kycStatus).length,
    approved: users.filter(u => u.kycStatus === 'approved').length,
    rejected: users.filter(u => u.kycStatus === 'rejected').length,
    ALL: users.length,
  };

  const filtered = users.filter(u => {
    const matchTab = activeTab === 'ALL' || (activeTab === 'pending' ? (u.kycStatus === 'pending' || !u.kycStatus) : u.kycStatus === activeTab);
    if (!matchTab) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      u.name?.toLowerCase().includes(s) ||
      u.email?.toLowerCase().includes(s) ||
      u.companyName?.toLowerCase().includes(s) ||
      u.companyReg?.toLowerCase().includes(s)
    );
  });

  const statusBadge = (status: string | null) => {
    const map: Record<string, { label: string; bg: string; text: string; icon: any }> = {
      pending_review: { label: 'Pending Review', bg: 'bg-green-50 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-400', icon: Clock },
      pending: { label: 'Not Submitted', bg: 'bg-violet-50 dark:bg-violet-900/30', text: 'text-violet-700 dark:text-violet-400', icon: FileText },
      approved: { label: 'KYC Approved', bg: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', icon: CheckCircle },
      rejected: { label: 'Rejected', bg: 'bg-red-50 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', icon: XCircle },
    };
    const s = map[status || 'pending'] || { label: status || 'Unknown', bg: 'bg-slate-100', text: 'text-slate-600', icon: AlertTriangle };
    const Icon = s.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
        <Icon className="w-3 h-3" />{s.label}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">KYC & Onboarding</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Review and manage merchant & partner applications</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/admin/kyc/requirements">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Settings2 className="w-3.5 h-3.5" />Requirements
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={fetchUsers} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />Refresh
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2 mb-5 scrollbar-none">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const count = counts[tab.id];
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-800/50'
              }`}
            >
              <tab.icon className={`w-4 h-4 ${isActive ? tab.color : ''}`} />
              {tab.label}
              {count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  isActive && tab.id === 'pending_review'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search by company, name, email, or registration number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-white dark:bg-slate-800"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/50 rounded-xl overflow-hidden shadow-sm">
        {/* Header */}
        <div className="hidden lg:grid lg:grid-cols-[1fr_100px_100px_80px_120px_50px] gap-4 px-5 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200/60 dark:border-slate-700/50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <span>Company / Contact</span>
          <span>Role</span>
          <span>Reg / VAT</span>
          <span>Docs</span>
          <span>Status</span>
          <span></span>
        </div>

        {loading ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="px-5 py-4 flex items-center gap-4 animate-pulse">
                <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="h-3 w-56 bg-slate-200 dark:bg-slate-700 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Shield className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No applications found</p>
            <p className="text-sm text-slate-400 mt-1">
              {activeTab !== 'ALL' ? 'Try a different tab or clear your search' : 'No merchants or partners have signed up yet'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700/30">
            {filtered.map((u) => (
              <div
                key={u.id}
                className="lg:grid lg:grid-cols-[1fr_100px_100px_80px_120px_50px] gap-4 px-5 py-3.5 items-center hover:bg-slate-50/80 dark:hover:bg-slate-700/20 transition-colors cursor-pointer"
                onClick={() => setSelectedUser(u)}
              >
                {/* Company / Contact */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 ${
                    u.kycStatus === 'approved'
                      ? 'bg-gradient-to-br from-emerald-500 to-emerald-600'
                      : u.kycStatus === 'pending_review'
                      ? 'bg-gradient-to-br from-green-500 to-green-700'
                      : 'bg-gradient-to-br from-slate-400 to-slate-500'
                  }`}>
                    {(u.companyName || u.name || '?')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">{u.companyName || u.name}</p>
                    <p className="text-xs text-slate-500 truncate">{u.name} &middot; {u.email}</p>
                  </div>
                </div>

                {/* Role */}
                <div className="hidden lg:block">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    u.role === 'partner'
                      ? 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'
                      : 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  }`}>
                    {u.role}
                  </span>
                </div>

                {/* Reg / VAT */}
                <div className="hidden lg:block">
                  <p className="text-xs text-slate-600 dark:text-slate-300 truncate">{u.companyReg || '—'}</p>
                  {u.vatNumber && <p className="text-[11px] text-slate-400 truncate">VAT: {u.vatNumber}</p>}
                </div>

                {/* Docs */}
                <div className="hidden lg:block">
                  <span className="text-sm text-slate-600 dark:text-slate-300">{u.documentCount}</span>
                </div>

                {/* Status */}
                <div className="hidden lg:block">
                  {statusBadge(u.kycStatus)}
                </div>

                {/* Action */}
                <div className="hidden lg:flex justify-end">
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>

                {/* Mobile extras */}
                <div className="lg:hidden flex flex-wrap gap-2 mt-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    u.role === 'partner'
                      ? 'bg-violet-50 text-violet-700'
                      : 'bg-blue-50 text-blue-700'
                  }`}>{u.role}</span>
                  {statusBadge(u.kycStatus)}
                  <span className="text-xs text-slate-400">{u.documentCount} docs</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50">
            <p className="text-xs text-slate-500">Showing {filtered.length} of {users.length} users</p>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selectedUser && (
        <ReviewModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onAction={() => { setSelectedUser(null); fetchUsers(); }}
          toast={toast}
        />
      )}
    </div>
  );
}

function KycDataSection({ label, icon: Icon, children }: { label: string; icon: any; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
        <Icon className="w-4 h-4 text-slate-400" /> {label}
      </h3>
      {children}
    </div>
  );
}

function ReviewModal({
  user,
  onClose,
  onAction,
  toast,
}: {
  user: KycUser;
  onClose: () => void;
  onAction: () => void;
  toast: any;
}) {
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'request-changes' | null>(null);
  const [reason, setReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const kyc = user.kycData || {};

  const handleAction = async (action: string, body?: any) => {
    setProcessing(true);
    try {
      const res = await fetch(`/api/admin/kyc/${user.id}/${action}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Success', description: data.message || `Action completed` });
        onAction();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' });
    }
    setProcessing(false);
    setActionType(null);
  };

  const statusBadge = (status: string | null) => {
    const map: Record<string, { label: string; bg: string }> = {
      pending_review: { label: 'Pending Review', bg: 'bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-400' },
      pending: { label: 'Not Submitted', bg: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400' },
      approved: { label: 'KYC Approved', bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' },
      rejected: { label: 'Rejected', bg: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
    };
    const s = map[status || 'pending'] || { label: status || 'Unknown', bg: 'bg-slate-100 text-slate-600' };
    return <span className={`px-3 py-1 rounded-full text-xs font-semibold ${s.bg}`}>{s.label}</span>;
  };

  const modeBadge = user.accountMode === 'live'
    ? <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">LIVE</span>
    : <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">DEMO</span>;

  const hasKycData = Object.keys(kyc).length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[90vh] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{user.companyName || user.name}</h2>
              {statusBadge(user.kycStatus)}
              {modeBadge}
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">{user.id}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Context cards */}
          {user.kycStatus === 'rejected' && user.vettingRejectionReason && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-sm text-red-800 dark:text-red-300">
              <strong>Rejection reason:</strong> {user.vettingRejectionReason}
            </div>
          )}
          {user.vettingAdminNote && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3 text-sm text-green-900 dark:text-green-300">
              <strong>Admin note:</strong> {user.vettingAdminNote}
            </div>
          )}
          {user.kycSubmittedAt && (
            <div className="text-xs text-slate-500">
              KYC submitted: {new Date(user.kycSubmittedAt).toLocaleString('en-ZA')}
            </div>
          )}

          {/* Contact Info */}
          <KycDataSection label="Contact" icon={Users}>
            <div className="grid grid-cols-2 gap-3">
              <InfoRow label="Name" value={user.fullName || user.name} />
              <InfoRow label="Email" value={user.email} verified={user.emailVerified} />
              <InfoRow label="Phone" value={user.phone} />
              <InfoRow label="Role" value={user.role} />
              <InfoRow label="2FA" value={user.mfaEnabled ? 'Enabled' : 'Disabled'} />
              <InfoRow label="Joined" value={new Date(user.createdAt).toLocaleDateString('en-ZA')} />
            </div>
          </KycDataSection>

          {/* Business Details from kycData */}
          {hasKycData ? (
            <>
              <KycDataSection label="Business Details" icon={Building}>
                <div className="grid grid-cols-2 gap-3">
                  <InfoRow label="Business Name" value={kyc.businessName} />
                  <InfoRow label="Trading Name" value={kyc.tradingName} />
                  <InfoRow label="Registration No." value={kyc.registrationNumber} />
                  <InfoRow label="VAT Number" value={kyc.vatNumber} />
                  <InfoRow label="Industry" value={kyc.industry} />
                  <InfoRow label="Monthly Volume" value={kyc.monthlyVolume} />
                  <InfoRow label="Store Name" value={kyc.storeName} />
                  <InfoRow label="Commencement Date" value={kyc.commencementDate} />
                  <InfoRow label="Website" value={kyc.website} />
                  <InfoRow label="Country" value={kyc.country} />
                  <div className="col-span-2">
                    <InfoRow label="Address" value={[kyc.address, kyc.city].filter(Boolean).join(', ')} />
                  </div>
                </div>
              </KycDataSection>

              <KycDataSection label="Director" icon={Shield}>
                <div className="grid grid-cols-2 gap-3">
                  <InfoRow label="Name" value={kyc.directorName} />
                  <InfoRow label="Email" value={kyc.directorEmail} />
                  <InfoRow label="ID Number" value={kyc.directorIdNumber} />
                  <InfoRow label="Capacity" value={kyc.directorCapacity} />
                  <div className="col-span-2">
                    <InfoRow label="Home Address" value={kyc.directorHomeAddress} />
                  </div>
                </div>
              </KycDataSection>

              <KycDataSection label="Primary Contact" icon={Mail}>
                <div className="grid grid-cols-2 gap-3">
                  <InfoRow label="Name" value={kyc.primaryContactName} />
                  <InfoRow label="Email" value={kyc.primaryContactEmail} />
                  <InfoRow label="Phone" value={kyc.primaryContactPhone} />
                </div>
              </KycDataSection>

              {(kyc.financeContactName || kyc.financeContactEmail) && (
                <KycDataSection label="Finance Contact" icon={FileText}>
                  <div className="grid grid-cols-2 gap-3">
                    <InfoRow label="Name" value={kyc.financeContactName} />
                    <InfoRow label="Email" value={kyc.financeContactEmail} />
                    <InfoRow label="Phone" value={kyc.financeContactPhone} />
                  </div>
                </KycDataSection>
              )}

              {(kyc.technicalContactName || kyc.technicalContactEmail) && (
                <KycDataSection label="Technical Contact" icon={Globe}>
                  <div className="grid grid-cols-2 gap-3">
                    <InfoRow label="Name" value={kyc.technicalContactName} />
                    <InfoRow label="Email" value={kyc.technicalContactEmail} />
                    <InfoRow label="Phone" value={kyc.technicalContactPhone} />
                  </div>
                </KycDataSection>
              )}

              <KycDataSection label="Banking" icon={Building}>
                <div className="grid grid-cols-2 gap-3">
                  <InfoRow label="Bank Name" value={kyc.bankName} />
                  <InfoRow label="Account Holder" value={kyc.accountHolder} />
                  <InfoRow label="Branch Code" value={kyc.branchCode} />
                  <InfoRow label="Current Acquiring Bank" value={kyc.currentAcquiringBank} />
                  <InfoRow label="PSP" value={kyc.psp} />
                  <InfoRow label="Current PMS" value={kyc.currentPms} />
                </div>
              </KycDataSection>
            </>
          ) : (
            <>
              <KycDataSection label="Company (from Onboarding)" icon={Building}>
                <div className="grid grid-cols-2 gap-3">
                  <InfoRow label="Legal Name" value={user.companyName} />
                  <InfoRow label="Registration" value={user.companyReg} />
                  <InfoRow label="Country" value={user.companyCountry} />
                  <InfoRow label="VAT" value={user.vatNumber} />
                  <div className="col-span-2">
                    <InfoRow label="Address" value={user.companyAddress} />
                  </div>
                </div>
              </KycDataSection>
              <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-center">
                <FileText className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500">KYC form has not been submitted yet</p>
              </div>
            </>
          )}

          {/* Documents */}
          <KycDataSection label={`Documents (${user.documents.length})`} icon={FileText}>
            {user.documents.length === 0 ? (
              <p className="text-sm text-slate-400">No documents uploaded</p>
            ) : (
              <div className="space-y-2">
                {user.documents.map((doc) => (
                  <a
                    key={doc.id}
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group"
                  >
                    <FileText className="w-5 h-5 text-green-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{doc.requirementName}</p>
                      <p className="text-xs text-slate-500 truncate">{doc.originalName}</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-green-500 transition-colors shrink-0" />
                  </a>
                ))}
              </div>
            )}
          </KycDataSection>

          {/* Action prompt */}
          {actionType && (
            <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
                {actionType === 'reject' ? 'Rejection Reason' : 'Note for the user'}
              </h4>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder={
                  actionType === 'reject'
                    ? 'Explain why the application was rejected...'
                    : 'What changes do you need? (e.g. "Proof of address is older than 3 months")'
                }
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white resize-none mb-3"
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={() => { setActionType(null); setReason(''); }}>Cancel</Button>
                <Button
                  size="sm"
                  disabled={!reason.trim() || processing}
                  onClick={() => handleAction(actionType, actionType === 'reject' ? { reason } : { note: reason })}
                  className={actionType === 'reject' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-green-500 hover:bg-green-700 text-white'}
                >
                  {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : actionType === 'reject' ? 'Reject' : 'Request Changes'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-2 bg-slate-50/50 dark:bg-slate-800/50">
          {user.kycStatus === 'pending_review' && !actionType && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setActionType('request-changes')}
                className="gap-1.5 text-green-700 border-green-200 hover:bg-green-50"
              >
                <AlertTriangle className="w-3.5 h-3.5" />Request Changes
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setActionType('reject')}
                className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
              >
                <XCircle className="w-3.5 h-3.5" />Reject
              </Button>
              <Button
                size="sm"
                onClick={() => handleAction('approve')}
                disabled={processing}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                Approve
              </Button>
            </>
          )}
          {user.kycStatus !== 'pending_review' && (
            <Button size="sm" variant="outline" onClick={onClose}>Close</Button>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, verified }: { label: string; value: string | null | undefined; verified?: boolean }) {
  return (
    <div>
      <p className="text-[11px] text-slate-400 uppercase tracking-wider">{label}</p>
      <div className="flex items-center gap-1.5">
        <p className="text-sm text-slate-900 dark:text-white">{value || '—'}</p>
        {verified !== undefined && (
          verified
            ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            : <XCircle className="w-3.5 h-3.5 text-red-400" />
        )}
      </div>
    </div>
  );
}
