"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import {
  User, Key, Lock, Building2, Bell, CreditCard, Zap,
  Webhook, ExternalLink, FileText, Activity, Settings, ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { ProfileSettings } from "./components/ProfileSettings";
import { SecuritySettings } from "./components/SecuritySettings";
import { ApiKeysSettings } from "./components/ApiKeysSettings";
import { CompanySettings } from "./components/CompanySettings";
import { NotificationSettings } from "./components/NotificationSettings";
import { PaymentMethodsSettings } from "./components/PaymentMethodsSettings";
import { BankAccountsSettings } from "./components/BankAccountsSettings";
import { WebhookSettings } from "./components/WebhookSettings";
import { EftUrlSettings } from "./components/EftUrlSettings";
import { TermsAndConditionsSettings } from "./components/TermsAndConditionsSettings";
import { MonitoringSettings } from "./components/MonitoringSettings";

type NavItem = {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
  adminOnly?: boolean;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    title: "Account",
    items: [
      { id: "profile", label: "Profile", icon: User, description: "Personal information" },
      { id: "security", label: "Security", icon: Lock, description: "Password & 2FA" },
      { id: "company", label: "Company", icon: Building2, description: "Business details" },
      { id: "notifications", label: "Notifications", icon: Bell, description: "Alert preferences" },
    ],
  },
  {
    title: "Payments",
    items: [
      { id: "services", label: "Payment Methods", icon: Zap, description: "Enabled services" },
      { id: "bank-accounts", label: "Bank Accounts", icon: CreditCard, description: "Linked accounts" },
      { id: "eft-urls", label: "Redirect URLs", icon: ExternalLink, description: "Success & failure URLs" },
    ],
  },
  {
    title: "Developer",
    items: [
      { id: "api-keys", label: "API Keys", icon: Key, description: "Manage API access" },
      { id: "webhooks", label: "Webhooks", icon: Webhook, description: "Event notifications" },
    ],
  },
  {
    title: "Platform",
    items: [
      { id: "terms", label: "Terms & Conditions", icon: FileText, description: "Payment page T&Cs", adminOnly: true },
      { id: "monitoring", label: "Monitoring", icon: Activity, description: "Alerts & health checks", adminOnly: true },
    ],
  },
];

const pageMap: Record<string, { title: string; description: string }> = {
  profile: { title: "Profile", description: "Manage your personal information and contact details" },
  security: { title: "Security", description: "Protect your account with password and two-factor authentication" },
  company: { title: "Company", description: "Update your business details and registration info" },
  notifications: { title: "Notifications", description: "Choose how you want to be notified" },
  services: { title: "Payment Methods", description: "Enable or disable payment services for your customers" },
  "bank-accounts": { title: "Bank Accounts", description: "Manage bank accounts for receiving payments" },
  "eft-urls": { title: "Redirect URLs", description: "Configure where customers are sent after payment" },
  "api-keys": { title: "API Keys", description: "Create and manage API keys for your integrations" },
  webhooks: { title: "Webhooks", description: "Set up real-time event notifications" },
  terms: { title: "Terms & Conditions", description: "Manage the T&Cs shown on the payment page" },
  monitoring: { title: "Monitoring", description: "Configure alerts and health check notifications" },
};

