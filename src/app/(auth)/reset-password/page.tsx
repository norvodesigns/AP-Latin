import type { Metadata } from 'next';
import Link from 'next/link';
import { supabaseConfigured } from '@/lib/supabase/config';
import { getCurrentUser } from '@/lib/supabase/server';
import { Page, PageHeader, Panel } from '@/components/ui';
import ResetPasswordForm from './ResetPasswordForm';

export const metadata: Metadata = { title: 'Choose a new password' };

export const dynamic = 'force-dynamic';

/**
 * Where a password-reset email ends up (via /auth/confirm, which signs the
 * person in for the purpose). Without that session there is nothing to
 * change, so it points back to "Forgot password".
 */
export default async function ResetPasswordPage() {
  const user = supabaseConfigured ? await getCurrentUser() : null;

  return (
    <Page>
      <PageHeader eyebrow="Accounts" title="Choose a new password" />
      {user ? (
        <ResetPasswordForm email={user.email ?? ''} />
      ) : (
        <Panel>
          <p
            className="measure"
            style={{
              margin: 0,
              fontFamily: 'var(--font-latin)',
              fontSize: '1.0625rem',
              lineHeight: 1.6,
              color: 'var(--ink2)',
            }}
          >
            This page opens from the link in a password-reset email, and that link has expired or was
            already used. Each one works once, for an hour.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/forgot-password" className="btn btn-primary">
              Send a new link
            </Link>
            <Link href="/login" className="btn">
              Sign in
            </Link>
          </div>
        </Panel>
      )}
    </Page>
  );
}
