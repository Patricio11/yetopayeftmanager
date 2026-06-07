"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home, Receipt, Settings, LogOut, Zap, Building2, CreditCard, Book,
  Users, Store, BarChart3, FileText, ChevronDown, ShieldCheck, MoreHorizontal,
  Menu, X, Mail,
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
            ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400"
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
                    ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 font-medium"
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

function MobileNavGroup({ group, pathname, onClose }: { group: NavGroup; pathname: string; onClose: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = group.icon;
  const hasActive = group.items.some(
    (item) => pathname === item.href || pathname.startsWith(item.href)
  );

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "flex items-center justify-between w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors",
          hasActive
            ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400"
            : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
        )}
      >
        <span className="flex items-center gap-3">
          <Icon className="w-5 h-5" />
          {group.label}
        </span>
        <ChevronDown className={cn("w-4 h-4 transition-transform", expanded && "rotate-180")} />
      </button>
      {expanded && (
        <div className="ml-4 mt-1 space-y-1 border-l-2 border-slate-200 dark:border-slate-700 pl-4">
          {group.items.map((item) => {
            const ItemIcon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors",
                  isActive
                    ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 font-medium"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAdmin = userRole === "admin";
  const isPartner = userRole === "partner";

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const handleLogout = async () => {
    try {
      await signOut();
      router.push("/auth/login");
    } catch (error) {
      console.error("Logout error:", error);
      router.push("/auth/login");
    }
  };

  const mainItems: NavItem[] = isPartner
    ? [
        { title: "Dashboard", href: "/dashboard/partner", icon: Home },
      ]
    : [
        { title: "Dashboard", href: "/dashboard", icon: Home },
        { title: "Transactions", href: "/dashboard/transactions", icon: Receipt },
        { title: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
        { title: "Invoices", href: "/dashboard/invoices", icon: FileText },
      ];

  const adminGroup: NavGroup = {
    label: "Admin",
    icon: ShieldCheck,
    items: [
      { title: "Merchants", href: "/dashboard/admin/merchants", icon: Store },
      { title: "Partners", href: "/dashboard/admin/partners", icon: Users },
      { title: "Users", href: "/dashboard/admin/users", icon: Users },
      { title: "Services", href: "/dashboard/admin/services", icon: Zap },
      { title: "Banks", href: "/dashboard/banks", icon: Building2 },
      { title: "Recon", href: "/dashboard/admin/recon", icon: BarChart3 },
      { title: "KYC", href: "/dashboard/admin/kyc", icon: ShieldCheck },
      { title: "Broadcasts", href: "/dashboard/admin/broadcasts", icon: Mail },
    ],
  };

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

  const moreGroup: NavGroup = {
    label: "More",
    icon: MoreHorizontal,
    items: isPartner
      ? [
          { title: "KYC", href: "/dashboard/kyc", icon: ShieldCheck },
          { title: "API Docs", href: "/dashboard/api-docs", icon: Book },
          { title: "Settings", href: "/dashboard/settings", icon: Settings },
        ]
      : isAdmin
      ? [
          { title: "Tokens", href: "/dashboard/tokens", icon: CreditCard },
          { title: "API Docs", href: "/dashboard/api-docs", icon: Book },
          { title: "Settings", href: "/dashboard/settings", icon: Settings },
        ]
      : [
          { title: "KYC", href: "/dashboard/kyc", icon: ShieldCheck },
          { title: "Tokens", href: "/dashboard/tokens", icon: CreditCard },
          { title: "API Docs", href: "/dashboard/api-docs", icon: Book },
          { title: "Settings", href: "/dashboard/settings", icon: Settings },
        ],
  };

  return (
    <>
    <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center group cursor-pointer">
            <span className="font-extrabold tracking-tight yp-gradient-text" style={{ fontSize: '2rem' }}>
              YetoPay
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
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
                        ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.title}
                  </Button>
                </Link>
              );
            })}

            {isPartner && <NavDropdown group={partnerGroup} pathname={pathname} />}
            {isAdmin && <NavDropdown group={adminGroup} pathname={pathname} />}
            <NavDropdown group={moreGroup} pathname={pathname} />

            <div className="ml-3 pl-3 border-l border-slate-200 dark:border-slate-700 flex items-center gap-2">
              {accountMode === 'demo' && (
                <span className="px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-300 rounded-full">
                  DEMO
                </span>
              )}
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

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 w-80 max-w-[85vw] bg-white dark:bg-slate-900 z-50 lg:hidden shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-tight yp-gradient-text" style={{ fontSize: '1.5rem' }}>
                  YetoPay
                </span>
                {accountMode === 'demo' && (
                  <span className="px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-300 rounded-full">
                    DEMO
                  </span>
                )}
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="p-4 space-y-1">
              {mainItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                      isActive
                        ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    {item.title}
                  </Link>
                );
              })}

              <div className="my-3 border-t border-slate-200 dark:border-slate-700" />

              {isPartner && <MobileNavGroup group={partnerGroup} pathname={pathname} onClose={() => setMobileOpen(false)} />}
              {isAdmin && <MobileNavGroup group={adminGroup} pathname={pathname} onClose={() => setMobileOpen(false)} />}
              <MobileNavGroup group={moreGroup} pathname={pathname} onClose={() => setMobileOpen(false)} />

              <div className="my-3 border-t border-slate-200 dark:border-slate-700" />

              <button
                onClick={() => { setMobileOpen(false); handleLogout(); }}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </nav>
          </div>
        </>
      )}
    </header>
    </>
  );
}
