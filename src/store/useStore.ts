'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { SkillCategory, QuestionType, UnitId } from '@/data/types';

export const STORE_VERSION = 1;
export const STORAGE_KEY = 'ap-latin-store';

/** Exam date: Friday, 14 May 2027. Stored as a plain local date. */
export const EXAM_DATE = '2027-05-14';

/* ------------------------------------------------------------------ */
/* Record shapes                                                      */
/* ------------------------------------------------------------------ */

export interface PassageState {
  notes: string;
  bookmarked: boolean;
  /** Line/section numbers the reader marked as hard. */
  flaggedLines: number[];
  lastOpened?: string;
  /** Number of cold reads completed (glossary hidden). */
  coldReads: number;
}

/** SM-2 scheduling record for one vocabulary item. */
export interface VocabCard {
  id: string;
  /** Ease factor, SM-2 default 2.5, floor 1.3. */
  ef: number;
  /** Current inter-repetition interval in days. */
  interval: number;
  /** Consecutive successful recalls. */
  repetitions: number;
  /** ISO date the card is next due. */
  due: string;
  lapses: number;
  reviews: number;
  /** Direction-specific history, so La→En and En→La are scheduled together
   *  but tracked separately for reporting. */
  lastQuality?: number;
  lastReviewed?: string;
}

export interface QuizAttempt {
  id: string;
  questionId: string;
  correct: boolean;
  chosenId: string;
  at: string;
  type: QuestionType;
  skillCategory: SkillCategory;
  unit: UnitId;
  passageId?: string;
  /** Seconds spent. */
  seconds?: number;
}

export interface TranslationAttempt {
  id: string;
  drillId: string;
  at: string;
  /** Segment id -> the student's self-scored or AI-scored result. */
  segmentResults: Record<string, 'correct' | 'partial' | 'incorrect'>;
  /** Raw typed translation, kept so it can be revisited. */
  text: string;
  score: number;
  maxScore: number;
  /** Grammar tags of segments missed, for the weak-spot report. */
  missedTags: string[];
  gradedBy: 'self' | 'ai';
}

export interface FrqResponse {
  id: string;
  promptId: string;
  at: string;
  /** Subquestion id -> the student's typed answer. */
  answers: Record<string, string>;
  /** Rubric row id -> points the student (or the model) awarded. */
  selfScore: Record<string, number>;
  secondsSpent: number;
  submitted: boolean;
}

export interface ExamResult {
  id: string;
  at: string;
  mcqCorrect: number;
  mcqTotal: number;
  /** Rubric-row totals across the five free-response questions. */
  frqPoints: number;
  frqMax: number;
  bySkill: Record<SkillCategory, { correct: number; total: number }>;
  byType: Partial<Record<QuestionType, { correct: number; total: number }>>;
  mcqSeconds: number;
  frqSeconds: number;
}

/** A course project passage the student supplies themselves (FRQ 4 and 5). */
export interface ProjectPassage {
  id: string;
  title: string;
  author: string;
  citation: string;
  genre: 'prose' | 'poetry';
  latin: string;
  notes: string;
  /** Checkpoint 1 (summary, 2 pts) and Checkpoint 2 (interpretation, 3 pts). */
  checkpoint1: string;
  checkpoint2: string;
}

export interface StudyPlanSettings {
  /** Minutes per day the student intends to study. */
  minutesPerDay: number;
  /** 0 = Sunday. Days the student studies. */
  activeDays: number[];
  startedAt: string;
}

export interface AiUsageDay {
  date: string;
  calls: number;
  byRoute: Record<string, number>;
}

/* ------------------------------------------------------------------ */
/* Store                                                              */
/* ------------------------------------------------------------------ */

export interface StoreState {
  version: number;
  theme: 'light' | 'dark' | 'system';

  /** Reading Room: hide the glossary for a cold read. */
  glossaryEnabled: boolean;
  /** Show macrons where the source provides them. */
  showMacrons: boolean;

  passages: Record<string, PassageState>;
  vocab: Record<string, VocabCard>;
  quizAttempts: QuizAttempt[];
  /** Question ids queued for review after being missed. */
  reviewQueue: string[];
  translationAttempts: TranslationAttempt[];
  frqResponses: FrqResponse[];
  examResults: ExamResult[];
  projectPassages: ProjectPassage[];
  studyPlan: StudyPlanSettings;

  /** ISO dates on which any study activity was recorded. */
  studyDays: string[];
  aiUsage: AiUsageDay[];

  /* actions ------------------------------------------------------- */
  setTheme: (t: StoreState['theme']) => void;
  toggleGlossary: () => void;

  updatePassage: (id: string, patch: Partial<PassageState>) => void;
  toggleBookmark: (id: string) => void;
  toggleFlaggedLine: (id: string, line: number) => void;

  reviewVocab: (id: string, quality: number) => void;
  seedVocab: (ids: string[]) => void;

  recordQuiz: (a: Omit<QuizAttempt, 'id' | 'at'>) => void;
  clearReviewQueue: () => void;
  removeFromReviewQueue: (questionId: string) => void;

