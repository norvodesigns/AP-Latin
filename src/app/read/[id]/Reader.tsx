'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Passage } from '@/data/types';
import { tokenize, lookup, type LookupResult } from '@/lib/latin';
import { useStore, readingCoverage } from '@/store/useStore';
import { passageVocabIds } from '@/data/passages';
import { BackLink, CedLink, SupplementaryNotice } from '@/components/ui';
import { useRevealChildren } from '@/hooks/useRevealChildren';
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
  const columns = useRevealChildren<HTMLDivElement>();
  const glossaryEnabled = useStore((s) => s.glossaryEnabled);
  const toggleGlossary = useStore((s) => s.toggleGlossary);
  const passages = useStore((s) => s.passages);
  const updatePassage = useStore((s) => s.updatePassage);
  const toggleBookmark = useStore((s) => s.toggleBookmark);
  const toggleFlaggedLine = useStore((s) => s.toggleFlaggedLine);
  const encounterWord = useStore((s) => s.encounterWord);
  const wordEncounters = useStore((s) => s.wordEncounters);
  const vocab = useStore((s) => s.vocab);
  const seedVocab = useStore((s) => s.seedVocab);
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
      const results = lookup(word);
      setSel({
        word,
        lineN,
        results,
        x: rect.left + rect.width / 2,
        y: rect.bottom,
      });
      // Reading is the primary way vocabulary gets tracked here: an exact
      // dictionary match seeds the word into the SM-2 rotation automatically,
      // the same way looking a word up in antiq.ai tracks it against the
      // syllabus rather than a static list. Stem matches are heuristic
      // guesses (see lib/latin.ts) and are not trusted enough to auto-seed.
      const top = results[0];
      if (top?.match === 'exact') encounterWord(top.entry.id, passage.id);
    },
    [glossaryEnabled, encounterWord, passage.id],
  );

  /* Dismiss the glossary on outside click or Escape. */
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

  const vocabIds = useMemo(() => passageVocabIds(passage), [passage]);
  const coverage = useMemo(
    () => readingCoverage(vocabIds, wordEncounters, vocab),
    [vocabIds, wordEncounters, vocab],
  );
  const coveragePct =
    coverage.total > 0 ? Math.round((coverage.inRotation / coverage.total) * 100) : 0;

  return (
    <div className="mx-auto w-full max-w-[1160px]">
      {/* ── Running head ── */}
      <div
        className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b px-5 py-4 sm:px-10"
        style={{ borderColor: 'var(--rule)' }}
      >
        <div className="flex min-w-0 items-baseline gap-4">
          <BackLink href="/read">Reading Room</BackLink>
          <span
            className="truncate"
            style={{ fontFamily: 'var(--font-latin)', fontSize: '1.25rem', color: 'var(--fg)' }}
          >
            {passage.citation}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="slab-sm hidden sm:inline">
            {passage.work} · Unit {passage.unit}
          </span>
          <div className="flex items-center gap-1">
            {prev && (
              <Link
                href={`/read/${prev.id}`}
                className="btn btn-ghost px-2"
                title={prev.citation}
                aria-label={`Previous: ${prev.citation}`}
              >
                ←
              </Link>
            )}
            {next && (
              <Link
                href={`/read/${next.id}`}
                className="btn btn-ghost px-2"
                title={next.citation}
                aria-label={`Next: ${next.citation}`}
              >
                →
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* The ref goes on the grid, so the whole Latin column arrives as one
          object. Revealing inside the article instead would have the passage
          appearing line by line under the reader's eye as they scroll it,
          which is the one place in this app where movement is a liability. */}
      <div ref={columns} className="grid lg:grid-cols-[minmax(0,1fr)_1px_366px]">
        {/* ─────────── The Latin ─────────── */}
        <article className="min-w-0 px-5 py-10 sm:px-10 sm:py-14 lg:pr-12">
          <header className="mb-9">
            <h1 style={{ fontSize: 'clamp(1.625rem, 1.3rem + 1.6vw, 2.25rem)', lineHeight: 1.15 }}>
              {passage.title}
            </h1>
            {passage.salutation && (
              <p
                className="mt-2"
                style={{
                  margin: '0.5rem 0 0',
                  fontFamily: 'var(--font-latin)',
                  fontSize: '1.125rem',
                  color: 'var(--fg-muted)',
                }}
              >
                {passage.salutation}
              </p>
            )}
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className={`btn ${!glossaryEnabled ? 'btn-primary' : ''}`}
                onClick={toggleGlossary}
                aria-pressed={!glossaryEnabled}
                title="Hide the glossary and read the Latin cold (c)"
              >
                {glossaryEnabled ? 'Cold read' : 'Glossary off'}
                <span className="kbd" aria-hidden="true">c</span>
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setNotesOpen((v) => !v)}
                aria-pressed={notesOpen}
                aria-expanded={notesOpen}
              >
                Notes
                <span className="kbd" aria-hidden="true">n</span>
              </button>
              <button
                type="button"
                className="btn px-3"
                onClick={() => toggleBookmark(passage.id)}
                aria-pressed={mounted ? Boolean(state?.bookmarked) : false}
                title="Bookmark this passage (b)"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  aria-hidden="true"
                  fill={mounted && state?.bookmarked ? 'currentColor' : 'none'}
                >
                  <path d="M4 2.5h8v11l-4-3-4 3v-11z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                </svg>
                <span className="sr-only">Bookmark</span>
              </button>
            </div>
          </header>

          {!passage.required && (
            <div className="mb-8">
              <SupplementaryNotice />
            </div>
          )}

          {/* The verse block: a red margin rule with the text ruled off it. */}
          <div className="verse-block">
            {passage.lines.map((line, li) => {
              const isFlagged = mounted && flagged.has(line.n);
              const tokens = tokenize(line.latin);
              return (
                <div
                  key={`${line.n}-${li}`}
                  className="group relative flex gap-5"
                  style={{ marginBottom: isVerse ? '0.375rem' : '1.15rem' }}
                >
                  <button
                    type="button"
                    onClick={() => toggleFlaggedLine(passage.id, line.n)}
                    className="verse-num transition-colors"
                    style={{
                      lineHeight: 2.6,
                      color: isFlagged ? 'var(--gilt)' : 'var(--fg-faint)',
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
                        ? 'inset 0 -0.42em 0 color-mix(in srgb, var(--gilt) 22%, transparent)'
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
                    className="slab-sm shrink-0 self-start opacity-0 transition-opacity duration-200 focus-visible:opacity-100 group-hover:opacity-100"
                    style={{ marginTop: '0.9rem' }}
                    title="Ask about this line"
                  >
                    ask
                  </button>
                </div>
              );
            })}
          </div>

          <p
            className="measure mt-10 border-t pt-5"
            style={{
              borderColor: 'var(--hair)',
              fontFamily: 'var(--font-latin)',
              fontSize: '1rem',
              lineHeight: 1.5,
              color: 'var(--fg-muted)',
            }}
          >
            Latin text from The Latin Library (public domain).{' '}
            {passage.macronized
              ? 'This passage carries vowel-quantity macrons from the source.'
              : 'This source does not mark vowel quantity; macrons are not shown because they would have to be invented.'}{' '}
            Click a line number to flag it as hard. This passage&rsquo;s place on the syllabus is
            set by the <CedLink to="requiredReading">CED&rsquo;s required reading list</CedLink>.
          </p>

          {notesOpen && (
            <div className="animate-in mt-8">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <span className="rubric">Your notes · {passage.citation}</span>
                <span className="slab-sm">saved automatically</span>
              </div>
              <textarea
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                rows={8}
                className="textarea"
                style={{ resize: 'vertical' }}
                placeholder="Grammar you keep tripping on, an argument you want to use in an essay, a line worth memorising…"
              />
            </div>
          )}
        </article>

        {/* The ruling */}
        <div className="hidden lg:block" style={{ background: 'var(--rule)' }} />

        {/* ─────────── Apparatus ─────────── */}
        <aside
          className="flex flex-col gap-8 border-t px-5 py-10 sm:px-10 lg:border-t-0 lg:py-14 lg:pl-9 lg:pr-10"
          style={{ borderColor: 'var(--rule)' }}
        >
          <RailSection title="English summary">
            {showSummary ? (
              <p
                style={{
                  margin: 0,
                  fontFamily: 'var(--font-latin)',
                  fontSize: '1.125rem',
                  lineHeight: 1.55,
                  color: 'var(--ink2)',
                }}
              >
                {passage.summary}
              </p>
            ) : (
              <>
                <p
                  style={{
                    margin: '0 0 0.875rem',
                    fontFamily: 'var(--font-latin)',
                    fontSize: '1.125rem',
                    fontStyle: 'italic',
                    color: 'var(--fg-muted)',
                  }}
                >
                  Hidden — construe first.
                </p>
                <button type="button" className="btn" onClick={() => setShowSummary(true)}>
                  Reveal English
                  <span className="kbd" aria-hidden="true">s</span>
                </button>
              </>
            )}
          </RailSection>

          <RailSection title="Context notes">
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--font-latin)',
                fontSize: '1.125rem',
                lineHeight: 1.55,
                color: 'var(--ink2)',
              }}
            >
              {passage.context}
            </p>
          </RailSection>

          <RailSection title="Themes">
            <div className="flex flex-wrap gap-2">
              {passage.themes.map((t) => (
                <span key={t} className="chip chip-accent">
                  {t}
                </span>
              ))}
            </div>
          </RailSection>

          {vocabIds.length > 0 && (
            <RailSection
              title="Vocabulary coverage"
              last={!(mounted && flagged.size > 0)}
              aside={
                <span
                  style={{
                    fontFamily: 'var(--font-latin)',
                    fontSize: '1.25rem',
                    lineHeight: 1,
                    color: 'var(--fg)',
                  }}
                >
                  {mounted ? `${coveragePct}%` : '—'}
                </span>
              }
            >
              <div className="meter">
                <span style={{ width: `${mounted ? coveragePct : 0}%` }} />
              </div>
              <p
                style={{
                  margin: '0.75rem 0 0',
                  fontFamily: 'var(--font-latin)',
                  fontSize: '1rem',
                  lineHeight: 1.45,
                  color: 'var(--fg-muted)',
                }}
              >
                {mounted
                  ? `${coverage.inRotation} of ${coverage.total} words in your known set. Clicking a word adds it automatically.`
                  : 'Clicking a word adds it to your rotation automatically.'}
              </p>
              {mounted && coverage.inRotation < coverage.total && (
                <button
                  type="button"
                  className="btn mt-4"
                  onClick={() => seedVocab(vocabIds)}
                >
                  Add all to deck
                </button>
              )}
            </RailSection>
          )}

          {mounted && flagged.size > 0 && (
            <RailSection title={`Flagged ${isVerse ? 'lines' : 'sections'}`} last>
              <div className="flex flex-wrap gap-2">
                {[...flagged]
                  .sort((a, b) => a - b)
                  .map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => toggleFlaggedLine(passage.id, n)}
                      className="chip chip-gilt"
                      title="Unflag"
                    >
                      {n}
                    </button>
                  ))}
              </div>
            </RailSection>
          )}
        </aside>
      </div>

      {/* ─────────── Glossārium ─────────── */}
      {sel && (
        <div
          ref={popRef}
          role="dialog"
          aria-label={`Glossary: ${sel.word}`}
          className="glossary"
          style={
            {
              // Clamped so the slip never runs off the right edge on desktop;
              // ignored entirely at touch widths, where it docks full-width.
              '--gx': `${Math.min(
                Math.max(sel.x - 176, 16),
                (typeof window !== 'undefined' ? window.innerWidth : 1200) - 368,
              )}px`,
              '--gy': `${sel.y + 10}px`,
            } as React.CSSProperties
          }
        >
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <span className="rubric">Glossārium</span>
            <button type="button" className="slab-sm" onClick={() => setSel(null)}>
              Close
            </button>
          </div>

          {sel.results.length === 0 ? (
            <>
              <div
                style={{
                  fontFamily: 'var(--font-latin)',
                  fontSize: '1.6875rem',
                  lineHeight: 1.15,
                  color: 'var(--fg)',
                }}
              >
                {sel.word}
              </div>
              <p
                style={{
                  margin: '0.75rem 0 0',
                  fontFamily: 'var(--font-latin)',
                  fontSize: '1.125rem',
                  lineHeight: 1.5,
                  color: 'var(--ink2)',
                }}
              >
                Not in the CED core vocabulary list — which means the exam would gloss it for you.
              </p>
            </>
          ) : (
            <ul className="flex flex-col gap-5">
              {sel.results.map((r) => (
                <li key={r.entry.id}>
                  <div
                    style={{
                      fontFamily: 'var(--font-latin)',
                      fontSize: '1.6875rem',
                      lineHeight: 1.15,
                      color: 'var(--fg)',
                    }}
                  >
                    {r.entry.lemma}
                  </div>
                  <div
                    className="mt-2 mb-3"
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: '0.875rem',
                      color: 'var(--fg-muted)',
                    }}
                  >
                    {r.entry.pos}
                    {r.match === 'stem' && (
                      <span style={{ color: 'var(--fg-faint)' }}> · stem match, verify in context</span>
                    )}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-latin)',
                      fontSize: '1.1875rem',
                      lineHeight: 1.5,
                      color: 'var(--fg)',
                    }}
                  >
                    {r.entry.definition}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="hair-faint my-4" />

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <button
              type="button"
              className="slab-sm"
              style={{ color: 'var(--accent)' }}
              onClick={() => {
                const top = sel.results[0];
                if (top) seedVocab([top.entry.id]);
                setSel(null);
              }}
              disabled={sel.results.length === 0}
            >
              ＋ Add to deck
            </button>
            <button
              type="button"
              className="slab-sm"
              onClick={() => {
                const line = passage.lines.find((l) => l.n === sel.lineN);
                if (line) setAskLine({ n: line.n, latin: line.latin });
                setSel(null);
              }}
            >
              Parse in context
            </button>
          </div>
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
    </div>
  );
}

/** One block of the apparatus, closed off by a hairline unless it is last. */
function RailSection({
  title,
  aside,
  children,
  last = false,
}: {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <section
      className={last ? undefined : 'border-b pb-7'}
      style={last ? undefined : { borderColor: 'var(--rule)' }}
    >
      <div className="mb-3.5 flex items-baseline justify-between gap-3">
        <h2 className="slab">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}