function SettingsContent() {
  const { toast } = useToast();
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const isAdmin = (session?.user as any)?.role === "admin";
  const [activeTab, setActiveTab] = useState("profile");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    const subtabParam = searchParams.get("subtab");

    if (subtabParam) {
      setActiveTab(subtabParam);
    } else if (tabParam) {
      const legacyMap: Record<string, string> = {
        "eft-settings": "eft-urls",
        banking: "bank-accounts",
        eft: "bank-accounts",
      };
      setActiveTab(legacyMap[tabParam] || tabParam);

      if (tabParam === "api-keys") {
        toast({
          title: "API Keys",
          description: "Create and manage your API keys here.",
        });
      }
    }
  }, [searchParams, toast]);

  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.adminOnly || isAdmin),
    }))
    .filter((group) => group.items.length > 0);

  const currentPage = pageMap[activeTab] || pageMap.profile;

  const renderContent = () => {
    switch (activeTab) {
      case "profile": return <ProfileSettings />;
      case "security": return <SecuritySettings />;
      case "api-keys": return <ApiKeysSettings />;
      case "company": return <CompanySettings />;
      case "notifications": return <NotificationSettings />;
      case "services": return <PaymentMethodsSettings />;
      case "bank-accounts": return <BankAccountsSettings />;
      case "webhooks": return <WebhookSettings />;
      case "eft-urls": return <EftUrlSettings />;
      case "terms": return isAdmin ? <TermsAndConditionsSettings /> : <ProfileSettings />;
      case "monitoring": return isAdmin ? <MonitoringSettings /> : <ProfileSettings />;
      default: return <ProfileSettings />;
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 md:px-6 max-w-7xl">
          <div className="flex items-center gap-3 py-5">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-green-700 to-green-500 text-white shadow-md shadow-green-700/20">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Settings</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Manage your account and preferences</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 max-w-7xl py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Mobile nav toggle */}
          <button
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="lg:hidden flex items-center justify-between w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm"
          >
            <div className="flex items-center gap-3">
              {(() => {
                const currentItem = visibleGroups.flatMap(g => g.items).find(i => i.id === activeTab);
                const Icon = currentItem?.icon || Settings;
                return (
                  <>
                    <Icon className="w-4 h-4 text-green-700" />
                    <span className="font-medium text-slate-900 dark:text-white">{currentItem?.label || "Settings"}</span>
                  </>
                );
              })()}
            </div>
            <ChevronRight className={cn("w-4 h-4 text-slate-400 transition-transform", mobileNavOpen && "rotate-90")} />
          </button>

          {/* Sidebar */}
          <aside className={cn(
            "lg:block lg:w-60 xl:w-64 flex-shrink-0",
            mobileNavOpen ? "block" : "hidden"
          )}>
            <nav className="lg:sticky lg:top-24 space-y-6">
              {visibleGroups.map((group) => (
                <div key={group.title}>
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 mb-1.5">
                    {group.title}
                  </h3>
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => { setActiveTab(item.id); setMobileNavOpen(false); }}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150 group",
                            isActive
                              ? "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 text-green-800 dark:text-green-400 shadow-sm border border-green-200/60 dark:border-green-800/40"
                              : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white"
                          )}
                        >
                          <Icon className={cn(
                            "w-4 h-4 flex-shrink-0 transition-colors",
                            isActive ? "text-green-700 dark:text-green-400" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                          )} />
                          <div className="min-w-0">
                            <div className={cn("text-sm font-medium truncate", isActive && "font-semibold")}>{item.label}</div>
                            <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate leading-tight">{item.description}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{currentPage.title}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{currentPage.description}</p>
            </div>
            {renderContent()}
          </main>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <SettingsContent />
    </Suspense>
  );
}

function SettingsSkeleton() {
  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80">
        <div className="container mx-auto px-4 md:px-6 max-w-7xl">
          <div className="flex items-center gap-3 py-5">
            <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse" />
            <div className="space-y-2">
              <div className="h-5 w-24 bg-slate-200 dark:bg-slate-700 animate-pulse rounded" />
              <div className="h-3 w-48 bg-slate-200 dark:bg-slate-700 animate-pulse rounded" />
            </div>
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 md:px-6 max-w-7xl py-6">
        <div className="flex gap-6">
          <div className="hidden lg:block w-60 space-y-4">
            {[...Array(3)].map((_, g) => (
              <div key={g} className="space-y-1">
                <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 animate-pulse rounded mx-3 mb-2" />
                {[...Array(g === 0 ? 4 : g === 1 ? 3 : 2)].map((_, i) => (
                  <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-lg mx-1" />
                ))}
              </div>
            ))}
          </div>
          <div className="flex-1 space-y-6">
            <div className="space-y-2">
              <div className="h-6 w-40 bg-slate-200 dark:bg-slate-700 animate-pulse rounded" />
              <div className="h-4 w-72 bg-slate-200 dark:bg-slate-700 animate-pulse rounded" />
            </div>
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 animate-pulse rounded" />
                    <div className="h-10 w-full bg-slate-100 dark:bg-slate-800 animate-pulse rounded-lg" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
