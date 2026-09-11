/**
 * Derived progress figures for the dashboard.
 *
 * The store records what happened; this works out what it means. It lives
 * apart from the component because most of it is arithmetic with edge cases
 * worth reading on their own — what counts as enough evidence to call a
 * skill weak, how a study calendar handles the week it starts mid-way
 * through — and none of it wants to be read interleaved with JSX.
 *
 * Everything here is pure and takes its inputs explicitly, so the dashboard
 * can call it inside `useMemo` and nothing depends on module state.
 */

import type {
  ExamResult,
  FrqResponse,
  QuizAttempt,
  ScansionAttempt,
  TranslationAttempt,
  VocabCard,
} from '@/store/useStore';
import type { QuestionType } from '@/data/types';
import { QUESTION_TYPE_LABELS } from '@/data/questions';

const DAY_MS = 86_400_000;
const iso = (d: Date) => d.toISOString().slice(0, 10);

/* ------------------------------------------------------------------ */
/* The study calendar                                                 */
/* ------------------------------------------------------------------ */

export interface CalendarDay {
  date: string;
  /** A day the student opened something — the same signal the streak counts. */
  studied: boolean;
  /** Graded pieces of work recorded that day, for the shading. */
  count: number;
  /** 0–4. 0 is untouched, 1 is "opened something", 2–4 scale with `count`. */
  level: 0 | 1 | 2 | 3 | 4;
  future: boolean;
}

/**
 * The last `weeks` weeks as columns of seven, ending with the week containing
 * today. Days after today are included in that final column and flagged
 * `future`, so the grid stays rectangular instead of losing its last column's
 * bottom corner — a ragged edge reads as missing data rather than as a week
 * that has not happened yet.
 *
 * Weeks start on Sunday, matching `StudyPlanSettings.activeDays`, where 0 is
 * Sunday.
 */
