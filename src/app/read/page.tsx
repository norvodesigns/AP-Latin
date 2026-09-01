import type { Metadata } from 'next';
import Link from 'next/link';
import { allPassages, UNIT_TITLES } from '@/data/passages';
import { Page, PageHeader, Badge } from '@/components/ui';
import type { UnitId } from '@/data/types';

export const metadata: Metadata = { title: 'Reading Room' };

export default function ReadIndex() {
  const units = ['2', '3', '4', '5'] as UnitId[];
  const required = allPassages.filter((p) => p.required);
  const supplementary = allPassages.filter((p) => !p.required);

  return (
    <Page wide>
      <PageHeader
        eyebrow="Syllabus reading"
        title="Reading Room"
        lede={
          <>
            Every passage on the official reading list, with the Latin, a click-any-word glossary,
            running notes, an English summary and context. {required.length} required passages;{' '}
            {supplementary.length} supplementary.
          </>
        }
      />

      {units.map((u) => {
        const ps = required.filter((p) => p.unit === u);
        if (ps.length === 0) return null;
        return (
          <section key={u} className="mb-9">
            <div className="mb-3 flex items-baseline gap-2.5">
              <h2 style={{ fontSize: '1.0625rem' }}>Unit {u}</h2>
              <span className="text-sm" style={{ color: 'var(--fg-faint)' }}>
                {UNIT_TITLES[u]}
              </span>
            </div>
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {ps.map((p) => (
                <PassageCard key={p.id} p={p} />
              ))}
            </ul>
          </section>
        );
      })}

      <section className="mb-6">
        <div className="mb-2 flex items-baseline gap-2.5">
          <h2 style={{ fontSize: '1.0625rem' }}>Supplementary</h2>
          <span className="text-sm" style={{ color: 'var(--fg-faint)' }}>
            Not on the 2025 required list
          </span>
        </div>
        <p className="measure mb-3 text-sm" style={{ color: 'var(--fg-muted)' }}>
          These were required under the previous AP Latin syllabus. They are worth reading for
          context — several sit immediately beside required passages — but they will not appear as
          syllabus reading on the exam.
        </p>
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {supplementary.map((p) => (
            <PassageCard key={p.id} p={p} />
          ))}
        </ul>
      </section>
    </Page>
  );
}

function PassageCard({ p }: { p: (typeof allPassages)[number] }) {
  return (
    <li>
      <Link
        href={`/read/${p.id}`}
        className="card block h-full p-4 transition-[transform,box-shadow] hover:-translate-y-px"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div
              style={{
                fontFamily: 'var(--font-latin)',
                fontSize: '1.0625rem',
                fontWeight: 600,
                letterSpacing: '0.005em',
              }}
            >
              {p.citation}
            </div>
            <div className="mt-0.5 text-sm" style={{ color: 'var(--fg-muted)' }}>
              {p.title}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <Badge tone={p.genre === 'poetry' ? 'accent' : 'neutral'}>{p.genre}</Badge>
            {p.macronized && (
              <Badge tone="gilt" title="Source text carries vowel-quantity macrons">
                macrons
              </Badge>
            )}
          </div>
        </div>
        <div
          className="mt-2.5 flex items-center gap-2 text-xs"
          style={{ color: 'var(--fg-faint)' }}
        >
          <span className="tabular-nums">{p.wordCount} words</span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">
            {p.lines.length} {p.author === 'vergil' ? 'lines' : 'sections'}
          </span>
          {p.cedReading && (
            <>
              <span aria-hidden="true">·</span>
              <span>CED {p.cedReading}</span>
            </>
          )}
        </div>
      </Link>
    </li>
  );
}
