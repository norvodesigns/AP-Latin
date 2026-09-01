#!/usr/bin/env node
/**
 * Content integrity checks.
 *
 * These run against the committed data files with no network access, and catch
 * the mistakes that matter most in a study app: a question whose answer key
 * points at no option, a drill quoting Latin that is not in its passage, a
 * scansion whose feet do not add up, a citation that claims lines the passage
 * does not contain.
 *
 * Run with:  npm run verify
 */
import { readFileSync } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const notes = [];

function fail(msg) {
  failures.push(msg);
}

/** Import a data file directly. Node strips the type annotations for us. */
async function load(relPath) {
  return import(pathToFileURL(join(root, relPath)).href);
}

/** Normalise Latin for comparison: no macrons, no punctuation, u/v and i/j folded. */
function norm(s) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/v/g, 'u')
    .replace(/j/g, 'i')
    .replace(/[^a-z]/g, '');
}

/* ------------------------------------------------------------------ */

const { vergilPassages: vergil } = await load('src/data/passages/vergil.ts');
const { plinyPassages: pliny } = await load('src/data/passages/pliny.ts');
const passages = [...vergil, ...pliny];
const byId = new Map(passages.map((p) => [p.id, p]));

const { coreVocabulary: vocab } = await load('src/data/vocabulary.ts');
const { questions } = await load('src/data/questions.ts');
const { translationDrills: drills } = await load('src/data/translation.ts');
const { scansionLines: scansion } = await load('src/data/scansion.ts');
const { sightPassages: sight, sightQuestions: sightQs } = await load('src/data/sight.ts');
const { grammarTopics } = await load('src/data/grammar.ts');
const { deviceCards } = await load('src/data/devices.ts');
const { contextCards } = await load('src/data/context.ts');
const { frqPrompts } = await load('src/data/frq.ts');

notes.push(`${passages.length} passages (${passages.filter((p) => p.required).length} required)`);
notes.push(`${vocab.length} vocabulary entries`);
notes.push(`${questions.length + sightQs.length} questions`);
notes.push(`${drills.length} translation drills`);
notes.push(`${scansion.length} scanned lines`);
notes.push(`${sight.length} vetted sight passages`);
notes.push(`${grammarTopics.length} grammar topics, ${deviceCards.length} device cards, ${contextCards.length} context cards`);
notes.push(`${frqPrompts.length} free-response prompts`);

/* --- passages ---------------------------------------------------- */
const seenPassage = new Set();
for (const p of passages) {
  if (seenPassage.has(p.id)) fail(`duplicate passage id: ${p.id}`);
  seenPassage.add(p.id);
  if (p.lines.length === 0) fail(`${p.id}: no lines`);
  if (!p.summary?.trim()) fail(`${p.id}: missing summary`);
  if (!p.context?.trim()) fail(`${p.id}: missing context`);

  // Line numbers must be strictly increasing (gaps are fine — editors omit lines).
  for (let i = 1; i < p.lines.length; i++) {
    if (p.lines[i].n <= p.lines[i - 1].n) {
      fail(`${p.id}: line numbers not increasing at ${p.lines[i - 1].n} -> ${p.lines[i].n}`);
    }
  }
  for (const l of p.lines) {
    if (!l.latin?.trim()) fail(`${p.id}: empty text at line ${l.n}`);
  }
  // A supplementary passage must say so in its context note.
  if (!p.required && !/not on the official/i.test(p.context)) {
    fail(`${p.id}: supplementary passage does not flag itself in its context note`);
  }
}

/* --- questions --------------------------------------------------- */
for (const q of [...questions, ...sightQs]) {
  if (!q.options.some((o) => o.id === q.answerId)) {
    fail(`question ${q.id}: answerId "${q.answerId}" matches no option`);
  }
  if (new Set(q.options.map((o) => o.id)).size !== q.options.length) {
    fail(`question ${q.id}: duplicate option ids`);
  }
  if (!q.explanation?.trim()) fail(`question ${q.id}: missing explanation`);
  if (q.explanation && q.explanation.length < 40) {
    fail(`question ${q.id}: explanation is too short to teach anything`);
  }
  if (q.skillCategory !== q.skill[0]) {
    fail(`question ${q.id}: skillCategory ${q.skillCategory} does not match skill ${q.skill}`);
  }
  if (q.passageId && !byId.has(q.passageId)) {
    fail(`question ${q.id}: unknown passageId ${q.passageId}`);
  }
  if (q.passageId && q.lineRange) {
    const p = byId.get(q.passageId);
    const [a, b] = q.lineRange;
    if (!p.lines.some((l) => l.n >= a && l.n <= b)) {
      fail(`question ${q.id}: lineRange ${a}-${b} is outside ${p.citation}`);
    }
  }
}

/* --- translation drills ------------------------------------------ */
for (const d of drills) {
  const p = byId.get(d.passageId);
  if (!p) {
    fail(`drill ${d.id}: unknown passageId ${d.passageId}`);
    continue;
  }
  if (d.segments.length !== 15) {
    fail(`drill ${d.id}: ${d.segments.length} segments — the exam scores translation in 15`);
  }
  // The drill's Latin must actually be in its passage.
  const haystack = norm(p.lines.map((l) => l.latin).join(' '));
  if (!haystack.includes(norm(d.latin))) {
    fail(`drill ${d.id}: its Latin is not found verbatim in ${p.citation}`);
  }
  // Every segment must be inside the drill's own Latin, in order.
  const drillNorm = norm(d.latin);
  let cursor = 0;
  for (const s of d.segments) {
    const n = norm(s.latin);
    const at = drillNorm.indexOf(n, cursor);
    if (at < 0) {
      fail(`drill ${d.id}, segment ${s.id}: "${s.latin}" not found in the drill text in order`);
    } else {
      cursor = at + n.length;
    }
    if (!s.literal?.trim()) fail(`drill ${d.id}, segment ${s.id}: missing literal rendering`);
    if (!s.requirement?.trim()) fail(`drill ${d.id}, segment ${s.id}: missing requirement`);
    if (!s.tags?.length) fail(`drill ${d.id}, segment ${s.id}: no grammar tags`);
  }
  // Segments should account for essentially the whole passage.
  const covered = d.segments.reduce((acc, s) => acc + norm(s.latin).length, 0);
  if (covered < drillNorm.length * 0.9) {
    fail(`drill ${d.id}: segments cover only ${Math.round((covered / drillNorm.length) * 100)}% of the Latin`);
  }
}