export function studyCalendar(
  studyDays: string[],
  events: Array<{ at: string }>,
  weeks = 14,
  today = new Date(),
): CalendarDay[][] {
  const studied = new Set(studyDays);

  const counts = new Map<string, number>();
  for (const e of events) {
    // `at` is a full ISO timestamp; the calendar is keyed by local date, so
    // it has to be re-derived rather than sliced off the UTC string — an
    // evening's work in a western timezone is stamped with tomorrow's UTC
    // date and would otherwise land in the wrong square.
    const day = iso(startOfDay(new Date(e.at)));
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }

  const end = startOfDay(today);
  // Wind forward to the Saturday closing this week, then back `weeks * 7`.
  const lastCell = new Date(end.getTime() + (6 - end.getDay()) * DAY_MS);
  const first = new Date(lastCell.getTime() - (weeks * 7 - 1) * DAY_MS);

  const grid: CalendarDay[][] = [];
  for (let w = 0; w < weeks; w += 1) {
    const column: CalendarDay[] = [];
    for (let d = 0; d < 7; d += 1) {
      const date = new Date(first.getTime() + (w * 7 + d) * DAY_MS);
      const key = iso(date);
      const count = counts.get(key) ?? 0;
      const didStudy = studied.has(key);
      column.push({
        date: key,
        studied: didStudy,
        count,
        level: level(didStudy, count),
        future: date.getTime() > end.getTime(),
      });
    }
    grid.push(column);
  }
  return grid;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function level(studied: boolean, count: number): CalendarDay['level'] {
  if (!studied && count === 0) return 0;
  if (count === 0) return 1;
  if (count < 5) return 2;
  if (count < 15) return 3;
  return 4;
}

/* ------------------------------------------------------------------ */
/* Weak spots                                                         */
/* ------------------------------------------------------------------ */

export interface WeakSpot {
  id: string;
  label: string;
  /** Accuracy as a percentage, or null where the measure is a raw count. */
  pct: number | null;
  /** Human-readable evidence: how much work this is drawn from. */
  detail: string;
  href: string;
  cta: string;
  /** Sorting key — lower is more urgent. */
  urgency: number;
}

/** "ablative absolute" -> "Ablative absolute". */
function sentenceCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Enough observations before a figure is allowed to call something weak.
 * Below this a run of bad luck reads as a weakness and sends the student to
 * drill something they are actually fine at.
 */
const MIN_SAMPLE = 6;

/**
 * The specific things a student is worst at, ranked, each pointing at the
 * drill that fixes it.
 *
 * The dashboard's skill meters answer "how am I doing"; this answers "what
 * should I do about it", which is the question that actually changes what a
 * student opens next. It draws on every kind of graded work rather than
 * multiple choice alone: a translation's missed grammar tags say more about
 * a shaky ablative than a category percentage ever will.
 */
export function weakSpots(input: {
  quizAttempts: QuizAttempt[];
  translationAttempts: TranslationAttempt[];
  scansionAttempts: ScansionAttempt[];
  vocab: Record<string, VocabCard>;
}): WeakSpot[] {
  const out: WeakSpot[] = [];

  /* Multiple choice, by question type. */
  const byType = new Map<QuestionType, { correct: number; total: number }>();
  for (const a of input.quizAttempts) {
    const cur = byType.get(a.type) ?? { correct: 0, total: 0 };
    cur.total += 1;
    if (a.correct) cur.correct += 1;
    byType.set(a.type, cur);
  }
  for (const [type, s] of byType) {
    if (s.total < MIN_SAMPLE) continue;
    const pct = Math.round((s.correct / s.total) * 100);
    if (pct >= 80) continue;
    out.push({
      id: `type-${type}`,
      label: QUESTION_TYPE_LABELS[type],
      pct,
      detail: `${s.correct} of ${s.total} right`,
      href: `/quiz?type=${type}`,
      cta: 'Drill it',
      urgency: pct,
    });
  }

  /* Translation, by the grammar tags of the segments actually missed. Unlike
     the counts above this has no denominator — a tag is recorded when it is
     missed, never when it is met — so it is ranked by how often it comes up
     rather than by a percentage, and says so. */
  const missed = new Map<string, number>();
  for (const a of input.translationAttempts) {
    for (const tag of a.missedTags) missed.set(tag, (missed.get(tag) ?? 0) + 1);
  }
  for (const [tag, n] of missed) {
    if (n < 3) continue;
    out.push({
      id: `tag-${tag}`,
      label: sentenceCase(tag.replace(/-/g, ' ')),
      pct: null,
      detail: `missed in ${n} translation segment${n === 1 ? '' : 's'}`,
      href: '/grammar',
      cta: 'Read it up',
      // Ranked alongside percentages by mapping "missed a lot" onto the same
      // scale: three misses sits around 70, ten or more down at 40.
      urgency: Math.max(40, 76 - n * 2),
    });
  }

  /* Scansion, over the most recent attempts only — an early run of bad
     lines should not keep a student who has since got the hang of it
     pinned to the top of this list. */
  const recentScansion = input.scansionAttempts.slice(-40);
  const scanned = recentScansion.reduce((n, a) => n + a.total, 0);
  const scanRight = recentScansion.reduce((n, a) => n + a.correct, 0);
  if (recentScansion.length >= MIN_SAMPLE && scanned > 0) {
    const pct = Math.round((scanRight / scanned) * 100);
    if (pct < 80) {
      out.push({
        id: 'scansion',
        label: 'Marking quantities',
        pct,
        detail: `${pct}% of syllables right across your last ${recentScansion.length} lines`,
        href: '/scansion',
        cta: 'Scan a line',
        urgency: pct,
      });
    }
  }

  /* Vocabulary that keeps slipping: cards lapsed twice or more are the ones
     costing the most review time for the least retention. */
  const leeches = Object.values(input.vocab).filter((c) => c.lapses >= 2);
  if (leeches.length >= 3) {
    out.push({
      id: 'leeches',
      label: 'Words that keep slipping',
      pct: null,
      detail: `${leeches.length} cards you have forgotten twice or more`,
      href: '/vocab',
      cta: 'Review them',
      urgency: Math.max(45, 70 - leeches.length),
    });
  }

  return out.sort((a, b) => a.urgency - b.urgency).slice(0, 5);
}

/* ------------------------------------------------------------------ */
/* Vocabulary forecast                                                */
/* ------------------------------------------------------------------ */

export interface VocabForecast {
  /** Cards due on or before today. */
  dueNow: number;
  /** Cards falling due on each of the next seven days, today first. */
  week: number[];
  /** Cards answered well enough to be on a three-week interval or longer. */
  mature: number;
  /** In rotation but not yet mature. */
  learning: number;
  total: number;
}

/**
 * What the vocabulary queue is about to do. The dashboard used to show only
 * "cards due today", which is the one number that tells a student nothing
 * about whether tomorrow is a five-minute review or a fifty-card wall.
 */
export function vocabForecast(
  vocab: Record<string, VocabCard>,
  today = new Date(),
): VocabForecast {
  const start = startOfDay(today);
  const todayIso = iso(start);
  const week = new Array(7).fill(0) as number[];
  let dueNow = 0;
  let mature = 0;

  const cards = Object.values(vocab);
  for (const c of cards) {
    if (c.due <= todayIso) dueNow += 1;
    else {
      const days = Math.round(
        (new Date(c.due + 'T00:00:00').getTime() - start.getTime()) / DAY_MS,
      );
      if (days >= 1 && days <= 6) week[days] += 1;
    }
    if (c.interval >= 21) mature += 1;
  }
  week[0] = dueNow;

  return { dueNow, week, mature, learning: cards.length - mature, total: cards.length };
}

/* ------------------------------------------------------------------ */
/* Recent work                                                        */
/* ------------------------------------------------------------------ */

export interface ActivityItem {
  id: string;
  at: string;
  label: string;
  detail: string;
  href: string;
}

/**
 * The last few pieces of work, newest first, across every kind of drill.
 *
 * Quiz attempts are deliberately grouped by day rather than listed one by
 * one: a single session is thirty of them, and thirty rows saying "one
 * question" would push everything else off the list without saying anything
 * a single "30 questions, 24 right" does not.
 */
export function recentActivity(input: {
  quizAttempts: QuizAttempt[];
  translationAttempts: TranslationAttempt[];
  examResults: ExamResult[];
  scansionAttempts: ScansionAttempt[];
  frqResponses: FrqResponse[];
  limit?: number;
}): ActivityItem[] {
  const items: ActivityItem[] = [];

  const quizByDay = new Map<string, { correct: number; total: number; at: string }>();
  for (const a of input.quizAttempts) {
    const day = iso(startOfDay(new Date(a.at)));
    const cur = quizByDay.get(day) ?? { correct: 0, total: 0, at: a.at };
    cur.total += 1;
    if (a.correct) cur.correct += 1;
    if (a.at > cur.at) cur.at = a.at;
    quizByDay.set(day, cur);
  }
  for (const [day, s] of quizByDay) {
    items.push({
      id: `quiz-${day}`,
      at: s.at,
      label: 'Quiz Engine',
      detail: `${s.total} question${s.total === 1 ? '' : 's'} · ${s.correct} right`,
      href: '/quiz',
    });
  }

  const scanByDay = new Map<string, { lines: number; correct: number; total: number; at: string }>();
  for (const a of input.scansionAttempts) {
    const day = iso(startOfDay(new Date(a.at)));
    const cur = scanByDay.get(day) ?? { lines: 0, correct: 0, total: 0, at: a.at };
    cur.lines += 1;
    cur.correct += a.correct;
    cur.total += a.total;
    if (a.at > cur.at) cur.at = a.at;
    scanByDay.set(day, cur);
  }
  for (const [day, s] of scanByDay) {
    const pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
    items.push({
      id: `scan-${day}`,
      at: s.at,
      label: 'Scansion Lab',
      detail: `${s.lines} line${s.lines === 1 ? '' : 's'} · ${pct}% of syllables`,
      href: '/scansion',
    });
  }

  for (const a of input.translationAttempts) {
    items.push({
      id: `tr-${a.id}`,
      at: a.at,
      label: 'Translate',
      detail: `${a.score} of ${a.maxScore} points${a.gradedBy === 'ai' ? '' : ' · self-scored'}`,
      href: '/translate',
    });
  }

  for (const r of input.examResults) {
    items.push({
      id: `exam-${r.id}`,
      at: r.at,
      label: 'Practice exam',
      detail: `MCQ ${r.mcqCorrect}/${r.mcqTotal} · FRQ ${r.frqPoints}/${r.frqMax}`,
      href: '/exam',
    });
  }

  for (const f of input.frqResponses.filter((f) => f.submitted)) {
    const points = Object.values(f.selfScore).reduce((n, p) => n + p, 0);
    items.push({
      id: `frq-${f.id}`,
      at: f.at,
      label: 'FRQ Workshop',
      detail: `${points} point${points === 1 ? '' : 's'} scored`,
      href: '/frq',
    });
  }

  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, input.limit ?? 6);
}

/* ------------------------------------------------------------------ */
/* The plan                                                           */
/* ------------------------------------------------------------------ */

/**
 * How many of the student's own chosen study days are left before the exam.
 *
 * The bare day count flatters: 120 days sounds like plenty, and at three
 * days a week it is fifty-one sessions. That is the number that should
 * govern how a student paces themselves, so it is the one the countdown
 * carries underneath.
 */
export function sessionsRemaining(
  activeDays: number[],
  examDate: string,
  from = new Date(),
): number {
  if (activeDays.length === 0) return 0;
  const wanted = new Set(activeDays);
  const exam = new Date(examDate + 'T00:00:00');
  let n = 0;
  const d = startOfDay(from);
  // Bounded by the loop condition, and the exam is a fixed date a couple of
  // years out at most — but capped anyway so a corrupted date in storage
  // cannot spin here.
  for (let guard = 0; d.getTime() <= exam.getTime() && guard < 4000; guard += 1) {
    if (wanted.has(d.getDay())) n += 1;
    d.setDate(d.getDate() + 1);
  }
  return n;
}
