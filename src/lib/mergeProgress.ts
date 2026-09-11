/**
 * Combining two devices' progress.
 *
 * The naive way to sync a blob of state is "whichever side is newer wins,
 * wholesale" — pull the cloud row, and if it's newer than what we last saw,
 * replace local with it; otherwise push local over it. For a single JSON
 * settings blob that is fine. It is the wrong answer here, because the
 * blob this app syncs is not a settings object — it is a student's entire
 * history. Study on a phone during the commute, then open a laptop that
 * still has yesterday's local cache, and a naive sync deletes the
 * commute's vocabulary reviews and quiz attempts the moment the laptop's
 * "newer… no wait, older" write lands. That is the bug this file exists to
 * make structurally impossible: every field below is merged in whatever
 * way loses no history, not overwritten.
 *
 * Two different merge rules cover everything in `SyncableData`:
 *
 *   Additive fields (quiz/translation/scansion/exam history, the streak
 *   calendar, vocabulary review state, highlights, word-lookup counts) —
 *   union the two sides. A record that exists on only one side survives
 *   unconditionally; a record that exists on both is resolved by whichever
 *   rule makes sense for that shape (see each helper below), never by
 *   discarding one side wholesale. Applying the same merge twice, or
 *   merging A∪B and then merging in B again, produces the same result —
 *   which matters because this runs on every sign-in and every periodic
 *   re-sync, not once.
 *
 *   Singleton settings (theme, glossaryEnabled, showMacrons, studyPlan, and
 *   a passage's own notes/bookmark) have no history to union — there is
 *   only "the current value". These use `cloudIsNewer`, decided by the
 *   caller from the cloud row's `updated_at` against the last one this
 *   session has already incorporated: if the cloud holds a change we
 *   haven't seen, it wins; otherwise local (about to be pushed) does.
 */

import type {
  Annotation,
  PassageState,
  VocabCard,
  SyncableData,
  AiUsageDay,
  ScansionDraft,
  WordEncounter,
} from '@/store/useStore';

/** Caps mirroring the ones `useStore.ts` applies when it records each kind
 *  of history, so a merge never grows a list past what the store itself
 *  would ever keep. */
const CAPS = {
  quizAttempts: 3000,
  translationAttempts: 500,
  frqResponses: 300,
  scansionAttempts: 1000,
  studyDays: 800,
  scansionDrafts: 300,
  aiUsage: 90,
} as const;

export function mergeSyncable(
  local: SyncableData,
  cloud: SyncableData,
  cloudIsNewer: boolean,
): SyncableData {
  return {
    theme: cloudIsNewer ? cloud.theme : local.theme,
    glossaryEnabled: cloudIsNewer ? cloud.glossaryEnabled : local.glossaryEnabled,
    showMacrons: cloudIsNewer ? cloud.showMacrons : local.showMacrons,
    studyPlan: cloudIsNewer ? cloud.studyPlan : local.studyPlan,
    passages: mergePassages(local.passages, cloud.passages, cloudIsNewer),
    vocab: mergeVocab(local.vocab, cloud.vocab),
    quizAttempts: mergeById(local.quizAttempts, cloud.quizAttempts, CAPS.quizAttempts),
    reviewQueue: mergeSet(local.reviewQueue, cloud.reviewQueue),
    translationAttempts: mergeById(
      local.translationAttempts,
      cloud.translationAttempts,
      CAPS.translationAttempts,
    ),
    frqResponses: mergeById(local.frqResponses, cloud.frqResponses, CAPS.frqResponses),
    examResults: mergeById(local.examResults, cloud.examResults),
    projectPassages: mergeById(local.projectPassages, cloud.projectPassages),
    studyDays: mergeSet(local.studyDays, cloud.studyDays, CAPS.studyDays, true),
    aiUsage: mergeAiUsage(local.aiUsage, cloud.aiUsage),
    scansionAttempts: mergeById(local.scansionAttempts, cloud.scansionAttempts, CAPS.scansionAttempts),
    scansionDrafts: mergeScansionDrafts(local.scansionDrafts, cloud.scansionDrafts),
    wordEncounters: mergeWordEncounters(local.wordEncounters, cloud.wordEncounters),
  };
}

/* ------------------------------------------------------------------ */
/* Arrays of records with their own id                                 */
/* ------------------------------------------------------------------ */

