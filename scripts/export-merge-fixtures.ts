/**
 * Parity fixtures for the native apps' port of the progress logic.
 *
 * The Swift app (ios/LectioCore) re-implements `mergeSyncable`
 * (src/lib/mergeProgress.ts) and `sm2` / the streak helpers
 * (src/store/useStore.ts), because cross-device sync only works if both
 * platforms merge a student's history identically. Rather than trust a
 * by-eye port, this script runs the real TypeScript on a set of inputs chosen
 * to hit every branch, and writes the inputs alongside the outputs. The Swift
 * tests replay the inputs and must reproduce the outputs exactly.
 *
 * The clock is pinned (sm2 and the streak count read "today"), and TZ is
 * forced to UTC so the output is deterministic on any machine.
 *
 * Run with:  npm run export:fixtures            (writes the fixtures)
 *            npm run export:fixtures -- --check (verifies, writes nothing)
 */
process.env.TZ = 'UTC';

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { mergeSyncable } from '../src/lib/mergeProgress';
import { sm2, newCard, currentStreak, longestStreak, blankSyncableData, type SyncableData } from '../src/store/useStore';

/** Every "now" the real code sees while this script runs. (The imports above
 *  only read the clock inside the functions called below, never at load
 *  time in a way these fixtures depend on.) */
const FIXED_NOW = Date.parse('2026-10-15T12:00:00.000Z');
const RealDate = Date;
class FixedDate extends RealDate {
  constructor(...args: unknown[]) {
    if (args.length === 0) super(FIXED_NOW);
    else super(...(args as [string | number]));
  }
  static now() {
    return FIXED_NOW;
  }
}
globalThis.Date = FixedDate as DateConstructor;

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'ios', 'LectioCore', 'Tests', 'LectioCoreTests', 'Fixtures');
const check = process.argv.includes('--check');

/* ------------------------------------------------------------------ */
/* Merge cases                                                         */
/* ------------------------------------------------------------------ */

/** A fresh blank record. `blankSyncableData()` hands back the store's own
 *  initial objects, so every container is replaced before anything writes
 *  into it — otherwise the two sides of a case would share one object. */
const base = (): SyncableData => ({
  ...blankSyncableData(),
  theme: 'light',
  passages: {}, vocab: {}, quizAttempts: [], reviewQueue: [], translationAttempts: [], frqResponses: [],
  examResults: [], projectPassages: [], studyDays: [], aiUsage: [], scansionAttempts: [], scansionDrafts: {},
  wordEncounters: {},
  studyPlan: { minutesPerDay: 30, activeDays: [0, 1, 2, 3, 4, 5, 6], startedAt: '2026-09-01' },
});

const ann = (id: string, lineN: number, s: number, e: number, note: string, createdAt: string, color: 'gilt' | 'woad' | null = 'gilt') => ({
  id, lineN, startTok: s, endTok: e, text: `t${s}-${e}`, color, note, createdAt,
});

const quiz = (id: string, at: string, correct = true) => ({
  id, questionId: `q-${id}`, correct, chosenId: 'a', at, type: 'grammar-syntax' as const, skillCategory: '1' as const, unit: '4' as const,
});

const card = (id: string, reviews: number, lastReviewed: string | undefined, ef = 2.5) => ({
  id, ef, interval: reviews, repetitions: reviews, due: '2026-10-20', lapses: 0, reviews, ...(lastReviewed ? { lastReviewed } : {}),
});

