/**
 * The course: Latin from the first day to the AP syllabus.
 *
 *   Level  (Prīma, Secunda, Tertia, Quārta) → Unit → Lesson → Steps
 *
 * A lesson is a short, fixed sequence of steps: a few that teach and many
 * that ask. Everything here is plain data. The website (/learn) and the app
 * (the Learn tab) render the same lessons, and `scripts/verify-content.mjs`
 * checks every one: that an answer index points at an option, that a
 * sentence to build can be built from its tiles, that a linked vocabulary id
 * exists.
 *
 * Text conventions, understood by both renderers:
 *   - In `body`, `tip` and `explain`: `*word*` is italic (Latin cited in
 *     English prose) and `**word**` is bold.
 *   - In a table cell or an example: `puell|ae` marks the ending, which is
 *     set in rubric red. The bar never shows.
 */

export type LevelId = 'prima' | 'secunda' | 'tertia' | 'quarta' | 'verba';

/**
 * The course runs as two tracks side by side: the grammar levels, taken in
 * order, and the vocabulary list by letter (Verba), taken alongside.
 */
export type Track = 'grammar' | 'vocabulary';

export interface CurriculumLevel {
  id: LevelId;
  /** Absent for the grammar levels. */
  track?: Track;
  /** "I", "II", "III". */
  numeral: string;
  /** "Prīma". */
  title: string;
  /** "Foundations". */
  subtitle: string;
  blurb: string;
  units: CurriculumUnit[];
}

export interface CurriculumUnit {
  /** "prima-1". */
  id: string;
  /** 1-based, within its level. */
  n: number;
  title: string;
  blurb: string;
  lessons: Lesson[];
}

export interface Lesson {
  /** "prima-1-1": level, unit, lesson. Stable forever — progress is keyed on it. */
  id: string;
  title: string;
  /** One line for the course map. */
  summary: string;
  /** Rough time to finish, for the course map. */
  minutes: number;
  /** What the student can do afterwards, shown before starting. */
  objectives: string[];
  /** A unit test: passed, it counts its whole unit as done (src/lib/path.ts). */
  test?: boolean;
  /** The words this lesson introduces. Those on the AP list join the
   *  student's flashcard deck when the lesson is finished. */
  words: LessonWord[];
  steps: LessonStep[];
}

export interface LessonWord {
  /** The dictionary entry, with macrons: "puella, puellae, f." */
  latin: string;
  english: string;
  /** Core vocabulary id (src/data/vocabulary.ts) when the word is on the AP
   *  list, so learning it here counts there too. */
  vocabId?: string;
  /** English words that come from it: "puerile", "amorous". */
  derivatives?: string[];
}

/* ------------------------------------------------------------------ */
/* Steps                                                               */
/* ------------------------------------------------------------------ */

export type LessonStep =
  | TeachStep
  | ReadStep
  | ChoiceStep
  | TypeStep
  | TranslateStep
  | BuildStep
  | MatchStep;

/** The kinds that ask something and are scored. */
export type ExerciseStep = ChoiceStep | TypeStep | TranslateStep | BuildStep | MatchStep;

export interface Example {
  la: string;
  en: string;
  note?: string;
}

export interface ParadigmTable {
  caption?: string;
  /** Column headings; the first column is the row label and has no heading. */
  cols: string[];
  rows: Array<{ label: string; cells: string[] }>;
}

/** Explains something. Not scored. */
export interface TeachStep {
  kind: 'teach';
  title: string;
  /** Paragraphs. */
  body: string[];
  table?: ParadigmTable;
  examples?: Example[];
  /** A short aside set off from the body: a mnemonic, a warning. */
  tip?: string;
}

/** A short connected passage, every line with its translation to reveal. Not scored. */
export interface ReadStep {
  kind: 'read';
  title: string;
  intro?: string;
  lines: Array<{ la: string; en: string }>;
  /** Words the passage uses that haven't been taught, glossed in the margin. */
  gloss?: Array<{ word: string; meaning: string }>;
}

/** Multiple choice. */
export interface ChoiceStep {
  kind: 'choice';
  prompt: string;
  /** Latin the question is about, set large above the options. */
  latin?: string;
  options: string[];
  /** Index into `options`. */
  answer: number;
  explain: string;
}

/** Type a short answer: an ending, a form, a word. Checked ignoring case,
 *  macrons, u/v and i/j, and a leading hyphen. */
export interface TypeStep {
  kind: 'type';
  prompt: string;
  latin?: string;
  /** Every accepted answer. The first is shown as the correct one. */
  answers: string[];
  explain: string;
  /** Shown on request, before answering. */
  hint?: string;
}

/**
 * Translate a Latin sentence into English. An answer matching one of
 * `answers` (ignoring case, punctuation and articles) is accepted at once.
 * Anything else shows the model translation and lets the student say
 * whether theirs meant the same, because English has too many right
 * answers to list.
 */
export interface TranslateStep {
  kind: 'translate';
  latin: string;
  /** Accepted translations. The first is the model answer. */
  answers: string[];
  explain?: string;
}

/**
 * Build a sentence from word tiles: `answer` in order, shuffled with
 * `extra` decoys. With `anyOrder`, any arrangement of the right tiles is
 * accepted, which is how a Latin sentence works.
 */
export interface BuildStep {
  kind: 'build';
  prompt: string;
  /** The sentence to translate, shown above the tiles. */
  source: string;
  /** Language of the tiles. */
  lang: 'la' | 'en';
  answer: string[];
  extra: string[];
  anyOrder?: boolean;
  explain?: string;
}

/** Tap pairs together. Scored as one exercise: right if no wrong pairing was tried. */
export interface MatchStep {
  kind: 'match';
  prompt: string;
  /** [left, right]. Left is usually Latin. 3 to 6 pairs. */
  pairs: Array<[string, string]>;
}

export function isExercise(step: LessonStep): step is ExerciseStep {
  return step.kind !== 'teach' && step.kind !== 'read';
}

/* ------------------------------------------------------------------ */
/* The outline: the course without its steps                          */
/* ------------------------------------------------------------------ */

/**
 * A lesson as the course map and the dashboard show it. Generated from the
 * course into `outline.generated.ts` (npm run export:outline), so pages that
 * only list lessons never load every exercise.
 */
export interface OutlineLesson {
  id: string;
  title: string;
  summary: string;
  minutes: number;
  /** Has exercises a review can use (see reviewable.ts). */
  reviewable: boolean;
  test?: boolean;
  /** The vocabulary track's lessons only: the AP words they teach, so the
   *  map can pass over lessons already known (src/lib/path.ts). */
  vocabIds?: string[];
}

export interface OutlineUnit {
  id: string;
  n: number;
  title: string;
  blurb: string;
  lessons: OutlineLesson[];
}

export interface OutlineLevel {
  id: LevelId;
  track?: Track;
  numeral: string;
  title: string;
  subtitle: string;
  blurb: string;
  units: OutlineUnit[];
}
