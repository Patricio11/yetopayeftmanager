import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth-server';
import { DashboardNav } from '@/components/dashboard/DashboardNav';
import { DashboardErrorBoundary } from '@/components/DashboardErrorBoundary';
import { Toaster } from '@/components/ui/toaster';
import { BankOutageNotice } from '@/components/dashboard/BankOutageNotice';
import { db } from '@/lib/db';
import { platformSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

async function getBankOutages() {
  try {
    const row = await db.query.platformSettings.findFirst({
      where: eq(platformSettings.settingKey, 'bank_outages'),
    });
    if (!row?.settingValue) return [];
    return JSON.parse(row.settingValue) as Array<{
      bankId: string;
      bankCode: string;
      bankName: string;
      disabledAt: string;
    }>;
  } catch {
    return [];
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect('/auth/login');
  }

  const outages = await getBankOutages();

  // Admin users can access everything
  // Merchant users can access merchant features
  // Both roles can create payment links and view transactions

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-amber-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
      <DashboardNav userRole={session.user.role || 'merchant'} accountMode={(session.user as any).accountMode} />
      <BankOutageNotice outages={outages} />
      <DashboardErrorBoundary>
        {children}
      </DashboardErrorBoundary>
      <Toaster />
    </div>
  );
}
