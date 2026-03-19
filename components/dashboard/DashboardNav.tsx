"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home, Receipt, Settings, LogOut, Zap, Building2, CreditCard, Book,
  Users, Store, BarChart3, FileText, ChevronDown, ShieldCheck, MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth-client";

interface DashboardNavProps {
  userRole: string;
  accountMode?: string;
}

interface NavItem {
  title: string;
  href: string;
  icon: any;
}

interface NavGroup {
  label: string;
  icon: any;
  items: NavItem[];
}

function NavDropdown({ group, pathname }: { group: NavGroup; pathname: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const hasActive = group.items.some(
    (item) => pathname === item.href || pathname.startsWith(item.href)
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const Icon = group.icon;

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        onClick={() => setOpen(!open)}
        className={cn(
          "gap-1.5 cursor-pointer transition-all",
          hasActive
            ? "bg-amber-50 dark:bg-fyro-navy text-fyro-gold dark:text-fyro-gold-light"
            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
        )}
      >
        <Icon className="w-4 h-4" />
        {group.label}
        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", open && "rotate-180")} />
      </Button>

      {open && (
        <div className="absolute top-full right-0 mt-1 w-52 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150">
          {group.items.map((item) => {
            const ItemIcon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-2.5 text-sm transition-colors",
                  isActive
                    ? "bg-amber-50 dark:bg-fyro-navy text-fyro-gold dark:text-fyro-gold-light font-medium"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <ItemIcon className="w-4 h-4" />
                {item.title}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function DashboardNav({ userRole, accountMode }: DashboardNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = userRole === "admin";
  const isPartner = userRole === "partner";

  const handleLogout = async () => {
    try {
      await signOut();
      router.push("/auth/login");
    } catch (error) {
      console.error("Logout error:", error);
      router.push("/auth/login");
    }
  };

  // Top-level items (always visible)
  const mainItems: NavItem[] = [
    { title: "Dashboard", href: "/dashboard", icon: Home },
    { title: "Transactions", href: "/dashboard/transactions", icon: Receipt },
    { title: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
    { title: "Invoices", href: "/dashboard/invoices", icon: FileText },
  ];

  // Admin dropdown group
  const adminGroup: NavGroup = {
    label: "Admin",
    icon: ShieldCheck,
    items: [
      { title: "Merchants", href: "/dashboard/admin/merchants", icon: Store },
      { title: "Partners", href: "/dashboard/admin/partners", icon: Users },
      { title: "Users", href: "/dashboard/admin/users", icon: Users },
      { title: "Banks", href: "/dashboard/banks", icon: Building2 },
      { title: "Recon", href: "/dashboard/admin/recon", icon: BarChart3 },
    ],
  };

  // Partner dropdown group
  const partnerGroup: NavGroup = {
    label: "Partner",
    icon: Building2,
    items: [
      { title: "Merchants", href: "/dashboard/partner/merchants", icon: Store },
      { title: "Transactions", href: "/dashboard/partner/transactions", icon: Receipt },
      { title: "Analytics", href: "/dashboard/partner/analytics", icon: BarChart3 },
      { title: "Invoices", href: "/dashboard/partner/invoices", icon: FileText },
    ],
  };

  // More dropdown group (Tokens, API Docs, Settings)
  const moreGroup: NavGroup = {
    label: "More",
    icon: MoreHorizontal,
    items: [
      { title: "Tokens", href: "/dashboard/tokens", icon: CreditCard },
      { title: "API Docs", href: "/dashboard/api-docs", icon: Book },
      { title: "Settings", href: "/dashboard/settings", icon: Settings },
    ],
  };

  return (
    <>
    {accountMode === 'demo' && (
      <div className="bg-fyro-navy text-fyro-gold-light text-center py-1.5 px-4 text-sm font-semibold sticky top-0 z-[51] border-b border-fyro-gold/30">
        You are in DEMO mode — transactions are simulated. Contact admin to activate LIVE.
      </div>
    )}
    <header className="bg-white/90 dark:bg-[#0c1120]/90 backdrop-blur-xl border-b border-slate-200/50 dark:border-fyro-gold/10 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* FyroPay Logo */}
          <Link href="/dashboard" className="flex items-center gap-3 group cursor-pointer">
            <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-fyro-navy border border-fyro-gold/40 shadow-sm group-hover:shadow-fyro-gold/20 group-hover:border-fyro-gold/70 transition-all duration-200">
              <span className="text-fyro-gold font-bold text-lg leading-none" style={{fontFamily:'Georgia,serif'}}>F</span>
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-fyro-gold rounded-full border-2 border-white dark:border-[#0c1120] animate-pulse" />
            </div>
            <span className="text-xl font-bold tracking-tight">
              <span className="text-slate-900 dark:text-white">Fyro</span><span className="text-fyro-gold">Pay</span>
            </span>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-1">
            {/* Main items */}
            {mainItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "gap-2 cursor-pointer transition-all",
                      isActive
                        ? "bg-amber-50 dark:bg-fyro-navy text-fyro-gold dark:text-fyro-gold-light"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.title}
                  </Button>
                </Link>
              );
            })}

            {/* Partner dropdown (partner only) */}
            {isPartner && <NavDropdown group={partnerGroup} pathname={pathname} />}

            {/* Admin dropdown (admin only) */}
            {isAdmin && <NavDropdown group={adminGroup} pathname={pathname} />}

            {/* More dropdown */}
            <NavDropdown group={moreGroup} pathname={pathname} />

            {/* Logout */}
            <div className="ml-3 pl-3 border-l border-slate-200 dark:border-slate-700">
              <Button
                onClick={handleLogout}
                variant="ghost"
                className="gap-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          </nav>
        </div>
      </div>
    </header>
    </>
  );
}
