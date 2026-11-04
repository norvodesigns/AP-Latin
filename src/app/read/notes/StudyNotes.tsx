'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { allPassages } from '@/data/passages';
import type { Passage } from '@/data/types';
import { Page, PageHeader } from '@/components/ui';
import AnnotatedLine from '@/components/reader/AnnotatedLine';
import { ROLE_INFO } from '@/lib/annotations';
import { groupText, lineTokens } from '@/lib/readerSelection';
import { useStore, type Annotation, type PassageState } from '@/store/useStore';

type Scope = 'marked' | 'whole';

const SCOPE_KEY = 'lectio-notes-scope';

/**
 * Everything the reader has written on every passage, in one place and in
 * syllabus order: their notes on each passage, the lines they highlighted
 * or marked with the marks drawn on them, and their notes numbered to match.
 * Printed, it is a study sheet for the whole course (or the part of it they
 * have marked up so far), set out the way the Reader's own study sheet is.
 */
export default function StudyNotes() {
  const [mounted, setMounted] = useState(false);
  const [scope, setScope] = useState<Scope>('marked');
  const [work, setWork] = useState<string | null>(null);
  const passages = useStore((s) => s.passages);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem(SCOPE_KEY);
      if (saved === 'marked' || saved === 'whole') setScope(saved);
    } catch {
      /* private window: default is fine */
    }
  }, []);

  const chooseScope = (s: Scope) => {
    setScope(s);
    try {
      localStorage.setItem(SCOPE_KEY, s);
    } catch {
      /* not remembered, which is fine */
    }
  };

  const withNotes = useMemo(
    () =>
      allPassages
        .map((p) => ({ passage: p, state: passages[p.id] }))
        .filter((x): x is { passage: Passage; state: PassageState } => Boolean(x.state && hasWriting(x.state))),
    [passages],
  );
  const works = useMemo(() => [...new Set(withNotes.map((x) => x.passage.work))], [withNotes]);
  const shown = work ? withNotes.filter((x) => x.passage.work === work) : withNotes;

  const usedRoles = useMemo(() => {
    const ids = new Set(shown.flatMap((x) => (x.state.marks ?? []).map((m) => m.role)));
    return [...ids].map((r) => ROLE_INFO[r]).filter(Boolean);
  }, [shown]);

  const print = () => {
    document.documentElement.dataset.print = 'study';
    const done = () => {
      delete document.documentElement.dataset.print;
      window.removeEventListener('afterprint', done);
    };
    window.addEventListener('afterprint', done);
    window.print();
  };

  return (
    <Page>
      <div className="print:hidden">
        <PageHeader
          eyebrow="Reading Room"
          title="My notes"
          lede="Every highlight, sentence mark and note you have made, passage by passage, ready to read through or print as a study sheet."
          actions={
            mounted && withNotes.length > 0 ? (
              <button type="button" className="btn btn-rubric" onClick={print}>
                Print study sheet
              </button>
            ) : undefined
          }
        />
      </div>
      <h1 className="hidden print:block" style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', margin: '0 0 1rem' }}>
        Study notes{work ? ` — ${work}` : ''}
      </h1>

      {mounted && withNotes.length === 0 && (
        <div className="measure" style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', lineHeight: 1.55, color: 'var(--fg-muted)' }}>
          <p style={{ margin: '0 0 1rem' }}>
            Nothing here yet. Open a passage, turn on <b>Mark up</b>, and tap words to highlight them, mark the
            subject and verb, or write a note. Everything you mark collects here.
          </p>
          <Link href="/read" className="btn">
            Go to the Reading Room
          </Link>
        </div>
      )}

      {mounted && withNotes.length > 0 && (
        <>
          <div className="mb-8 flex flex-wrap items-center gap-x-6 gap-y-3 print:hidden">
            <div className="flex gap-1.5" role="group" aria-label="How much of each passage">
              {(['marked', 'whole'] as Scope[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={scope === s}
                  className={scope === s ? 'btn btn-sm btn-rubric' : 'btn btn-sm'}
                  onClick={() => chooseScope(s)}
                >
                  {s === 'marked' ? 'Marked lines' : 'Whole passages'}
                </button>
              ))}
            </div>
            {works.length > 1 && (
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Which text">
                <button type="button" aria-pressed={work === null} className={work === null ? 'btn btn-sm btn-rubric' : 'btn btn-sm'} onClick={() => setWork(null)}>
                  All
                </button>
                {works.map((w) => (
                  <button key={w} type="button" aria-pressed={work === w} className={work === w ? 'btn btn-sm btn-rubric' : 'btn btn-sm'} onClick={() => setWork(w)}>
                    {w}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="study-sheet flex flex-col gap-12 print:gap-8">
            {shown.map(({ passage, state }) => (
              <PassageNotes key={passage.id} passage={passage} state={state} scope={scope} />
            ))}
          </div>

          {usedRoles.length > 0 && (
            <p className="mt-10 border-t pt-4" style={{ borderColor: 'var(--hair)', fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', lineHeight: 1.6, color: 'var(--fg-muted)' }}>
              <b>Key:</b>{' '}
              {usedRoles.map((r, i) => (
                <span key={r.id}>
                  {i > 0 && ' · '}
                  <span className={`mk mk-${r.id} mk-g-${r.group}`}>{r.short}</span> {r.label.toLowerCase()}
                </span>
              ))}
            </p>
          )}
        </>
      )}
    </Page>
  );
}

function hasWriting(s: PassageState): boolean {
  return Boolean(s.notes?.trim() || s.annotations?.length || s.marks?.length || s.flaggedLines?.length);
}

/** One passage's notes: its heading, the reader's notes on the whole of it,
 *  its lines with their marks, and the numbered notes on its words. */
function PassageNotes({ passage, state, scope }: { passage: Passage; state: PassageState; scope: Scope }) {
  const isVerse = passage.genre === 'poetry';
  const annotations = useMemo(() => state.annotations ?? [], [state.annotations]);
  const marks = useMemo(() => state.marks ?? [], [state.marks]);
  const flagged = new Set(state.flaggedLines ?? []);

  const notes = useMemo(
    () => annotations.filter((a) => a.note.trim()).sort((a, b) => a.lineN - b.lineN || a.startTok - b.startTok),
    [annotations],
  );
  const noteNumbers = useMemo(() => new Map(notes.map((a, i) => [a.id, i + 1])), [notes]);

  const touched = new Set<number>([...annotations.map((a) => a.lineN), ...marks.map((m) => m.lineN), ...flagged]);
  const lines = scope === 'whole' ? passage.lines : passage.lines.filter((l) => touched.has(l.n));

  return (
    <section style={{ breakInside: 'auto' }}>
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1" style={{ breakAfter: 'avoid' }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.375rem', fontWeight: 500 }}>
          {passage.citation} <span style={{ color: 'var(--fg-muted)', fontStyle: 'italic' }}>· {passage.title}</span>
        </h2>
        <Link href={`/read/${passage.id}`} className="btn btn-ghost btn-sm print:hidden">
          Open →
        </Link>
      </header>

      {state.notes?.trim() && (
        <p className="measure" style={{ margin: '0 0 1.25rem', fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', lineHeight: 1.55, whiteSpace: 'pre-wrap', color: 'var(--ink2)' }}>
          {state.notes}
        </p>
      )}

      {lines.length > 0 && (
        <div className="verse-block print-ruled">
          {lines.map((line, i) => {
            const prev = lines[i - 1];
            const gap = scope === 'marked' && prev && passage.lines.indexOf(line) - passage.lines.indexOf(prev) > 1;
            const lineMarks = marks.filter((m) => m.lineN === line.n);
            return (
              <Fragment key={`${line.n}-${i}`}>
                {gap && (
                  <div aria-hidden="true" style={{ color: 'var(--fg-faint)', margin: '0.1rem 0 0.35rem', letterSpacing: '0.3em' }}>
                    ⋯
                  </div>
                )}
                <div
                  className={`flex gap-5 ${lineMarks.some((m) => m.role !== 'clause') ? 'line-marked' : ''}`}
                  style={{ marginBottom: isVerse ? '0.375rem' : '1.15rem' }}
                >
                  <span className="verse-num" style={{ lineHeight: 2.6, color: flagged.has(line.n) ? 'var(--gilt)' : undefined }} title={flagged.has(line.n) ? 'Flagged as hard' : undefined}>
                    {line.n}
                  </span>
                  <p
                    className={`min-w-0 flex-1 ${isVerse ? 'latin-verse' : 'latin'}`}
                    style={{
                      margin: 0,
                      boxShadow: flagged.has(line.n) ? 'inset 0 -0.42em 0 color-mix(in srgb, var(--gilt) 22%, transparent)' : undefined,
                    }}
                  >
                    <AnnotatedLine
                      tokens={lineTokens(passage, line.n)}
                      annotations={annotations.filter((a) => a.lineN === line.n)}
                      marks={lineMarks}
                      noteNumbers={noteNumbers}
                    />
                  </p>
                </div>
              </Fragment>
            );
          })}
        </div>
      )}

      {notes.length > 0 && <NoteList notes={notes} all={annotations} noteNumbers={noteNumbers} isVerse={isVerse} />}

      {flagged.size > 0 && (
        <p style={{ margin: '0.75rem 0 0', fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--fg-muted)' }}>
          <b>Flagged as hard:</b> {isVerse ? 'lines' : 'sections'} {[...flagged].sort((a, b) => a - b).join(', ')}
        </p>
      )}
    </section>
  );
}

function NoteList({ notes, all, noteNumbers, isVerse }: { notes: Annotation[]; all: Annotation[]; noteNumbers: Map<string, number>; isVerse: boolean }) {
  return (
    <ol className="print-notes mt-5" style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', lineHeight: 1.5, paddingLeft: 0, listStyle: 'none', margin: '1.25rem 0 0' }}>
      {notes.map((a) => (
        <li key={a.id} className="flex gap-2" style={{ marginBottom: '0.45rem' }}>
          <b style={{ minWidth: '1.4rem', color: 'var(--accent)' }}>{noteNumbers.get(a.id)}</b>
          <span>
            <span style={{ fontFamily: 'var(--font-latin)', fontStyle: 'italic' }}>{groupText(a, all)}</span>{' '}
            <span style={{ color: 'var(--fg-faint)' }}>
              ({isVerse ? 'line' : 'section'} {a.lineN})
            </span>{' '}
            — <span style={{ whiteSpace: 'pre-wrap' }}>{a.note}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