  recordTranslation: (a: Omit<TranslationAttempt, 'id' | 'at'>) => void;
  saveFrq: (r: Omit<FrqResponse, 'id' | 'at'> & { id?: string }) => void;
  recordExam: (r: Omit<ExamResult, 'id' | 'at'>) => void;

  upsertProjectPassage: (p: ProjectPassage) => void;
  removeProjectPassage: (id: string) => void;

  setStudyPlan: (s: Partial<StudyPlanSettings>) => void;
  recordAiCall: (route: string) => void;

  markStudied: () => void;
  exportJSON: () => string;
  importJSON: (json: string) => { ok: true } | { ok: false; error: string };
  resetAll: () => void;
}

const today = () => new Date().toISOString().slice(0, 10);
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const emptyPassage = (): PassageState => ({
  notes: '',
  bookmarked: false,
  flaggedLines: [],
  coldReads: 0,
});

const initialState = {
  version: STORE_VERSION,
  theme: 'system' as const,
  glossaryEnabled: true,
  showMacrons: true,
  passages: {} as Record<string, PassageState>,
  vocab: {} as Record<string, VocabCard>,
  quizAttempts: [] as QuizAttempt[],
  reviewQueue: [] as string[],
  translationAttempts: [] as TranslationAttempt[],
  frqResponses: [] as FrqResponse[],
  examResults: [] as ExamResult[],
  projectPassages: [] as ProjectPassage[],
  studyPlan: {
    minutesPerDay: 30,
    activeDays: [0, 1, 2, 3, 4, 5, 6],
    startedAt: today(),
  } as StudyPlanSettings,
  studyDays: [] as string[],
  aiUsage: [] as AiUsageDay[],
};

/**
 * SM-2 (Piotr Wozniak). `quality` is 0–5; below 3 counts as a lapse and
 * restarts the interval while keeping a reduced ease factor.
 */
export function sm2(card: VocabCard, quality: number): VocabCard {
  const q = Math.max(0, Math.min(5, quality));
  let { ef, interval, repetitions, lapses } = card;

  ef = ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (ef < 1.3) ef = 1.3;

  if (q < 3) {
    repetitions = 0;
    interval = 1;
    lapses += 1;
  } else {
    repetitions += 1;
    if (repetitions === 1) interval = 1;
    else if (repetitions === 2) interval = 6;
    else interval = Math.round(interval * ef);
  }

  const due = new Date();
  due.setDate(due.getDate() + interval);

  return {
    ...card,
    ef,
    interval,
    repetitions,
    lapses,
    due: due.toISOString().slice(0, 10),
    reviews: card.reviews + 1,
    lastQuality: q,
    lastReviewed: today(),
  };
}

