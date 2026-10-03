/**
 * Laurels: achievements across the whole app, worked out from the progress
 * that already syncs, so they need no storage of their own and every device
 * agrees. Each has a Latin name, what it asks for, and how far along the
 * student is. The app computes the same (LectioCore `Laurels`), held to this
 * by parity fixtures.
 */

import { longestStreak, scansionStatsByLine, type SyncableData } from '@/store/useStore';
import { OUTLINE } from '@/data/curriculum/outline';

export interface LaurelSpec {
  id: string;
  latin: string;
  title: string;
  detail: string;
  target: number;
}

export interface Laurel extends LaurelSpec {
  /** How far along, capped at the target. */
  have: number;
  earned: boolean;
}

/** The course's shape, as laurels need it: level id -> its units' lesson ids. */
export type CourseShape = Array<{ id: string; units: string[][] }>;

/** This site's course, in that shape. */
export const COURSE_SHAPE: CourseShape = OUTLINE.map((l) => ({ id: l.id, units: l.units.map((u) => u.lessons.map((x) => x.id)) }));

/** Longest run of consecutive YYYY-MM-DD days in a list. */
function longestRun(days: string[]): number {
  const n = (d: string) => Math.round(Date.parse(`${d}T00:00:00Z`) / 86_400_000);
  const sorted = [...new Set(days.map(n))].filter((x) => !Number.isNaN(x)).sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  for (let i = 0; i < sorted.length; i++) {
    run = i > 0 && sorted[i] === sorted[i - 1] + 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return best;
}

export const LAUREL_SPECS: LaurelSpec[] = [
  // The course
  { id: 'first-lesson', latin: 'Prīmus gradus', title: 'The first step', detail: 'Finish a lesson of the course.', target: 1 },
  { id: 'unit', latin: 'Pēnsum perfectum', title: 'A whole unit', detail: 'Finish every lesson of a unit.', target: 1 },
  { id: 'prima', latin: 'Prīma perfecta', title: 'Level I, done', detail: 'Finish every lesson of Prīma.', target: 1 },
  { id: 'secunda', latin: 'Secunda perfecta', title: 'Level II, done', detail: 'Finish every lesson of Secunda.', target: 1 },
  { id: 'tertia', latin: 'Tertia perfecta', title: 'Level III, done', detail: 'Finish every lesson of Tertia.', target: 1 },
  { id: 'quarta', latin: 'Quārta perfecta', title: 'Level IV, done', detail: 'Finish every lesson of Quārta: the whole AP syllabus, read with a guide.', target: 1 },
  { id: 'verba', latin: 'Omnia verba', title: 'The whole AP list', detail: 'Finish every unit of Verba, the AP word list by letter.', target: 1 },
  { id: 'lessons-50', latin: 'Quīnquāgintā lēctiōnēs', title: 'Fifty lessons', detail: 'Finish fifty lessons of the course.', target: 50 },
  // Habit
  { id: 'streak-7', latin: 'Septem diēs', title: 'A week unbroken', detail: 'Study seven days in a row.', target: 7 },
  { id: 'streak-30', latin: 'Trīgintā diēs', title: 'A month unbroken', detail: 'Study thirty days in a row.', target: 30 },
  { id: 'streak-100', latin: 'Centum diēs', title: 'A hundred days unbroken', detail: 'Study a hundred days in a row.', target: 100 },
  { id: 'days-50', latin: 'Assiduus', title: 'Fifty days of study', detail: 'Study on fifty different days.', target: 50 },
  // Vocabulary
  { id: 'deck-100', latin: 'Centum verba', title: 'A hundred words', detail: 'Have a hundred words in your flashcards.', target: 100 },
  { id: 'deck-500', latin: 'Quīngenta verba', title: 'Five hundred words', detail: 'Have five hundred words in your flashcards.', target: 500 },
  { id: 'mature-100', latin: 'Memoria tenāx', title: 'A hundred words held fast', detail: 'Get a hundred cards to an interval of three weeks or more.', target: 100 },
  // Reading
  { id: 'reader', latin: 'Lēctor', title: 'Five passages opened', detail: 'Open five passages in the Reading Room.', target: 5 },
  { id: 'annotations', latin: 'Adnotātiōnēs', title: 'Twenty-five marks', detail: 'Make twenty-five highlights and notes while reading.', target: 25 },
  { id: 'cold-read', latin: 'Sine auxiliō', title: 'A cold read', detail: 'Read a passage with the glossary turned off.', target: 1 },
  // Quiz and exam
  { id: 'quiz-100', latin: 'Centum respōnsa', title: 'A hundred questions', detail: 'Answer a hundred questions in the Quiz Engine.', target: 100 },
  { id: 'quiz-1000', latin: 'Mīlle respōnsa', title: 'A thousand questions', detail: 'Answer a thousand questions in the Quiz Engine.', target: 1000 },
  { id: 'exam', latin: 'Probātiō', title: 'A practice exam', detail: 'Finish a full practice exam.', target: 1 },
  { id: 'exam-80', latin: 'Summa cum laude', title: 'Eighty percent', detail: 'Score 80% or more on a practice exam’s multiple choice.', target: 80 },
  // Writing
  { id: 'translations-10', latin: 'Interpres', title: 'Ten translations', detail: 'Finish ten translation drills.', target: 10 },
  { id: 'frq-5', latin: 'Scrīptor', title: 'Five free responses', detail: 'Submit five free responses in the FRQ Workshop.', target: 5 },
  // Scansion
  { id: 'scansion-first', latin: 'Prīmus versus', title: 'A first line scanned', detail: 'Scan a line in the Scansion Lab.', target: 1 },
  { id: 'scansion-50', latin: 'Metricus', title: 'Fifty lines, perfectly', detail: 'Scan fifty different lines without a mistake.', target: 50 },
  // Sententia
  { id: 'sententia-7', latin: 'Sententiōsus', title: 'A week of sententiae', detail: 'Do the Sententia of the day seven days in a row.', target: 7 },
  { id: 'sententia-30', latin: 'Trīgintā sententiae', title: 'Thirty sententiae', detail: 'Do the Sententia of the day thirty times.', target: 30 },
];

/** Every laurel, and how far along the student is. */
export function laurels(data: SyncableData, course: CourseShape): Laurel[] {
  const done = data.lessons ?? {};
  const isDone = (id: string) => Boolean(done[id]);
  const lessonsDone = Object.keys(done).length;
  const unitsDone = course.flatMap((l) => l.units).filter((u) => u.length > 0 && u.every(isDone)).length;
  const levelDone = (id: string) => {
    const units = course.find((l) => l.id === id)?.units ?? [];
    return units.length > 0 && units.every((u) => u.every(isDone)) ? 1 : 0;
  };
  const cards = Object.values(data.vocab ?? {});
  const passages = Object.values(data.passages ?? {});
  const exams = data.examResults ?? [];
  const bestExam = Math.max(0, ...exams.map((e) => (e.mcqTotal > 0 ? Math.floor((e.mcqCorrect / e.mcqTotal) * 100) : 0)));
  const mastered = [...scansionStatsByLine(data.scansionAttempts ?? []).values()].filter((s) => s.mastered).length;
  const daily = Object.keys(data.daily ?? {});

  const have: Record<string, number> = {
    'first-lesson': lessonsDone,
    unit: unitsDone,
    prima: levelDone('prima'),
    secunda: levelDone('secunda'),
    tertia: levelDone('tertia'),
    quarta: levelDone('quarta'),
    verba: levelDone('verba'),
    'lessons-50': lessonsDone,
    'streak-7': longestStreak(data.studyDays ?? []),
    'streak-30': longestStreak(data.studyDays ?? []),
    'streak-100': longestStreak(data.studyDays ?? []),
    'days-50': new Set(data.studyDays ?? []).size,
    'deck-100': cards.length,
    'deck-500': cards.length,
    'mature-100': cards.filter((c) => c.interval >= 21).length,
    reader: passages.filter((p) => p.lastOpened).length,
    annotations: passages.reduce((n, p) => n + (p.annotations?.length ?? 0), 0),
    'cold-read': passages.reduce((n, p) => n + (p.coldReads ?? 0), 0),
    'quiz-100': (data.quizAttempts ?? []).length,
    'quiz-1000': (data.quizAttempts ?? []).length,
    exam: exams.length,
    'exam-80': bestExam,
    'translations-10': (data.translationAttempts ?? []).length,
    'frq-5': (data.frqResponses ?? []).filter((r) => r.submitted).length,
    'scansion-first': (data.scansionAttempts ?? []).length,
    'scansion-50': mastered,
    'sententia-7': longestRun(daily),
    'sententia-30': daily.length,
  };
  return LAUREL_SPECS.map((spec) => {
    const n = have[spec.id] ?? 0;
    return { ...spec, have: Math.min(n, spec.target), earned: n >= spec.target };
  });
}

/** The unearned laurel closest to done, by fraction of its target. */
export function nextLaurel(list: Laurel[]): Laurel | null {
  const open = list.filter((l) => !l.earned && l.have > 0);
  if (open.length === 0) return list.find((l) => !l.earned) ?? null;
  return open.reduce((a, b) => (b.have / b.target > a.have / a.target ? b : a));
}
