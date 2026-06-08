"use client";

import React from 'react';
import { FileText, ExternalLink } from 'lucide-react';

export function TermsAndConditionsSettings() {
  return (
    <div className="space-y-6">
      <div className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800/50 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-green-700 to-green-500 flex items-center justify-center text-white">
            <FileText className="w-4.5 h-4.5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Terms &amp; Conditions</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Legal pages shown to customers during payment
            </p>
          </div>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          Customers may be asked to agree to our Terms &amp; Conditions and Privacy Policy before completing a payment.
          This setting is managed globally by the platform admin.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href="/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            View Privacy Policy
          </a>
          <a
            href="/terms-and-conditions"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            View Terms &amp; Conditions
          </a>
        </div>
      </div>
    </div>
  );
}
