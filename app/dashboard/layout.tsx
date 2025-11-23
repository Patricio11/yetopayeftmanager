import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth-server';
import { DashboardNav } from '@/components/dashboard/DashboardNav';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect('/auth/login');
  }

  // Admin users can access everything
  // Merchant users can access merchant features
  // Both roles can create payment links and view transactions

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-green-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
      <DashboardNav userRole={session.user.role} />
      {children}
    </div>
  );
}
