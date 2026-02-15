"use client";

import { useState } from "react";
import { CreditCard, Webhook, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { BankAccountsSettings } from "./BankAccountsSettings";
import { WebhookSettings } from "./WebhookSettings";
import { EftUrlSettings } from "./EftUrlSettings";

const subTabs = [
  { id: "bank-accounts", label: "Bank Accounts", icon: CreditCard },
  { id: "webhooks", label: "Webhooks", icon: Webhook },
  { id: "eft-urls", label: "EFT URLs", icon: ExternalLink },
] as const;

type SubTabId = typeof subTabs[number]["id"];

export function EftSuperTab({ initialSubTab }: { initialSubTab?: string }) {
  const [activeSubTab, setActiveSubTab] = useState<SubTabId>(
    (subTabs.find(t => t.id === initialSubTab)?.id) || "bank-accounts"
  );

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Left sidebar navigation */}
      <nav className="w-full md:w-48 flex-shrink-0">
        <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
          {subTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 w-full px-3 py-2.5 text-sm rounded-lg text-left transition-colors whitespace-nowrap",
                  activeSubTab === tab.id
                    ? "bg-blue-50 text-blue-700 font-medium border border-blue-200"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Right content area */}
      <div className="flex-1 min-w-0">
        {activeSubTab === "bank-accounts" && <BankAccountsSettings />}
        {activeSubTab === "webhooks" && <WebhookSettings />}
        {activeSubTab === "eft-urls" && <EftUrlSettings />}
      </div>
    </div>
  );
}
