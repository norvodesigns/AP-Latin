'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Passage } from '@/data/types';
import { tokenize, lookup, disambiguateInContext, type LookupResult } from '@/lib/latin';
import { useStore, readingCoverage, type Annotation, type HighlightColor } from '@/store/useStore';
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
  /** Anchor point: the word's bottom edge when the slip opens below it, or
   *  its top edge when there isn't room below and it opens above instead. */
  y: number;
  above: boolean;
}

/** A pending text-selection annotation: a token range plus where to anchor
 *  the popup, and the existing annotation for that exact range if any. */
interface Annotate {
  lineN: number;
  startTok: number;
  endTok: number;
  text: string;
  x: number;
  y: number;
  existing: Annotation | null;
  noteOpen: boolean;
}

const HIGHLIGHT_COLORS: { id: HighlightColor; label: string }[] = [
  { id: 'gilt', label: 'Gilt' },
  { id: 'verdigris', label: 'Verdigris' },
  { id: 'woad', label: 'Woad' },
  { id: 'rubric', label: 'Rubric' },
];

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
  const setHighlight = useStore((s) => s.setHighlight);
  const setAnnotationNote = useStore((s) => s.setAnnotationNote);
  const removeAnnotation = useStore((s) => s.removeAnnotation);
  const encounterWord = useStore((s) => s.encounterWord);
  const wordEncounters = useStore((s) => s.wordEncounters);
  const vocab = useStore((s) => s.vocab);
  const seedVocab = useStore((s) => s.seedVocab);
  const markStudied = useStore((s) => s.markStudied);

  const state = passages[passage.id];
  const flagged = useMemo(() => new Set(state?.flaggedLines ?? []), [state?.flaggedLines]);
  const annotations = useMemo(() => state?.annotations ?? [], [state?.annotations]);

  const [sel, setSel] = useState<Selection | null>(null);
  const [annotate, setAnnotate] = useState<Annotate | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const [askLine, setAskLine] = useState<{ n: number; latin: string } | null>(null);
  const [mounted, setMounted] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);
  const annotateRef = useRef<HTMLDivElement>(null);
  const verseRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    updatePassage(passage.id, { lastOpened: new Date().toISOString() });
    markStudied();
    // Only on passage change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passage.id]);

  useEffect(
    () => setNoteDraft(annotate?.existing?.note ?? ''),
    // Reset the draft only when the *identity* of the open annotation
    // changes (a different selection, or none) — reacting to its `.note`
    // too would stomp whatever the reader is mid-typing every time this
    // same effect's own save writes that note back to the store.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [annotate?.existing?.id],
  );

  /** Reopens the annotate popup, in note-editing mode, for an annotation the
   *  reader already made — the note mark next to its highlighted text is the
   *  only way back into it once the original selection is gone. */
  const openAnnotationForEdit = useCallback((e: React.SyntheticEvent, ann: Annotation) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setAnnotate({
      lineN: ann.lineN,
      startTok: ann.startTok,
      endTok: ann.endTok,
      text: ann.text,
      x: rect.left + rect.width / 2,
      y: rect.bottom,
      existing: ann,
      noteOpen: true,
    });
  }, []);

  const onWord = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>, word: string, lineN: number, tokenIndex: number) => {
      if (!glossaryEnabled) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const results = disambiguateInContext(passage.id, lineN, word, lookup(word), tokenIndex);
      // Flip above the word when there isn't reasonably room below for even
      // a short entry, and above actually has more room to offer — never
      // flip a word near the very top of the screen just because it's also
      // not near the bottom.
      const spaceBelow = window.innerHeight - rect.bottom;
      const above = spaceBelow < 260 && rect.top > spaceBelow;
      setSel({
        word,
        lineN,
        results,
        x: rect.left + rect.width / 2,
        y: above ? rect.top : rect.bottom,
        above,
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

  /** Persists the pending selection as an annotation (creating one if it
   *  doesn't exist yet, keeping its current color if it does) and returns
   *  its id — the one place both the note-save and remove flows need. */
  const ensureAnnotation = useCallback(
    (a: Annotate) =>
      setHighlight(passage.id, a.lineN, a.startTok, a.endTok, a.text, a.existing?.color ?? null),
    [passage.id, setHighlight],
  );

  /** Closes the annotate popup, flushing an in-progress note edit first so
   *  clicking away never silently discards what was typed. */
  const closeAnnotate = useCallback(() => {
    setAnnotate((prev) => {
      if (prev?.noteOpen) {
        const trimmed = noteDraft.trim();
        if (trimmed !== (prev.existing?.note ?? '')) {
          const a = ensureAnnotation(prev);
          setAnnotationNote(passage.id, a.id, trimmed);
        }
      }
      return null;
    });
    window.getSelection()?.removeAllRanges();
  }, [noteDraft, ensureAnnotation, passage.id, setAnnotationNote]);

  /* Dismiss the glossary or the annotate popup on outside click or Escape. */
  useEffect(() => {
    if (!sel && !annotate) return;
    const onDown = (e: MouseEvent) => {
      if (sel && popRef.current && !popRef.current.contains(e.target as Node)) setSel(null);
      if (annotate && annotateRef.current && !annotateRef.current.contains(e.target as Node)) {
        closeAnnotate();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSel(null);
        closeAnnotate();
      }
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
    // `closeAnnotate` is intentionally included despite changing identity on
    // every note keystroke: it closes over `noteDraft`, and this listener
    // must always flush the *current* draft, not whatever it was when the
    // popup first opened.
  }, [sel, annotate, closeAnnotate]);

  /* A dragged text selection inside the verse block opens the annotate
   *  popup — checked on mouseup/touchend rather than every selectionchange
   *  so the popup appears once, when the gesture finishes, not mid-drag.
   *  Restricted to a single line: the anchor (line + token range) has to
   *  stay simple enough that `tokenize()` on that one line's fixed text can
   *  always reproduce it. A plain click for the glossary popover leaves the
   *  selection collapsed, so it never reaches this. */
  useEffect(() => {
    const onUp = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;
      if (!selection.toString().trim()) return;
      const range = selection.getRangeAt(0);
      if (!verseRef.current?.contains(range.commonAncestorContainer)) return;

      const asEl = (n: Node) => (n.nodeType === Node.ELEMENT_NODE ? (n as Element) : n.parentElement);
      const startTokEl = asEl(range.startContainer)?.closest<HTMLElement>('[data-tok]');
      const endTokEl = asEl(range.endContainer)?.closest<HTMLElement>('[data-tok]');
      if (!startTokEl || !endTokEl) return;
      const startLineEl = startTokEl.closest<HTMLElement>('[data-line-n]');
      const endLineEl = endTokEl.closest<HTMLElement>('[data-line-n]');
      if (!startLineEl || !endLineEl || startLineEl !== endLineEl) return;

      const lineN = Number(startLineEl.dataset.lineN);
      let startTok = Number(startTokEl.dataset.tok);
      let endTok = Number(endTokEl.dataset.tok);
      if (startTok > endTok) [startTok, endTok] = [endTok, startTok];

      const line = passage.lines.find((l) => l.n === lineN);
      if (!line) return;
      const tokens = tokenize(line.latin);
      const text = tokens.slice(startTok, endTok + 1).map((t) => t.text).join('');
      const existing =
        annotations.find((a) => a.lineN === lineN && a.startTok === startTok && a.endTok === endTok) ??
        null;
      const rect = range.getBoundingClientRect();
      setAnnotate({
        lineN,
        startTok,
        endTok,
        text,
        x: rect.left + rect.width / 2,
        y: rect.bottom,
        existing,
        noteOpen: false,
      });
    };
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchend', onUp);
    return () => {
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchend', onUp);
    };
  }, [passage.lines, annotations]);

  /* Section shortcuts: c = cold read, s = summary, b = bookmark. */
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
      else if (k === 's') { e.preventDefault(); setShowSummary((v) => !v); }
      else if (k === 'b') { e.preventDefault(); toggleBookmark(passage.id); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [passage.id, toggleGlossary, toggleBookmark]);

  const isVerse = passage.genre === 'poetry';

  const notedAnnotations = useMemo(
    () => annotations.filter((a) => a.note.trim()).sort((a, b) => a.lineN - b.lineN),
    [annotations],
  );

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

          <p
            className="mb-8"
            style={{
              margin: '0 0 2rem',
              fontFamily: 'var(--font-sans)',
              fontSize: '0.8125rem',
              color: 'var(--fg-faint)',
            }}
          >
            Tip: select a word or phrase in the text to highlight it or attach a note.
          </p>

          {!passage.required && (
            <div className="mb-8">
              <SupplementaryNotice />
            </div>
          )}

          {/* The verse block: a red margin rule with the text ruled off it. */}
          <div className="verse-block" ref={verseRef}>
            {passage.lines.map((line, li) => {
              const isFlagged = mounted && flagged.has(line.n);
              const tokens = tokenize(line.latin);
              const lineAnnotations = mounted
                ? annotations.filter((a) => a.lineN === line.n)
                : [];
              return (
                <div
                  key={`${line.n}-${li}`}
                  data-line-n={line.n}
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
                    {tokens.map((t) => {
                      const ann = lineAnnotations.find(
                        (a) => t.index >= a.startTok && t.index <= a.endTok,
                      );
                      const hlClass = ann?.color ? `hl hl-${ann.color}` : '';
                      // The note marker sits once, after the last token of
                      // the span it belongs to, however many words that is.
                      const showNoteMark = Boolean(ann?.note) && ann?.endTok === t.index;
                      return t.isWord ? (
                        <button
                          key={t.index}
                          type="button"
                          data-tok={t.index}
                          className={`word ${hlClass} ${
                            sel?.word === t.text && sel?.lineN === line.n ? 'word-active' : ''
                          }`}
                          onClick={(e) => onWord(e, t.text, line.n, t.index)}
                          tabIndex={glossaryEnabled ? 0 : -1}
                          style={{ cursor: glossaryEnabled ? 'pointer' : 'text' }}
                        >
                          {t.text}
                          {showNoteMark && ann && <NoteMark onOpen={(e) => openAnnotationForEdit(e, ann)} />}
                        </button>
                      ) : (
                        <span key={t.index} data-tok={t.index} className={hlClass}>
                          {t.text}
                          {showNoteMark && ann && <NoteMark onOpen={(e) => openAnnotationForEdit(e, ann)} />}
                        </span>
                      );
                    })}
                  </p>

                  <button
                    type="button"
                    onClick={() => setAskLine({ n: line.n, latin: line.latin })}
                    className={`slab-sm ask-hint shrink-0 self-start ${
                      sel?.lineN === line.n ? 'ask-hint-active' : ''
                    }`}
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
            Click a line number to flag it as hard, or select any span of text to highlight it or
            attach a note. This passage&rsquo;s place on the syllabus is set by the{' '}
            <CedLink to="requiredReading">CED&rsquo;s required reading list</CedLink>.
          </p>
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
              last={!(mounted && (notedAnnotations.length > 0 || flagged.size > 0))}
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

          {mounted && notedAnnotations.length > 0 && (
            <RailSection title="Your notes" last={flagged.size === 0}>
              <ul className="flex flex-col gap-5 pl-0" style={{ listStyle: 'none' }}>
                {notedAnnotations.map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      className="latin text-left"
                      style={{
                        margin: 0,
                        fontSize: '1.0625rem',
                        background: 'none',
                        border: 0,
                        padding: 0,
                        cursor: 'pointer',
                      }}
                      onClick={() => {
                        document
                          .querySelector(`[data-line-n="${a.lineN}"]`)
                          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }}
                      title="Jump to this line"
                    >
                      {a.color && <span className={`hl hl-${a.color} rounded-sm`}>{a.text}</span>}
                      {!a.color && <>&ldquo;{a.text}&rdquo;</>}
                    </button>
                    <p
                      style={{
                        margin: '0.375rem 0 0',
                        fontFamily: 'var(--font-sans)',
                        fontSize: '0.9375rem',
                        lineHeight: 1.5,
                        color: 'var(--ink2)',
                      }}
                    >
                      {a.note}
                    </p>
                    <button
                      type="button"
                      className="slab-sm mt-1.5"
                      style={{ color: 'var(--fg-faint)' }}
                      onClick={() => removeAnnotation(passage.id, a.id)}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
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
          className={`glossary ${sel.above ? 'glossary-above' : ''}`}
          style={
            {
              // Clamped so the slip never runs off the right edge on desktop;
              // ignored entirely at touch widths, where it docks full-width.
              '--gx': `${Math.min(
                Math.max(sel.x - 176, 16),
                (typeof window !== 'undefined' ? window.innerWidth : 1200) - 368,
              )}px`,
              // Below the word: anchor its top 10px under the word's bottom
              // edge. Above the word (not enough room below): anchor its
              // bottom 10px above the word's top edge instead, so the slip
              // grows upward off the word rather than running past the
              // bottom of the viewport.
              '--gy': `${sel.y + 10}px`,
              '--gy-above': `${
                (typeof window !== 'undefined' ? window.innerHeight : 800) - sel.y + 10
              }px`,
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
                No entry found for this word.
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
                    {!r.entry.supplementary && <span className="ap-badge ml-2">AP</span>}
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

      {/* ─────────── Select-to-annotate toolbar ─────────── */}
      {annotate && (
        <div
          ref={annotateRef}
          role="dialog"
          aria-label="Highlight or annotate selection"
          className="annotate-bar"
          style={
            {
              '--gx': `${Math.min(
                Math.max(annotate.x - 110, 16),
                (typeof window !== 'undefined' ? window.innerWidth : 1200) - 236,
              )}px`,
              '--gy': `${annotate.y + 10}px`,
            } as React.CSSProperties
          }
        >
          {!annotate.noteOpen ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                {HIGHLIGHT_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`swatch swatch-${c.id} ${
                      annotate.existing?.color === c.id ? 'swatch-active' : ''
                    }`}
                    title={c.label}
                    aria-label={`Highlight in ${c.label}`}
                    onClick={() => {
                      const nextColor = annotate.existing?.color === c.id ? null : c.id;
                      const a = setHighlight(
                        passage.id,
                        annotate.lineN,
                        annotate.startTok,
                        annotate.endTok,
                        annotate.text,
                        nextColor,
                      );
                      setAnnotate({ ...annotate, existing: nextColor ? a : null });
                      // The browser's own blue selection band would otherwise
                      // sit on top of the highlight's color and muddy it.
                      window.getSelection()?.removeAllRanges();
                    }}
                  />
                ))}
              </div>
              <div className="hair-v" aria-hidden="true" />
              <button
                type="button"
                className="slab-sm"
                onClick={() => {
                  navigator.clipboard?.writeText(annotate.text).catch(() => {});
                  window.getSelection()?.removeAllRanges();
                  setAnnotate(null);
                }}
              >
                Copy
              </button>
              <button
                type="button"
                className="slab-sm"
                onClick={() => setAnnotate({ ...annotate, noteOpen: true })}
              >
                {annotate.existing?.note ? 'Edit note' : 'Note'}
              </button>
              {annotate.existing && (
                <button
                  type="button"
                  className="slab-sm"
                  style={{ color: 'var(--fg-faint)' }}
                  onClick={() => {
                    if (annotate.existing) removeAnnotation(passage.id, annotate.existing.id);
                    window.getSelection()?.removeAllRanges();
                    setAnnotate(null);
                  }}
                >
                  Remove
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              <p
                className="latin"
                style={{ margin: 0, fontSize: '1rem', color: 'var(--fg-muted)' }}
              >
                &ldquo;{annotate.text}&rdquo;
              </p>
              <textarea
                autoFocus
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                rows={3}
                className="textarea"
                style={{ resize: 'vertical', fontSize: '0.9375rem' }}
                placeholder="What's worth remembering about this?"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  className="btn btn-rubric"
                  onClick={() => {
                    const a = ensureAnnotation(annotate);
                    setAnnotationNote(passage.id, a.id, noteDraft.trim());
                    window.getSelection()?.removeAllRanges();
                    setAnnotate(null);
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          )}
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

/** A small superscript dot marking a highlighted span that also carries a
 *  note — the only visible trace of the note once its original selection is
 *  gone, and the only way back into editing it. */
function NoteMark({ onOpen }: { onOpen: (e: React.SyntheticEvent) => void }) {
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(e);
        }
      }}
      className="note-mark"
      title="View note"
      aria-label="View note on this text"
    >
      ●
    </span>
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
