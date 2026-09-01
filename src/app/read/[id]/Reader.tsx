'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Passage } from '@/data/types';
import { tokenize, lookup, type LookupResult } from '@/lib/latin';
import { useStore } from '@/store/useStore';
import { Page, PageHeader, Badge, BackLink, SupplementaryNotice } from '@/components/ui';
import AskAboutLine from '@/components/AskAboutLine';

interface Nav {
  id: string;
  citation: string;
}

interface Selection {
  word: string;
  lineN: number;
  results: LookupResult[];
  x: number;
  y: number;
}

export default function Reader({
  passage,
  prev,
  next,
}: {
  passage: Passage;
  prev: Nav | null;
  next: Nav | null;
}) {
  const glossaryEnabled = useStore((s) => s.glossaryEnabled);
  const toggleGlossary = useStore((s) => s.toggleGlossary);
  const passages = useStore((s) => s.passages);
  const updatePassage = useStore((s) => s.updatePassage);
  const toggleBookmark = useStore((s) => s.toggleBookmark);
  const toggleFlaggedLine = useStore((s) => s.toggleFlaggedLine);
  const markStudied = useStore((s) => s.markStudied);

  const state = passages[passage.id];
  const flagged = useMemo(() => new Set(state?.flaggedLines ?? []), [state?.flaggedLines]);

  const [sel, setSel] = useState<Selection | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const [askLine, setAskLine] = useState<{ n: number; latin: string } | null>(null);
  const [mounted, setMounted] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    updatePassage(passage.id, { lastOpened: new Date().toISOString() });
    markStudied();
    // Only on passage change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passage.id]);

  useEffect(() => setNotesDraft(state?.notes ?? ''), [state?.notes, passage.id]);

  /* Persist notes on a debounce so typing stays smooth. */
  useEffect(() => {
    if (!notesOpen) return;
    const t = window.setTimeout(() => {
      if (notesDraft !== (state?.notes ?? '')) updatePassage(passage.id, { notes: notesDraft });
    }, 400);
    return () => window.clearTimeout(t);
  }, [notesDraft, notesOpen, passage.id, state?.notes, updatePassage]);

  const onWord = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>, word: string, lineN: number) => {
      if (!glossaryEnabled) return;
      const rect = e.currentTarget.getBoundingClientRect();
      setSel({
        word,
        lineN,
        results: lookup(word),
        x: rect.left + rect.width / 2,
        y: rect.bottom,
      });
    },
    [glossaryEnabled],
  );

  /* Dismiss the glossary popup on outside click or Escape. */
  useEffect(() => {
    if (!sel) return;
    const onDown = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setSel(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSel(null);
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [sel]);

  /* Section shortcuts: c = cold read, n = notes, s = summary, b = bookmark. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (
        e.metaKey || e.ctrlKey || e.altKey ||
        (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable))
      ) {
        return;
      }
      const k = e.key.toLowerCase();
      if (k === 'c') { e.preventDefault(); toggleGlossary(); }
      else if (k === 'n') { e.preventDefault(); setNotesOpen((v) => !v); }
      else if (k === 's') { e.preventDefault(); setShowSummary((v) => !v); }
      else if (k === 'b') { e.preventDefault(); toggleBookmark(passage.id); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [passage.id, toggleGlossary, toggleBookmark]);

  const isVerse = passage.author === 'vergil';

  return (
    <Page wide>
      <div className="mb-4 flex items-center justify-between gap-3">
        <BackLink href="/read">Reading Room</BackLink>
        <div className="flex items-center gap-1.5">
          {prev && (
            <Link href={`/read/${prev.id}`} className="btn btn-ghost px-2 text-xs" title={prev.citation}>
              ←
            </Link>
          )}
          {next && (
            <Link href={`/read/${next.id}`} className="btn btn-ghost px-2 text-xs" title={next.citation}>
              →
            </Link>
          )}
        </div>
      </div>

      <PageHeader
        eyebrow={`${passage.work} · Unit ${passage.unit}${passage.cedReading ? ` · CED ${passage.cedReading}` : ''}`}
        title={passage.title}
        lede={
          <span style={{ fontFamily: 'var(--font-latin)', fontSize: '1.0625rem', color: 'var(--fg)' }}>
            {passage.citation}
            {passage.salutation && (
              <span className="ml-2" style={{ color: 'var(--fg-faint)', fontSize: '0.9rem' }}>
                {passage.salutation}
              </span>
            )}
          </span>
        }
        actions={
          <>
            <button
              type="button"
              className={`btn ${!glossaryEnabled ? 'btn-primary' : ''}`}
              onClick={toggleGlossary}
              aria-pressed={!glossaryEnabled}
              title="Hide the glossary and read the Latin cold (c)"
            >
              {glossaryEnabled ? 'Cold read' : 'Glossary off'}
              <span className="kbd ml-0.5" aria-hidden="true">c</span>
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => setNotesOpen((v) => !v)}
              aria-pressed={notesOpen}
              aria-expanded={notesOpen}
            >
              Notes
              <span className="kbd ml-0.5" aria-hidden="true">n</span>
            </button>
            <button
              type="button"
              className="btn px-2"
              onClick={() => toggleBookmark(passage.id)}
              aria-pressed={mounted ? Boolean(state?.bookmarked) : false}
              title="Bookmark this passage (b)"
            >
              <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true"
                   fill={mounted && state?.bookmarked ? 'var(--gilt)' : 'none'}>
                <path d="M4 2.5h8v11l-4-3-4 3v-11z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
              </svg>
              <span className="sr-only">Bookmark</span>
            </button>
          </>
        }
      />

      {!passage.required && (
        <div className="mb-5">
          <SupplementaryNotice />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        {/* ---------------- Latin ---------------- */}
        <article>
          <div
            className="card px-5 py-6 sm:px-7 sm:py-8"
            style={{ background: 'var(--bg-raised)' }}
          >
            {passage.lines.map((line, li) => {
              const isFlagged = mounted && flagged.has(line.n);
              const tokens = tokenize(line.latin);
              return (
                <div
                  key={`${line.n}-${li}`}
                  className="group relative"
                  style={{ marginBottom: isVerse ? 0 : '1.15rem' }}
                >
                  <div className="flex items-baseline gap-3">
                    {/* Line / section number */}
                    <button
                      type="button"
                      onClick={() => toggleFlaggedLine(passage.id, line.n)}
                      className="w-8 shrink-0 select-none text-right tabular-nums transition-colors"
                      style={{
                        fontSize: '0.6875rem',
                        color: isFlagged ? 'var(--gilt)' : 'var(--fg-faint)',
                        fontWeight: isFlagged ? 700 : 400,
                        fontFamily: 'var(--font-sans)',
                      }}
                      title={isFlagged ? 'Unflag this line' : 'Flag this line as hard'}
                      aria-pressed={isFlagged}
                    >
                      {line.n}
                    </button>

                    <p
                      className={isVerse ? 'latin-verse' : 'latin'}
                      style={{
                        margin: 0,
                        flex: 1,
                        boxShadow: isFlagged
                          ? 'inset 0 -0.5em 0 color-mix(in srgb, var(--gilt) 18%, transparent)'
                          : undefined,
                      }}
                    >
                      {tokens.map((t) =>
                        t.isWord ? (
                          <button
                            key={t.index}
                            type="button"
                            className={`word ${
                              sel?.word === t.text && sel?.lineN === line.n ? 'word-active' : ''
                            }`}
                            onClick={(e) => onWord(e, t.text, line.n)}
                            tabIndex={glossaryEnabled ? 0 : -1}
                            style={{ cursor: glossaryEnabled ? 'pointer' : 'text' }}
                          >
                            {t.text}
                          </button>
                        ) : (
                          <span key={t.index}>{t.text}</span>
                        ),
                      )}
                    </p>

                    <button
                      type="button"
                      onClick={() => setAskLine({ n: line.n, latin: line.latin })}
                      className="btn btn-ghost shrink-0 px-1.5 py-0.5 text-[0.6875rem] opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                      style={{ color: 'var(--fg-faint)' }}
                      title="Ask about this line"
                    >
                      ask
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-3 text-xs" style={{ color: 'var(--fg-faint)' }}>
            Latin text from The Latin Library (public domain).{' '}
            {passage.macronized
              ? 'This passage carries vowel-quantity macrons from the source.'
              : 'This source does not mark vowel quantity; macrons are not shown because they would have to be invented.'}{' '}
            Click a line number to flag it as hard.
          </p>
        </article>

        {/* ---------------- Sidebar ---------------- */}
        <aside className="flex flex-col gap-4">
          <section className="card p-4">
            <div className="flex items-center justify-between">
              <h2 className="eyebrow" style={{ margin: 0 }}>English summary</h2>
              <button
                type="button"
                className="btn btn-ghost px-1.5 py-0.5 text-xs"
                onClick={() => setShowSummary((v) => !v)}
                aria-expanded={showSummary}
              >
                {showSummary ? 'Hide' : 'Reveal'}
                <span className="kbd ml-1" aria-hidden="true">s</span>
              </button>
            </div>
            {showSummary ? (
              <p className="mt-2 text-sm" style={{ color: 'var(--fg-muted)', lineHeight: 1.65 }}>
                {passage.summary}
              </p>
            ) : (
              <p className="mt-2 text-sm" style={{ color: 'var(--fg-faint)' }}>
                Hidden so you can summarise it yourself first — that is skill 1.C, and it carries
                25–35% of the exam.
              </p>
            )}
          </section>

          <section className="card p-4">
            <h2 className="eyebrow">Context</h2>
            <p className="mt-2 text-sm" style={{ color: 'var(--fg-muted)', lineHeight: 1.65 }}>
              {passage.context}
            </p>
          </section>

          <section className="card p-4">
            <h2 className="eyebrow">Themes</h2>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {passage.themes.map((t) => (
                <Badge key={t} tone="neutral">{t}</Badge>
              ))}
            </div>
          </section>

          {mounted && flagged.size > 0 && (
            <section className="card p-4">
              <h2 className="eyebrow">Flagged {passage.author === 'vergil' ? 'lines' : 'sections'}</h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[...flagged].sort((a, b) => a - b).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => toggleFlaggedLine(passage.id, n)}
                    className="tabular-nums"
                    title="Unflag"
                  >
                    <Badge tone="gilt">{n}</Badge>
                  </button>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>

      {/* ---------------- Notes drawer ---------------- */}
      {notesOpen && (
        <div className="animate-in card mt-6 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="eyebrow" style={{ margin: 0 }}>Your notes on {passage.citation}</h2>
            <span className="text-xs" style={{ color: 'var(--fg-faint)' }}>saved automatically</span>
          </div>
          <textarea
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            rows={8}
            className="input"
            style={{ fontFamily: 'var(--font-serif)', lineHeight: 1.7, resize: 'vertical' }}
            placeholder="Grammar you keep tripping on, an argument you want to use in an essay, a line worth memorising…"
          />
        </div>
      )}

      {/* ---------------- Glossary popup ---------------- */}
      {sel && (
        <div
          ref={popRef}
          role="dialog"
          aria-label={`Glossary: ${sel.word}`}
          className="animate-in fixed z-40 w-[min(22rem,calc(100vw-2rem))] rounded-xl p-3.5"
          style={{
            left: Math.min(Math.max(sel.x - 176, 16), (typeof window !== 'undefined' ? window.innerWidth : 400) - 368),
            top: sel.y + 8,
            background: 'var(--bg-raised)',
            border: '1px solid var(--rule-strong)',
            boxShadow: 'var(--shadow-pop)',
          }}
        >
          <div className="flex items-baseline justify-between gap-2">
            <span style={{ fontFamily: 'var(--font-latin)', fontSize: '1.25rem', fontWeight: 600 }}>
              {sel.word}
            </span>
            <button type="button" className="btn btn-ghost px-1.5 py-0.5 text-xs" onClick={() => setSel(null)}>
              esc
            </button>
          </div>

          {sel.results.length === 0 ? (
            <p className="mt-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
              Not in the CED core vocabulary list — which means the exam would gloss it for you.
              Use <em>ask about this line</em> for a parse in context.
            </p>
          ) : (
            <ul className="mt-2.5 flex flex-col gap-2.5">
              {sel.results.map((r) => (
                <li key={r.entry.id}>
                  <div className="flex items-baseline gap-2">
                    <span style={{ fontFamily: 'var(--font-latin)', fontSize: '1rem', fontWeight: 600 }}>
                      {r.entry.lemma}
                    </span>
                    {r.match === 'stem' && (
                      <Badge tone="muted" title="Matched by stem, not an exact form — verify in context">
                        stem match
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--fg-faint)' }}>{r.entry.pos}</div>
                  <div className="mt-0.5 text-sm" style={{ color: 'var(--fg-muted)' }}>
                    {r.entry.definition}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            className="btn mt-3 w-full text-xs"
            onClick={() => {
              const line = passage.lines.find((l) => l.n === sel.lineN);
              if (line) setAskLine({ n: line.n, latin: line.latin });
              setSel(null);
            }}
          >
            Parse this word in context
          </button>
        </div>
      )}

      {askLine && (
        <AskAboutLine
          passage={passage}
          lineN={askLine.n}
          latin={askLine.latin}
          onClose={() => setAskLine(null)}
        />
      )}
    </Page>
  );
}
