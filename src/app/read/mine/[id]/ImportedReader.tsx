'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/store/useStore';
import { importedToPassage } from '@/lib/imports';
import { Page, Empty } from '@/components/ui';
import Reader from '../../[id]/Reader';

/**
 * A text the reader imported, in the Reading Room's own Reader. The text
 * lives only in the reader's progress (this browser's, and their account's
 * when signed in), so nothing is drawn until the page has mounted and the
 * store has been read.
 */
export default function ImportedReader({ id }: { id: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const text = useStore((s) => s.importedTexts?.[id]);
  const passage = useMemo(() => (text && !text.deleted ? importedToPassage(text) : null), [text]);

  if (!mounted) return <div className="min-h-[60vh]" aria-busy="true" />;

  if (!text || text.deleted || !passage) {
    return (
      <Page>
        <Empty
          title={text?.deleted ? 'This text was deleted' : 'This text isn’t here'}
          body={
            text?.deleted
              ? 'It was deleted, with your highlights and notes on it.'
              : 'Imported texts are kept with your progress. If you imported it on another device, it appears here once you sign in and your progress syncs.'
          }
          action={
            <Link href="/read" className="btn">
              Reading Room
            </Link>
          }
        />
      </Page>
    );
  }

  return <Reader passage={passage} prev={null} next={null} imported={text} />;
}