/**
 * Union by `id`. Every record here is created with the store's own
 * `uid()` — a random string, never derived from content — so the same
 * logical event from two devices can never collide on id; a collision only
 * happens when both sides already agree (the same push synced twice), or
 * in the rare case a record is *updated in place* under a stable id
 * (`saveFrq` does this for an in-progress FRQ response). For that case,
 * whichever side carries the later `at` wins; lacking one, the existing
 * entry is left alone rather than guessing.
 */
function mergeById<T extends { id: string; at?: string }>(a: T[], b: T[], cap?: number): T[] {
  const byId = new Map<string, T>();
  for (const item of a) byId.set(item.id, item);
  for (const item of b) {
    const existing = byId.get(item.id);
    if (!existing) {
      byId.set(item.id, item);
    } else if (item.at && existing.at && item.at > existing.at) {
      byId.set(item.id, item);
    }
  }
  let merged = [...byId.values()];
  // Restore chronological order when every record carries a timestamp —
  // the store itself always appends in that order, and a lot of dashboard
  // logic (`.slice(-N)`, "most recent first") assumes it.
  if (merged.every((m) => typeof m.at === 'string')) {
    merged.sort((x, y) => (x.at as string).localeCompare(y.at as string));
  }
  if (cap && merged.length > cap) merged = merged.slice(-cap);
  return merged;
}

/* ------------------------------------------------------------------ */
/* Sets of primitives                                                  */
/* ------------------------------------------------------------------ */

/** Union of two string arrays. `sortAsDates` is for ISO date strings
 *  (`studyDays`), where lexical order is chronological order and capping
 *  should drop the *oldest* entries, not an arbitrary Set-iteration tail. */
function mergeSet(a: string[], b: string[], cap?: number, sortAsDates = false): string[] {
  let merged = [...new Set([...a, ...b])];
  if (sortAsDates) merged.sort();
  if (cap && merged.length > cap) merged = merged.slice(-cap);
  return merged;
}

/* ------------------------------------------------------------------ */
/* Vocabulary                                                          */
/* ------------------------------------------------------------------ */

/**
 * Per card, keep whichever side has reviewed it more — more repetitions is
 * strictly more study history, regardless of which device is "newer" — and
 * break a tie on the more recent review. This is what fixes "the flashcard
 * count was different on my other device": the richer SM-2 state always
 * wins, never the device that merely synced last.
 */
