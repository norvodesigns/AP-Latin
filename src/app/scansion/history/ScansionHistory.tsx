'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useStore, scansionStatsByLine, type ScansionAttempt } from '@/store/useStore';
import { loadBook, parseLineId } from '@/data/scansionCorpus';
import { BackLink, Empty, Page, PageHeader, Section, SkillMeter } from '@/components/ui';
import { localDay, dayNumber } from '@/lib/daily';
import {
  accuracy,
  answerFor,
  explainQuantity,
  gradeScansion,
  latestAttemptIds,
  tryNumbers,
  workForAttempt,
  type GradedScansion,
  type ScansionWork,
} from '@/lib/scansionResult';
import type { ScansionLine } from '@/data/types';

type Filter = 'all' | 'missed' | 'perfect';

const PAGE = 40;
/** The scans the "where the points go" breakdown is drawn from. */
const RECENT = 40;

const latin: CSSProperties = { fontFamily: 'var(--font-latin)' };
const prose: CSSProperties = { ...latin, fontSize: '1.0625rem', lineHeight: 1.55, color: 'var(--ink2)' };

const perfect = (a: ScansionAttempt) => a.total > 0 && a.correct === a.total;

/** "Today", "Yesterday", or the date written out. */
function dayLabel(day: string, today: string): string {
  const diff = dayNumber(today) - dayNumber(day);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return new Date(`${day}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    ...(diff > 300 ? { year: 'numeric' } : {}),
  });
}

function timeLabel(at: string): string {
  return new Date(at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

/**
 * Every line the student has checked in the Scansion Lab, newest first, and
 * any one of them opened again with the marks they made and the answer.
 */
export default function ScansionHistory() {
  const params = useSearchParams();
  const selectedId = params.get('scan');

  const attempts = useStore((s) => s.scansionAttempts);
  const drafts = useStore((s) => s.scansionDrafts);
  const markStudied = useStore((s) => s.markStudied);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    markStudied();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [filter, setFilter] = useState<Filter>('all');
  const [shown, setShown] = useState(PAGE);

  const all = useMemo(() => (mounted ? attempts : []), [mounted, attempts]);
  const newestFirst = useMemo(() => [...all].reverse(), [all]);
  const tries = useMemo(() => tryNumbers(all), [all]);
  const latest = useMemo(() => latestAttemptIds(all), [all]);
  const selected = selectedId ? all.find((a) => a.id === selectedId) ?? null : null;

  const filtered = useMemo(
    () =>
      newestFirst.filter((a) =>
        filter === 'all' ? true : filter === 'perfect' ? perfect(a) : !perfect(a),
      ),
    [newestFirst, filter],
  );
  const visible = filtered.slice(0, shown);

  /* The corpus books the page needs: for the rows on screen, the recent
     scans the breakdown reads, and the scan that is open. */
  const [books, setBooks] = useState<Record<number, ScansionLine[]>>({});
  const [failedBooks, setFailedBooks] = useState<number[]>([]);
  const wanted = useMemo(() => {
    const set = new Set<number>();
    const add = (a: ScansionAttempt) => {
      const p = parseLineId(a.lineId);
      if (p) set.add(p.book);
    };
    visible.forEach(add);
    newestFirst.slice(0, RECENT).forEach(add);
    if (selected) add(selected);
    return [...set].sort((a, b) => a - b);
  }, [visible, newestFirst, selected]);
  const wantedKey = wanted.join(',');

  useEffect(() => {
    let live = true;
    for (const b of wanted) {
      if (books[b]) continue;
      loadBook(b)
        .then((ls) => live && setBooks((prev) => ({ ...prev, [b]: ls })))
        .catch(() => live && setFailedBooks((prev) => (prev.includes(b) ? prev : [...prev, b])));
    }
    return () => {
      live = false;
    };
    // `books` is read only to skip what is already in; `wantedKey` stands for `wanted`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantedKey]);

  const lineIndex = useMemo(() => {
    const m = new Map<string, ScansionLine>();
    for (const ls of Object.values(books)) for (const l of ls) m.set(l.id, l);
    return m;
  }, [books]);

  const workOf = (a: ScansionAttempt): ScansionWork | null => {
    const line = lineIndex.get(a.lineId);
    if (!line) return null;
    return workForAttempt(a, line, { latestOnLine: latest.has(a.id), draft: drafts[a.lineId] });
  };

  if (!mounted) {
    return (
      <Page>
        <PageHeader eyebrow="Scansion Lab" title="Your scans" />
      </Page>
    );
  }

  if (selectedId) {
    return (
      <ScanResult
        attempt={selected}
        line={selected ? lineIndex.get(selected.lineId) : undefined}
        lineFailed={selected ? failedBooks.includes(parseLineId(selected.lineId)?.book ?? -1) : false}
        work={selected ? workOf(selected) : null}
        tryNumber={selected ? tries.get(selected.id) ?? 1 : 1}
        sameLine={selected ? all.filter((a) => a.lineId === selected.lineId) : []}
      />
    );
  }

  if (all.length === 0) {
    return (
      <Page>
        <BackLink href="/scansion">Scansion Lab</BackLink>
        <div className="mt-6">
          <PageHeader eyebrow="Scansion Lab" title="Your scans" />
        </div>
        <Empty
          title="No scans yet"
          body="Check a line in the Scansion Lab and it appears here, with the marks you made and what was right."
          action={
            <Link href="/scansion" className="btn btn-primary">
              Scan a line
            </Link>
          }
        />
      </Page>
    );
  }

  return (
    <Page>
      <BackLink href="/scansion">Scansion Lab</BackLink>
      <div className="mt-6">
        <PageHeader
          eyebrow="Scansion Lab"
          title="Your scans"
          lede="Every line you have checked, newest first. Open one to see the marks you made beside the right scansion."
          actions={
            <Link href="/scansion" className="btn btn-primary">
              Scan a line
            </Link>
          }
        />
      </div>

      <Summary attempts={all} />
      <Breakdown recent={newestFirst.slice(0, RECENT)} lineIndex={lineIndex} workOf={workOf} />

      <Section
        title="Scans"
        className="mt-12"
        aside={
          <div className="flex flex-wrap gap-2" role="group" aria-label="Show">
            {(
              [
                ['all', 'All'],
                ['missed', 'Not perfect'],
                ['perfect', 'Perfect'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`chip ${filter === id ? 'chip-on' : ''}`}
                aria-pressed={filter === id}
                onClick={() => {
                  setFilter(id);
                  setShown(PAGE);
                }}
              >
                {label}
              </button>
            ))}
          </div>
        }
      >
        {visible.length === 0 ? (
          <p style={prose}>
            {filter === 'perfect' ? 'No perfect scans yet.' : 'Every scan so far is perfect.'}
          </p>
        ) : (
          <DayGroups attempts={visible} lineIndex={lineIndex} tries={tries} />
        )}
        {filtered.length > visible.length && (
          <div className="mt-6">
            <button type="button" className="btn" onClick={() => setShown((n) => n + PAGE)}>
              Show {Math.min(PAGE, filtered.length - visible.length)} more
            </button>
          </div>
        )}
      </Section>
    </Page>
  );
}

/* ------------------------------------------------------------------ */
/* The list                                                            */
/* ------------------------------------------------------------------ */

function Summary({ attempts }: { attempts: ScansionAttempt[] }) {
  const stats = scansionStatsByLine(attempts);
  const mastered = [...stats.values()].filter((s) => s.mastered).length;
  const recent = attempts.slice(-20);
  const right = recent.reduce((n, a) => n + a.correct, 0);
  const total = recent.reduce((n, a) => n + a.total, 0);
  const figures: Array<[string, string]> = [
    [attempts.length.toLocaleString(), attempts.length === 1 ? 'scan' : 'scans'],
    [stats.size.toLocaleString(), stats.size === 1 ? 'line' : 'different lines'],
    [mastered.toLocaleString(), 'mastered'],
    [total > 0 ? `${Math.round((right / total) * 100)}%` : '—', `right, last ${recent.length}`],
  ];
  return (
    <dl className="grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-4">
      {figures.map(([value, caption]) => (
        // The caption comes first for a screen reader and sits under the figure on screen.
        <div key={caption} className="flex flex-col-reverse">
          <dt className="slab-sm mt-1.5">{caption}</dt>
          <dd className="numeral" style={{ fontSize: '2.25rem', margin: 0 }}>
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Which of the three halves of scanning costs the most, over recent scans
 * whose marks were kept — the part of the results worth acting on.
 */
function Breakdown({
  recent,
  lineIndex,
  workOf,
}: {
  recent: ScansionAttempt[];
  lineIndex: Map<string, ScansionLine>;
  workOf: (a: ScansionAttempt) => ScansionWork | null;
}) {
  let n = 0;
  const sum = { syl: 0, sylT: 0, ft: 0, ftT: 0, el: 0, elT: 0 };
  for (const a of recent) {
    const line = lineIndex.get(a.lineId);
    const work = workOf(a);
    if (!line || !work) continue;
    const s = gradeScansion(line, work).score;
    n += 1;
    sum.syl += s.syllables;
    sum.sylT += s.syllablesTotal;
    sum.ft += s.boundaries;
    sum.ftT += s.boundariesTotal;
    sum.el += s.elisions;
    sum.elT += s.elisionsTotal;
  }
  if (n === 0) return null;
  const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 100);
  const rows = [
    { label: 'Syllable quantities', pct: pct(sum.syl, sum.sylT) },
    { label: 'Foot divisions', pct: pct(sum.ft, sum.ftT) },
    { label: 'Elisions', pct: pct(sum.el, sum.elT) },
  ];
  const weakest = Math.min(...rows.map((r) => r.pct));
  return (
    <Section title="Where the points go" className="mt-12">
      <div className="grid gap-6 sm:grid-cols-3">
        {rows.map((r) => (
          <SkillMeter key={r.label} label={r.label} pct={r.pct} weak={r.pct === weakest && r.pct < 90} />
        ))}
      </div>
      <p className="slab-sm mt-4" style={{ color: 'var(--fg-faint)' }}>
        Across your last {n} scan{n === 1 ? '' : 's'} with marks kept
      </p>
    </Section>
  );
}

function DayGroups({
  attempts,
  lineIndex,
  tries,
}: {
  attempts: ScansionAttempt[];
  lineIndex: Map<string, ScansionLine>;
  tries: Map<string, number>;
}) {
  const today = localDay();
  const groups: Array<{ day: string; items: ScansionAttempt[] }> = [];
  for (const a of attempts) {
    const day = localDay(new Date(a.at));
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(a);
    else groups.push({ day, items: [a] });
  }
  return (
    <div className="flex flex-col gap-8">
      {groups.map((g) => (
        <div key={g.day}>
          <h3 className="slab-sm mb-1" style={{ color: 'var(--fg-muted)' }}>
            {dayLabel(g.day, today)}
          </h3>
          <ul>
            {g.items.map((a) => (
              <Row key={a.id} attempt={a} line={lineIndex.get(a.lineId)} tryNumber={tries.get(a.id) ?? 1} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function Row({ attempt, line, tryNumber }: { attempt: ScansionAttempt; line?: ScansionLine; tryNumber: number }) {
  const p = parseLineId(attempt.lineId);
  const citation = line?.citation ?? (p ? `Aeneid ${p.book}.${p.line}` : attempt.lineId);
  const isPerfect = perfect(attempt);
  return (
    <li className="border-b" style={{ borderColor: 'var(--hair)' }}>
      <Link
        href={`/scansion/history?scan=${encodeURIComponent(attempt.id)}`}
        className="group flex items-baseline gap-4 py-3.5"
      >
        <span className="min-w-0 flex-1">
          <span className="block group-hover:underline" style={{ ...latin, fontSize: '1.1875rem', color: 'var(--fg)' }}>
            {citation}
          </span>
          <span
            className="mt-0.5 block truncate"
            style={{ ...latin, fontStyle: 'italic', fontSize: '1rem', color: 'var(--fg-muted)', minHeight: '1.5em' }}
          >
            {line?.latin ?? ''}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span
            className="block"
            style={{ ...latin, fontSize: '1.1875rem', color: isPerfect ? 'var(--gilt)' : 'var(--fg)' }}
          >
            {isPerfect && <span aria-label="perfect">★ </span>}
            {attempt.correct} / {attempt.total}
          </span>
          <span className="slab-sm mt-0.5 block" style={{ color: 'var(--fg-faint)' }}>
            {timeLabel(attempt.at)}
            {tryNumber > 1 && ` · ${ordinal(tryNumber)} try`}
          </span>
        </span>
      </Link>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* One scan                                                            */
/* ------------------------------------------------------------------ */

function ScanResult({
  attempt,
  line,
  lineFailed,
  work,
  tryNumber,
  sameLine,
}: {
  attempt: ScansionAttempt | null;
  line?: ScansionLine;
  lineFailed: boolean;
  work: ScansionWork | null;
  tryNumber: number;
  sameLine: ScansionAttempt[];
}) {
  if (!attempt) {
    return (
      <Page>
        <BackLink href="/scansion/history">All your scans</BackLink>
        <div className="mt-6">
          <Empty
            title="That scan isn’t in your history"
            body="It may have been made on another device that hasn’t synced yet, or it was one of the oldest scans, which make room for new ones after a thousand."
          />
        </div>
      </Page>
    );
  }

  const p = parseLineId(attempt.lineId);
  const citation = line?.citation ?? (p ? `Aeneid ${p.book}.${p.line}` : attempt.lineId);
  const when = new Date(attempt.at).toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
  const graded = line && work ? gradeScansion(line, work) : null;
  const pct = Math.round(accuracy(attempt) * 100);

  return (
    <Page>
      <BackLink href="/scansion/history">All your scans</BackLink>
      <div className="mt-6">
        <PageHeader
          eyebrow={`Scanned ${when}${tryNumber > 1 ? ` · ${ordinal(tryNumber)} try` : ''}`}
          title={citation}
          lede={line ? <em>{line.latin}</em> : undefined}
          actions={
            <Link href={`/scansion?line=${encodeURIComponent(attempt.lineId)}`} className="btn btn-primary">
              Scan it again
            </Link>
          }
        />
      </div>

      <div className="mb-10 flex flex-wrap items-baseline gap-x-5 gap-y-2">
        <span className="numeral" style={{ fontSize: '2.5rem', color: pct === 100 ? 'var(--gilt)' : undefined }}>
          {attempt.correct} / {attempt.total}
        </span>
        <span className="slab">{pct === 100 ? 'perfect' : `${pct}% right`}</span>
        {graded && (
          <span className="slab-sm" style={{ color: 'var(--fg-muted)' }}>
            Syllables {graded.score.syllables} of {graded.score.syllablesTotal} · Feet{' '}
            {graded.score.boundaries} of {graded.score.boundariesTotal} · Elisions {graded.score.elisions} of{' '}
            {graded.score.elisionsTotal}
          </span>
        )}
      </div>

      {!line ? (
        <p style={prose}>
          {lineFailed
            ? 'The line could not be loaded, so only the score is shown. Check your connection and try again.'
            : 'Loading the line…'}
        </p>
      ) : (
        <>
          {graded && work ? (
            <Section title="Your scansion">
              <LineView line={line} work={work} graded={graded} />
            </Section>
          ) : (
            <p className="mb-10" style={prose}>
              Lectio didn&rsquo;t keep the marks for scans made before the history was added, so only the score
              is shown for this one. The right scansion is below.
            </p>
          )}

          <Section title="The scansion" className={graded ? 'mt-12' : ''}>
            <LineView line={line} work={answerFor(line)} />
            <p className="mt-6" style={{ ...prose, color: 'var(--fg-muted)' }}>
              {line.feet.map((f) => (f === 'dactyl' ? 'D' : 'S')).join(' ')}
              {line.caesurae.length > 0 && <> · caesurae: {line.caesurae.map((c) => c.type).join(', ')}</>}
            </p>
          </Section>

          {graded && work && <Mistakes line={line} work={work} graded={graded} />}
        </>
      )}

      {sameLine.length > 1 && (
        <Section title="Every scan of this line" className="mt-12">
          <ul className="flex flex-wrap gap-2">
            {sameLine.map((a, i) => (
              <li key={a.id}>
                <Link
                  href={`/scansion/history?scan=${encodeURIComponent(a.id)}`}
                  className={`chip ${a.id === attempt.id ? 'chip-on' : ''} ${perfect(a) ? 'chip-gilt' : ''}`}
                  aria-current={a.id === attempt.id ? 'page' : undefined}
                >
                  {ordinal(i + 1)} · {a.correct} / {a.total}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <div className="mt-12 flex flex-wrap gap-3">
        <Link href={`/scansion?line=${encodeURIComponent(attempt.lineId)}`} className="btn btn-primary">
          Scan it again
        </Link>
        <Link href="/scansion/history" className="btn">
          All your scans
        </Link>
      </div>
    </Page>
  );
}

/** What went wrong, one sentence each: quantities, boundaries, elisions. */
function Mistakes({ line, work, graded }: { line: ScansionLine; work: ScansionWork; graded: GradedScansion }) {
  const syl = (i: number) => (
    <span style={{ ...latin, color: 'var(--fg)', fontSize: '1.1875rem' }}>{line.syllables[i].text}</span>
  );
  const wrongQuantities = graded.metrical.filter((i) => graded.syllables[i] !== 'ok');
  const extraBoundaries = work.divisions.filter((d) => !graded.boundaryRight(d));
  const missedBoundaries = graded.correctDivisions.filter((d) => !work.divisions.includes(d));
  const wrongJunctions = graded.junctions.filter((j) => j.claimed !== j.elides);

  if (!wrongQuantities.length && !extraBoundaries.length && !missedBoundaries.length && !wrongJunctions.length) {
    return (
      <p className="mt-10" style={prose}>
        Every quantity, every foot boundary and every elision right.
      </p>
    );
  }

  return (
    <Section title="What to look at" className="mt-12">
      <ul className="flex flex-col gap-3" style={prose}>
        {wrongQuantities.map((i) => (
          <li key={`q${i}`}>
            {syl(i)} is <span style={{ color: 'var(--accent)' }}>{line.syllables[i].quantity}</span>
            {work.marks[i] ? <> — you marked it {work.marks[i]}</> : <> — you left it unmarked</>}.{' '}
            {explainQuantity(line, i)}
          </li>
        ))}
        {extraBoundaries.map((d) => (
          <li key={`x${d}`}>
            No foot ends after {syll(line, d)}, but you ruled a boundary there.
          </li>
        ))}
        {missedBoundaries.map((d) => (
          <li key={`m${d}`}>
            A foot ends after {syll(line, d)}.
          </li>
        ))}
        {wrongJunctions.map((j) => (
          <li key={`e${j.at}`}>
            {syl(j.at)}{' '}
            {j.elides
              ? 'elides into the next word — you left it unmarked.'
              : 'does not elide — you marked it as eliding.'}
          </li>
        ))}
      </ul>
    </Section>
  );
}

function syll(line: ScansionLine, i: number) {
  return <span style={{ ...latin, color: 'var(--fg)', fontSize: '1.1875rem' }}>{line.syllables[i]?.text}</span>;
}

/* ------------------------------------------------------------------ */
/* A line drawn read-only                                              */
/* ------------------------------------------------------------------ */

/**
 * The line split into the feet `work` divides it into, with its marks hung
 * above the syllables. Given `graded`, it is the student's own work coloured
 * right and wrong; without, it is the answer, with each foot named.
 */
function LineView({ line, work, graded }: { line: ScansionLine; work: ScansionWork; graded?: GradedScansion }) {
  const claimed = new Set(work.elisions);
  // The student's own view of which syllables elide; for the answer, the real one.
  const elided = (i: number) => claimed.has(i);
  const cuts = new Set(work.divisions);

  const groups: Array<{ syllables: number[]; endsAt: number; closed: boolean }> = [];
  let current: number[] = [];
  let lastCounted = -1;
  for (let i = 0; i < line.syllables.length; i += 1) {
    current.push(i);
    if (elided(i)) continue;
    lastCounted = i;
    if (cuts.has(i)) {
      while (i + 1 < line.syllables.length && elided(i + 1)) {
        i += 1;
        current.push(i);
      }
      groups.push({ syllables: current, endsAt: lastCounted, closed: true });
      current = [];
    }
  }
  if (current.length) groups.push({ syllables: current, endsAt: lastCounted, closed: false });

  const metrical = line.syllables.map((s, i) => (s.elides ? -1 : i)).filter((i) => i >= 0);
  const caesuraAfter = new Set(line.caesurae.map((c) => metrical[c.afterSyllable]));

  const tone = (ok: boolean | null) => (ok === null ? 'var(--fg)' : ok ? 'var(--correct)' : 'var(--incorrect)');

  const footName = (g: (typeof groups)[number]) => {
    const shape = g.syllables.filter((i) => !elided(i)).map((i) => work.marks[i]);
    if (shape.length === 3 && shape[0] === 'long' && shape[1] === 'short' && shape[2] === 'short') return 'Dactyl';
    if (shape.length === 2 && shape[0] === 'long' && shape[1] === 'long') return 'Spondee';
    return null;
  };

  return (
    <div className="flex flex-wrap items-start gap-y-6" role="img" aria-label={describe(line, work, graded)}>
      {groups.map((g, gi) => {
        const boundaryOk = g.closed && graded ? graded.boundaryRight(g.endsAt) : null;
        const isLast = gi === groups.length - 1;
        return (
          <div key={gi} className="flex items-stretch">
            <div className="flex flex-col">
              <div className="flex items-start">
                {g.syllables.map((i) => {
                  const s = line.syllables[i];
                  const isElided = elided(i);
                  const result = graded?.syllables[i];
                  // Right or wrong, from the student's point of view: a claimed
                  // elision is right if it truly elides; a counted syllable by
                  // its grade.
                  const missedElision = Boolean(graded && !isElided && s.elides);
                  const ok = !graded
                    ? null
                    : isElided
                      ? Boolean(s.elides)
                      : missedElision
                        ? false
                        : result === 'ok'
                          ? true
                          : result === 'blank'
                            ? null
                            : false;
                  const mark = work.marks[i];
                  const markText = isElided
                    ? ''
                    : !graded && s.anceps
                      ? '×'
                      : mark === 'long'
                        ? '—'
                        : mark === 'short'
                          ? '˘'
                          : graded
                            ? '?'
                            : '';
                  const wordGap = i !== 0 && s.startsWord !== false;
                  return (
                    <div key={i} className="flex items-start">
                      <div className="flex flex-col items-center" style={{ paddingLeft: wordGap ? '10px' : 0 }}>
                        <span
                          aria-hidden="true"
                          style={{
                            height: '22px',
                            fontFamily: 'var(--font-sans)',
                            fontSize: '1.125rem',
                            lineHeight: 1,
                            color: graded ? (ok === null ? 'var(--fg-faint)' : tone(ok)) : 'var(--accent)',
                          }}
                        >
                          {markText}
                        </span>
                        <span
                          style={{
                            ...latin,
                            fontSize: 'calc(1.625rem * var(--ls, 1))',
                            lineHeight: 1.2,
                            padding: '0 3px',
                            color: isElided
                              ? graded
                                ? tone(ok)
                                : 'var(--fg-faint)'
                              : graded
                                ? ok === null
                                  ? 'var(--fg-faint)'
                                  : tone(ok)
                                : 'var(--fg)',
                            textDecoration: isElided ? 'line-through' : undefined,
                          }}
                        >
                          {s.text}
                        </span>
                        {/* An elision the student missed, flagged under the word. */}
                        <span
                          aria-hidden="true"
                          style={{
                            height: '12px',
                            fontSize: '1rem',
                            lineHeight: '8px',
                            color: 'var(--incorrect)',
                          }}
                        >
                          {missedElision ? '‿' : ''}
                        </span>
                      </div>
                      {caesuraAfter.has(i) && !graded && (
                        <span
                          aria-hidden="true"
                          className="px-0.5"
                          style={{ fontFamily: 'var(--font-sans)', fontSize: '1.5rem', lineHeight: 1.9, color: 'var(--accent)' }}
                          title="caesura"
                        >
                          ‖
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div
                className={`foot-bracket ${g.closed || isLast ? '' : 'foot-bracket-open'}`}
                style={{ marginTop: '4px' }}
                aria-hidden="true"
              />
              <span className="slab-sm mt-1.5" style={{ color: 'var(--fg-faint)', minHeight: '1.2em' }}>
                {graded ? (footName(g) ?? (g.closed || isLast ? 'not a foot' : '')) : footName(g)}
              </span>
            </div>
            {g.closed && !isLast && (
              <span
                aria-hidden="true"
                className="mx-1.5 self-stretch"
                style={{
                  width: '2px',
                  borderRadius: '2px',
                  background: boundaryOk === null ? 'var(--accent)' : tone(boundaryOk),
                  margin: '4px 7px 30px',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/** The line read out for a screen reader: feet, marks and what was right. */
function describe(line: ScansionLine, work: ScansionWork, graded?: GradedScansion): string {
  const parts = line.syllables.map((s, i) => {
    if (work.elisions.includes(i)) return `${s.text} elided`;
    const m = work.marks[i];
    const verdict = graded ? (graded.syllables[i] === 'ok' ? ', right' : graded.syllables[i] === 'blank' ? ', unmarked' : ', wrong') : '';
    const bar = work.divisions.includes(i) ? ' |' : '';
    return `${s.text}${m ? ` ${m}` : ''}${verdict}${bar}`;
  });
  return `${graded ? 'Your scansion' : 'The scansion'}: ${parts.join(' ')}`;
}
