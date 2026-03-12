"use client";

import { useState } from "react";
import { AlertTriangle, ExternalLink, X } from "lucide-react";
import Link from "next/link";

interface Outage {
  bankId: string;
  bankCode: string;
  bankName: string;
  disabledAt: string;
}

interface BankOutageNoticeProps {
  outages: Outage[];
}

/**
 * Banner shown to all dashboard users when one or more banks
 * have been automatically disabled due to consecutive failures.
 * Includes a dismiss button to hide until next page load.
 */
export function BankOutageNotice({ outages }: BankOutageNoticeProps) {
  const [dismissed, setDismissed] = useState(false);

  if (outages.length === 0 || dismissed) return null;

  const names = outages.map((o) => o.bankName).join(", ");
  const plural = outages.length > 1;

  return (
    <div className="bg-red-600 text-white px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <p className="text-sm font-medium truncate">
            <span className="font-bold">
              {plural ? `${outages.length} banks disabled` : `${names} disabled`}
            </span>
            {" — "}
            {plural
              ? `${names} were automatically disabled due to consecutive failures.`
              : "Automatically disabled due to consecutive transaction failures."}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href="/dashboard/banks"
            className="flex items-center gap-1 text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full whitespace-nowrap transition-colors"
          >
            Manage Banks
            <ExternalLink className="w-3 h-3" />
          </Link>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded-full hover:bg-white/20 transition-colors"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
