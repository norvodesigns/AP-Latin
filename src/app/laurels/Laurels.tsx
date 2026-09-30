'use client';

import { useEffect, useMemo, useState } from 'react';
import { getSyncableData, useStore } from '@/store/useStore';
import { COURSE_SHAPE, laurels, type Laurel } from '@/lib/laurels';
import { Page, PageHeader } from '@/components/ui';

/** Every laurel, earned ones first in each group's order, with how far along the rest are. */
export default function Laurels() {
  const state = useStore();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const list = useMemo(() => laurels(getSyncableData(state), COURSE_SHAPE), [state]);
  const earned = list.filter((l) => l.earned).length;

  return (
    <Page>
      <PageHeader
        eyebrow="Laurels"
        title="Achievements"
        lede={
          mounted
            ? `${earned} of ${list.length} earned. They come from what you do anywhere in Lectio, on any device you sign in on.`
            : 'They come from what you do anywhere in Lectio, on any device you sign in on.'
        }
      />
      <ul className="grid gap-x-10 gap-y-2 pl-0 sm:grid-cols-2" style={{ listStyle: 'none' }}>
        {list.map((l) => (
          <LaurelRow key={l.id} laurel={l} mounted={mounted} />
        ))}
      </ul>
    </Page>
  );
}

function LaurelRow({ laurel: l, mounted }: { laurel: Laurel; mounted: boolean }) {
  const earned = mounted && l.earned;
  return (
    <li className="border-t py-4" style={{ borderColor: 'var(--rule)' }}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="latin" style={{ fontSize: '1.25rem', fontStyle: 'italic', color: earned ? 'var(--accent)' : 'var(--fg)' }}>
          {earned && (
            <span aria-hidden="true" className="mr-1.5" style={{ fontStyle: 'normal' }}>
              ❦
            </span>
          )}
          {l.latin}
        </span>
        <span className="slab-sm tabular-nums" style={{ color: earned ? 'var(--accent)' : 'var(--fg-muted)' }}>
          {earned ? 'earned' : mounted && l.target > 1 ? `${l.have} / ${l.target}` : ''}
        </span>
      </div>
      <div style={{ fontFamily: 'var(--font-latin)', fontSize: '1.0625rem', color: 'var(--ink2)' }}>
        {l.title}. <span style={{ color: 'var(--fg-muted)' }}>{l.detail}</span>
      </div>
      {mounted && !l.earned && l.target > 1 && l.have > 0 && (
        <div className="meter meter-thin mt-2" role="progressbar" aria-valuenow={l.have} aria-valuemin={0} aria-valuemax={l.target} aria-label={`${l.title}: ${l.have} of ${l.target}`}>
          <span style={{ width: `${(l.have / l.target) * 100}%` }} />
        </div>
      )}
    </li>
  );
}