function richPair(): { local: SyncableData; cloud: SyncableData } {
  const local = base();
  const cloud = base();

  local.theme = 'light';
  cloud.theme = 'dark';
  local.glossaryEnabled = true;
  cloud.glossaryEnabled = false;
  cloud.studyPlan = { minutesPerDay: 45, activeDays: [1, 2, 3, 4, 5], startedAt: '2026-09-02' };

  local.passages = {
    'vergil-1-1': {
      notes: 'local note', bookmarked: true, flaggedLines: [3, 7], coldReads: 2, lastOpened: '2026-10-10T08:00:00.000Z',
      annotations: [
        ann('la1', 3, 0, 2, '', '2026-10-01T00:00:00.000Z'),
        ann('la2', 5, 4, 4, 'my gloss', '2026-10-02T00:00:00.000Z'),
        ann('la3', 9, 1, 3, '', '2026-10-05T00:00:00.000Z', 'woad'),
      ],
    },
    'pliny-6-16-a': { notes: '', bookmarked: false, flaggedLines: [], coldReads: 0, annotations: [] },
  };
  cloud.passages = {
    'vergil-1-1': {
      notes: 'cloud note', bookmarked: false, flaggedLines: [1, 7], coldReads: 3,
      annotations: [
        ann('ca1', 3, 0, 2, 'cloud note on span', '2026-09-30T00:00:00.000Z'),
        ann('ca2', 5, 4, 4, '', '2026-10-09T00:00:00.000Z'),
        ann('ca3', 9, 1, 3, '', '2026-10-06T00:00:00.000Z'),
        ann('ca4', 2, 6, 8, '', '2026-10-03T00:00:00.000Z'),
      ],
    },
    'vergil-4-305': { notes: 'only cloud', bookmarked: true, flaggedLines: [310], coldReads: 1, lastOpened: '2026-10-11T00:00:00.000Z', annotations: [] },
  };

  local.vocab = {
    arma: card('arma', 3, '2026-10-01'),
    cano: card('cano', 2, '2026-10-05'),
    vir: card('vir', 4, '2026-10-02'),
    only_local: card('only_local', 1, undefined),
  };
  cloud.vocab = {
    arma: card('arma', 5, '2026-09-20', 2.2),
    cano: card('cano', 2, '2026-10-07', 2.6),
    vir: card('vir', 4, '2026-10-02', 2.1),
    only_cloud: card('only_cloud', 0, undefined),
  };

  local.quizAttempts = [quiz('q1', '2026-10-01T10:00:00.000Z'), quiz('q3', '2026-10-03T10:00:00.000Z', false)];
  cloud.quizAttempts = [quiz('q2', '2026-10-02T10:00:00.000Z'), quiz('q1', '2026-10-01T10:00:00.000Z'), quiz('q4', '2026-09-28T10:00:00.000Z')];
  local.reviewQueue = ['q-q3', 'q-x'];
  cloud.reviewQueue = ['q-y', 'q-q3'];

  local.translationAttempts = [
    { id: 't1', drillId: 'd1', at: '2026-10-04T00:00:00.000Z', segmentResults: { s1: 'correct', s2: 'partial' }, text: 'I sing', score: 1, maxScore: 2, missedTags: ['ablative'], gradedBy: 'self' },
  ];
  cloud.translationAttempts = [
    { id: 't2', drillId: 'd1', at: '2026-10-03T00:00:00.000Z', segmentResults: { s1: 'incorrect' }, text: 'arms', score: 0, maxScore: 2, missedTags: [], gradedBy: 'ai' },
  ];

  // Same FRQ response edited on both devices: the later `at` wins.
  local.frqResponses = [{ id: 'f1', promptId: 'p1', at: '2026-10-05T00:00:00.000Z', answers: { a: 'local' }, selfScore: { r1: 1 }, secondsSpent: 100, submitted: false }];
  cloud.frqResponses = [
    { id: 'f1', promptId: 'p1', at: '2026-10-06T00:00:00.000Z', answers: { a: 'cloud later' }, selfScore: { r1: 2 }, secondsSpent: 200, submitted: true },
    { id: 'f2', promptId: 'p2', at: '2026-10-01T00:00:00.000Z', answers: {}, selfScore: {}, secondsSpent: 5, submitted: false },
  ];

  const bySkill = { '1': { correct: 1, total: 2 }, '2': { correct: 0, total: 1 }, '3': { correct: 1, total: 1 } };
  local.examResults = [{ id: 'e1', at: '2026-10-02T00:00:00.000Z', mcqCorrect: 30, mcqTotal: 52, frqPoints: 10, frqMax: 20, bySkill, byType: {}, mcqSeconds: 3000, frqSeconds: 6000 }];
  cloud.examResults = [{ id: 'e0', at: '2026-09-20T00:00:00.000Z', mcqCorrect: 25, mcqTotal: 52, frqPoints: 8, frqMax: 20, bySkill, byType: { meter: { correct: 1, total: 2 } }, mcqSeconds: 3100, frqSeconds: 6100 }];

  // No `at` on project passages: order is local's, then cloud's new ones.
  const proj = (id: string, title: string) => ({ id, title, author: 'Ovid', citation: 'Met. 1', genre: 'poetry' as const, latin: 'in nova fert', notes: '', checkpoint1: '', checkpoint2: '' });
  local.projectPassages = [proj('pp2', 'local two'), proj('pp1', 'local one')];
  cloud.projectPassages = [proj('pp1', 'cloud one'), proj('pp3', 'cloud three')];

  local.studyDays = ['2026-10-14', '2026-10-12', '2026-10-15'];
  cloud.studyDays = ['2026-10-13', '2026-10-12', '2026-10-01'];

  local.aiUsage = [{ date: '2026-10-14', calls: 3, byRoute: { ask: 2, 'grade-translation': 1 } }];
  cloud.aiUsage = [
    { date: '2026-10-14', calls: 2, byRoute: { ask: 1, 'grade-essay': 1 } },
    { date: '2026-10-10', calls: 1, byRoute: { ask: 1 } },
  ];

  local.scansionAttempts = [{ id: 's1', lineId: 'aen1-1', at: '2026-10-01T00:00:00.000Z', correct: 12, total: 13 }];
  cloud.scansionAttempts = [{ id: 's2', lineId: 'aen1-3', at: '2026-09-30T00:00:00.000Z', correct: 13, total: 13 }];

  local.scansionDrafts = {
    'aen1-5': { marks: ['long', null, 'short'], divisions: [2] },
    'aen1-6': { marks: ['long', 'long'], divisions: [], checked: true },
    'aen1-7': { marks: ['long', 'short', 'short'], divisions: [] },
  };
  cloud.scansionDrafts = {
    'aen1-5': { marks: ['long', 'short', 'short'], divisions: [3], elisions: [4] },
    'aen1-6': { marks: ['long', 'long', 'long', 'long'], divisions: [] },
    'aen1-7': { marks: ['long', 'short', 'long'], divisions: [1] },
    'aen1-8': { marks: [null], divisions: [] },
  };

  local.wordEncounters = {
    arma: { count: 3, lastSeen: '2026-10-10', passageIds: ['vergil-1-1'] },
    cano: { count: 1, lastSeen: '2026-10-01', passageIds: ['vergil-1-1'] },
  };
  cloud.wordEncounters = {
    arma: { count: 2, lastSeen: '2026-10-12', passageIds: ['vergil-4-305', 'vergil-1-1'] },
    peto: { count: 1, lastSeen: '2026-10-11', passageIds: ['pliny-6-16-a'] },
  };

  return { local, cloud };
}

