'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  useStore,
  scansionStatsByLine,
  masteredLineIds,
  scansionBadges,
  currentStreak,
} from '@/store/useStore';
import {
  AENEID_BOOKS,
  loadBook,
  loadIndex,
  parseLineId,
  type CorpusIndex,
} from '@/data/scansionCorpus';
import { Page, PageHeader, Empty, Roman, SourceNote } from '@/components/ui';
import { useRevealChildren } from '@/hooks/useRevealChildren';
import type { ScansionLine, ScannedSyllable } from '@/data/types';

type Mark = 'long' | 'short' | null;

/**
 * A run of syllables between two of the student's foot boundaries. `endsAt` is
 * the metrical index of its last syllable, which is what a boundary is keyed
 * on; `closed` means the student has actually ruled a line after it.
 */
interface Group {
  syllables: number[];
  endsAt: number;
  closed: boolean;
}

/**
 * Split the line at the student's boundaries. An elided syllable is carried
 * along with the foot it sits inside and never counts toward filling it, so a
 * boundary after a metrical syllable absorbs any elided syllables that follow.
 */
function groupsFrom(syllables: ScannedSyllable[], divisions: number[]): Group[] {
  const cuts = new Set(divisions);
  const out: Group[] = [];
  let current: number[] = [];
  let m = -1;

  for (let i = 0; i < syllables.length; i += 1) {
    current.push(i);
    if (syllables[i].elides) continue;
    m += 1;
    if (cuts.has(m)) {
      while (i + 1 < syllables.length && syllables[i + 1].elides) {
        i += 1;
        current.push(i);
      }
      out.push({ syllables: current, endsAt: m, closed: true });
      current = [];
    }
  }
  if (current.length) out.push({ syllables: current, endsAt: m, closed: false });
  return out;
}

/**
 * What the student's own marks make this group, if anything. Reading their
 * work back to them is fair — it is what they would see on paper — whereas
 * naming the foot before they have marked it would be giving the answer.
 */
function footNameFrom(marks: Mark[], group: Group, syllables: ScannedSyllable[]): string | null {
  const metrical = group.syllables.filter((i) => !syllables[i].elides);
  if (metrical.some((i) => marks[i] === null)) return null;
  const shape = metrical.map((i) => marks[i]);
  if (shape.length === 3 && shape[0] === 'long' && shape[1] === 'short' && shape[2] === 'short') {
    return 'Dactyl';
  }
  if (shape.length === 2 && shape[0] === 'long' && shape[1] === 'long') return 'Spondee';
  return null;
}

/**
 * Pick a book at random, weighted by how many lines it has, so that every line
 * in the corpus is equally likely rather than every book. Book 1 has 512 lines
 * and book 12 has 650; picking a book uniformly would over-serve the short ones.
 */
function randomBook(books: Array<{ book: number; count: number }>): number {
  const total = books.reduce((a, b) => a + b.count, 0);
  if (total === 0) return 1;
  let r = Math.random() * total;
  for (const b of books) {
    r -= b.count;
    if (r <= 0) return b.book;
  }
  return books[books.length - 1].book;
}

/** A uniformly random element, or null when there is nothing to choose from. */
function sample<T>(items: T[]): T | null {
  return items.length ? items[Math.floor(Math.random() * items.length)] : null;
}

/** True when syllable `i` is the last syllable of its word — i.e. the next
 *  syllable starts a new one, or there is no next syllable at all. */
function isWordFinal(syllables: ScannedSyllable[], i: number): boolean {
  const next = syllables[i + 1];
  return !next || next.startsWord !== false;
}

