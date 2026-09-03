import type { Metadata } from 'next';
import { getCurrentProfile } from '@/lib/supabase/server';
import Settings from './Settings';

export const metadata: Metadata = { title: 'Settings' };

export default async function SettingsPage() {
  // Only used to gate the "Delete account" section — everything else on
  // this page is local-only and works identically signed in or out.
  const profile = await getCurrentProfile();
  return <Settings profile={profile} />;
}
