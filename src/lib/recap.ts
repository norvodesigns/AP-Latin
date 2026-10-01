/**
 * The week in review: what a student did in the last seven days, beside the
 * seven before, worked out from progress that already syncs. Days follow
 * the store's convention (the UTC date, `toISOString().slice(0, 10)`), the
 * same one study days and streaks use, so the numbers agree with them. The
 * app computes the same (LectioCore `Recap`), held to this by a parity
 * fixture.
 *
 * Study time is not here: minutes are kept per device, not in the synced
 * document, so a recap on one device could not count another's.
 */

import type { SyncableData } from '@/store/useStore';
import { shiftDay } from '@/lib/daily';

export interface RecapCounts {
  /** Days with any study. */
  days: number;
  /** Course lessons finished for the first time. */
  lessons: number;
  /** Quiz questions answered, and how many right. */
  quiz: number;
  quizRight: number;
  /** Flashcards last reviewed in the window. */
  cards: number;
  sententiae: number;
  scansion: number;
  translations: number;
}

export interface Recap {
  /** First and last day of the week, inclusive. */
  from: string;
  to: string;
  week: RecapCounts;
  /** The seven days before. */
  before: RecapCounts;
}

/** Today, as the store writes days. */
export function utcToday(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function counts(data: SyncableData, from: string, to: string): RecapCounts {
  const inside = (at: string | undefined) => {
    const d = at?.slice(0, 10);
    return d !== undefined && d.length === 10 && d >= from && d <= to;
  };
  const quiz = (data.quizAttempts ?? []).filter((a) => inside(a.at));
  return {
    days: new Set((data.studyDays ?? []).filter(inside)).size,
    lessons: Object.values(data.lessons ?? {}).filter((l) => inside(l.completedAt)).length,
    quiz: quiz.length,
    quizRight: quiz.filter((a) => a.correct).length,
    cards: Object.values(data.vocab ?? {}).filter((c) => inside(c.lastReviewed)).length,
    sententiae: Object.keys(data.daily ?? {}).filter(inside).length,
    scansion: (data.scansionAttempts ?? []).filter((a) => inside(a.at)).length,
    translations: (data.translationAttempts ?? []).filter((a) => inside(a.at)).length,
  };
}

export function weeklyRecap(data: SyncableData, today = utcToday()): Recap {
  const from = shiftDay(today, -6);
  return {
    from,
    to: today,
    week: counts(data, from, today),
    before: counts(data, shiftDay(today, -13), shiftDay(today, -7)),
  };
}

/** True when nothing at all happened in the week. */
export function quietWeek(c: RecapCounts): boolean {
  return Object.values(c).every((n) => n === 0);
}
