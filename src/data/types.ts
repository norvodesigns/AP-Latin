/**
 * Core content types for the AP Latin study app.
 *
 * Everything the app renders comes from typed data files in /src/data.
 * Adding new passages, questions, or cards should never require touching
 * component or store code. See CONTENT.md for the authoring guide.
 */

/* ------------------------------------------------------------------ */
/* Framework primitives                                                */
/* ------------------------------------------------------------------ */

/** The six units of instruction in the 2025 CED. */
export type UnitId = '1' | '2' | '3' | '4' | '5' | '6';

/** The three AP Latin skill categories. */
export type SkillCategory = '1' | '2' | '3';

/** Individual skills within each category (CED pp. 227–228). */
export type SkillCode = '1.A' | '1.B' | '1.C' | '1.D' | '2.A' | '2.B' | '3.A' | '3.B';

export type Author = 'vergil' | 'pliny' | 'other';
export type Genre = 'poetry' | 'prose';

/** Question taxonomy used by the quiz engine's filters. */
export type QuestionType =
  | 'grammar-syntax'
  | 'form-identification'
  | 'vocabulary-in-context'
  | 'translation-choice'
  | 'literary-device'
  | 'meter'
  | 'context-culture'
  | 'inference';

/** Where a multiple-choice stimulus comes from, per the CED exam blueprint. */
export type StimulusType =
  | 'syllabus-pliny'
  | 'syllabus-vergil'
  | 'sight-pliny'
  | 'sight-vergil'
  | 'sight-other-prose'
  | 'sight-other-poetry';

/* ------------------------------------------------------------------ */
/* Passages                                                            */
/* ------------------------------------------------------------------ */

/**
 * One numbered unit of text: a verse line for Vergil, a numbered section
 * for Pliny. `n` is the authoritative citation number, not an array index.
 */
export interface PassageLine {
  n: number;
  latin: string;
}

export interface Passage {
  id: string;
  author: Author;
  genre: Genre;
  /** "Aeneid" | "Letters" */
  work: string;
  book: number;
  /** Pliny only. */
  letter?: number;
  /** Pliny only, e.g. "C. PLINIUS TACITO SUO S." */
  salutation?: string;
  /** Human-readable citation, e.g. "Aeneid 4.305–361". */
  citation: string;
  title: string;
  /**
   * True only for passages on the official 2025 CED required reading list.
   * Supplementary passages (mostly from the pre-2025 syllabus) are false and
   * say so in their `context` note.
   */
  required: boolean;
  /** CED reading number, e.g. "5.2". Null for supplementary passages. */
  cedReading: string | null;
  unit: UnitId;
  /** True when the source text carries vowel-quantity macrons. */
  macronized: boolean;
  wordCount: number;
  themes: string[];
  summary: string;
  context: string;
  lines: PassageLine[];
}

/* ------------------------------------------------------------------ */
/* Vocabulary                                                          */
/* ------------------------------------------------------------------ */

export interface VocabEntry {
  /** Stable slug derived from the headword. */
  id: string;
  /** Full dictionary entry with principal parts, e.g. "fero, ferre, tuli, latum". */
  lemma: string;
  /** First form only, e.g. "fero". */
  headword: string;
  pos: string;
  definition: string;
  /** CED reading numbers where this word is introduced, e.g. ["2.1", "5.3"]. */
  readings: string[];
  /** Units derived from `readings`. */
  units: UnitId[];
}

/* ------------------------------------------------------------------ */
/* Questions                                                           */
/* ------------------------------------------------------------------ */

export interface QuestionOption {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  skill: SkillCode;
  skillCategory: SkillCategory;
  /** Passage this question is about, when it targets syllabus reading. */
  passageId?: string;
  /** Restrict the question to specific lines/sections of the passage. */
  lineRange?: [number, number];
  /** Self-contained Latin stimulus for sight questions. */
  stimulus?: {
    latin: string;
    citation: string;
    genre: Genre;
    gloss?: Array<{ word: string; meaning: string }>;
  };
  prompt: string;
  options: QuestionOption[];
  answerId: string;
  /** Required: every question explains *why*, not just what. */
  explanation: string;
  unit: UnitId;
  difficulty: 1 | 2 | 3;
}

/** A CED-shaped multiple-choice set (3-question short set or 10-question long set). */
export interface QuestionSet {
  id: string;
  title: string;
  stimulusType: StimulusType;
  length: 'short' | 'long';
  passageId?: string;
  questionIds: string[];
}

/* ------------------------------------------------------------------ */
/* Translation drills                                                  */
/* ------------------------------------------------------------------ */

/**
 * One scoring segment of a literal translation, mirroring how AP scores
 * FRQ 2 (a ~35–40 word passage divided into 15 segments).
 */