function mergeVocab(
  a: Record<string, VocabCard>,
  b: Record<string, VocabCard>,
): Record<string, VocabCard> {
  const out: Record<string, VocabCard> = { ...a };
  for (const [id, cardB] of Object.entries(b)) {
    const cardA = out[id];
    if (!cardA) {
      out[id] = cardB;
      continue;
    }
    const bIsRicher =
      cardB.reviews > cardA.reviews ||
      (cardB.reviews === cardA.reviews && (cardB.lastReviewed ?? '') > (cardA.lastReviewed ?? ''));
    out[id] = bIsRicher ? cardB : cardA;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Word encounters                                                     */
/* ------------------------------------------------------------------ */

/**
 * `count` uses max rather than sum on purpose: this merge can run many
 * times over the same two values (every sign-in, every periodic re-pull),
 * and summing would inflate the count a little more on every pass. Max
 * keeps the merge idempotent at the cost of slightly undercounting look-ups
 * that happened independently on both devices — an acceptable trade for a
 * number that only ever feeds a rough "coverage" percentage.
 */
function mergeWordEncounters(
  a: Record<string, WordEncounter>,
  b: Record<string, WordEncounter>,
): Record<string, WordEncounter> {
  const out: Record<string, WordEncounter> = { ...a };
  for (const [id, encB] of Object.entries(b)) {
    const encA = out[id];
    if (!encA) {
      out[id] = encB;
      continue;
    }
    out[id] = {
      count: Math.max(encA.count, encB.count),
      lastSeen: encA.lastSeen > encB.lastSeen ? encA.lastSeen : encB.lastSeen,
      passageIds: [...new Set([...encA.passageIds, ...encB.passageIds])],
    };
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* AI usage                                                             */
/* ------------------------------------------------------------------ */

/** Keyed by date, same max-not-sum reasoning as word encounters — this
 *  merge is idempotent, which matters far more for a usage meter than
 *  perfect precision on a day split across two devices. */
function mergeAiUsage(a: AiUsageDay[], b: AiUsageDay[]): AiUsageDay[] {
  const byDate = new Map<string, AiUsageDay>();
  for (const day of a) byDate.set(day.date, day);
  for (const day of b) {
    const existing = byDate.get(day.date);
    if (!existing) {
      byDate.set(day.date, day);
      continue;
    }
    const byRoute: Record<string, number> = { ...existing.byRoute };
    for (const [route, n] of Object.entries(day.byRoute)) {
      byRoute[route] = Math.max(byRoute[route] ?? 0, n);
    }
    byDate.set(day.date, { date: day.date, calls: Math.max(existing.calls, day.calls), byRoute });
  }
  return [...byDate.values()].sort((x, y) => x.date.localeCompare(y.date)).slice(-CAPS.aiUsage);
}

/* ------------------------------------------------------------------ */
/* Scansion drafts                                                     */
/* ------------------------------------------------------------------ */

/** These are in-progress, unsaved work on one line — not history, so
 *  there's nothing to union. Per line, keep whichever draft represents
 *  more actual progress (more marks placed, and a checked line always
 *  beats an unchecked one) rather than whichever device happens to be
 *  "newer", so switching devices mid-line never throws away the marks
 *  already placed on the other one. */
function mergeScansionDrafts(
  a: Record<string, ScansionDraft>,
  b: Record<string, ScansionDraft>,
): Record<string, ScansionDraft> {
  const progress = (d: ScansionDraft) => d.marks.filter(Boolean).length + (d.checked ? 1000 : 0);
  const out: Record<string, ScansionDraft> = { ...a };
  for (const [lineId, draftB] of Object.entries(b)) {
    const draftA = out[lineId];
    out[lineId] = !draftA || progress(draftB) > progress(draftA) ? draftB : draftA;
  }
  const keys = Object.keys(out);
  if (keys.length > CAPS.scansionDrafts) {
    for (const k of keys.slice(0, keys.length - CAPS.scansionDrafts)) delete out[k];
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Passages: notes, bookmarks, flags, cold reads, highlights            */
/* ------------------------------------------------------------------ */

function mergePassages(
  a: Record<string, PassageState>,
  b: Record<string, PassageState>,
  cloudIsNewer: boolean,
): Record<string, PassageState> {
  const out: Record<string, PassageState> = { ...a };
  for (const [id, pb] of Object.entries(b)) {
    const pa = out[id];
    if (!pa) {
      out[id] = pb;
      continue;
    }
    out[id] = {
      // A free-text note or a bookmark toggle has no history to union —
      // same singleton-settings rule as theme/studyPlan above.
      notes: cloudIsNewer ? pb.notes : pa.notes,
      bookmarked: cloudIsNewer ? pb.bookmarked : pa.bookmarked,
      // Flags and the cold-read count are monotonic — a line once flagged,
      // or a cold read once completed, stays true regardless of which
      // side is "newer" — so these always merge additively.
      flaggedLines: [...new Set([...pa.flaggedLines, ...pb.flaggedLines])].sort((x, y) => x - y),
      coldReads: Math.max(pa.coldReads, pb.coldReads),
      lastOpened: laterOf(pa.lastOpened, pb.lastOpened),
      annotations: mergeAnnotations(pa.annotations, pb.annotations),
    };
  }
  return out;
}

function laterOf(a: string | undefined, b: string | undefined): string | undefined {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

/**
 * Two annotations covering the exact same span are the same highlight even
 * when they were made independently on two devices before ever syncing —
 * each carries its own random id, so a plain union-by-id would keep both
 * and render a duplicated mark. Spans are deduped first (keeping whichever
 * copy carries a note, or is simply newer, over the other), then what's
 * left unions normally.
 */
function mergeAnnotations(a: Annotation[], b: Annotation[]): Annotation[] {
  const bySpan = new Map<string, Annotation>();
  const spanKey = (x: Annotation) => `${x.lineN}:${x.startTok}:${x.endTok}`;
  for (const ann of [...a, ...b]) {
    const key = spanKey(ann);
    const existing = bySpan.get(key);
    if (!existing) {
      bySpan.set(key, ann);
      continue;
    }
    const annHasNote = ann.note.trim().length > 0;
    const existingHasNote = existing.note.trim().length > 0;
    const winner =
      annHasNote !== existingHasNote
        ? annHasNote
          ? ann
          : existing
        : ann.createdAt > existing.createdAt
          ? ann
          : existing;
    bySpan.set(key, winner);
  }
  return [...bySpan.values()].sort((x, y) => x.lineN - y.lineN || x.startTok - y.startTok);
}
