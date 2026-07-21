"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Send,
  User,
  Mail,
  Hash,
  DollarSign,
  Building,
  Calendar,
  FileText,
  Loader2,
  Code,
  ChevronDown,
  Copy,
  ScrollText,
  ExternalLink,
  ImageIcon,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { AuditTimeline } from "@/components/dashboard/AuditTimeline";

// ─── Types ──────────────────────────────────────────────────────────────────

type TransactionData = {
  transaction: {
    id: string;
    reference: string;
    amount: string;
    status: string | null;
    createdAt: Date;
    completedAt: Date | null;
    updatedAt: Date;
    customerEmail: string | null;
    customerName: string | null;
    description: string | null;
    statusReason?: string | null;
    updatedBy?: string | null;
    notifyUrl?: string | null;
    successUrl?: string | null;
    failureUrl?: string | null;
    cancelledUrl?: string | null;
    metadata?: any;
  };
  merchant: {
    id: string;
    name: string;
    email: string;
    companyName: string | null;
  } | null;
  bank: {
    id: string;
    bankName: string;
    code: string;
  } | null;
};

// ─── View Transaction Dialog ────────────────────────────────────────────────

interface TransactionDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: TransactionData | null;
  isAdmin: boolean;
}

export function TransactionDetailDialog({
  open,
  onOpenChange,
  transaction,
  isAdmin,
}: TransactionDetailDialogProps) {
  const { toast } = useToast();
  const [resending, setResending] = useState(false);
  const [jsonOpen, setJsonOpen] = useState(false);
  const [jsonCopied, setJsonCopied] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);

  if (!transaction) return null;

  const t = transaction.transaction;
  const m = transaction.merchant;
  const b = transaction.bank;

  const handleResendWebhook = async () => {
    setResending(true);
    try {
      const res = await fetch(`/api/admin/transactions/${t.id}/resend-webhook`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to resend");
      toast({ title: "Webhook Sent", description: data.message });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to resend webhook",
        variant: "destructive",
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-blue-600" />
            Transaction Details
          </DialogTitle>
          <DialogDescription>
            Reference: {t.reference}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status & Amount */}
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <div>
              <p className="text-sm text-slate-500 mb-1">Amount</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">
                R {parseFloat(t.amount).toFixed(2)}
              </p>
            </div>
            <StatusBadge status={t.status || "not_started"} />
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DetailRow icon={Hash} label="Transaction ID" value={t.id} mono />
            <DetailRow icon={Hash} label="Reference" value={t.reference} mono />
            <DetailRow
              icon={Calendar}
              label="Created"
              value={format(new Date(t.createdAt), "MMM dd, yyyy HH:mm:ss")}
            />
            <DetailRow
              icon={Calendar}
              label="Updated"
              value={format(new Date(t.updatedAt), "MMM dd, yyyy HH:mm:ss")}
            />
            {t.completedAt && (
              <DetailRow
                icon={CheckCircle}
                label="Completed"
                value={format(new Date(t.completedAt), "MMM dd, yyyy HH:mm:ss")}
              />
            )}
            <DetailRow
              icon={Building}
              label="Bank"
              value={b?.bankName || "Not selected"}
            />
          </div>

          {/* Customer Info */}
          {(t.customerName || t.customerEmail) && (
            <div>
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                Customer
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {t.customerName && (
                  <DetailRow icon={User} label="Name" value={t.customerName} />
                )}
                {t.customerEmail && (
                  <DetailRow icon={Mail} label="Email" value={t.customerEmail} />
                )}
              </div>
            </div>
          )}

          {/* Merchant Info (admin only) */}
          {isAdmin && m && (
            <div>
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                Merchant
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DetailRow
                  icon={Building}
                  label="Company"
                  value={m.companyName || m.name}
                />
                <DetailRow icon={Mail} label="Email" value={m.email} />
              </div>
            </div>
          )}

          {/* Status Update Info */}
          {(t.statusReason || (t.metadata as any)?.completion_message) && (
            <div className={`p-4 rounded-lg border ${
              t.status === 'cancelled' ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700' :
              t.status === 'failed' ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800' :
              'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800'
            }`}>
              <h4 className={`text-sm font-semibold mb-1 ${
                t.status === 'cancelled' ? 'text-slate-700 dark:text-slate-300' :
                t.status === 'failed' ? 'text-red-800 dark:text-red-300' :
                'text-amber-800 dark:text-amber-300'
              }`}>
                {t.status === 'cancelled' ? 'Cancellation Reason' : t.status === 'failed' ? 'Failure Reason' : 'Status Reason'}
              </h4>
              <p className={`text-sm ${
                t.status === 'cancelled' ? 'text-slate-600 dark:text-slate-400' :
                t.status === 'failed' ? 'text-red-700 dark:text-red-400' :
                'text-amber-700 dark:text-amber-400'
              }`}>
                {t.statusReason || (t.metadata as any)?.completion_message}
              </p>
            </div>
          )}

          {/* Description */}
          {t.description && (
            <div>
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Description
              </h4>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t.description}
              </p>
            </div>
          )}

          {/* JSON Response Accordion */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
            <button
              onClick={() => setJsonOpen(!jsonOpen)}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Webhook JSON Response
                </span>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${jsonOpen ? 'rotate-180' : ''}`} />
            </button>
            {jsonOpen && (
              <div className="border-t border-slate-200 dark:border-slate-700 p-4">
                <div className="flex justify-end mb-2">
                  <button
                    onClick={() => {
                      const jsonPayload = {
                        event: t.status === 'completed' ? 'payment.completed' : t.status === 'failed' || t.status === 'expired' ? 'payment.failed' : t.status === 'cancelled' || t.status === 'aborted' ? 'payment.cancelled' : 'transaction.updated',
                        data: {
                          id: t.id,
                          reference: t.reference,
                          amount: parseFloat(t.amount),
                          status: t.status,
                          customerEmail: t.customerEmail || undefined,
                          customerName: t.customerName || undefined,
                          bankName: b?.bankName || undefined,
                          metadata: t.metadata || {},
                          createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : undefined,
                          completedAt: t.completedAt ? new Date(t.completedAt).toISOString() : undefined,
                          message: (t.metadata as any)?.completion_message || undefined,
                          gatewayResult: (t.metadata as any)?.gateway_result || undefined,
                        },
                      };
                      navigator.clipboard.writeText(JSON.stringify(jsonPayload, null, 2));
                      setJsonCopied(true);
                      setTimeout(() => setJsonCopied(false), 2000);
                    }}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                  >
                    {jsonCopied ? <CheckCircle className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                    {jsonCopied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <pre className="bg-slate-900 dark:bg-slate-950 text-amber-400 p-4 rounded-lg text-xs overflow-x-auto max-h-80 overflow-y-auto">
                  {JSON.stringify(
                    {
                      event: t.status === 'completed' ? 'payment.completed' : t.status === 'failed' || t.status === 'expired' ? 'payment.failed' : t.status === 'cancelled' || t.status === 'aborted' ? 'payment.cancelled' : 'transaction.updated',
                      data: {
                        id: t.id,
                        reference: t.reference,
                        amount: parseFloat(t.amount),
                        status: t.status,
                        customerEmail: t.customerEmail || undefined,
                        customerName: t.customerName || undefined,
                        bankName: b?.bankName || undefined,
                        metadata: t.metadata || {},
                        createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : undefined,
                        completedAt: t.completedAt ? new Date(t.completedAt).toISOString() : undefined,
                        message: (t.metadata as any)?.completion_message || undefined,
                        gatewayResult: (t.metadata as any)?.gateway_result || undefined,
                      },
                    },
                    null,
                    2
                  )}
                </pre>
                <p className="text-xs text-slate-500 mt-2">
                  This is the JSON payload sent to the merchant via webhook when the transaction status changes.
                </p>
              </div>
            )}
          </div>

          {/* URLs (admin only) */}
          {isAdmin && (t.notifyUrl || t.successUrl || t.failureUrl) && (
            <div>
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                Callback URLs
              </h4>
              <div className="space-y-2 text-sm">
                {t.notifyUrl && (
                  <div className="flex gap-2">
                    <span className="text-slate-500 w-20 shrink-0">Notify:</span>
                    <span className="font-mono text-xs text-slate-600 dark:text-slate-400 break-all">{t.notifyUrl}</span>
                  </div>
                )}
                {t.successUrl && (
                  <div className="flex gap-2">
                    <span className="text-slate-500 w-20 shrink-0">Success:</span>
                    <span className="font-mono text-xs text-slate-600 dark:text-slate-400 break-all">{t.successUrl}</span>
                  </div>
                )}
                {t.failureUrl && (
                  <div className="flex gap-2">
                    <span className="text-slate-500 w-20 shrink-0">Failure:</span>
                    <span className="font-mono text-xs text-slate-600 dark:text-slate-400 break-all">{t.failureUrl}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Audit trail (admin only) */}
          {isAdmin && (
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Audit Trail
                </p>
                <p className="text-xs text-slate-500">
                  Full EFT session log and captured screenshots for this transaction
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setAuditOpen(true)}>
                <ScrollText className="w-4 h-4 mr-2" />
                View Audit
              </Button>
            </div>
          )}

          {/* Resend Webhook (admin only) */}
          {isAdmin && (
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Resend Webhook
                </p>
                <p className="text-xs text-slate-500">
                  Dispatch a webhook event with the current status to the merchant
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleResendWebhook}
                disabled={resending}
              >
                {resending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                {resending ? "Sending..." : "Resend"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>

      {isAdmin && (
        <TransactionAuditDialog
          open={auditOpen}
          onOpenChange={setAuditOpen}
          transactionId={t.id}
          reference={t.reference}
        />
      )}
    </Dialog>
  );
}

// ─── Audit Trail Dialog (admin) ─────────────────────────────────────────────
// Shows the EFT service's transaction log and the screenshots it captured,
// fetched from the storage buckets ({date}/{transactionId}/...).

interface AuditData {
  date: string | null;
  log: string | null;
  screenshots: { name: string; url: string }[];
  logFiles: { name: string; url: string }[];
}

function TransactionAuditDialog({
  open,
  onOpenChange,
  transactionId,
  reference,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionId: string;
  reference: string;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [audit, setAudit] = useState<AuditData | null>(null);

  useEffect(() => {
    if (!open) return;
    setAudit(null);
    setLoading(true);
    fetch(`/api/admin/transactions/${transactionId}/audit`)
      .then((r) => r.json())
      .then((j) => {
        if (j.success) {
          setAudit(j.data);
        } else {
          toast({ title: "Error", description: j.message || "Failed to load audit", variant: "destructive" });
        }
      })
      .catch(() => toast({ title: "Error", description: "Failed to load audit trail", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [open, transactionId, toast]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-green-700" />
            Transaction Audit
          </DialogTitle>
          <DialogDescription>
            The full story of this transaction — log and screenshots · Ref {reference}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-[320px] pr-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-slate-400 animate-spin mb-3" />
              <p className="text-sm text-slate-500">Loading audit trail...</p>
            </div>
          ) : (
            <AuditTimeline log={audit?.log ?? null} screenshots={audit?.screenshots || []} />
          )}
        </div>

        <DialogFooter className="flex-row items-center justify-between sm:justify-between">
          <span className="text-xs text-slate-400">{audit?.date ? `Stored under ${audit.date}` : ""}</span>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface UpdateStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: TransactionData | null;
  onSuccess: () => void;
}

export function UpdateStatusDialog({
  open,
  onOpenChange,
  transaction,
  onSuccess,
}: UpdateStatusDialogProps) {
  const { toast } = useToast();
  const [status, setStatus] = useState("");
  const [reason, setReason] = useState("");
  const [resendWebhook, setResendWebhook] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!transaction) return null;

  const t = transaction.transaction;

  const statuses = [
    { value: "not_started", label: "Not Started" },
    { value: "initiated", label: "Initiated" },
    { value: "pending", label: "Pending" },
    { value: "completed", label: "Completed" },
    { value: "failed", label: "Failed" },
    { value: "aborted", label: "Aborted" },
    { value: "cancelled", label: "Cancelled" },
    { value: "expired", label: "Expired" },
  ].filter((s) => s.value !== t.status);

  const handleSubmit = async () => {
    if (!status || !reason.trim()) {
      toast({
        title: "Validation Error",
        description: "Please select a status and provide a reason.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/transactions/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reason: reason.trim(), resendWebhook }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update");
      }

      toast({
        title: "Status Updated",
        description: data.message,
      });

      setStatus("");
      setReason("");
      setResendWebhook(false);
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update transaction status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Update Transaction Status
          </DialogTitle>
          <DialogDescription>
            {t.reference} - Currently: <StatusBadge status={t.status || "not_started"} />
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* New Status */}
          <div className="space-y-2">
            <Label>New Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="cursor-pointer">
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent className="cursor-pointer">
                {statuses.map((s) => (
                  <SelectItem key={s.value} value={s.value} className="cursor-pointer">
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label>Reason for Update <span className="text-red-500">*</span></Label>
            <Textarea
              placeholder="Explain why you're changing the status..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-slate-500 text-right">{reason.length}/500</p>
          </div>

          {/* Resend Webhook Switch */}
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <div className="space-y-1">
              <Label htmlFor="resend-webhook" className="cursor-pointer">
                Resend Webhook
              </Label>
              <p className="text-xs text-slate-500">
                Dispatch a webhook event with the new status to the merchant
              </p>
            </div>
            <Switch
              id="resend-webhook"
              checked={resendWebhook}
              onCheckedChange={setResendWebhook}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !status || !reason.trim()}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Update Status
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Resend Webhook Confirm Dialog ──────────────────────────────────────────

interface ResendWebhookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: TransactionData | null;
}

export function ResendWebhookDialog({
  open,
  onOpenChange,
  transaction,
}: ResendWebhookDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  if (!transaction) return null;

  const t = transaction.transaction;

  const handleResend = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/transactions/${t.id}/resend-webhook`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to resend");
      }

      toast({
        title: "Webhook Sent",
        description: data.message,
      });

      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to resend webhook",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Send className="w-5 h-5 text-blue-500" />
            Resend Webhook
          </DialogTitle>
          <DialogDescription>
            This will dispatch a webhook event for transaction {t.reference} with its current status ({t.status}).
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleResend} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Resend Webhook
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Shared Components ──────────────────────────────────────────────────────

function DetailRow({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: any;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p
          className={`text-sm text-slate-900 dark:text-white break-all ${
            mono ? "font-mono text-xs" : ""
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; icon: any }> = {
    completed: { color: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400", icon: CheckCircle },
    initiated: { color: "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400", icon: Clock },
    pending: { color: "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400", icon: Clock },
    failed: { color: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400", icon: XCircle },
    cancelled: { color: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400", icon: XCircle },
    aborted: { color: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400", icon: XCircle },
    expired: { color: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400", icon: XCircle },
  };

  const c = config[status] || { color: "bg-slate-100 text-slate-700", icon: Clock };
  const Icon = c.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${c.color}`}>
      <Icon className="w-3.5 h-3.5" />
      {status}
    </span>
  );
}