function capsPair(): { local: SyncableData; cloud: SyncableData } {
  const local = base();
  const cloud = base();
  const day = (i: number) => new RealDate(Date.UTC(2024, 0, 1) + i * 86_400_000).toISOString().slice(0, 10);
  // 820 distinct study days across the two sides: the cap keeps the newest 800.
  local.studyDays = Array.from({ length: 420 }, (_, i) => day(i * 2));
  cloud.studyDays = Array.from({ length: 420 }, (_, i) => day(i * 2 + 1)).reverse();
  // 100 AI usage days: the cap keeps the newest 90.
  local.aiUsage = Array.from({ length: 50 }, (_, i) => ({ date: day(i), calls: 1, byRoute: { ask: 1 } }));
  cloud.aiUsage = Array.from({ length: 50 }, (_, i) => ({ date: day(i + 50), calls: 2, byRoute: { ask: 2 } }));
  // 310 drafts: the cap drops the earliest-inserted keys, as the store does.
  for (let i = 0; i < 160; i++) local.scansionDrafts[`aen2-${i}`] = { marks: ['long'], divisions: [] };
  for (let i = 0; i < 150; i++) cloud.scansionDrafts[`aen3-${i}`] = { marks: ['short', 'short'], divisions: [] };
  // 510 translation attempts: the cap keeps the newest 500.
  const tr = (id: string, i: number) => ({ id, drillId: 'd', at: new RealDate(Date.UTC(2026, 0, 1) + i * 60_000).toISOString(), segmentResults: {}, text: '', score: 0, maxScore: 15, missedTags: [], gradedBy: 'self' as const });
  local.translationAttempts = Array.from({ length: 255 }, (_, i) => tr(`l${i}`, i * 2));
  cloud.translationAttempts = Array.from({ length: 255 }, (_, i) => tr(`c${i}`, i * 2 + 1));
  return { local, cloud };
}

