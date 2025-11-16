import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth-server';

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

  return <>{children}</>;
}