export interface TranslationSegment {
  id: string;
  latin: string;
  /** The literal rendering a reader would accept. */
  literal: string;
  /** What must be present to earn the point. */
  requirement: string;
  /** Common ways students lose this segment. */
  pitfalls: string[];
  /** Grammatical features this segment tests, for missed-segment analytics. */
  tags: string[];
}

export interface TranslationDrill {
  id: string;
  passageId: string;
  citation: string;
  lineRange: [number, number];
  /** The full Latin, for display above the segment-by-segment work. */
  latin: string;
  segments: TranslationSegment[];
  /** A continuous literal model translation. */
  modelTranslation: string;
  notes?: string;
}

/* ------------------------------------------------------------------ */
/* Grammar, devices, culture                                           */
/* ------------------------------------------------------------------ */

export interface GrammarExample {
  latin: string;
  citation: string;
  passageId?: string;
  analysis: string;
}

export interface GrammarTopic {
  id: string;
  name: string;
  category: 'clause' | 'case' | 'verbal' | 'mood' | 'participle';
  summary: string;
  /** How to recognise it in the wild. */
  recognition: string[];
  /** How to render it in a literal translation. */
  translation: string[];
  examples: GrammarExample[];
}

export interface DeviceCard {
  id: string;
  name: string;
  definition: string;
  /** Why an author reaches for it — what AP calls the device's "function". */
  effect: string;
  examples: GrammarExample[];
}

export interface ContextCard {
  id: string;
  topic: 'vergil-augustan' | 'epic-conventions' | 'trojan-legend' | 'pliny-world'
       | 'epistolary' | 'provincial-admin' | 'vesuvius';
  title: string;
  body: string;
  keyFacts: string[];
}

/* ------------------------------------------------------------------ */
/* Scansion                                                           */
/* ------------------------------------------------------------------ */

export type FootType = 'dactyl' | 'spondee';

/**
 * A hand-verified scansion of one hexameter.
 * `syllables` is the full sequence; `feet` groups them into six feet.
 */
export interface ScannedSyllable {
  text: string;
  quantity: 'long' | 'short';
  /** True when this syllable elides into the next. */
  elides?: boolean;
  /**
   * The last syllable of the line, which is anceps: it counts long whatever it
   * really is (brevis in longo). Marked long by convention, but the grader
   * accepts either answer rather than failing a student who wrote its true
   * quantity.
   */
  anceps?: boolean;
  /** Why it is long: by nature, by position, or both. */
  reason?: string;
}

export interface ScansionLine {
  id: string;
  passageId: string;
  citation: string;
  latin: string;
  feet: FootType[];
  syllables: ScannedSyllable[];
  /** Indices into `syllables` after which a caesura falls. */
  caesurae: Array<{ afterSyllable: number; type: 'penthemimeral' | 'hephthemimeral' | 'trithemimeral' | 'bucolic' }>;
  notes: string;
}

/* ------------------------------------------------------------------ */
/* Free response                                                       */
/* ------------------------------------------------------------------ */

export type FrqType =
  | 'short-answer'      // FRQ 1  — 6–8 subquestions
  | 'translation'       // FRQ 2  — 15 segments
  | 'short-essay'       // FRQ 3  — syllabus passage
  | 'project-prose'     // FRQ 4  — course project prose passage
  | 'project-poetry';   // FRQ 5  — course project poetry passage

export interface RubricRow {
  id: string;
  label: string;
  maxPoints: number;
  criteria: string;
  /** What separates earning the point from not earning it. */
  decisionRules: string[];
}

export interface FrqPrompt {
  id: string;
  type: FrqType;
  title: string;
  passageId?: string;
  /** Latin shown with the prompt, when not drawn from a stored passage. */
  latin?: string;
  citation?: string;
  /** Minutes suggested by the CED for this question. */
  minutes: number;
  subquestions: Array<{ id: string; label: string; prompt: string; points: number }>;
  rubric: RubricRow[];
  /** A strong response, for side-by-side self-scoring. */
  sampleResponse: string;
  scoringNotes: string;
}

/* ------------------------------------------------------------------ */
/* Sight reading                                                       */
/* ------------------------------------------------------------------ */

export interface SightPassage {
  id: string;
  author: string;
  work: string;
  citation: string;
  genre: Genre;
  latin: string;
  gloss: Array<{ word: string; meaning: string }>;
  /** English summary, revealed after the attempt. */
  summary: string;
  questionIds: string[];
  /**
   * True when a model selected or adapted this passage rather than a human.
   * Surfaced in the UI so machine-selected text is never mistaken for vetted text.
   */
  machineSelected?: boolean;
  source: string;
}