const mergeCases = [];
for (const [name, make] of [['rich', richPair], ['caps', capsPair]] as const) {
  for (const cloudIsNewer of [true, false]) {
    const { local, cloud } = make();
    mergeCases.push({ name: `${name}-${cloudIsNewer ? 'cloud-newer' : 'local-newer'}`, local, cloud, cloudIsNewer, expected: mergeSyncable(local, cloud, cloudIsNewer) });
  }
}
{
  // Idempotence: merging the merged result with the cloud again changes nothing.
  const { local, cloud } = richPair();
  const once = mergeSyncable(local, cloud, true);
  mergeCases.push({ name: 'rich-remerge', local: once, cloud, cloudIsNewer: false, expected: mergeSyncable(once, cloud, false) });
}

/* ------------------------------------------------------------------ */
/* SM-2 and streak cases                                               */
/* ------------------------------------------------------------------ */

const sm2Cases = [];
for (const qualities of [[5, 5, 5, 5], [4, 3, 5, 2, 4], [0, 1, 2, 5], [3, 3, 3, 3, 3, 3], [5, 4, 0, 5, 5]]) {
  let c = newCard('arma');
  const steps = [];
  for (const q of qualities) {
    c = sm2(c, q);
    steps.push({ quality: q, card: c });
  }
  sm2Cases.push({ start: newCard('arma'), steps });
}

const streakCases = [
  [],
  ['2026-10-15'],
  ['2026-10-14'],
  ['2026-10-13'],
  ['2026-10-15', '2026-10-14', '2026-10-13', '2026-10-11'],
  ['2026-10-14', '2026-10-13', '2026-10-12', '2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05'],
  ['2026-03-07', '2026-03-08', '2026-03-09', '2026-03-10', '2026-11-01', '2026-11-02'],
  ['2026-10-15', '2026-10-15', '2026-10-14'],
].map((days) => ({ studyDays: days, current: currentStreak(days), longest: longestStreak(days) }));

/* ------------------------------------------------------------------ */
/* Write, or verify                                                    */
/* ------------------------------------------------------------------ */

const rendered: Record<string, string> = {
  'merge.json': JSON.stringify({ cases: mergeCases }) + '\n',
  'sm2.json': JSON.stringify({ now: new RealDate(FIXED_NOW).toISOString(), cases: sm2Cases }, null, 1) + '\n',
  'streaks.json': JSON.stringify({ now: new RealDate(FIXED_NOW).toISOString(), cases: streakCases }, null, 1) + '\n',
};

if (check) {
  const stale = Object.entries(rendered).filter(([n, body]) => {
    const p = join(outDir, n);
    return !existsSync(p) || readFileSync(p, 'utf8') !== body;
  });
  if (stale.length > 0) {
    console.error(`Swift parity fixtures are stale (${stale.map(([n]) => n).join(', ')}). Run \`npm run export:fixtures\`.`);
    process.exit(1);
  }
  console.log('Swift parity fixtures are up to date.');
} else {
  mkdirSync(outDir, { recursive: true });
  for (const [n, body] of Object.entries(rendered)) writeFileSync(join(outDir, n), body);
  console.log(`Wrote ${Object.keys(rendered).length} parity fixtures to ios/LectioCore/Tests/LectioCoreTests/Fixtures.`);
}
