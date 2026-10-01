/**
 * Sententia of the day: which line today is, the short lesson it becomes,
 * and the streak of days done. Everyone gets the same line on the same
 * calendar day, counted on their own clock. The app does the same
 * (LectioCore `Daily`).
 */

import type { Sententia } from '@/data/daily';
import type { Lesson } from '@/data/curriculum';
import type { DailyResult } from '@/store/useStore';

export const DAILY_PREFIX = 'daily-';

/** Today's date on the student's own clock, as YYYY-MM-DD. */
export function localDay(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Whole days since 1970-01-01 for a YYYY-MM-DD date: exact, free of time zones. */
export function dayNumber(day: string): number {
  return Math.round(Date.parse(`${day}T00:00:00Z`) / 86_400_000);
}

/** The date `n` days after (or before) `day`. */
export function shiftDay(day: string, n: number): string {
  return new Date((dayNumber(day) + n) * 86_400_000).toISOString().slice(0, 10);
}

/**
 * The line for a day, from the list (`SENTENTIAE` in src/data/daily). The list
 * is passed in so that this module stays small: the dashboard loads the
 * lines only when its card is drawn.
 */
export function sententiaFor(day: string, list: Sententia[]): Sententia {
  const n = list.length;
  return list[((dayNumber(day) % n) + n) % n];
}

export function isDailyId(id: string): boolean {
  return id.startsWith(DAILY_PREFIX);
}

/** The day a daily lesson belongs to, from its id. */
export function dailyDayOf(id: string): string {
  return id.slice(DAILY_PREFIX.length);
}

/**
 * The line as a three-minute lesson: read it with its glosses, answer three
 * questions, then see the translation and where it comes from.
 */
export function dailyLesson(s: Sententia, day: string): Lesson {
  return {
    id: `${DAILY_PREFIX}${day}`,
    title: 'Sententia of the day',
    summary: 'One famous line of Latin, the words you need for it, and three quick questions.',
    minutes: 3,
    objectives: ['Read a line of real Latin', 'Notice one point of grammar in it', 'Meet an English word that comes from it'],
    words: [],
    steps: [
      {
        kind: 'teach',
        title: `*${s.latin}*`,
        body: ['Read it aloud, then work out what it says. The words you may not know:'],
        examples: s.gloss.map((g) => ({ la: g.word, en: g.meaning })),
      },
      ...s.steps,
      {
        kind: 'teach',
        title: `*${s.latin}*`,
        body: [`“${s.english}”`, `— ${s.source}`, s.note],
      },
    ],
  };
}

/** Days in a row with the day's line done, counting today, or yesterday if today isn't done yet. */
export function dailyStreak(daily: Record<string, DailyResult>, today = localDay()): number {
  let day = daily[today] ? today : shiftDay(today, -1);
  let n = 0;
  while (daily[day]) {
    n += 1;
    day = shiftDay(day, -1);
  }
  return n;
}
