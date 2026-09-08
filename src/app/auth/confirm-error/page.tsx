import type { Metadata } from 'next';
import Link from 'next/link';
import { Page, PageHeader, Panel } from '@/components/ui';

export const metadata: Metadata = { title: 'Link expired' };

export default function ConfirmErrorPage() {
  return (
    <Page>
      <PageHeader eyebrow="Accounts" title="That link didn't work" />
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
          Confirmation links expire after a while, and each one only works once. Try signing in —
          if your address still needs confirming, sign-up will offer to send a fresh link.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/login" className="btn btn-primary">
            Sign in
          </Link>
          <Link href="/signup" className="btn">
            Back to sign up
          </Link>
        </div>
      </Panel>
    </Page>
  );
}
