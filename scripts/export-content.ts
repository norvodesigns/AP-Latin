/**
 * Exports the app's content as JSON for the native apps (ios/).
 *
 * The TypeScript files under src/data stay the one place content is written.
 * This script turns them into the plain JSON the Swift app bundles, so a new
 * passage, question or grammar topic reaches the iPhone the same way it
 * reaches the website: by editing src/data and nothing else.
 *
 * The one thing it adds is the Reading Room glossary, pre-resolved. Every word
 * of every passage is run through the same tokenize() -> lookup() ->
 * disambiguateInContext() chain Reader.tsx runs when a word is clicked, and
 * the result is stored with the token. The Swift app renders those results and
 * never re-implements the stemmer — so the two platforms can never disagree
 * about a gloss, and an annotation's token range means the same thing on both.
 *
 * Output is deterministic (no timestamps), so re-running it on unchanged
 * content produces byte-identical files and `--check` can fail CI when the
 * committed bundle has drifted from src/data.
 *
 * Run with:  npm run export:content            (writes ios/Content)
 *            npm run export:content -- --check (verifies, writes nothing)
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { allPassages, passageVocabIds, UNIT_TITLES } from '../src/data/passages/index';
import { coreVocabulary } from '../src/data/vocabulary';
import { supplementaryVocabulary } from '../src/data/supplementaryVocabulary';
import { questions, questionSets, QUESTION_TYPE_LABELS, SKILL_LABELS } from '../src/data/questions';
import { grammarTopics } from '../src/data/grammar';
import { deviceCards } from '../src/data/devices';
import { contextCards, CONTEXT_TOPIC_LABELS } from '../src/data/context';
import {
  frqPrompts,
  FRQ_TYPE_LABELS,
  SHORT_ESSAY_RUBRIC,
  PROJECT_ESSAY_RUBRIC,
  SHORT_ANSWER_RUBRIC,
  CHECKPOINT_1_RUBRIC,
  CHECKPOINT_2_RUBRIC,
} from '../src/data/frq';
import { sightPassages, sightQuestions, SIGHT_AUTHORS } from '../src/data/sight';
import { translationDrills } from '../src/data/translation';
import { scansionLines } from '../src/data/scansion';
import { COURSE, PLACEMENT } from '../src/data/curriculum';
import { tokenize, lookup, disambiguateInContext } from '../src/lib/latin';
import { EXAM_DATE, STORE_VERSION } from '../src/store/useStore';

/** Bump when a file's shape changes in a way an older app can't decode. */
const SCHEMA_VERSION = 1;

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'ios', 'Content');
const check = process.argv.includes('--check');

/* ------------------------------------------------------------------ */
/* Passages, with the glossary resolved per token                      */
/* ------------------------------------------------------------------ */

/** A glossary candidate: vocab id plus how it matched ('e' exact, 's' stem). */
type Gloss = { id: string; m: 'e' | 's' };
/** A token as stored: `t` the text; `w` and `g` only on words. */
type ExportToken = { t: string; w?: 1; g?: Gloss[] };

function exportPassages() {
  return allPassages.map((p) => ({
    ...p,
    vocabIds: passageVocabIds(p),
    lines: p.lines.map((line) => ({
      n: line.n,
      latin: line.latin,
      tokens: tokenize(line.latin).map((tok): ExportToken => {
        if (!tok.isWord) return { t: tok.text };
        const results = disambiguateInContext(p.id, line.n, tok.text, lookup(tok.text), tok.index);
        return {
          t: tok.text,
          w: 1,
          g: results.map((r) => ({ id: r.entry.id, m: r.match === 'exact' ? 'e' : 's' })),
        };
      }),
    })),
  }));
}

/* ------------------------------------------------------------------ */
/* Files                                                               */
/* ------------------------------------------------------------------ */

const files: Record<string, unknown> = {
  'passages.json': exportPassages(),
  'vocabulary.json': { core: coreVocabulary, supplementary: supplementaryVocabulary },
  'questions.json': { questions, sets: questionSets },
  'grammar.json': grammarTopics,
  'devices.json': deviceCards,
  'context.json': contextCards,
  'frq.json': {
    prompts: frqPrompts,
    rubrics: {
      shortEssay: SHORT_ESSAY_RUBRIC,
      projectEssay: PROJECT_ESSAY_RUBRIC,
      shortAnswer: SHORT_ANSWER_RUBRIC,
      checkpoint1: CHECKPOINT_1_RUBRIC,
      checkpoint2: CHECKPOINT_2_RUBRIC,
    },
  },
  'sight.json': { passages: sightPassages, questions: sightQuestions, authors: SIGHT_AUTHORS },
  'translation.json': translationDrills,
  'scansion.json': scansionLines,
  'curriculum.json': { levels: COURSE, placement: PLACEMENT },
  'meta.json': {
    examDate: EXAM_DATE,
    storeVersion: STORE_VERSION,
    unitTitles: UNIT_TITLES,
    questionTypeLabels: QUESTION_TYPE_LABELS,
    skillLabels: SKILL_LABELS,
    contextTopicLabels: CONTEXT_TOPIC_LABELS,
    frqTypeLabels: FRQ_TYPE_LABELS,
  },
};

const rendered = Object.fromEntries(
  Object.entries(files).map(([name, data]) => [name, JSON.stringify(data) + '\n']),
);

const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const fileHashes = Object.fromEntries(Object.entries(rendered).map(([n, s]) => [n, sha(s)]));
const contentHash = sha(Object.entries(fileHashes).map(([n, h]) => `${n}:${h}`).join('\n'));

// Every earlier contentHash, newest first. The app downloads content from the
// website (/content/v1) only when it supersedes what the app already has, so
// an app build that's ahead of the website never "updates" backwards.
const manifestPath = join(outDir, 'manifest.json');
const previous: { contentHash?: string; supersedes?: string[] } | null = existsSync(manifestPath)
  ? JSON.parse(readFileSync(manifestPath, 'utf8'))
  : null;
const history = previous?.supersedes ?? [];
const supersedes =
  !previous?.contentHash || previous.contentHash === contentHash
    ? history
    : [previous.contentHash, ...history.filter((h) => h !== contentHash)].slice(0, 500);

const manifest = {
  schemaVersion: SCHEMA_VERSION,
  contentHash,
  supersedes,
  files: fileHashes,
};
rendered['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';

/* ------------------------------------------------------------------ */
/* Write, or verify                                                    */
/* ------------------------------------------------------------------ */

if (check) {
  const stale = Object.entries(rendered)
    .filter(([name, body]) => {
      const path = join(outDir, name);
      return !existsSync(path) || readFileSync(path, 'utf8') !== body;
    })
    .map(([name]) => name);
  if (stale.length > 0) {
    console.error(
      `ios/Content is out of date with src/data (${stale.join(', ')}).\n` +
        'Run `npm run export:content` and commit the result.',
    );
    process.exit(1);
  }
  console.log(`ios/Content is up to date (${manifest.contentHash.slice(0, 12)}).`);
} else {
  mkdirSync(outDir, { recursive: true });
  for (const [name, body] of Object.entries(rendered)) writeFileSync(join(outDir, name), body);
  const kb = Object.values(rendered).reduce((n, s) => n + Buffer.byteLength(s), 0) / 1024;
  console.log(
    `Wrote ${Object.keys(rendered).length} files to ios/Content (${Math.round(kb)} KB, ${manifest.contentHash.slice(0, 12)}).`,
  );
}
