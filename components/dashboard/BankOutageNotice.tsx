import { AlertTriangle, ExternalLink } from "lucide-react";
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
 * Server-rendered banner shown to all dashboard users when one or more banks
 * have been automatically disabled due to consecutive failures.
 */
export function BankOutageNotice({ outages }: BankOutageNoticeProps) {
  if (outages.length === 0) return null;

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
        <Link
          href="/dashboard/banks"
          className="flex items-center gap-1 text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full whitespace-nowrap transition-colors flex-shrink-0"
        >
          Manage Banks
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
