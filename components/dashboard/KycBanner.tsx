"use client";

import Link from "next/link";
import { ShieldAlert, ArrowRight, Clock, XCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface KycBannerProps {
  kycStatus: string;
  accountMode: string;
}

export function KycBanner({ kycStatus, accountMode }: KycBannerProps) {
  if (kycStatus === "approved" && accountMode === "live") return null;

  if (kycStatus === "approved") return null;

  if (kycStatus === "pending_review") {
    return (
      <div className="mx-4 sm:mx-6 mt-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 px-5 py-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">KYC Under Review</p>
              <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">
                Your application is being reviewed. We&apos;ll notify you once it&apos;s approved. Your account is currently in demo mode.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (kycStatus === "rejected") {
    return (
      <div className="mx-4 sm:mx-6 mt-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 px-5 py-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/50 flex items-center justify-center shrink-0">
              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-red-900 dark:text-red-200">KYC Application Rejected</p>
              <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">
                Your KYC application was not approved. Please review the feedback and resubmit.
              </p>
            </div>
            <Link href="/dashboard/kyc">
              <Button size="sm" className="gap-1.5 bg-red-600 hover:bg-red-700 text-white shrink-0">
                Resubmit <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-4 sm:mx-6 mt-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 px-5 py-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/40 dark:to-emerald-950/30 border border-green-200 dark:border-green-800">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-700 to-green-500 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-green-900 dark:text-green-200">Complete Your KYC</p>
            <p className="text-xs text-green-800 dark:text-green-400 mt-0.5">
              Your account is in <strong>demo mode</strong>. Complete your KYC verification to start processing live transactions.
            </p>
          </div>
          <Link href="/dashboard/kyc">
            <Button size="sm" className="gap-1.5 bg-green-700 hover:bg-green-800 text-white shrink-0">
              Start KYC <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
