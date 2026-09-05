import type { Metadata } from 'next';
import Link from 'next/link';
import { allPassages, UNIT_TITLES } from '@/data/passages';
import { Page, PageHeader, SourceNote } from '@/components/ui';
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
          <section key={u} className="mb-12">
            <div
              className="mb-1 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b pb-3"
              style={{ borderColor: 'var(--rule)' }}
            >
              <h2 className="rubric">Unit {u}</h2>
              <span
                style={{
                  fontFamily: 'var(--font-latin)',
                  fontSize: '1.0625rem',
                  color: 'var(--fg-muted)',
                }}
              >
                {UNIT_TITLES[u]}
              </span>
            </div>
            <ul>
              {ps.map((p) => (
                <PassageRow key={p.id} p={p} />
              ))}
            </ul>
          </section>
        );
      })}

      <section className="mb-8">
        <div
          className="mb-1 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b pb-3"
          style={{ borderColor: 'var(--rule)' }}
        >
          <h2 className="slab" style={{ color: 'var(--gilt)' }}>
            Supplementary
          </h2>
          <span
            style={{
              fontFamily: 'var(--font-latin)',
              fontSize: '1.0625rem',
              color: 'var(--fg-muted)',
            }}
          >
            Not on the 2025 required list
          </span>
        </div>
        <p
          className="measure py-4"
          style={{
            fontFamily: 'var(--font-latin)',
            fontSize: '1.0625rem',
            lineHeight: 1.55,
            color: 'var(--ink2)',
          }}
        >
          These were required under the previous AP Latin syllabus. They are worth reading for
          context — several sit immediately beside required passages — but they will not appear as
          syllabus reading on the exam.
        </p>
        <ul>
          {supplementary.map((p) => (
            <PassageRow key={p.id} p={p} />
          ))}
        </ul>
      </section>

      <SourceNote to="requiredReading">
        The required list is the CED&rsquo;s own. Latin texts are public domain, from The Latin
        Library and Perseus; nothing here is paraphrased or reconstructed.
      </SourceNote>
    </Page>
  );
}

/** One entry in the contents: citation, title, and its measurements. */
function PassageRow({ p }: { p: (typeof allPassages)[number] }) {
  return (
    <li>
      <Link
        href={`/read/${p.id}`}
        className="row-hover -mx-3 flex flex-wrap items-baseline gap-x-5 gap-y-1 border-b px-3 py-4"
        style={{ borderColor: 'var(--hair)' }}
      >
        <span
          style={{
            fontFamily: 'var(--font-latin)',
            fontSize: '1.375rem',
            lineHeight: 1.2,
            color: 'var(--fg)',
            minWidth: '9rem',
          }}
        >
          {p.citation}
        </span>
        <span
          className="min-w-0 flex-1"
          style={{
            fontFamily: 'var(--font-latin)',
            fontSize: '1.125rem',
            color: 'var(--ink2)',
          }}
        >
          {p.title}
        </span>
        <span className="slab-sm flex shrink-0 items-baseline gap-3">
          {p.macronized && <span style={{ color: 'var(--gilt)' }}>macrons</span>}
          <span style={{ color: p.genre === 'poetry' ? 'var(--accent)' : undefined }}>
            {p.genre}
          </span>
          <span>
            {p.lines.length} {p.genre === 'poetry' ? 'lines' : '§§'}
          </span>
          <span>{p.wordCount} words</span>
        </span>
      </Link>
    </li>
  );
}
