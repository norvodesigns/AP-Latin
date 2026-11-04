'use client';

import Link from 'next/link';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Passage } from '@/data/types';
import { lookup, disambiguateInContext, type LookupResult } from '@/lib/latin';
import type { Token } from '@/lib/tokenize';
import {
  useStore,
  readingCoverage,
  type Annotation,
  type Pigment,
  type SyntaxMark,
  type SyntaxRole,
} from '@/store/useStore';
import { PIGMENTS, ROLE_INFO, pigmentOf } from '@/lib/annotations';
import {
  covering,
  groupOf,
  groupText,
  inRange,
  lineTokens,
  matchPieces,
  newGroupId,
  piecesOf,
  piecesText,
  rangeBetween,
  rangeOfGroup,
  rangeOnLine,
  sameRange,
  type Point,
  type Range,
} from '@/lib/readerSelection';
import { passageVocabIds } from '@/data/passages/vocabIds';
import { coreVocabulary } from '@/data/vocabulary';
import { BackLink, CedLink, SupplementaryNotice } from '@/components/ui';
import { useRevealChildren } from '@/hooks/useRevealChildren';
import AskAboutLine from '@/components/AskAboutLine';
import AnnotatedLine from '@/components/reader/AnnotatedLine';
import MarkupBar, { type BarPanel } from '@/components/reader/MarkupBar';
import ReaderNotes from '@/components/reader/ReaderNotes';

interface Nav {
  id: string;
  citation: string;
}

/** The glossary slip for a tapped word. */
interface Gloss {
  word: string;
  lineN: number;
  tok: number;
  results: LookupResult[];
  x: number;
  /** The word's bottom edge when the slip opens below it, or its top edge
   *  when there isn't room below and it opens above instead. */
  y: number;
  above: boolean;
}

/** Where the mark-up bar sits, and which of its panels is showing. */
interface Bar {
  x: number;
  y: number;
  above: boolean;
  panel: BarPanel;
}

type EnglishView = 'off' | 'rail' | 'side';

/**
 * Where an anchored popup should sit relative to the thing it belongs to.
 * Flips above only when there genuinely isn't room below *and* above has
 * more to offer — never near the top of the screen just because it also
 * isn't near the bottom.
 */
function anchorFor(rect: DOMRect, minHeight: number): { y: number; above: boolean } {
  const spaceBelow = window.innerHeight - rect.bottom;
  const above = spaceBelow < minHeight && rect.top > spaceBelow;
  return { y: above ? rect.top : rect.bottom, above };
}

/** Height the mark-up bar needs below a selection before it flips above it. */
const BAR_MIN_SPACE = 230;

/**
 * The Reading Room's page for one passage.
 *
 * Two ways to work on the text, kept apart so one never gets in the way of
 * the other:
 *
 *   Reading (the default). Tap a word for its gloss. The gloss also shows
 *   anything of yours on that word (a highlight, a note, a sentence mark)
 *   with a button to take it off, so nothing has to be re-selected to be
 *   removed.
 *
 *   Mark up (the pen button, or m). Taps select instead of glossing: tap a
 *   word, then the last word of the phrase (on any line), and the bar offers
 *   pigments, sentence-part marks and a note. Tapping a highlight selects
 *   it whole. On a wide screen, dragging across the text selects in either
 *   mode.
 *
 * Before 1.2 the two overlapped: on a phone a tap glossed and selecting was
 * nearly impossible; in the app a tap glossed or extended a highlight
 * depending on an invisible state.
 */
