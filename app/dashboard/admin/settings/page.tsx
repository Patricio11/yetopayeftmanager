import { redirect } from 'next/navigation';

export default function AdminSettingsPage() {
  redirect('/dashboard/settings?tab=eft&subtab=terms');
}
