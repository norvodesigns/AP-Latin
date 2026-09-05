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

export type Author = 'vergil' | 'pliny' | 'caesar' | 'other';
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
  /**
   * True for an entry from `supplementaryVocabulary` rather than the
   * required 990-word CED list — real Latin, real dictionary source, but not
   * part of the fixed official list, the same way the real exam glosses a
   * non-core word in the margin rather than silently requiring it. `readings`
   * and `units` are always empty on these: they were never introduced by a
   * CED unit, so there is nothing to put there.
   */
  supplementary?: boolean;
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
  category: 'clause' | 'case' | 'verbal' | 'mood' | 'participle' | 'morphology';
  /**
   * Where this sits in a course sequence. 'foundational' is the paradigm
   * material (declensions, conjugations, pronouns) a first- or second-year
   * course covers before AP; 'ap' is exactly what the CED's syntax list
   * tests; 'advanced' is real, common Latin syntax the exam does not
   * require. Optional and defaults to 'ap' in the UI: every topic written
   * before this field existed is genuine AP-tested syntax.
   */
  level?: 'foundational' | 'ap' | 'advanced';
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
  topic:
    // Syllabus-specific — tied directly to the two required authors.
    | 'vergil-augustan' | 'epic-conventions' | 'trojan-legend' | 'pliny-world'
    | 'epistolary' | 'provincial-admin' | 'vesuvius'
    // Broader Roman history and culture — background no CED reading is
    // required to teach on its own, but that the syllabus authors all
    // assume. Not required by the exam; here because a comprehensive
    // course covers it regardless.
    | 'roman-founding' | 'early-republic' | 'roman-government' | 'punic-wars'
    | 'late-republic-crisis' | 'caesar-civil-war' | 'fall-of-republic'
    | 'augustan-reforms' | 'julio-claudians' | 'flavians'
    | 'roman-religion' | 'roman-family' | 'roman-education' | 'roman-slavery'
    | 'roman-military' | 'roman-law' | 'city-of-rome' | 'roman-provinces'
    | 'roman-engineering' | 'roman-entertainment';
  title: string;
  body: string;
  keyFacts: string[];
  /**
   * False for general Roman history/culture background beyond what Skill
   * 2.B requires — real and worth knowing, but not itself exam-scoped, the
   * same distinction `Passage.required` draws for reading. Omitted (treated
   * as required) on every card written before this field existed, since all
   * of those are tied directly to a syllabus author or reading.
   */
  required?: boolean;
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
   * True when this is the first syllable of a word — i.e. a real space
   * precedes it in the source line, not just a syllable break. Drives word
   * spacing in the Scansion Lab: syllables are shown run together within a
   * word, exactly as printed, with a gap only where the words themselves
   * have one. The interactive foot-boundary target between any two
   * syllables is unaffected either way — feet routinely fall mid-word.
   */
  startsWord?: boolean;
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