export const newCard = (id: string): VocabCard => ({
  id,
  ef: 2.5,
  interval: 0,
  repetitions: 0,
  due: today(),
  lapses: 0,
  reviews: 0,
});

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setTheme: (theme) => {
        set({ theme });
        if (typeof document !== 'undefined') {
          if (theme === 'system') {
            document.documentElement.removeAttribute('data-theme');
            try {
              localStorage.removeItem('ap-latin-theme');
            } catch {}
          } else {
            document.documentElement.setAttribute('data-theme', theme);
            try {
              localStorage.setItem('ap-latin-theme', theme);
            } catch {}
          }
        }
      },

      toggleGlossary: () => set((s) => ({ glossaryEnabled: !s.glossaryEnabled })),

      updatePassage: (id, patch) =>
        set((s) => ({
          passages: {
            ...s.passages,
            [id]: { ...emptyPassage(), ...s.passages[id], ...patch },
          },
        })),

      toggleBookmark: (id) =>
        set((s) => {
          const cur = s.passages[id] ?? emptyPassage();
          return {
            passages: { ...s.passages, [id]: { ...cur, bookmarked: !cur.bookmarked } },
          };
        }),

      toggleFlaggedLine: (id, line) =>
        set((s) => {
          const cur = s.passages[id] ?? emptyPassage();
          const has = cur.flaggedLines.includes(line);
          return {
            passages: {
              ...s.passages,
              [id]: {
                ...cur,
                flaggedLines: has
                  ? cur.flaggedLines.filter((l) => l !== line)
                  : [...cur.flaggedLines, line].sort((a, b) => a - b),
              },
            },
          };
        }),

      seedVocab: (ids) =>
        set((s) => {
          const next = { ...s.vocab };
          for (const id of ids) if (!next[id]) next[id] = newCard(id);
          return { vocab: next };
        }),

      reviewVocab: (id, quality) =>
        set((s) => {
          const card = s.vocab[id] ?? newCard(id);
          return { vocab: { ...s.vocab, [id]: sm2(card, quality) } };
        }),

      recordQuiz: (a) =>
        set((s) => {
          const attempt: QuizAttempt = { ...a, id: uid(), at: new Date().toISOString() };
          const queue = a.correct
            ? s.reviewQueue.filter((q) => q !== a.questionId)
            : s.reviewQueue.includes(a.questionId)
              ? s.reviewQueue
              : [...s.reviewQueue, a.questionId];
          return {
            quizAttempts: [...s.quizAttempts, attempt].slice(-3000),
            reviewQueue: queue,
          };
        }),

      clearReviewQueue: () => set({ reviewQueue: [] }),
      removeFromReviewQueue: (questionId) =>
        set((s) => ({ reviewQueue: s.reviewQueue.filter((q) => q !== questionId) })),

      recordTranslation: (a) =>
        set((s) => ({
          translationAttempts: [
            ...s.translationAttempts,
            { ...a, id: uid(), at: new Date().toISOString() },
          ].slice(-500),
        })),

      saveFrq: (r) =>
        set((s) => {
          const id = r.id ?? uid();
          const existing = s.frqResponses.findIndex((x) => x.id === id);
          const rec: FrqResponse = { ...r, id, at: new Date().toISOString() };
          const next = [...s.frqResponses];
          if (existing >= 0) next[existing] = rec;
          else next.push(rec);
          return { frqResponses: next.slice(-300) };
        }),

      recordExam: (r) =>
        set((s) => ({
          examResults: [...s.examResults, { ...r, id: uid(), at: new Date().toISOString() }],
        })),

      upsertProjectPassage: (p) =>
        set((s) => {
          const i = s.projectPassages.findIndex((x) => x.id === p.id);
          const next = [...s.projectPassages];
          if (i >= 0) next[i] = p;
          else next.push(p);
          return { projectPassages: next };
        }),

      removeProjectPassage: (id) =>
        set((s) => ({ projectPassages: s.projectPassages.filter((p) => p.id !== id) })),

      setStudyPlan: (p) => set((s) => ({ studyPlan: { ...s.studyPlan, ...p } })),

      recordAiCall: (route) =>
        set((s) => {
          const d = today();
          const days = [...s.aiUsage];
          const i = days.findIndex((x) => x.date === d);
          if (i >= 0) {
            days[i] = {
              ...days[i],
              calls: days[i].calls + 1,
              byRoute: { ...days[i].byRoute, [route]: (days[i].byRoute[route] ?? 0) + 1 },
            };
          } else {
            days.push({ date: d, calls: 1, byRoute: { [route]: 1 } });
          }
          return { aiUsage: days.slice(-90) };
        }),

      markStudied: () =>
        set((s) => {
          const d = today();
          return s.studyDays.includes(d) ? s : { studyDays: [...s.studyDays, d].slice(-800) };
        }),

      exportJSON: () => {
        const s = get();
        const payload = {
          app: 'ap-latin',
          version: STORE_VERSION,
          exportedAt: new Date().toISOString(),
          data: {
            theme: s.theme,
            glossaryEnabled: s.glossaryEnabled,
            showMacrons: s.showMacrons,
            passages: s.passages,
            vocab: s.vocab,
            quizAttempts: s.quizAttempts,
            reviewQueue: s.reviewQueue,
            translationAttempts: s.translationAttempts,
            frqResponses: s.frqResponses,
            examResults: s.examResults,
            projectPassages: s.projectPassages,
            studyPlan: s.studyPlan,
            studyDays: s.studyDays,
            aiUsage: s.aiUsage,
          },
        };
        return JSON.stringify(payload, null, 2);
      },

      importJSON: (json) => {
        try {
          const parsed = JSON.parse(json);
          if (parsed?.app !== 'ap-latin' || typeof parsed?.data !== 'object') {
            return { ok: false as const, error: 'That does not look like an AP Latin export file.' };
          }
          set((s) => ({ ...s, ...parsed.data, version: STORE_VERSION }));
          return { ok: true as const };
        } catch {
          return { ok: false as const, error: 'Could not parse that file as JSON.' };
        }
      },

      resetAll: () => set({ ...initialState, studyPlan: { ...initialState.studyPlan, startedAt: today() } }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      version: STORE_VERSION,
      partialize: (s) => {
        // Persist data, not the action functions.
        const { ...rest } = s;
        return rest as StoreState;
      },
    },
  ),
);

/* ------------------------------------------------------------------ */
/* Derived selectors                                                   */
/* ------------------------------------------------------------------ */

export function daysUntilExam(from = new Date()): number {
  const exam = new Date(EXAM_DATE + 'T00:00:00');
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  return Math.max(0, Math.round((exam.getTime() - start.getTime()) / 86_400_000));
}

/** Current consecutive-day study streak, counting today or yesterday as live. */
export function currentStreak(studyDays: string[]): number {
  if (studyDays.length === 0) return 0;
  const set = new Set(studyDays);
  const d = new Date();
  if (!set.has(d.toISOString().slice(0, 10))) {
    d.setDate(d.getDate() - 1);
    if (!set.has(d.toISOString().slice(0, 10))) return 0;
  }
  let n = 0;
  for (;;) {
    if (!set.has(d.toISOString().slice(0, 10))) break;
    n += 1;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export function dueVocab(vocab: Record<string, VocabCard>, on = today()): VocabCard[] {
  return Object.values(vocab)
    .filter((c) => c.due <= on)
    .sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : a.ef - b.ef));
}