/* --- scansion ----------------------------------------------------- */
for (const s of scansion) {
  if (s.feet.length !== 6) {
    fail(`scansion ${s.id}: ${s.feet.length} feet, expected 6`);
  }
  if (s.feet[5] !== 'spondee') {
    fail(`scansion ${s.id}: sixth foot is ${s.feet[5]}, must be disyllabic`);
  }
  const metrical = s.syllables.filter((y) => !y.elides);
  const expected = s.feet.reduce((n, f) => n + (f === 'dactyl' ? 3 : 2), 0);
  if (metrical.length !== expected) {
    fail(`scansion ${s.id}: ${metrical.length} metrical syllables but the feet require ${expected}`);
  }
  // The first syllable of every foot must be long.
  let i = 0;
  for (const f of s.feet) {
    if (metrical[i] && metrical[i].quantity !== 'long') {
      fail(`scansion ${s.id}: foot starting at syllable ${i} begins with a short`);
    }
    i += f === 'dactyl' ? 3 : 2;
  }
  // The syllables must reconstruct the line.
  const rebuilt = norm(s.syllables.map((y) => y.text).join(''));
  if (rebuilt !== norm(s.latin)) {
    fail(`scansion ${s.id}: syllables do not reconstruct the line`);
  }
  const p = byId.get(s.passageId);
  if (!p) fail(`scansion ${s.id}: unknown passageId ${s.passageId}`);
  else {
    const line = p.lines.find((l) => `${p.citation.split(' ')[1]?.split('.')[0]}` && norm(l.latin) === norm(s.latin));
    if (!line) fail(`scansion ${s.id}: its Latin does not match any line of ${p.citation}`);
  }
}

/* --- sight passages ---------------------------------------------- */
const allQ = new Map([...questions, ...sightQs].map((q) => [q.id, q]));
for (const sp of sight) {
  if (!sp.latin?.trim()) fail(`sight ${sp.id}: no Latin`);
  if (!sp.summary?.trim()) fail(`sight ${sp.id}: no summary`);
  if (!sp.source?.trim()) fail(`sight ${sp.id}: no source attribution`);
  for (const qid of sp.questionIds ?? []) {
    if (!allQ.has(qid)) fail(`sight ${sp.id}: references unknown question ${qid}`);
  }
}

/* --- vocabulary --------------------------------------------------- */
const seenVocab = new Set();
for (const v of vocab) {
  if (seenVocab.has(v.id)) fail(`duplicate vocabulary id: ${v.id}`);
  seenVocab.add(v.id);
  if (!v.definition?.trim()) fail(`vocab ${v.id}: no definition`);
  if (!v.pos?.trim()) fail(`vocab ${v.id}: no part of speech`);
}

/* --- grammar, devices, context ------------------------------------ */
for (const t of [...grammarTopics, ...deviceCards]) {
  if (!t.examples?.length) fail(`${t.id}: no examples`);
  for (const ex of t.examples ?? []) {
    if (!ex.analysis?.trim()) fail(`${t.id}: example "${ex.latin}" has no analysis`);
    if (ex.passageId && !byId.has(ex.passageId)) {
      fail(`${t.id}: example cites unknown passageId ${ex.passageId}`);
    }
    // When an example names a passage, its Latin must really be in it.
    if (ex.passageId) {
      const p = byId.get(ex.passageId);
      const hay = norm(p.lines.map((l) => l.latin).join(' '));
      const needle = norm(ex.latin.split('…')[0].split('/')[0]);
      if (needle.length > 6 && !hay.includes(needle)) {
        fail(`${t.id}: example "${ex.latin}" is not found in ${p.citation}`);
      }
    }
  }
}
for (const c of contextCards) {
  if (!c.body?.trim()) fail(`context ${c.id}: no body`);
  if (!c.keyFacts?.length) fail(`context ${c.id}: no key facts`);
}

/* --- free response ------------------------------------------------ */
for (const f of frqPrompts) {
  if (!f.rubric?.length) fail(`frq ${f.id}: no rubric`);
  if (!f.subquestions?.length) fail(`frq ${f.id}: no subquestions`);
  if (f.passageId && !byId.has(f.passageId)) fail(`frq ${f.id}: unknown passageId ${f.passageId}`);
  const total = f.rubric.reduce((n, r) => n + r.maxPoints, 0);
  const expected = { 'short-answer': 8, translation: 15, 'short-essay': 8,
                     'project-prose': 11, 'project-poetry': 11 }[f.type];
  if (expected && total !== expected) {
    fail(`frq ${f.id}: rubric totals ${total} points, but ${f.type} is worth ${expected} on the exam`);
  }
}

/* ------------------------------------------------------------------ */

for (const n of notes) console.log(`  ${n}`);
console.log('');
if (failures.length) {
  console.error(`FAILED — ${failures.length} problem(s):`);
  for (const f of failures) console.error(`  • ${f}`);
  process.exit(1);
}
console.log('All content checks passed.');