export default function Reader({
  passage,
  prev,
  next,
  quizCount = 0,
  english,
}: {
  passage: Passage;
  prev: Nav | null;
  next: Nav | null;
  /** Quiz questions on this passage; a link to them shows when there are any. */
  quizCount?: number;
  /** A literal translation, by line (or section) number. */
  english?: Record<number, string>;
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
  const setMark = useStore((s) => s.setMark);
  const removeMark = useStore((s) => s.removeMark);
  const encounterWord = useStore((s) => s.encounterWord);
  const wordEncounters = useStore((s) => s.wordEncounters);
  const vocab = useStore((s) => s.vocab);
  const seedVocab = useStore((s) => s.seedVocab);
  const markStudied = useStore((s) => s.markStudied);

  const state = passages[passage.id];
  const flagged = useMemo(() => new Set(state?.flaggedLines ?? []), [state?.flaggedLines]);
  const annotations = useMemo(() => state?.annotations ?? [], [state?.annotations]);
  const marks = useMemo(() => state?.marks ?? [], [state?.marks]);

  const [mode, setMode] = useState<'read' | 'markup'>('read');
  const [gloss, setGloss] = useState<Gloss | null>(null);
  const [range, setRange] = useState<Range | null>(null);
  /** The first word tapped in mark-up mode; the next tap extends from it. */
  const [anchor, setAnchor] = useState<Point | null>(null);
  /** The selection is something already on the page (a highlight tapped
   *  whole) or has just been acted on, so the next tap starts afresh. */
  const [settled, setSettled] = useState(false);
  const [bar, setBar] = useState<Bar | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [englishView, setEnglishView] = useState<EnglishView>('off');
  const [lastShown, setLastShown] = useState<'rail' | 'side'>('side');
  const [printMenu, setPrintMenu] = useState(false);
  const [askLine, setAskLine] = useState<{ n: number; latin: string } | null>(null);
  const [mounted, setMounted] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const verseRef = useRef<HTMLDivElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    updatePassage(passage.id, { lastOpened: new Date().toISOString() });
    markStudied();
    // Only on passage change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passage.id]);

  // Side by side is remembered; whether the English shows at all is not —
  // every visit starts with the Latin alone, to be construed first.
  useEffect(() => {
    try {
      const v = localStorage.getItem('lectio-english-view');
      if (v === 'rail' || v === 'side') setLastShown(v);
    } catch {}
  }, []);
  const showEnglish = useCallback((view: 'rail' | 'side') => {
    setEnglishView(view);
    setLastShown(view);
    try {
      localStorage.setItem('lectio-english-view', view);
    } catch {}
  }, []);

  const hasEnglish = Boolean(english && Object.keys(english).length > 0);

  /* ---------------------------------------------------------------- */
  /* The selection                                                     */
  /* ---------------------------------------------------------------- */

  const pieces = useMemo(() => (range ? piecesOf(passage, range) : []), [passage, range]);
  const matchedAnns = useMemo(() => matchPieces(pieces, annotations), [pieces, annotations]);
  const matchedMarks = useMemo(() => matchPieces(pieces, marks), [pieces, marks]);

  /** The pigment every piece shares, if it is one highlight already. */
  const currentPigment = useMemo<Pigment | null>(() => {
    if (pieces.length === 0 || matchedAnns.some((a) => !a || !a.color)) return null;
    const ps = new Set(matchedAnns.map((a) => (a ? pigmentOf(a) : null)));
    return ps.size === 1 ? ([...ps][0] ?? null) : null;
  }, [pieces, matchedAnns]);
  const currentRole = useMemo<SyntaxRole | null>(() => {
    if (pieces.length === 0 || matchedMarks.some((m) => !m)) return null;
    const rs = new Set(matchedMarks.map((m) => m!.role));
    return rs.size === 1 ? [...rs][0] : null;
  }, [pieces, matchedMarks]);
  const notedAnn = useMemo(
    () => [...matchedAnns].reverse().find((a) => a && a.note.trim()) ?? null,
    [matchedAnns],
  );
  const hasExisting = matchedAnns.some(Boolean) || matchedMarks.some(Boolean);

  /** Where a selection is on screen, from the first and last of its words. */
  const rectOf = useCallback((r: Range): DOMRect | null => {
    const el = (p: Point) =>
      verseRef.current?.querySelector<HTMLElement>(`[data-line-n="${p.lineN}"] [data-tok="${p.tok}"]`);
    const a = el(r.start)?.getBoundingClientRect();
    const b = el(r.end)?.getBoundingClientRect();
    if (!a || !b) return null;
    const left = Math.min(a.left, b.left);
    const right = Math.max(a.right, b.right);
    return new DOMRect(left, a.top, right - left, b.bottom - a.top);
  }, []);

  /** Selects a range and brings up the bar beside it. */
  const select = useCallback(
    (r: Range, opts: { settled: boolean; anchor?: Point | null; panel?: BarPanel } = { settled: false }) => {
      setGloss(null);
      setRange(r);
      setSettled(opts.settled);
      setAnchor(opts.anchor ?? null);
      const rect = rectOf(r);
      const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
      const pos = rect ? anchorFor(rect, BAR_MIN_SPACE) : { y: window.innerHeight / 2, above: false };
      setBar({ x, ...pos, panel: opts.panel ?? 'main' });
      if (opts.panel === 'note') {
        const ps = piecesOf(passage, r);
        const noted = [...matchPieces(ps, annotations)].reverse().find((a) => a && a.note.trim());
        setNoteDraft(noted?.note ?? '');
      }
    },
    [rectOf, passage, annotations],
  );

  // The bar's panels differ in height (the sentence-part picker is three
  // times the colours), so once a panel is drawn its real height decides
  // whether it fits under the words or has to sit above them. Desktop only:
  // on a phone the bar is a sheet along the bottom.
  const barPanel = bar?.panel;
  useLayoutEffect(() => {
    if (!range || !barPanel || !barRef.current) return;
    if (!window.matchMedia('(min-width: 1024px)').matches) return;
    const rect = rectOf(range);
    if (!rect) return;
    const pos = anchorFor(rect, barRef.current.offsetHeight + 24);
    setBar((b) => (b && (b.above !== pos.above || b.y !== pos.y) ? { ...b, ...pos } : b));
  }, [barPanel, range, rectOf]);

  // On a phone the gloss and the bar are sheets along the bottom, and a word
  // low on the screen ends up underneath the sheet it opened. Scroll it up
  // to just above the sheet, so the reader can see what they tapped.
  const glossKey = gloss ? `${gloss.lineN}:${gloss.tok}` : null;
  const rangeKey = range ? `${range.start.lineN}:${range.start.tok}-${range.end.lineN}:${range.end.tok}` : null;
  useEffect(() => {
    if (!glossKey && !rangeKey) return;
    if (window.matchMedia('(min-width: 1024px)').matches) return;
    const frame = requestAnimationFrame(() => {
      // Its height, not its rect: the sheet is still sliding up from below.
      const sheet = glossKey ? popRef.current : barRef.current;
      const [lineN, tok] = (glossKey ?? rangeKey!.split('-')[1]).split(':');
      const word = verseRef.current
        ?.querySelector(`[data-line-n="${lineN}"] [data-tok="${tok}"]`)
        ?.getBoundingClientRect();
      if (!sheet || !word) return;
      const overlap = word.bottom - (window.innerHeight - sheet.offsetHeight - 16);
      if (overlap > 0) window.scrollBy({ top: overlap, behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(frame);
  }, [glossKey, rangeKey]);

  const clearSelection = useCallback(() => {
    setRange(null);
    setBar(null);
    setAnchor(null);
    setSettled(false);
    window.getSelection()?.removeAllRanges();
  }, []);

  /** Writes the note editor's text to the selection: on its last piece, so
   *  the note mark sits after the whole phrase. */
  const commitNote = useCallback(
    (text: string) => {
      if (pieces.length === 0) return;
      const trimmed = text.trim();
      if (notedAnn) {
        if (trimmed !== notedAnn.note) setAnnotationNote(passage.id, notedAnn.id, trimmed);
        return;
      }
      if (!trimmed) return;
      const last = pieces[pieces.length - 1];
      const lastIdx = pieces.length - 1;
      const existing = matchedAnns[lastIdx];
      const group = existing?.group ?? matchedAnns.find((a) => a?.group)?.group;
      const target =
        existing ??
        setHighlight(
          passage.id,
          last.lineN,
          last.startTok,
          last.endTok,
          // A note on a phrase with no colour lives on its last line alone,
          // so it carries the whole phrase as its text.
          pieces.length > 1 ? piecesText(pieces) : last.text,
          null,
          group,
        );
      setAnnotationNote(passage.id, target.id, trimmed);
    },
    [pieces, notedAnn, matchedAnns, passage.id, setAnnotationNote, setHighlight],
  );

  /** Closes the bar, keeping a note that was being typed. */
  const closeBar = useCallback(() => {
    if (bar?.panel === 'note') commitNote(noteDraft);
    clearSelection();
  }, [bar?.panel, commitNote, noteDraft, clearSelection]);

  const applyPigment = useCallback(
    (p: Pigment) => {
      if (pieces.length === 0) return;
      if (currentPigment === p) {
        for (const a of matchedAnns) if (a) setHighlight(passage.id, a.lineN, a.startTok, a.endTok, a.text, null);
      } else {
        const group =
          pieces.length > 1 ? (matchedAnns.find((a) => a?.group)?.group ?? newGroupId()) : undefined;
        for (const piece of pieces) {
          setHighlight(passage.id, piece.lineN, piece.startTok, piece.endTok, piece.text, p, group);
        }
      }
      markStudied();
      setSettled(true);
      window.getSelection()?.removeAllRanges();
    },
    [pieces, currentPigment, matchedAnns, passage.id, setHighlight, markStudied],
  );

  const applyRole = useCallback(
    (r: SyntaxRole) => {
      if (pieces.length === 0) return;
      const off = currentRole === r;
      const group =
        pieces.length > 1 ? (matchedMarks.find((m) => m?.group)?.group ?? newGroupId()) : undefined;
      for (const piece of pieces) {
        setMark(passage.id, piece.lineN, piece.startTok, piece.endTok, piece.text, off ? null : r, group);
      }
      markStudied();
      setSettled(true);
      setBar((b) => (b ? { ...b, panel: 'main' } : b));
    },
    [pieces, currentRole, matchedMarks, passage.id, setMark, markStudied],
  );

  /** Takes everything stored on exactly these words off the page. */
  const removeSelected = useCallback(() => {
    for (const a of matchedAnns) if (a) removeAnnotation(passage.id, a.id);
    for (const m of matchedMarks) if (m) removeMark(passage.id, m.id);
    clearSelection();
  }, [matchedAnns, matchedMarks, passage.id, removeAnnotation, removeMark, clearSelection]);

  /** Takes a highlight or note off, with the rest of its cross-line group. */
  const removeGroup = useCallback(
    (a: Annotation) => {
      for (const x of groupOf(a, annotations)) removeAnnotation(passage.id, x.id);
    },
    [annotations, passage.id, removeAnnotation],
  );
  const uncolorGroup = useCallback(
    (a: Annotation) => {
      for (const x of groupOf(a, annotations)) setHighlight(passage.id, x.lineN, x.startTok, x.endTok, x.text, null);
    },
    [annotations, passage.id, setHighlight],
  );
  const removeMarkGroup = useCallback(
    (m: SyntaxMark) => {
      for (const x of groupOf(m, marks)) removeMark(passage.id, x.id);
    },
    [marks, passage.id, removeMark],
  );

  /* ---------------------------------------------------------------- */
  /* Words                                                             */
  /* ---------------------------------------------------------------- */

  /** A tap in mark-up mode: select, extend, narrow or let go. */
  const markupTap = useCallback(
    (lineN: number, tok: number) => {
      const here = { lineN, tok };
      const inside = range ? inRange(passage, range, lineN, tok) : false;
      const single = range ? range.start.lineN === range.end.lineN && range.start.tok === range.end.tok : false;

      const fresh = () => {
        // Tapping a highlight selects it whole: to recolour it, note it, or
        // take it off.
        const hit = annotations.findLast((a) => a.color && a.lineN === lineN && tok >= a.startTok && tok <= a.endTok);
        if (hit) {
          select(rangeOfGroup(passage, hit, annotations), { settled: true });
          return;
        }
        const markHit = marks.find((m) => m.lineN === lineN && tok >= m.startTok && tok <= m.endTok);
        if (markHit) {
          select(rangeOfGroup(passage, markHit, marks), { settled: true });
          return;
        }
        select({ start: here, end: here }, { settled: false, anchor: here });
      };

      if (!range) return fresh();
      if (settled) {
        if (!inside) return fresh();
        if (single) return clearSelection();
        // Narrow a selected highlight to the one word, to work on it alone.
        return select({ start: here, end: here }, { settled: false, anchor: here });
      }
      if (single && inside) return clearSelection();
      const from = anchor ?? range.start;
      select(rangeBetween(passage, from, here), { settled: false, anchor: from });
    },
    [range, settled, anchor, passage, annotations, marks, select, clearSelection],
  );

  const onWord = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>, lineN: number, t: Token) => {
      if (mode === 'markup') {
        markupTap(lineN, t.index);
        return;
      }
      // A click that ends a drag-selection belongs to the selection.
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed && sel.toString().trim()) return;
      if (range) clearSelection();
      if (!glossaryEnabled) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const results = disambiguateInContext(passage.id, lineN, t.text, lookup(t.text), t.index);
      setGloss({ word: t.text, lineN, tok: t.index, results, x: rect.left + rect.width / 2, ...anchorFor(rect, 260) });
      // Reading is the primary way vocabulary gets tracked here: an exact
      // dictionary match seeds the word into the SM-2 rotation. Stem
      // matches are heuristic guesses and are not trusted enough to seed.
      const top = results[0];
      if (top?.match === 'exact') encounterWord(top.entry.id, passage.id);
    },
    [mode, markupTap, range, clearSelection, glossaryEnabled, encounterWord, passage.id],
  );

  /* Dismiss on an outside click, and Escape. */
  useEffect(() => {
    if (!gloss && !bar && mode === 'read') return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (gloss && popRef.current && !popRef.current.contains(t)) setGloss(null);
      if (bar && barRef.current && !barRef.current.contains(t)) {
        // In mark-up mode a tap on the text changes the selection rather
        // than dismissing it; the word's own click handles that.
        const onText = mode === 'markup' && verseRef.current?.contains(t);
        const onDock = dockRef.current?.contains(t);
        if (!onText && !onDock) closeBar();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (gloss) setGloss(null);
      else if (bar) closeBar();
      else if (mode === 'markup') setMode('read');
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [gloss, bar, mode, closeBar]);

  /* A dragged text selection inside the verse block selects those words,
   * across lines if it runs on — checked when the gesture ends, so the bar
   * appears once, not mid-drag. A plain click leaves the selection
   * collapsed, so it never reaches this. */
  useEffect(() => {
    const onUp = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;
      if (!selection.toString().trim()) return;
      const r = selection.getRangeAt(0);
      if (!verseRef.current?.contains(r.commonAncestorContainer)) return;
      const asEl = (n: Node) => (n.nodeType === Node.ELEMENT_NODE ? (n as Element) : n.parentElement);
      const pointOf = (n: Node): Point | null => {
        const tokEl = asEl(n)?.closest<HTMLElement>('[data-tok]');
        const lineEl = tokEl?.closest<HTMLElement>('[data-line-n]');
        if (!tokEl || !lineEl) return null;
        return { lineN: Number(lineEl.dataset.lineN), tok: Number(tokEl.dataset.tok) };
      };
      const a = pointOf(r.startContainer);
      const b = pointOf(r.endContainer);
      if (!a || !b) return;
      const next = rangeBetween(passage, a, b);
      if (piecesOf(passage, next).length === 0) return;
      // Already showing this one.
      if (sameRange(next, range)) return;
      select(next, { settled: false, anchor: next.start });
    };
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchend', onUp);
    return () => {
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchend', onUp);
    };
  }, [passage, range, select]);

  /* Shortcuts: c cold read, t (or s) translation, b bookmark, m mark up;
   * with words selected, 1–8 a pigment and Delete removes. */
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
      if (range && bar?.panel === 'main') {
        const n = Number(k);
        if (n >= 1 && n <= PIGMENTS.length) {
          e.preventDefault();
          applyPigment(PIGMENTS[n - 1].id);
          return;
        }
        if ((e.key === 'Delete' || e.key === 'Backspace') && hasExisting) {
          e.preventDefault();
          removeSelected();
          return;
        }
      }
      if (k === 'c') { e.preventDefault(); toggleGlossary(); }
      else if (k === 't' || k === 's') {
        e.preventDefault();
        if (englishView === 'off') showEnglish(lastShown);
        else setEnglishView('off');
      } else if (k === 'b') { e.preventDefault(); toggleBookmark(passage.id); }
      else if (k === 'm') {
        e.preventDefault();
        setGloss(null);
        setMode((m) => (m === 'markup' ? 'read' : 'markup'));
      } else if (k === 'n') {
        e.preventDefault();
        document.getElementById('reader-notes')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [passage.id, toggleGlossary, toggleBookmark, range, bar?.panel, applyPigment, hasExisting, removeSelected, englishView, lastShown, showEnglish]);

  /* ---------------------------------------------------------------- */
  /* Printing                                                          */
  /* ---------------------------------------------------------------- */

  const print = useCallback(
    (kind: 'clean' | 'study', withEnglish: boolean) => {
      setPrintMenu(false);
      clearSelection();
      setGloss(null);
      const before = englishView;
      if (withEnglish && hasEnglish) setEnglishView('side');
      else setEnglishView('off');
      document.documentElement.dataset.print = kind;
      const done = () => {
        delete document.documentElement.dataset.print;
        setEnglishView(before);
        window.removeEventListener('afterprint', done);
      };
      window.addEventListener('afterprint', done);
      // A frame for React to draw the English (or take it away) first.
      requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
    },
    [clearSelection, englishView, hasEnglish],
  );

  useEffect(() => {
    if (!printMenu) return;
    const onDown = (e: MouseEvent) => {
      if (printRef.current && !printRef.current.contains(e.target as Node)) setPrintMenu(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [printMenu]);

  /* ---------------------------------------------------------------- */
  /* Derived                                                           */
  /* ---------------------------------------------------------------- */

  const isVerse = passage.genre === 'poetry';
  const side = englishView === 'side' && hasEnglish;

  /** Notes numbered in reading order, for the printed sheet's endnotes. */
  const notes = useMemo(
    () => annotations.filter((a) => a.note.trim()).sort((a, b) => a.lineN - b.lineN || a.startTok - b.startTok),
    [annotations],
  );
  const noteNumbers = useMemo(() => new Map(notes.map((a, i) => [a.id, i + 1])), [notes]);

  const vocabIds = useMemo(() => passageVocabIds(passage), [passage]);
  const coverage = useMemo(
    () => readingCoverage(vocabIds, wordEncounters, vocab),
    [vocabIds, wordEncounters, vocab],
  );
  const coveragePct =
    coverage.total > 0 ? Math.round((coverage.inRotation / coverage.total) * 100) : 0;

  /** What the gloss slip should show as the reader's own, on its word. */
  const glossOwn = useMemo(() => {
    if (!gloss) return { anns: [] as Annotation[], marks: [] as SyntaxMark[] };
    const seen = new Set<string>();
    const anns = covering(annotations, gloss.lineN, gloss.tok).filter((a) => {
      const k = a.group ?? a.id;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    const ms = covering(marks, gloss.lineN, gloss.tok);
    return { anns, marks: ms };
  }, [gloss, annotations, marks]);

  const selectionLines = pieces.length
    ? pieces[0].lineN === pieces[pieces.length - 1].lineN
      ? `line ${pieces[0].lineN}`
      : `lines ${pieces[0].lineN}–${pieces[pieces.length - 1].lineN}`
    : '';

  return (
    <div className={`mx-auto w-full max-w-[1160px] ${mode === 'markup' ? 'reader-markup' : ''}`}>
      {/* ── Running head ── */}
      <div
        className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b px-5 py-4 sm:px-10 print:hidden"
        style={{ borderColor: 'var(--rule)' }}
      >
        <div className="flex min-w-0 items-baseline gap-4">
          <BackLink href="/read">Reading Room</BackLink>
          <span className="truncate" style={{ fontFamily: 'var(--font-latin)', fontSize: '1.25rem', color: 'var(--fg)' }}>
            {passage.citation}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="slab-sm hidden sm:inline">
            {passage.work} · Unit {passage.unit}
          </span>
          <div className="flex items-center gap-1">
            {prev && (
              <Link href={`/read/${prev.id}`} className="btn btn-ghost px-2" title={prev.citation} aria-label={`Previous: ${prev.citation}`}>
                ←
              </Link>
            )}
            {next && (
              <Link href={`/read/${next.id}`} className="btn btn-ghost px-2" title={next.citation} aria-label={`Next: ${next.citation}`}>
                →
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* The ref goes on the grid, so the whole Latin column arrives as one
          object rather than line by line under the reader's eye. */}
      <div ref={columns} className="grid lg:grid-cols-[minmax(0,1fr)_1px_366px]">
        {/* ─────────── The Latin ─────────── */}
        <article className="min-w-0 px-5 py-10 sm:px-10 sm:py-14 lg:pr-12">
          <header className="mb-9">
            {/* On paper: who it belongs to, and where the text comes from. */}
            <div className="hidden print:mb-6 print:flex print:items-baseline print:justify-between print:gap-8">
              <span className="slab-sm">
                {passage.author === 'vergil' ? 'Vergil' : passage.author === 'pliny' ? 'Pliny' : passage.author},{' '}
                {passage.citation}
              </span>
              <span className="print-clean-only" style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem' }}>
                Name ______________________ Date __________
              </span>
              <span className="print-study-only hidden print:inline" style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem' }}>
                Study sheet · {new Date().toLocaleDateString()}
              </span>
            </div>
            <h1 style={{ fontSize: 'clamp(1.625rem, 1.3rem + 1.6vw, 2.25rem)', lineHeight: 1.15 }}>{passage.title}</h1>
            {passage.salutation && (
              <p className="mt-2" style={{ margin: '0.5rem 0 0', fontFamily: 'var(--font-latin)', fontSize: '1.125rem', color: 'var(--fg-muted)' }}>
                {passage.salutation}
              </p>
            )}
            <div className="mt-5 flex flex-wrap items-center gap-2 print:hidden">
              <button
                type="button"
                className={`btn ${mode === 'markup' ? 'btn-primary' : ''}`}
                onClick={() => {
                  setGloss(null);
                  if (mode === 'markup') closeBar();
                  setMode(mode === 'markup' ? 'read' : 'markup');
                }}
                aria-pressed={mode === 'markup'}
                title="Tap words to highlight them, mark parts of the sentence, or add a note (m)"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" fill="none">
                  <path d="M10.5 2.5l3 3-7.5 7.5H3v-3l7.5-7.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                  <path d="M2 14.5h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
                {mode === 'markup' ? 'Marking up' : 'Mark up'}
                <span className="kbd" aria-hidden="true">m</span>
              </button>
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
              {hasEnglish && (
                <button
                  type="button"
                  className={`btn ${englishView !== 'off' ? 'btn-rubric' : ''}`}
                  onClick={() => (englishView === 'off' ? showEnglish(lastShown) : setEnglishView('off'))}
                  aria-pressed={englishView !== 'off'}
                  title="Show the literal English translation (t)"
                >
                  {englishView === 'off' ? 'English' : 'Hide English'}
                  <span className="kbd" aria-hidden="true">t</span>
                </button>
              )}
              <button
                type="button"
                className="btn px-3"
                onClick={() => toggleBookmark(passage.id)}
                aria-pressed={mounted ? Boolean(state?.bookmarked) : false}
                title="Bookmark this passage (b)"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" fill={mounted && state?.bookmarked ? 'currentColor' : 'none'}>
                  <path d="M4 2.5h8v11l-4-3-4 3v-11z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                </svg>
                <span className="sr-only">Bookmark</span>
              </button>
              <div className="relative" ref={printRef}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setPrintMenu((v) => !v)}
                  aria-expanded={printMenu}
                  aria-haspopup="menu"
                >
                  Print
                </button>
                {printMenu && (
                  <div role="menu" className="panel absolute left-0 z-30 mt-2 flex w-72 flex-col gap-1 p-2" style={{ top: '100%' }}>
                    <PrintItem title="Study sheet" body="Your highlights, sentence marks and numbered notes, in colour." onClick={() => print('study', false)} />
                    {hasEnglish && (
                      <PrintItem title="Study sheet with the English" body="The same, with the translation line by line beside the Latin." onClick={() => print('study', true)} />
                    )}
                    <PrintItem title="Clean handout" body="The Latin double-spaced with its vocabulary and room to write." onClick={() => print('clean', false)} />
                  </div>
                )}
              </div>
              {quizCount > 0 && (
                <Link className="btn" href={`/quiz?passage=${passage.id}`}>
                  {quizCount} questions
                </Link>
              )}
              {passage.genre === 'poetry' && passage.author === 'vergil' && passage.required && (
                <Link className="btn" href={`/scansion?passage=${passage.id}`}>
                  Scan this passage
                </Link>
              )}
            </div>
          </header>

          <p className="mb-8 print:hidden" style={{ margin: '0 0 2rem', fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--fg-faint)' }}>
            {mode === 'markup'
              ? 'Mark-up mode: tap a word, then the last word of the phrase, and pick a colour, a sentence part or a note. Tap a highlight to change or remove it.'
              : 'Tap a word for its gloss. To highlight, mark the subject and verb, or write a note, turn on Mark up (or drag across the words).'}
          </p>

          {!passage.required && (
            <div className="mb-8 print:hidden">
              <SupplementaryNotice />
            </div>
          )}

          {/* The verse block: a red margin rule with the text ruled off it. */}
          <div className={`verse-block print-ruled ${side ? 'side-by-side' : ''}`} ref={verseRef}>
            {passage.lines.map((line, li) => {
              const isFlagged = mounted && flagged.has(line.n);
              const tokens = lineTokens(passage, line.n);
              const lineAnns = mounted ? annotations.filter((a) => a.lineN === line.n) : [];
              const lineMarks = mounted ? marks.filter((m) => m.lineN === line.n) : [];
              const selected = range ? rangeOnLine(passage, range, line.n) : null;
              const en = english?.[line.n];
              return (
                <div
                  key={`${line.n}-${li}`}
                  data-line-n={line.n}
                  className={`group relative flex gap-5 ${lineMarks.some((m) => m.role !== 'clause') ? 'line-marked' : ''}`}
                  style={{ marginBottom: isVerse ? (side ? '0.625rem' : '0.375rem') : '1.15rem' }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (mode === 'markup') {
                        // The whole line, to mark or note it at once.
                        const first = tokens.find((t) => t.isWord);
                        const last = tokens.findLast((t) => t.isWord);
                        if (first && last) select({ start: { lineN: line.n, tok: first.index }, end: { lineN: line.n, tok: last.index } }, { settled: false });
                        return;
                      }
                      toggleFlaggedLine(passage.id, line.n);
                    }}
                    className="verse-num transition-colors"
                    style={{ lineHeight: 2.6, color: isFlagged ? 'var(--gilt)' : 'var(--fg-faint)' }}
                    title={mode === 'markup' ? 'Select the whole line' : isFlagged ? 'Unflag this line' : 'Flag this line as hard'}
                    aria-pressed={mode === 'markup' ? undefined : isFlagged}
                  >
                    {line.n}
                  </button>

                  <div className="line-row min-w-0 flex-1">
                    <p
                      className={isVerse ? 'latin-verse' : 'latin'}
                      style={{
                        margin: 0,
                        boxShadow: isFlagged ? 'inset 0 -0.42em 0 color-mix(in srgb, var(--gilt) 22%, transparent)' : undefined,
                      }}
                    >
                      <AnnotatedLine
                        tokens={tokens}
                        annotations={lineAnns}
                        marks={lineMarks}
                        selected={selected}
                        activeTok={gloss && gloss.lineN === line.n ? gloss.tok : null}
                        onWord={(e, t) => onWord(e, line.n, t)}
                        wordsFocusable={glossaryEnabled || mode === 'markup'}
                        onNote={(e, a) => {
                          e.stopPropagation();
                          select(rangeOfGroup(passage, a, annotations), { settled: true, panel: 'note' });
                        }}
                        noteNumbers={noteNumbers}
                      />
                    </p>
                    {side && (
                      <p className="line-english" style={{ margin: 0 }}>
                        {en ?? ''}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setAskLine({ n: line.n, latin: line.latin })}
                    className={`slab-sm ask-hint shrink-0 self-start print:hidden ${gloss?.lineN === line.n ? 'ask-hint-active' : ''}`}
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
            className="measure mt-10 border-t pt-5 print:hidden"
            style={{ borderColor: 'var(--hair)', fontFamily: 'var(--font-latin)', fontSize: '1rem', lineHeight: 1.5, color: 'var(--fg-muted)' }}
          >
            Latin text from The Latin Library (public domain).{' '}
            {passage.macronized
              ? 'This passage carries vowel-quantity macrons from the source.'
              : 'This source does not mark vowel quantity; macrons are not shown because they would have to be invented.'}{' '}
            {hasEnglish && 'The English is a literal translation in the exam’s own style, written for this app. '}
            Click a line number to flag it as hard. This passage&rsquo;s place on the syllabus is set by the{' '}
            <CedLink to="requiredReading">CED&rsquo;s required reading list</CedLink>.
          </p>

          <PrintStudyNotes notes={notes} all={annotations} noteNumbers={noteNumbers} passageNotes={mounted ? (state?.notes ?? '') : ''} marks={marks} flagged={[...flagged].sort((a, b) => a - b)} isVerse={isVerse} />
          <PrintVocabulary passage={passage} ids={vocabIds} />
        </article>

        {/* The ruling */}
        <div className="hidden lg:block print:hidden" style={{ background: 'var(--rule)' }} />

        {/* ─────────── Apparatus ─────────── */}
        <aside
          className="flex min-w-0 flex-col gap-8 border-t px-5 py-10 sm:px-10 lg:border-t-0 lg:py-14 lg:pl-9 lg:pr-10 print:hidden"
          style={{ borderColor: 'var(--rule)' }}
        >
          <RailSection title={hasEnglish ? 'English translation' : 'English summary'}>
            {hasEnglish ? (
              englishView === 'off' ? (
                <>
                  <p style={{ margin: '0 0 0.875rem', fontFamily: 'var(--font-latin)', fontSize: '1.125rem', fontStyle: 'italic', color: 'var(--fg-muted)' }}>
                    Hidden — construe first.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="btn" onClick={() => showEnglish('side')}>
                      Side by side
                      <span className="kbd" aria-hidden="true">t</span>
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={() => showEnglish('rail')}>
                      Here in the margin
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-4 flex flex-wrap gap-2">
                    <button type="button" className="btn btn-sm" onClick={() => showEnglish(englishView === 'side' ? 'rail' : 'side')}>
                      {englishView === 'side' ? 'Move to the margin' : 'Side by side'}
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEnglishView('off')}>
                      Hide
                    </button>
                  </div>
                  {englishView === 'rail' ? (
                    <ol className="flex flex-col gap-2 pl-0" style={{ listStyle: 'none', margin: 0 }}>
                      {passage.lines.map((l) =>
                        english?.[l.n] ? (
                          <li key={l.n} className="flex gap-3">
                            <button
                              type="button"
                              className="slab-sm shrink-0"
                              style={{ minWidth: '2rem', textAlign: 'right', color: 'var(--fg-faint)', background: 'none', border: 0, padding: 0, cursor: 'pointer' }}
                              onClick={() => document.querySelector(`[data-line-n="${l.n}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                              title="Jump to this line"
                            >
                              {l.n}
                            </button>
                            <span className="line-english">{english[l.n]}</span>
                          </li>
                        ) : null,
                      )}
                    </ol>
                  ) : (
                    <p style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--fg-muted)' }}>
                      Shown beside each line of the Latin, with the same numbers.
                    </p>
                  )}
                </>
              )
            ) : (
              <SummaryReveal summary={passage.summary} />
            )}
            {hasEnglish && (
              <details className="mt-5">
                <summary className="slab-sm cursor-pointer" style={{ color: 'var(--fg-muted)' }}>
                  Summary
                </summary>
                <p style={{ margin: '0.75rem 0 0', fontFamily: 'var(--font-latin)', fontSize: '1.0625rem', lineHeight: 1.55, color: 'var(--ink2)' }}>
                  {passage.summary}
                </p>
              </details>
            )}
          </RailSection>

          <RailSection title="Context notes">
            <p style={{ margin: 0, fontFamily: 'var(--font-latin)', fontSize: '1.125rem', lineHeight: 1.55, color: 'var(--ink2)' }}>
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
              aside={
                <span style={{ fontFamily: 'var(--font-latin)', fontSize: '1.25rem', lineHeight: 1, color: 'var(--fg)' }}>
                  {mounted ? `${coveragePct}%` : '—'}
                </span>
              }
            >
              <div className="meter">
                <span style={{ width: `${mounted ? coveragePct : 0}%` }} />
              </div>
              <p style={{ margin: '0.75rem 0 0', fontFamily: 'var(--font-latin)', fontSize: '1rem', lineHeight: 1.45, color: 'var(--fg-muted)' }}>
                {mounted
                  ? `${coverage.inRotation} of ${coverage.total} words in your known set. Clicking a word adds it automatically.`
                  : 'Clicking a word adds it to your rotation automatically.'}
              </p>
              {mounted && coverage.inRotation < coverage.total && (
                <button type="button" className="btn mt-4" onClick={() => seedVocab(vocabIds)}>
                  Add all to deck
                </button>
              )}
            </RailSection>
          )}

          <div id="reader-notes">
            <RailSection title="Your notes and marks" last={!(mounted && flagged.size > 0)}>
              <ReaderNotes
                annotations={annotations}
                marks={marks}
                passageNotes={state?.notes ?? ''}
                onPassageNotes={(notesText) => updatePassage(passage.id, { notes: notesText })}
                onJump={(n) => document.querySelector(`[data-line-n="${n}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                onEdit={(a) => {
                  document.querySelector(`[data-line-n="${a.lineN}"]`)?.scrollIntoView({ block: 'center' });
                  requestAnimationFrame(() => select(rangeOfGroup(passage, a, annotations), { settled: true, panel: 'note' }));
                }}
                onRemove={removeGroup}
                onClearMarks={() => {
                  for (const m of marks) removeMark(passage.id, m.id);
                }}
                mounted={mounted}
              />
            </RailSection>
          </div>

          {mounted && flagged.size > 0 && (
            <RailSection title={`Flagged ${isVerse ? 'lines' : 'sections'}`} last>
              <div className="flex flex-wrap gap-2">
                {[...flagged]
                  .sort((a, b) => a - b)
                  .map((n) => (
                    <button key={n} type="button" onClick={() => toggleFlaggedLine(passage.id, n)} className="chip chip-gilt" title="Unflag">
                      {n}
                    </button>
                  ))}
              </div>
            </RailSection>
          )}
        </aside>
      </div>

      {/* ─────────── Glossārium ─────────── */}
      {gloss && (
        <div
          ref={popRef}
          role="dialog"
          aria-label={`Glossary: ${gloss.word}`}
          className={`glossary ${gloss.above ? 'glossary-above' : ''}`}
          style={
            {
              '--gx': `${gloss.x}px`,
              '--gy': `${gloss.y + 10}px`,
              '--gy-above': `${(typeof window !== 'undefined' ? window.innerHeight : 800) - gloss.y + 10}px`,
            } as React.CSSProperties
          }
        >
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <span className="rubric">Glossārium</span>
            <button type="button" className="btn btn-ghost btn-sm" style={{ marginRight: '-0.5rem' }} onClick={() => setGloss(null)}>
              Close
            </button>
          </div>

          {gloss.results.length === 0 ? (
            <>
              <div style={{ fontFamily: 'var(--font-latin)', fontSize: '1.6875rem', lineHeight: 1.15, color: 'var(--fg)' }}>{gloss.word}</div>
              <p style={{ margin: '0.75rem 0 0', fontFamily: 'var(--font-latin)', fontSize: '1.125rem', lineHeight: 1.5, color: 'var(--ink2)' }}>
                No entry found for this word.
              </p>
            </>
          ) : (
            <ul className="flex flex-col gap-5">
              {gloss.results.map((r) => (
                <li key={r.entry.id}>
                  <div style={{ fontFamily: 'var(--font-latin)', fontSize: '1.6875rem', lineHeight: 1.15, color: 'var(--fg)' }}>{r.entry.lemma}</div>
                  <div className="mt-2 mb-3" style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--fg-muted)' }}>
                    {r.entry.pos}
                    {r.match === 'stem' && <span style={{ color: 'var(--fg-faint)' }}> · stem match, verify in context</span>}
                    {!r.entry.supplementary && <span className="ap-badge ml-2">AP</span>}
                  </div>
                  <div style={{ fontFamily: 'var(--font-latin)', fontSize: '1.1875rem', lineHeight: 1.5, color: 'var(--fg)' }}>{r.entry.definition}</div>
                </li>
              ))}
            </ul>
          )}

          {(glossOwn.anns.length > 0 || glossOwn.marks.length > 0) && (
            <>
              <div className="hair-faint my-4" />
              <div className="slab-sm mb-2">On your page</div>
              <ul className="flex flex-col gap-2.5 pl-0" style={{ listStyle: 'none', margin: 0 }}>
                {glossOwn.anns.map((a) => {
                  const pigment = pigmentOf(a);
                  const all = groupOf(a, annotations);
                  const noted = all.find((x) => x.note.trim());
                  return (
                    <li key={a.group ?? a.id} className="flex flex-col gap-1">
                      {pigment && (
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-2" style={{ fontSize: '0.9375rem' }}>
                            <span className={`swatch swatch-${pigment}`} style={{ width: '0.875rem', height: '0.875rem', cursor: 'default' }} aria-hidden="true" />
                            Highlighted {PIGMENTS.find((p) => p.id === pigment)?.plain}
                          </span>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => {
                              uncolorGroup(a);
                              if (!noted) setGloss(null);
                            }}
                          >
                            Remove highlight
                          </button>
                        </div>
                      )}
                      {noted && (
                        <div className="flex items-start justify-between gap-2">
                          <p style={{ margin: 0, fontSize: '0.9375rem', lineHeight: 1.45, color: 'var(--ink2)', whiteSpace: 'pre-wrap' }}>{noted.note}</p>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm shrink-0"
                            onClick={() => select(rangeOfGroup(passage, a, annotations), { settled: true, panel: 'note' })}
                          >
                            Edit note
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
                {glossOwn.marks.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-2">
                    <span style={{ fontSize: '0.9375rem' }}>
                      <b style={{ color: 'var(--accent)' }}>{ROLE_INFO[m.role]?.short}</b> {ROLE_INFO[m.role]?.label ?? m.role}
                      {m.text !== gloss.word && <span style={{ color: 'var(--fg-faint)' }}> · {groupOf(m, marks).map((x) => x.text).join(' ')}</span>}
                    </span>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeMarkGroup(m)}>
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          <div className="hair-faint my-4" />

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <button
              type="button"
              className="btn btn-rubric btn-sm"
              onClick={() => {
                const top = gloss.results[0];
                if (top) seedVocab([top.entry.id]);
                setGloss(null);
              }}
              disabled={gloss.results.length === 0}
            >
              ＋ Add to deck
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                const here = { lineN: gloss.lineN, tok: gloss.tok };
                setMode('markup');
                select({ start: here, end: here }, { settled: false, anchor: here });
              }}
            >
              Mark up
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                const line = passage.lines.find((l) => l.n === gloss.lineN);
                if (line) setAskLine({ n: line.n, latin: line.latin });
                setGloss(null);
              }}
            >
              Ask the tutor
            </button>
          </div>
        </div>
      )}

      {/* ─────────── The mark-up bar ─────────── */}
      {range && bar && pieces.length > 0 && (
        <MarkupBar
          ref={barRef}
          text={piecesText(pieces)}
          lines={selectionLines}
          panel={bar.panel}
          pigment={currentPigment}
          role={currentRole}
          hasExisting={hasExisting}
          hasNote={Boolean(notedAnn)}
          noteDraft={noteDraft}
          above={bar.above}
          style={
            {
              '--gx': `${bar.x}px`,
              '--gy': `${bar.y + 10}px`,
              '--gy-above': `${(typeof window !== 'undefined' ? window.innerHeight : 800) - bar.y + 10}px`,
            } as React.CSSProperties
          }
          onPigment={applyPigment}
          onRole={applyRole}
          onPanel={(panel) => {
            if (panel === 'note') setNoteDraft(notedAnn?.note ?? '');
            setBar((b) => (b ? { ...b, panel } : b));
          }}
          onNoteDraft={setNoteDraft}
          onSaveNote={() => {
            commitNote(noteDraft);
            setSettled(true);
            setBar((b) => (b ? { ...b, panel: 'main' } : b));
            if (mode === 'read') clearSelection();
          }}
          onCancelNote={() => setBar((b) => (b ? { ...b, panel: 'main' } : b))}
          onAsk={() => {
            setAskLine({ n: pieces[0].lineN, latin: piecesText(pieces) });
            clearSelection();
          }}
          onCopy={() => {
            navigator.clipboard?.writeText(piecesText(pieces)).catch(() => {});
            clearSelection();
          }}
          onRemove={removeSelected}
          onDone={closeBar}
        />
      )}

      {mode === 'markup' && !range && (
        <div ref={dockRef} className="markup-dock print:hidden" role="status">
          <span>Tap a word, then the last word of the phrase.</span>
          <button type="button" className="btn btn-sm" onClick={() => setMode('read')}>
            Done
          </button>
        </div>
      )}

      {askLine && <AskAboutLine passage={passage} lineN={askLine.n} latin={askLine.latin} onClose={() => setAskLine(null)} />}
    </div>
  );
}

function PrintItem({ title, body, onClick }: { title: string; body: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="menuitem"
      className="squish rounded-lg px-3 py-2 text-left hover:bg-[var(--redtint)]"
      style={{ background: 'none', border: 0, cursor: 'pointer' }}
      onClick={onClick}
    >
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--fg)' }}>{title}</div>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', lineHeight: 1.4, color: 'var(--fg-muted)' }}>{body}</div>
    </button>
  );
}

/** For a passage with no translation yet: the summary, hidden until asked for. */
function SummaryReveal({ summary }: { summary: string }) {
  const [shown, setShown] = useState(false);
  return shown ? (
    <p style={{ margin: 0, fontFamily: 'var(--font-latin)', fontSize: '1.125rem', lineHeight: 1.55, color: 'var(--ink2)' }}>{summary}</p>
  ) : (
    <>
      <p style={{ margin: '0 0 0.875rem', fontFamily: 'var(--font-latin)', fontSize: '1.125rem', fontStyle: 'italic', color: 'var(--fg-muted)' }}>
        Hidden — construe first.
      </p>
      <button type="button" className="btn" onClick={() => setShown(true)}>
        Reveal English
      </button>
    </>
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
    <section className={last ? undefined : 'border-b pb-7'} style={last ? undefined : { borderColor: 'var(--rule)' }}>
      <div className="mb-3.5 flex items-baseline justify-between gap-3">
        <h2 className="slab">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

/**
 * The study sheet's back matter, on paper only: the notes numbered to match
 * the marks in the text, notes on the whole passage, the flagged lines, and
 * a key to the sentence marks used.
 */
function PrintStudyNotes({
  notes,
  all,
  noteNumbers,
  passageNotes,
  marks,
  flagged,
  isVerse,
}: {
  notes: Annotation[];
  all: Annotation[];
  noteNumbers: Map<string, number>;
  passageNotes: string;
  marks: SyntaxMark[];
  flagged: number[];
  isVerse: boolean;
}) {
  const used = [...new Set(marks.map((m) => m.role))].map((r) => ROLE_INFO[r]).filter(Boolean);
  if (notes.length === 0 && !passageNotes.trim() && used.length === 0 && flagged.length === 0) return null;
  return (
    <section className="print-study-only hidden print:mt-8 print:block">
      {passageNotes.trim() && (
        <>
          <h2 className="slab-sm mb-2">Notes on the passage</h2>
          <p style={{ fontSize: '0.875rem', lineHeight: 1.5, whiteSpace: 'pre-wrap', margin: '0 0 1rem' }}>{passageNotes}</p>
        </>
      )}
      {notes.length > 0 && (
        <>
          <h2 className="slab-sm mb-2">Notes</h2>
          <ol className="print-notes" style={{ fontSize: '0.875rem', lineHeight: 1.45, paddingLeft: 0, listStyle: 'none', margin: '0 0 1rem' }}>
            {notes.map((a) => (
              <li key={a.id} className="flex gap-2">
                <b style={{ minWidth: '1.4rem' }}>{noteNumbers.get(a.id)}</b>
                <span>
                  <span style={{ fontFamily: 'var(--font-latin)', fontStyle: 'italic' }}>{groupText(a, all)}</span>{' '}
                  <span style={{ color: '#555' }}>({isVerse ? 'line' : 'section'} {a.lineN})</span> — {a.note}
                </span>
              </li>
            ))}
          </ol>
        </>
      )}
      {flagged.length > 0 && (
        <p style={{ fontSize: '0.875rem', margin: '0 0 1rem' }}>
          <b>Flagged as hard:</b> {isVerse ? 'lines' : 'sections'} {flagged.join(', ')}
        </p>
      )}
      {used.length > 0 && (
        <p style={{ fontSize: '0.8125rem', margin: 0 }}>
          <b>Key:</b>{' '}
          {used.map((r, i) => (
            <span key={r.id}>
              {i > 0 && ' · '}
              <span className={`mk mk-${r.id} mk-g-${r.group}`}>{r.short}</span> {r.label.toLowerCase()}
            </span>
          ))}
        </p>
      )}
    </section>
  );
}

/**
 * The passage's vocabulary, printed after the Latin as a handout's word list
 * and never shown on screen, where every word glosses on a tap instead.
 */
function PrintVocabulary({ passage, ids }: { passage: Passage; ids: string[] }) {
  // The reading's word list covers more than this passage, so it is narrowed
  // to the words the glossary actually finds in the Latin on the page. Only
  // paper uses it, so it is worked out once the page is idle, not on load.
  const [entries, setEntries] = useState<typeof coreVocabulary>([]);
  useEffect(() => {
    const work = () => {
      const listed = new Set(ids);
      const found = new Set<string>();
      for (const line of passage.lines) {
        for (const t of lineTokens(passage, line.n)) {
          if (!t.isWord) continue;
          const best = disambiguateInContext(passage.id, line.n, t.text, lookup(t.text), t.index)[0];
          if (best && listed.has(best.entry.id)) found.add(best.entry.id);
        }
      }
      setEntries(coreVocabulary.filter((e) => found.has(e.id)).sort((a, b) => a.headword.localeCompare(b.headword, 'la')));
    };
    if ('requestIdleCallback' in window) {
      const handle = window.requestIdleCallback(work);
      return () => window.cancelIdleCallback(handle);
    }
    const timer = setTimeout(work, 200);
    return () => clearTimeout(timer);
  }, [passage, ids]);
  if (entries.length === 0) return null;
  return (
    <section className="print-clean-only hidden print:mt-8 print:block">
      <h2 className="slab-sm mb-3">Vocabulary</h2>
      <ul className="print-vocab" style={{ fontSize: '0.8125rem', lineHeight: 1.45 }}>
        {entries.map((e) => (
          <li key={e.id}>
            <span style={{ fontFamily: 'var(--font-latin)', fontWeight: 600 }}>{e.lemma}</span> {e.definition}
          </li>
        ))}
      </ul>
      <p className="mt-4" style={{ fontSize: '0.75rem' }}>
        Latin text: The Latin Library (public domain). Printed from Lectio, lectio.norvodesigns.com.
      </p>
    </section>
  );
}