export default function ScansionLab() {
  // Declared with the other hooks: this component returns early while the
  // corpus loads, and a hook after that would not run on every render.
  const content = useRevealChildren<HTMLDivElement>();
  const markStudied = useStore((s) => s.markStudied);
  const scansionAttempts = useStore((s) => s.scansionAttempts);
  const recordScansion = useStore((s) => s.recordScansion);
  const scansionDrafts = useStore((s) => s.scansionDrafts);
  const saveScansionDraft = useStore((s) => s.saveScansionDraft);
  const studyDays = useStore((s) => s.studyDays);

  const [book, setBook] = useState<number>(1);
  const [lines, setLines] = useState<ScansionLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [corpus, setCorpus] = useState<CorpusIndex | null>(null);

  const [index, setIndex] = useState(0);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [divisions, setDivisions] = useState<number[]>([]);
  /** Syllable indices the student has claimed elide into the next word — a
   *  working guess, not the answer. See the comment on ScansionDraft. */
  const [studentElisions, setStudentElisions] = useState<Set<number>>(new Set());
  const [checked, setChecked] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [revisitMastered, setRevisitMastered] = useState(false);
  const [mounted, setMounted] = useState(false);

  const line: ScansionLine | undefined = lines[index];

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    loadIndex().then(setCorpus).catch(() => {});
  }, []);

  /* Open on a random line once the index says what the corpus holds. */
  const started = useRef(false);
  useEffect(() => {
    if (!corpus || started.current) return;
    started.current = true;
    const b = randomBook(corpus.books);
    setLoading(true);
    setLoadError(null);
    loadBook(b)
      .then((ls) => {
        setBook(b);
        setLines(ls);
        setIndex(Math.floor(Math.random() * ls.length));
        setLoading(false);
      })
      .catch((e: Error) => {
        setLoadError(e.message);
        setLoading(false);
      });
  }, [corpus]);

  /*
   * Restore whatever the student left on this line. Coming back to a line and
   * finding your work gone is the kind of small betrayal that stops people
   * moving around the corpus at all.
   */
  useEffect(() => {
    if (!line) return;
    const draft = scansionDrafts[line.id];
    if (draft && draft.marks.length === line.syllables.length) {
      setMarks(draft.marks);
      setDivisions(draft.divisions);
      setStudentElisions(new Set(draft.elisions ?? []));
      setChecked(Boolean(draft.checked));
    } else {
      setMarks(new Array(line.syllables.length).fill(null));
      setDivisions([]);
      setStudentElisions(new Set());
      setChecked(false);
    }
    setSelected(null);
    // Reading the draft store here would re-run this on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [line?.id]);

  useEffect(() => {
    markStudied();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Save work in progress, debounced so marking a syllable is not a write. */
  useEffect(() => {
    if (!line || checked) return;
    if (marks.every((m) => m === null) && divisions.length === 0 && studentElisions.size === 0) return;
    const t = window.setTimeout(
      () => saveScansionDraft(line.id, { marks, divisions, elisions: [...studentElisions] }),
      500,
    );
    return () => window.clearTimeout(t);
  }, [line, marks, divisions, studentElisions, checked, saveScansionDraft]);

  const stats = useMemo(() => scansionStatsByLine(scansionAttempts), [scansionAttempts]);
  const corpusTotal = corpus?.total ?? 0;
  const badges = useMemo(
    () => scansionBadges(scansionAttempts, Math.max(1, corpusTotal)),
    [scansionAttempts, corpusTotal],
  );
  const masteredCount = useMemo(
    () => [...stats.values()].filter((s) => s.mastered).length,
    [stats],
  );
  const streak = mounted ? currentStreak(studyDays) : 0;

  /** Indices of syllables that actually count metrically. */
  const metricalIdx = useMemo(
    () => (line ? line.syllables.map((s, i) => (s.elides ? -1 : i)).filter((i) => i >= 0) : []),
    [line],
  );

  /**
   * Every word-junction inside the line where elision is a live question —
   * i.e. every word-final syllable that has a following word to elide into.
   * The student judges each one for themselves; nothing here reveals which
   * ones actually elide.
   */
  const elidableIdx = useMemo(
    () =>
      line
        ? line.syllables
            .map((_, i) => i)
            .filter((i) => i < line.syllables.length - 1 && isWordFinal(line.syllables, i))
        : [],
    [line],
  );

  /**
   * The foot divisions the STUDENT has drawn, as metrical indices after which
   * a boundary falls. This is deliberately not derived from the answer: the
   * app used to draw the feet itself and label them "Dactyl"/"Spondee", which
   * handed over half the exercise. Dividing the line is the other half of
   * scanning, so the student does it.
   */
  const groups = useMemo(() => groupsFrom(line?.syllables ?? [], divisions), [line, divisions]);

  /** The divisions the metre actually requires — used only after checking. */
  const correctDivisions = useMemo(() => {
    if (!line) return [];
    const out: number[] = [];
    let acc = -1;
    for (const f of line.feet.slice(0, -1)) {
      acc += f === 'dactyl' ? 3 : 2;
      out.push(acc);
    }
    return out;
  }, [line]);

  const setMark = useCallback((i: number, m: Mark) => {
    setMarks((prev) => {
      const next = [...prev];
      next[i] = m;
      return next;
    });
    setSelected(null);
  }, []);

  /** Toggle the student's own claim that syllable `i` elides into the next
   *  word. Claiming it clears any quantity mark already on it — an elided
   *  syllable does not take one — so the two controls never disagree on
   *  screen; un-claiming it leaves a mark in place rather than discarding
   *  work the student may want to keep. */
  const toggleElision = useCallback((i: number) => {
    setStudentElisions((prev) => {
      const claiming = !prev.has(i);
      const next = new Set(prev);
      if (claiming) next.add(i);
      else next.delete(i);
      if (claiming) {
        setMarks((m) => (m[i] === null ? m : m.map((v, j) => (j === i ? null : v))));
      }
      return next;
    });
    setSelected(null);
  }, []);

  /* Keyboard: move with arrows, mark with l/s (or - and u), clear with 0. */
  useEffect(() => {
    if (selected === null || checked || !line) return;
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'escape') { setSelected(null); return; }
      if (k === 'l' || k === '-' || k === '_') { e.preventDefault(); setMark(selected, 'long'); return; }
      if (k === 's' || k === 'u' || k === 'v') { e.preventDefault(); setMark(selected, 'short'); return; }
      if (k === '0' || k === 'backspace') { e.preventDefault(); setMark(selected, null); return; }
      if (k === 'arrowright' || k === 'arrowleft') {
        e.preventDefault();
        const pos = metricalIdx.indexOf(selected);
        const nextPos = k === 'arrowright' ? pos + 1 : pos - 1;
        if (nextPos >= 0 && nextPos < metricalIdx.length) setSelected(metricalIdx[nextPos]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, checked, line, metricalIdx, setMark]);

  /**
   * Draw the next line at random from the whole corpus.
   *
   * A book is chosen weighted by its line count, so every one of the ~6,500
   * lines is equally likely; then a line is picked uniformly from the ones the
   * student has not already mastered. Books are memoised after their first
   * fetch, so this settles into no network traffic fairly quickly.
   */
  const advance = useCallback(
    async (exclude?: string) => {
      const books = corpus?.books ?? [];
      if (books.length === 0) return;

      const mastered = revisitMastered ? new Set<string>() : masteredLineIds(scansionAttempts);
      const pickFrom = (ls: ScansionLine[]) =>
        sample(ls.filter((l) => l.id !== exclude && !mastered.has(l.id)));

      // A few draws is almost always enough; the fallback below covers the
      // case where the books we happened to draw are fully mastered.
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const b = randomBook(books);
        setLoading(true);
        try {
          const ls = await loadBook(b);
          const chosen = pickFrom(ls);
          if (chosen) {
            setBook(b);
            setLines(ls);
            setIndex(ls.indexOf(chosen));
            setLoading(false);
            return;
          }
        } catch {
          /* try another book */
        }
      }

      // Nothing came up: walk the books in order for anything left at all.
      for (const b of AENEID_BOOKS) {
        try {
          const ls = await loadBook(b);
          const chosen = pickFrom(ls);
          if (chosen) {
            setBook(b);
            setLines(ls);
            setIndex(ls.indexOf(chosen));
            setLoading(false);
            return;
          }
        } catch {
          /* keep looking */
        }
      }
      setLoading(false);
    },
    [corpus, scansionAttempts, revisitMastered],
  );

  /** The weakest line the student has attempted but not yet mastered. */
  const practiseWeakest = useCallback(async () => {
    const attempted = [...scansionStatsByLine(scansionAttempts).entries()]
      .filter(([, st]) => !st.mastered)
      .sort((a, b) => a[1].bestAccuracy - b[1].bestAccuracy);
    const target = attempted[0]?.[0];
    const parsed = target ? parseLineId(target) : null;
    if (!parsed) {
      void advance();
      return;
    }
    setLoading(true);
    try {
      const ls = await loadBook(parsed.book);
      const i = ls.findIndex((l) => l.id === target);
      if (i >= 0) {
        setBook(parsed.book);
        setLines(ls);
        setIndex(i);
      }
    } catch {
      /* fall through */
    }
    setLoading(false);
  }, [scansionAttempts, advance]);

  if (loadError) {
    return (
      <Page>
        <PageHeader title="Scansion Lab" />
        <Empty
          title="Could not load the corpus"
          body={`Book ${book} did not load (${loadError}). Check that public/scansion has been generated — npm run build:scansion.`}
        />
      </Page>
    );
  }

  if (loading || !line) {
    return (
      <Page>
        <PageHeader eyebrow="Dactylic hexameter" title="Scansion Lab" />
        <p className="slab">Loading Aeneid {book}…</p>
      </Page>
    );
  }

  const active: ScansionLine = line;
  const lineStats = mounted ? stats.get(active.id) : undefined;

  /**
   * The final syllable is anceps — it counts long however it really scans — so
   * either mark is right there. Marking it short is not an error, and a grader
   * that says otherwise teaches the wrong thing.
   */
  const isCorrect = (i: number) => {
    const s = active.syllables[i];
    if (marks[i] === null) return false;
    if (s.anceps) return true;
    return marks[i] === s.quantity;
  };

  const result = checked
    ? active.syllables.map((s, i) => {
        if (s.elides) return marks[i] === null ? 'ok' : 'wrong-elision';
        return isCorrect(i) ? 'ok' : marks[i] === null ? 'blank' : 'wrong';
      })
    : null;

  const scored = checked ? metricalIdx.filter(isCorrect).length : 0;

  /** Did the student's elision claim at junction `i` match the real answer —
   *  whether that means correctly spotting one or correctly finding none. */
  const elisionCorrect = (i: number) => studentElisions.has(i) === Boolean(active.syllables[i].elides);
  const elisionsRight = checked ? elidableIdx.filter(elisionCorrect).length : 0;

  /**
   * Three halves count, not two. Getting every quantity right but dividing
   * the line wrongly, or missing an elision, is not a scanned line, so foot
   * divisions and elisions are scored alongside the syllables rather than
   * treated as decoration.
   */
  function check() {
    setChecked(true);
    setSelected(null);
    const syllablesRight = metricalIdx.filter(isCorrect).length;
    const boundariesRight = divisions.filter((d) => correctDivisions.includes(d)).length;
    const elisionsCorrectCount = elidableIdx.filter(elisionCorrect).length;
    recordScansion(
      active.id,
      syllablesRight + boundariesRight + elisionsCorrectCount,
      metricalIdx.length + correctDivisions.length + elidableIdx.length,
    );
    saveScansionDraft(active.id, { marks, divisions, elisions: [...studentElisions], checked: true });
  }

  function next() {
    void advance(active.id);
  }

  const allMarked = metricalIdx.every((i) => marks[i] !== null);
  const dividedRight = divisions.length === 5;
  const ready = allMarked && dividedRight;

  /** The principal break — penthemimeral where there is one, else the first. */
  const mainCaesura = active.caesurae.length
    ? [active.caesurae.find((c) => c.type === 'penthemimeral') ?? active.caesurae[0]]
    : [];

  /** Toggle a foot boundary after a metrical syllable. */
  function toggleDivision(m: number) {
    if (checked) return;
    setDivisions((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m].sort((a, b) => a - b),
    );
    setSelected(null);
  }

  const divisionsRight =
    divisions.length === correctDivisions.length &&
    divisions.every((d, i) => d === correctDivisions[i]);

  return (
    <div className="mx-auto w-full max-w-[1160px]">
      {/* ── Running head ── */}
      <div
        className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b px-5 py-4 sm:px-10"
        style={{ borderColor: 'var(--rule)' }}
      >
        <span style={{ fontFamily: 'var(--font-latin)', fontSize: '1.25rem', color: 'var(--fg)' }}>
          Dactylic hexameter · <em>{active.citation}</em>
        </span>
        <div className="flex items-center gap-5">
          <span className="slab-sm hidden sm:inline">
            {checked ? 'Reviewed' : 'Mark each syllable'}
          </span>
          <button
            type="button"
            className="slab-sm"
            onClick={() => setShowTutorial((v) => !v)}
            aria-expanded={showTutorial}
          >
            {showTutorial ? 'Hide rules' : 'Rules'}
          </button>
        </div>
      </div>

      {/* Scansion builds its own toolbar-plus-content layout rather than
          using `Page`, so the reveal ref goes on the content column. */}
      <div ref={content} className="px-5 py-8 sm:px-10 sm:py-10">
        {showTutorial && <Tutorial />}

        {/* ── Where this line came from ── */}
        <div className="mb-9 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <span
            style={{
              fontFamily: 'var(--font-latin)',
              fontSize: '1.0625rem',
              color: 'var(--fg-muted)',
            }}
          >
            Drawn at random from {corpusTotal ? corpusTotal.toLocaleString() : '6,500+'} lines of
            the <em>Aeneid</em>. Lines you have mastered never come back.
          </span>
          <button type="button" className="slab-sm" onClick={() => void practiseWeakest()}>
            ↯ Weakest line
          </button>
        </div>

        {/* ── The line ──
            Syllables run in one wrapping row. Between each pair sits a hit
            area: hovering ghosts a boundary in, clicking rules it. The
            brackets and foot names below are drawn from the student's own
            divisions and marks, never from the answer. */}
        <div className="flex flex-col items-center gap-12 py-6 sm:py-10">
          <div className="flex w-full flex-wrap items-start justify-center gap-y-10">
            {groups.map((group, gi) => {
              /*
               * The end of the line is a foot boundary too — the student never
               * draws it. So the trailing group counts as a foot as soon as the
               * other five boundaries are in, and is only "undivided" before
               * that.
               */
              const isLast = gi === groups.length - 1;
              const isFoot = group.closed || (isLast && divisions.length === 5);
              const name = footNameFrom(marks, group, active.syllables);
              const complete = group.syllables.every(
                (i) => active.syllables[i].elides || marks[i] !== null,
              );
              const boundaryRight =
                checked && group.closed ? correctDivisions.includes(group.endsAt) : null;

              return (
                <div key={gi} className="flex items-stretch">
                  <div className="flex min-w-0 flex-col items-center">
                    <div
                      className={`flex items-end ${group.closed ? '' : 'flex-wrap justify-center'}`}
                    >
                      {group.syllables.map((i, within) => {
                        const syl = active.syllables[i];
                        const state = result?.[i];
                        const mark = marks[i];
                        const isSelected = selected === i;
                        // Before checking only the main caesura is drawn: a line
                        // marked with every possible break is unreadable, and the
                        // secondary ones are a review point rather than a cue.
                        const caesura = (checked ? active.caesurae : mainCaesura).find(
                          (c) => metricalIdx[c.afterSyllable] === i,
                        );

                        // The metrical index of this syllable, for boundaries —
                        // always the real one, so the foot math underneath stays
                        // correct regardless of what the student has or hasn't
                        // claimed elides. Only the *display* of a syllable reacts
                        // to the student's own elision marks; the arithmetic never
                        // does, or a wrong guess there would cascade into every
                        // foot boundary after it looking wrong too.
                        const m = metricalIdx.indexOf(i);
                        const isLastInGroup = within === group.syllables.length - 1;
                        const canDivide = !checked && !syl.elides && m >= 0 && m < metricalIdx.length - 1;

                        // What this syllable looks like right now: the
                        // student's own claim before checking, the real answer
                        // after. Never the real answer up front — that was the
                        // giveaway the strikethrough used to be.
                        const showElided = checked ? Boolean(syl.elides) : studentElisions.has(i);

                        let color = 'var(--fg)';
                        if (checked && !showElided) {
                          color =
                            state === 'ok'
                              ? 'var(--correct)'
                              : state === 'blank'
                                ? 'var(--fg-faint)'
                                : 'var(--incorrect)';
                        }

                        // A gap only where the word itself has one — the first
                        // syllable of a new word gets real space before it (as
                        // it would in print), everything after sits flush
                        // against the previous syllable so the word reads as
                        // one word, not a chain of separated fragments. The
                        // very first syllable of the line never gets a
                        // leading gap. `startsWord` is on the data, not
                        // guessed from punctuation — see ScannedSyllable.
                        const wordGap = i !== 0 && syl.startsWord !== false;

                        // Elision is not shown — it is asked. Every word-final
                        // syllable with a word after it gets a small target
                        // beneath it the student taps to claim an elision
                        // there, exactly the judgment call scanning the line
                        // by hand requires.
                        const elidable = elidableIdx.includes(i);
                        const elisionMarkedCorrect = checked && elidable ? elisionCorrect(i) : null;

                        return (
                          <div key={i} className="flex items-stretch">
                            <div
                              className="relative flex flex-col items-center"
                              style={{ paddingLeft: wordGap ? '12px' : 0 }}
                            >
                              {/* Quantity mark, hanging above the syllable */}
                              <span
                                aria-hidden="true"
                                key={`${mark}-${checked}`}
                                style={{
                                  height: '26px',
                                  fontFamily: 'var(--font-sans)',
                                  fontSize: '1.375rem',
                                  lineHeight: 1,
                                  color:
                                    isSelected && !mark
                                      ? 'var(--fg-faint)'
                                      : color === 'var(--fg)'
                                        ? 'var(--accent)'
                                        : color,
                                  animation: mark ? 'mark-drop 240ms var(--ease) both' : undefined,
                                }}
                              >
                                {showElided
                                  ? ''
                                  : mark === 'long'
                                    ? '—'
                                    : mark === 'short'
                                      ? '˘'
                                      : isSelected
                                        ? '?'
                                        : ''}
                              </span>

                              <button
                                type="button"
                                onClick={() => setSelected(isSelected ? null : i)}
                                disabled={showElided || checked}
                                aria-label={`${syl.text}${
                                  mark ? `, marked ${mark}` : ''
                                }`}
                                aria-pressed={isSelected}
                                className="squish transition-colors duration-200"
                                style={{
                                  fontFamily: 'var(--font-latin)',
                                  fontSize: 'calc(2.125rem * var(--ls))',
                                  lineHeight: 1.2,
                                  color: showElided ? 'var(--fg-faint)' : color,
                                  textDecoration: showElided ? 'line-through' : undefined,
                                  background: isSelected ? 'var(--redtint)' : 'transparent',
                                  boxShadow: isSelected ? '0 3px 0 var(--accent)' : undefined,
                                  borderRadius: '6px',
                                  padding: '0 5px',
                                  cursor: showElided || checked ? 'default' : 'pointer',
                                }}
                              >
                                {syl.text}
                              </button>

                              {isSelected && !checked && (
                                <div className="chooser" role="group" aria-label="Mark this syllable">
                                  <button type="button" onClick={() => setMark(i, 'long')}>
                                    <span
                                      aria-hidden="true"
                                      style={{
                                        fontFamily: 'var(--font-sans)',
                                        fontSize: '1.25rem',
                                        lineHeight: 1,
                                        color: 'var(--fg)',
                                      }}
                                    >
                                      —
                                    </span>
                                    <span className="slab-sm">Longa</span>
                                  </button>
                                  <button type="button" onClick={() => setMark(i, 'short')}>
                                    <span
                                      aria-hidden="true"
                                      style={{
                                        fontFamily: 'var(--font-sans)',
                                        fontSize: '1.25rem',
                                        lineHeight: 1,
                                        color: 'var(--fg)',
                                      }}
                                    >
                                      ˘
                                    </span>
                                    <span className="slab-sm">Brevis</span>
                                  </button>
                                </div>
                              )}

                              {/* The elision target — underneath the word, not
                                  the syllable, since it is the gap between two
                                  words being judged. */}
                              {elidable && (
                                <button
                                  type="button"
                                  onClick={() => toggleElision(i)}
                                  disabled={checked}
                                  title={
                                    checked
                                      ? undefined
                                      : 'Tap if you think this elides into the next word'
                                  }
                                  aria-label={`${
                                    studentElisions.has(i) ? 'Unmark' : 'Mark'
                                  } an elision after ${syl.text}`}
                                  aria-pressed={studentElisions.has(i)}
                                  className="squish elision-tap"
                                  style={{
                                    color:
                                      elisionMarkedCorrect === true
                                        ? 'var(--correct)'
                                        : elisionMarkedCorrect === false
                                          ? 'var(--incorrect)'
                                          : studentElisions.has(i)
                                            ? 'var(--accent)'
                                            : 'var(--fg-faint)',
                                    opacity: studentElisions.has(i) || checked ? 1 : 0.45,
                                  }}
                                >
                                  ‿
                                </button>
                              )}
                            </div>

                            {caesura && (
                              <span
                                className="self-end px-0.5"
                                style={{
                                  fontFamily: 'var(--font-sans)',
                                  fontSize: '1.875rem',
                                  lineHeight: 1.2,
                                  color: checked ? 'var(--accent)' : 'var(--redborder)',
                                }}
                                title={`${caesura.type} caesura`}
                              >
                                ‖
                              </span>
                            )}

                            {/* A place to rule a foot boundary. */}
                            {!isLastInGroup && canDivide && (
                              <button
                                type="button"
                                className="foot-gap"
                                onClick={() => toggleDivision(m)}
                                title="Divide the feet here"
                                aria-label={`Place a foot boundary after ${syl.text}`}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* The bracket the student has drawn under this foot */}
                    <div
                      className={`foot-bracket ${!isFoot ? 'foot-bracket-open' : ''} ${
                        boundaryRight === true ? 'foot-bracket-right' : ''
                      } ${boundaryRight === false ? 'foot-bracket-wrong' : ''}`}
                      aria-hidden="true"
                    />
                    <span
                      className="slab-sm mt-2"
                      style={{ color: name ? undefined : 'var(--fg-faint)' }}
                    >
                      {isFoot ? (name ?? (complete ? 'not a foot' : '—')) : 'undivided'}
                    </span>
                  </div>

                  {/* The boundary itself — click to remove. */}
                  {group.closed && !isLast && (
                    <button
                      type="button"
                      className="foot-rule"
                      onClick={() => toggleDivision(group.endsAt)}
                      disabled={checked}
                      title={checked ? undefined : 'Remove this foot boundary'}
                      aria-label="Remove this foot boundary"
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Controls ── */}
          {!checked ? (
            <div className="flex flex-col items-center gap-4">
              <div className="flex flex-wrap items-center justify-center gap-4">
                <button type="button" className="btn btn-primary" onClick={check} disabled={!ready}>
                  Check my scansion
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setMarks(new Array(active.syllables.length).fill(null));
                    setDivisions([]);
                    setStudentElisions(new Set());
                    setSelected(null);
                  }}
                >
                  Clear
                </button>
              </div>
              {/* Three counters, because there are three halves to the task. */}
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1">
                <span
                  className="slab-sm"
                  style={{ color: allMarked ? 'var(--gilt)' : undefined }}
                >
                  {allMarked
                    ? '✓ every syllable marked'
                    : `${metricalIdx.filter((i) => marks[i] === null).length} syllables unmarked`}
                </span>
                <span
                  className="slab-sm"
                  style={{ color: dividedRight ? 'var(--gilt)' : undefined }}
                >
                  {dividedRight
                    ? '✓ six feet'
                    : `${divisions.length} of 5 divisions — click between syllables`}
                </span>
                <span className="slab-sm">
                  {studentElisions.size} elision{studentElisions.size === 1 ? '' : 's'} marked —
                  tap under a word
                </span>
              </div>
            </div>
          ) : (
            <Verdict
              active={active}
              marks={marks}
              metricalIdx={metricalIdx}
              scored={scored}
              divisionsRight={divisionsRight}
              divisionCount={correctDivisions.length}
              divisionsHit={divisions.filter((d) => correctDivisions.includes(d)).length}
              elisionsRight={elisionsRight}
              elisionCount={elidableIdx.length}
              wrongElisions={elidableIdx.filter((i) => !elisionCorrect(i))}
              studentElisions={studentElisions}
              onNext={next}
              onRetry={() => {
                setMarks(new Array(active.syllables.length).fill(null));
                setChecked(false);
              }}
            />
          )}
        </div>

        {/* ── Progress ── */}
        <div
          className="mx-auto mt-12 flex w-full max-w-[780px] flex-wrap items-center justify-between gap-6 border-t pt-7"
          style={{ borderColor: 'var(--rule)' }}
        >
          <div className="min-w-[240px] flex-1">
            <div className="mb-2.5 flex items-baseline justify-between gap-3">
              <span className="slab">Lines mastered</span>
              <span
                style={{
                  fontFamily: 'var(--font-latin)',
                  fontSize: '1.1875rem',
                  lineHeight: 1,
                  color: 'var(--fg)',
                }}
              >
                {mounted ? masteredCount : '—'} / {corpusTotal || '—'}
                {mounted && masteredCount > 0 && (
                  <span style={{ color: 'var(--fg-faint)' }}>
                    {' · '}
                    <Roman value={masteredCount} />
                  </span>
                )}
              </span>
            </div>
            <div className="meter">
              <span
                style={{
                  width: `${mounted && corpusTotal ? Math.round((masteredCount / corpusTotal) * 100) : 0}%`,
                }}
              />
            </div>
            {mounted && lineStats && (
              <p
                className="slab-sm mt-3"
                style={{ color: 'var(--fg-faint)' }}
              >
                this line · {lineStats.attempts} attempt{lineStats.attempts === 1 ? '' : 's'} ·{' '}
                best {Math.round(lineStats.bestAccuracy * 100)}%
                {lineStats.mastered && ' · mastered'}
              </p>
            )}
          </div>

          <div className="flex items-center gap-4">
            <label
              className="slab-sm flex cursor-pointer items-center gap-2"
              title="Mastered lines are retired by default. Tick this to see them again."
            >
              <input
                type="checkbox"
                checked={revisitMastered}
                onChange={(e) => setRevisitMastered(e.target.checked)}
                style={{ accentColor: 'var(--accent)' }}
              />
              Revisit mastered
            </label>
            {mounted && streak > 0 && (
              <div
                className="flex items-baseline gap-2.5 border px-4 py-2"
                style={{ borderColor: 'var(--accent)' }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '1.375rem',
                    lineHeight: 1,
                    color: 'var(--accent)',
                  }}
                >
                  {streak}
                </span>
                <span className="slab-sm" style={{ color: 'var(--accent)' }}>
                  day streak
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Badges ── */}
        {mounted && badges.some((b) => b.earned) && (
          <div
            className="mx-auto mt-7 flex w-full max-w-[780px] flex-wrap gap-2 border-t pt-6"
            style={{ borderColor: 'var(--hair)' }}
          >
            {badges.map((b) => (
              <span
                key={b.id}
                title={b.detail}
                className={`chip ${b.earned ? 'chip-gilt' : ''}`}
              >
                {b.earned ? '★' : '☆'} {b.label}
              </span>
            ))}
          </div>
        )}

        <SourceNote to="requiredReading">
          {corpusTotal ? corpusTotal.toLocaleString() : '6,500+'} lines drawn from the whole{' '}
          <em>Aeneid</em>. Nothing here is guessed: each line&rsquo;s scansion is the one foot
          division the metre permits, given its syllable count, its elisions and the syllables
          closed by two consonants. Lines that allow more than one reading are left out rather than
          resolved by preference — about a third of the poem. The final syllable of every line is
          anceps, so either mark is accepted there.
        </SourceNote>
      </div>
    </div>
  );
}

function Verdict({
  active,
  marks,
  metricalIdx,
  scored,
  divisionsRight,
  divisionCount,
  divisionsHit,
  elisionsRight,
  elisionCount,
  wrongElisions,
  studentElisions,
  onNext,
  onRetry,
}: {
  active: ScansionLine;
  marks: Mark[];
  metricalIdx: number[];
  scored: number;
  divisionsRight: boolean;
  divisionCount: number;
  divisionsHit: number;
  elisionsRight: number;
  elisionCount: number;
  wrongElisions: number[];
  studentElisions: Set<number>;
  onNext: () => void;
  onRetry: () => void;
}) {
  const wrong = metricalIdx.filter((i) => marks[i] !== active.syllables[i].quantity);
  const elisionsAllRight = elisionsRight === elisionCount;

  return (
    <div
      className="animate-in mx-auto w-full max-w-[780px] border-t pt-8"
      style={{ borderColor: 'var(--rule)' }}
    >
      <div className="mb-6 flex flex-wrap items-baseline gap-4">
        <span className="numeral" style={{ fontSize: '2.5rem' }}>
          {scored} / {metricalIdx.length}
        </span>
        <span className="slab">syllables correct</span>
        <span
          className="slab"
          style={{ color: divisionsRight ? 'var(--gilt)' : 'var(--accent)' }}
        >
          {divisionsRight
            ? '· feet divided correctly'
            : `· ${divisionsHit} of ${divisionCount} divisions right`}
        </span>
        {elisionCount > 0 && (
          <span
            className="slab"
            style={{ color: elisionsAllRight ? 'var(--gilt)' : 'var(--accent)' }}
          >
            {elisionsAllRight
              ? '· elisions spotted correctly'
              : `· ${elisionsRight} of ${elisionCount} elisions right`}
          </span>
        )}
        <div className="ml-auto flex flex-wrap gap-2">
          {active.feet.map((f, i) => (
            <span
              key={i}
              className="border px-2.5 py-1"
              style={{
                borderColor: f === 'dactyl' ? 'var(--redborder)' : 'var(--rule-strong)',
                color: f === 'dactyl' ? 'var(--accent)' : 'var(--fg-muted)',
                fontFamily: 'var(--font-sans)',
                fontSize: '0.75rem',
                lineHeight: 1,
              }}
            >
              {i + 1}. {f === 'dactyl' ? '— ˘ ˘' : '— —'}
            </span>
          ))}
        </div>
      </div>

      {wrong.length > 0 && (
        <ul className="mb-6 flex flex-col gap-3">
          {wrong.map((i) => (
            <li
              key={i}
              style={{
                fontFamily: 'var(--font-latin)',
                fontSize: '1.0625rem',
                lineHeight: 1.5,
                color: 'var(--ink2)',
              }}
            >
              <span style={{ color: 'var(--fg)', fontSize: '1.1875rem' }}>
                {active.syllables[i].text}
              </span>{' '}
              is <span style={{ color: 'var(--accent)' }}>{active.syllables[i].quantity}</span>
              {marks[i] && <> — you marked it {marks[i]}</>}. {explain(active, i)}
            </li>
          ))}
        </ul>
      )}

      {wrongElisions.length > 0 && (
        <ul className="mb-6 flex flex-col gap-3">
          {wrongElisions.map((i) => {
            const trulyElides = Boolean(active.syllables[i].elides);
            const claimed = studentElisions.has(i);
            return (
              <li
                key={i}
                style={{
                  fontFamily: 'var(--font-latin)',
                  fontSize: '1.0625rem',
                  lineHeight: 1.5,
                  color: 'var(--ink2)',
                }}
              >
                <span style={{ color: 'var(--fg)', fontSize: '1.1875rem' }}>
                  {active.syllables[i].text}
                </span>{' '}
                {trulyElides
                  ? 'elides into the next word'
                  : 'does not elide, despite the vowels on either side of the gap'}
                {claimed && !trulyElides && <> — you marked it as eliding</>}
                {!claimed && trulyElides && <> — you left it unmarked</>}.
              </li>
            );
          })}
        </ul>
      )}

      <p
        className="measure"
        style={{
          margin: 0,
          fontFamily: 'var(--font-latin)',
          fontSize: '1.0625rem',
          lineHeight: 1.55,
          color: 'var(--fg-muted)',
        }}
      >
        {active.notes}
        {active.caesurae.length > 0 && (
          <>
            {' '}
            Caesurae: {active.caesurae.map((c) => c.type).join(', ')}.
          </>
        )}
      </p>

      <div className="mt-7 flex flex-wrap gap-3">
        <button type="button" className="btn btn-primary" onClick={onNext}>
          Next line
        </button>
        <button type="button" className="btn" onClick={onRetry}>
          Try again
        </button>
      </div>
    </div>
  );
}

/**
 * Why a syllable has the quantity it has.
 *
 * The corpus is unmacronised, so quantity by nature is not visible in the
 * text. Where a syllable is not long by position or by diphthong, the honest
 * answer is that the metre settles it — which is exactly the reasoning a
 * student uses, and worth saying plainly rather than dressing up.
 */
function explain(line: ScansionLine, i: number): string {
  const syl = line.syllables[i];
  if (syl.anceps) {
    return 'It closes the line, so it is anceps: it counts long whatever its real quantity is.';
  }
  const hasMacron = /[āēīōūȳĀĒĪŌŪȲ]/.test(syl.text);
  const isDiphthong = /ae|au|oe/i.test(syl.text);

  if (syl.quantity === 'long') {
    if (isDiphthong) return 'It contains a diphthong, which is always long by nature.';
    if (hasMacron) return 'The text marks the vowel long with a macron, so it is long by nature.';
    const next = line.syllables.slice(i + 1).find((s) => s.text)?.text ?? '';
    if (/^[bcdfgjklmnpqrstvxz]{2}/i.test(next) || /[bcdfgjklmnpqrstvxz]{2}$/i.test(syl.text)) {
      return 'The vowel is followed by two or more consonants, so it is long by position.';
    }
    return 'Nothing in the spelling shows it, but no other foot division fits the line — so this syllable has to be long by nature.';
  }
  return 'It sits in a short position, and nothing closes it or makes it long by nature.';
}

function Tutorial() {
  const items: Array<{ title: string; body: React.ReactNode }> = [
    {
      title: 'The line',
      body: (
        <>
          Six feet. Each of the first four is either a <strong>dactyl</strong> (— ˘ ˘) or a{' '}
          <strong>spondee</strong> (— —). The fifth is almost always a dactyl; the sixth is always
          two syllables, and its last counts long whatever it really is (anceps).
        </>
      ),
    },
    {
      title: 'Long by nature',
      body: (
        <>
          A vowel is long by nature if it simply is long — which you cannot see unless the text
          marks it with a macron. Every <strong>diphthong</strong> (ae, au, ei, eu, oe, ui) is long
          by nature.
        </>
      ),
    },
    {
      title: 'Long by position',
      body: (
        <>
          A short vowel counts long if followed by <strong>two or more consonants</strong>, or by x
          or z — they may straddle a word boundary. A mute plus a liquid (pr, tr, cl, br…) may leave
          the syllable short. h never makes position; qu counts as one consonant.
        </>
      ),
    },
    {
      title: 'Elision',
      body: (
        <>
          A word ending in a vowel, a diphthong, or a vowel + m loses that final syllable before a
          word beginning with a vowel or h. It is not marked for you — tap the <strong>‿</strong>{' '}
          under a word&rsquo;s last syllable to claim it elides. An elision you have claimed does
          not count toward the feet, the same as the real answer will not.
        </>
      ),
    },
    {
      title: 'Caesura',
      body: (
        <>
          A word-break inside a foot. The <strong>penthemimeral</strong> (after the first syllable
          of foot 3) is much the commonest in Vergil; the hephthemimeral falls in foot 4, the
          trithemimeral in foot 2.
        </>
      ),
    },
    {
      title: 'A working method',
      body: (
        <>
          Look for elisions first — a vowel or -m before a word starting with a vowel or h — then
          mark everything long by position, then the diphthongs. Put a dactyl in the fifth foot
          and a spondee in the sixth. What remains usually has only one legal solution.
        </>
      ),
    },
  ];

  return (
    <div
      className="animate-in mb-10 border-y py-8"
      style={{ borderColor: 'var(--rule)' }}
    >
      <div className="rubric mb-6">How dactylic hexameter works</div>
      <div className="grid gap-x-10 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => (
          <div key={it.title}>
            <h3 className="slab-sm mb-2.5">{it.title}</h3>
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--font-latin)',
                fontSize: '1.0625rem',
                lineHeight: 1.55,
                color: 'var(--ink2)',
              }}
            >
              {it.body}
            </p>
          </div>
        ))}
      </div>
      <p
        className="mt-7"
        style={{
          margin: '1.75rem 0 0',
          fontFamily: 'var(--font-latin)',
          fontSize: '1.25rem',
          color: 'var(--fg)',
        }}
      >
        — ˘˘ | — ˘˘ | — — | — — | — ˘˘ | — ×
      </p>
    </div>
  );
}
