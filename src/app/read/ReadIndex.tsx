'use client';

import { useState } from 'react';
import Link from 'next/link';
import { allPassages, UNIT_TITLES } from '@/data/passages';
import { Page, PageHeader, SourceNote } from '@/components/ui';
import type { Passage, UnitId } from '@/data/types';

type View = 'text' | 'unit';

/** Reading order for the "By text" view — the two required authors first
 *  (Vergil, then Pliny, matching the CED's own emphasis), the teacher's-
 *  choice supplementary-only texts after. */
const WORK_ORDER = ['Aeneid', 'Letters', 'De Bello Gallico', 'Carmina'];
const WORK_LABELS: Record<string, string> = {
  Aeneid: "Vergil's Aeneid",
  Letters: "Pliny's Letters",
  'De Bello Gallico': "Caesar's De Bello Gallico",
  Carmina: "Catullus's Carmina",
};

export default function ReadIndex() {
  const [view, setView] = useState<View>('text');
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
        actions={
          <div className="flex gap-1.5" role="tablist" aria-label="Organize by">
            {(['text', 'unit'] as View[]).map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={view === v}
                onClick={() => setView(v)}
                className={view === v ? 'btn btn-rubric' : 'btn'}
              >
                {v === 'text' ? 'By text' : 'By unit'}
              </button>
            ))}
          </div>
        }
      />

      {view === 'text' ? <ByText /> : <ByUnit units={units} required={required} supplementary={supplementary} />}

      <SourceNote to="requiredReading">
        The required list is the CED&rsquo;s own. Latin texts are public domain, from The Latin
        Library and Perseus; nothing here is paraphrased or reconstructed.
      </SourceNote>
    </Page>
  );
}

/** Every passage, required and supplementary together, grouped by the work
 *  it comes from and then by book — the order a reader would meet them on
 *  the page, so a passage like a connective supplementary scene sits right
 *  next to the required passages either side of it instead of being routed
 *  to a separate section entirely. */
function ByText() {
  const works = [...new Set(allPassages.map((p) => p.work))].sort((a, b) => {
    const rank = (w: string) => {
      const i = WORK_ORDER.indexOf(w);
      return i === -1 ? WORK_ORDER.length : i;
    };
    return rank(a) - rank(b);
  });

  return (
    <>
      {works.map((work) => {
        const passages = allPassages
          .filter((p) => p.work === work)
          .sort((a, b) => {
            if (a.book !== b.book) return a.book - b.book;
            const al = a.letter ?? 0;
            const bl = b.letter ?? 0;
            if (al !== bl) return al - bl;
            return (a.lines[0]?.n ?? 0) - (b.lines[0]?.n ?? 0);
          });
        const books = [...new Set(passages.map((p) => p.book))];

        return (
          <section key={work} className="mb-12">
            <div
              className="mb-1 border-b pb-3"
              style={{ borderColor: 'var(--rule)' }}
            >
              <h2 className="rubric">{WORK_LABELS[work] ?? work}</h2>
            </div>
            {books.length > 1 ? (
              books.map((book) => (
                <div key={book} className="mb-2">
                  <h3 className="slab-sm mt-5 mb-1" style={{ color: 'var(--fg-faint)' }}>
                    Book {book}
                  </h3>
                  <ul>
                    {passages
                      .filter((p) => p.book === book)
                      .map((p) => (
                        <PassageRow key={p.id} p={p} />
                      ))}
                  </ul>
                </div>
              ))
            ) : (
              <ul>
                {passages.map((p) => (
                  <PassageRow key={p.id} p={p} />
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </>
  );
}

/** The original grouping: required passages by syllabus unit, then every
 *  supplementary passage together underneath with its own explanation. */
function ByUnit({
  units,
  required,
  supplementary,
}: {
  units: UnitId[];
  required: Passage[];
  supplementary: Passage[];
}) {
  return (
    <>
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
            <PassageRow key={p.id} p={p} tag={false} />
          ))}
        </ul>
      </section>
    </>
  );
}

/** One entry in the contents: citation, title, and its measurements. `tag`
 *  shows an inline "supplementary" label — on by default, since the by-text
 *  view interleaves required and supplementary passages together, but
 *  turned off inside the by-unit view's own "Supplementary" section, where
 *  the section heading already says as much. */
function PassageRow({ p, tag = true }: { p: Passage; tag?: boolean }) {
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
          {tag && !p.required && <span style={{ color: 'var(--gilt)' }}>supplementary</span>}
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
