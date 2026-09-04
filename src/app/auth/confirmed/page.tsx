import type { Metadata } from 'next';
import Link from 'next/link';
import { Page, PageHeader, Panel } from '@/components/ui';

export const metadata: Metadata = { title: 'Email confirmed' };

export default function EmailConfirmedPage() {
  return (
    <Page>
      <PageHeader eyebrow="Accounts" title="Email confirmed" />
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
          Your address is verified and the account is ready. Sign in to join a classroom, or head
          straight back to studying — everything works either way.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/login" className="btn btn-primary">
            Sign in
          </Link>
          <Link href="/" className="btn">
            Back to studying
          </Link>
        </div>
      </Panel>
    </Page>
  );
}
