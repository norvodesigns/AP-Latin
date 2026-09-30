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
const { caesarPassages: caesar } = await load('src/data/passages/caesar.ts');
const { catullusPassages: catullus } = await load('src/data/passages/catullus.ts');
const passages = [...vergil, ...pliny, ...caesar, ...catullus];
const byId = new Map(passages.map((p) => [p.id, p]));

const { coreVocabulary: vocab } = await load('src/data/vocabulary.ts');
const { supplementaryVocabulary: suppVocab } = await load('src/data/supplementaryVocabulary.ts');
const { VOCAB_DISAMBIGUATION: disambig } = await load('src/data/vocabDisambiguation.ts');
const { questions } = await load('src/data/questions.ts');
const { translationDrills: drills } = await load('src/data/translation.ts');
const { scansionLines: scansion } = await load('src/data/scansion.ts');
const { sightPassages: sight, sightQuestions: sightQs } = await load('src/data/sight.ts');
const { grammarTopics } = await load('src/data/grammar.ts');
const { deviceCards } = await load('src/data/devices.ts');
const { contextCards } = await load('src/data/context.ts');
const { frqPrompts } = await load('src/data/frq.ts');

notes.push(`${passages.length} passages (${passages.filter((p) => p.required).length} required)`);
notes.push(`${vocab.length} core vocabulary entries, ${suppVocab.length} supplementary`);
notes.push(`${disambig.length} per-line disambiguation overrides`);
notes.push(`${questions.length + sightQs.length} questions`);
notes.push(`${drills.length} translation drills`);
notes.push(`${scansion.length} scanned lines`);
notes.push(`${sight.length} vetted sight passages`);
notes.push(`${grammarTopics.length} grammar topics, ${deviceCards.length} device cards, ${contextCards.length} context cards`);
notes.push(`${frqPrompts.length} free-response prompts (5 graded per sitting; short-essay offers 2 alternates)`);

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
  // A required passage must carry the CED reading number that put it there.
  if (p.required && (!p.cedReading?.trim() || !p.unit)) {
    fail(`${p.id}: required passage is missing cedReading/unit`);
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
// A lemma's headword may legitimately be an inflected form actually attested
// in a passage (e.g. "Dardanidum", genitive plural, alongside the dictionary
// headword "Dardanidae") rather than the lemma's own first word, so the
// check tolerates a shared stem instead of requiring exact equality.
function lemmaHead(lemma) {
  return lemma.replace(/\([^)]*\)/g, '').split(',')[0].split(/\bor\b/)[0].trim();
}
function sharesStem(a, b) {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i >= 4 && i >= Math.min(a.length, b.length) * 0.6;
}

const seenVocab = new Set();
const allVocab = [...vocab, ...suppVocab];
for (const v of allVocab) {
  if (seenVocab.has(v.id)) fail(`duplicate vocabulary id (core+supplementary): ${v.id}`);
  seenVocab.add(v.id);
  if (!v.definition?.trim()) fail(`vocab ${v.id}: no definition`);
  if (!v.pos?.trim()) fail(`vocab ${v.id}: no part of speech`);
  const first = norm(lemmaHead(v.lemma));
  const head = norm(v.headword);
  if (first !== head && !sharesStem(first, head)) {
    fail(`vocab ${v.id}: lemma "${v.lemma}" does not start with headword "${v.headword}"`);
  }
}

/* --- per-line disambiguation overrides ----------------------------- */
const byNormHeadword = new Map();
for (const v of allVocab) {
  const key = norm(v.headword);
  if (!byNormHeadword.has(key)) byNormHeadword.set(key, []);
  byNormHeadword.get(key).push(v);
}
const seenDisambig = new Set();
for (const d of disambig) {
  const dupKey = `${d.passageId}|${d.lineN}|${d.word}|${d.tokenIndex ?? ''}`;
  if (seenDisambig.has(dupKey)) fail(`disambiguation: duplicate entry for ${dupKey}`);
  seenDisambig.add(dupKey);

  if (norm(d.word) !== d.word) {
    fail(`disambiguation ${dupKey}: word "${d.word}" is not pre-normalized (expected "${norm(d.word)}")`);
  }
  const p = byId.get(d.passageId);
  if (!p) {
    fail(`disambiguation ${dupKey}: unknown passageId ${d.passageId}`);
    continue;
  }
  if (!p.lines.some((l) => l.n === d.lineN)) {
    fail(`disambiguation ${dupKey}: line ${d.lineN} does not exist in ${p.citation}`);
  }
  const candidates = byNormHeadword.get(norm(d.headword)) ?? [];
  if (candidates.length === 0) {
    fail(`disambiguation ${dupKey}: headword "${d.headword}" matches no dictionary entry`);
  } else {
    const matches = candidates.filter(
      (v) => (!d.pos || v.pos === d.pos) && (!d.entryId || v.id === d.entryId)
    );
    if (matches.length === 0) {
      fail(`disambiguation ${dupKey}: no entry for headword "${d.headword}" with pos/entryId as given`);
    }
  }
  if (d.entryId && !seenVocab.has(d.entryId)) {
    fail(`disambiguation ${dupKey}: entryId "${d.entryId}" matches no vocabulary id`);
  }
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

// The graded Practice Exam administers exactly one prompt per FRQ type — a
// type with more than one stored prompt (short-essay currently has two, a
// Pliny option and a Vergil option) is alternate practice material for that
// one slot, not extra questions. This only checks the data shape (exactly
// five distinct types, summing to the CED's 53-point Section II); the
// one-prompt-per-type selection itself lives in PracticeExam.tsx.
{
  const types = [...new Set(frqPrompts.map((f) => f.type))];
  if (types.length !== 5) {
    fail(`frq: expected exactly 5 FRQ types on the graded exam, found ${types.length} (${types.join(', ')})`);
  }
  const perTypeMax = new Map();
  for (const f of frqPrompts) {
    const total = f.rubric.reduce((n, r) => n + r.maxPoints, 0);
    if (!perTypeMax.has(f.type)) perTypeMax.set(f.type, total);
  }
  const gradedTotal = [...perTypeMax.values()].reduce((n, v) => n + v, 0);
  if (gradedTotal !== 53) {
    fail(`frq: the graded exam (one prompt per type) totals ${gradedTotal} points, expected 53`);
  }
}

/* --- the course (src/data/curriculum) ------------------------------ */
{
  const { readdirSync, existsSync } = await import('fs');
  const levelsDir = join(root, 'src/data/curriculum');
  const coreIds = new Set(vocab.map((v) => v.id));
  // The answer checker the lesson player uses: every exercise must accept
  // its own model answer, or no student could ever get it right.
  const { checkTyped, checkTranslation, checkBuild } = await load('src/lib/lessonCheck.ts');
  const seenLessons = new Set();
  let lessonCount = 0;
  let exerciseCount = 0;

  // `*` pairs for italics and bold must balance; the `|` ending marker is
  // only meaningful in tables and examples.
  const checkMarkup = (where, text) => {
    if (typeof text !== 'string' || !text.trim()) return fail(`${where}: empty text`);
    if ((text.match(/\*/g) ?? []).length % 2) fail(`${where}: unbalanced * in "${text}"`);
  };
  const noBar = (where, text) => {
    if (text.includes('|')) fail(`${where}: a | ending marker outside a table or example`);
  };

  for (const levelId of readdirSync(levelsDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)) {
    const files = readdirSync(join(levelsDir, levelId)).filter((f) => /^unit\d+\.ts$/.test(f));
    for (const file of files) {
      const { unit } = await load(`src/data/curriculum/${levelId}/${file}`);
      const n = Number(file.match(/\d+/)[0]);
      if (unit.id !== `${levelId}-${n}` || unit.n !== n) fail(`${levelId}/${file}: unit id should be ${levelId}-${n}`);
      if (!unit.title?.trim() || !unit.blurb?.trim()) fail(`${unit.id}: missing title or blurb`);
      unit.lessons.forEach((lesson, li) => {
        lessonCount += 1;
        const id = lesson.id;
        if (id !== `${unit.id}-${li + 1}`) fail(`${id}: lesson ids run in order; expected ${unit.id}-${li + 1}`);
        if (seenLessons.has(id)) fail(`duplicate lesson id ${id}`);
        seenLessons.add(id);
        if (!lesson.title?.trim() || !lesson.summary?.trim()) fail(`${id}: missing title or summary`);
        if (!(lesson.minutes >= 1 && lesson.minutes <= 30)) fail(`${id}: minutes out of range`);
        if (!lesson.objectives?.length) fail(`${id}: no objectives`);
        for (const w of lesson.words) {
          if (!w.latin?.trim() || !w.english?.trim()) fail(`${id}: a word is missing its Latin or English`);
          if (w.vocabId && !coreIds.has(w.vocabId)) fail(`${id}: word "${w.latin}" links to unknown vocabulary id "${w.vocabId}"`);
        }
        const exercises = lesson.steps.filter((s) => s.kind !== 'teach' && s.kind !== 'read');
        exerciseCount += exercises.length;
        if (exercises.length < 3) fail(`${id}: only ${exercises.length} exercises`);
        lesson.steps.forEach((s, si) => {
          const at = `${id} step ${si + 1} (${s.kind})`;
          switch (s.kind) {
            case 'teach':
              checkMarkup(`${at} title`, s.title);
              if (!s.body?.length) fail(`${at}: no body`);
              s.body?.forEach((p) => { checkMarkup(at, p); noBar(at, p); });
              if (s.tip) { checkMarkup(`${at} tip`, s.tip); noBar(at, s.tip); }
              if (s.table) {
                for (const r of s.table.rows) {
                  if (r.cells.length !== s.table.cols.length) fail(`${at}: table row "${r.label}" has ${r.cells.length} cells for ${s.table.cols.length} columns`);
                }
              }
              for (const e of s.examples ?? []) {
                if (!e.la?.trim() || !e.en?.trim()) fail(`${at}: an example is missing its Latin or English`);
                if (e.note) checkMarkup(`${at} note`, e.note);
              }
              break;
            case 'read':
              if ((s.lines?.length ?? 0) < 2) fail(`${at}: a reading needs at least two lines`);
              for (const l of s.lines ?? []) if (!l.la?.trim() || !l.en?.trim()) fail(`${at}: a line is missing its Latin or English`);
              // Readings and their glosses are shown as plain text: no markup.
              for (const t of [...(s.lines ?? []).flatMap((l) => [l.la, l.en]), ...(s.gloss ?? []).flatMap((g) => [g.word, g.meaning])]) {
                if (/[*|]/.test(t ?? '')) fail(`${at}: markup in plain text "${t}"`);
              }
              break;
            case 'choice': {
              checkMarkup(`${at} prompt`, s.prompt);
              checkMarkup(`${at} explain`, s.explain);
              if (s.options.length < 2) fail(`${at}: fewer than two options`);
              // Exact, not folded: macrons can be the whole point (ven- vs vēn-).
              const trimmed = s.options.map((o) => o.trim().toLowerCase());
              if (new Set(trimmed).size !== trimmed.length) fail(`${at}: duplicate options`);
              s.options.forEach((o) => checkMarkup(`${at} option`, o));
              if (!Number.isInteger(s.answer) || s.answer < 0 || s.answer >= s.options.length) fail(`${at}: answer ${s.answer} is not an option`);
              break;
            }
            case 'type':
              checkMarkup(`${at} prompt`, s.prompt);
              checkMarkup(`${at} explain`, s.explain);
              if (!s.answers?.length || s.answers.some((a) => !norm(a))) fail(`${at}: needs at least one non-empty answer`);
              else if (!s.answers.every((a) => checkTyped(a, s.answers))) fail(`${at}: an answer is rejected by the checker`);
              break;
            case 'translate':
              if (!s.latin?.trim()) fail(`${at}: no Latin`);
              if (!s.answers?.length || s.answers.some((a) => !a.trim())) fail(`${at}: needs at least one translation`);
              else if (!s.answers.every((a) => checkTranslation(a, s.answers))) fail(`${at}: a translation is rejected by the checker`);
              if (s.explain) checkMarkup(`${at} explain`, s.explain);
              break;
            case 'build': {
              checkMarkup(`${at} prompt`, s.prompt);
              if (!s.answer?.length) fail(`${at}: no answer tiles`);
              if (s.lang !== 'la' && s.lang !== 'en') fail(`${at}: lang must be la or en`);
              const fold = (w) => (s.lang === 'la' ? norm(w) : w.toLowerCase().replace(/[^a-z0-9']/g, ''));
              const needed = new Set(s.answer.map(fold));
              for (const x of s.extra ?? []) if (needed.has(fold(x))) fail(`${at}: decoy "${x}" is also a word of the answer`);
              if (!checkBuild(s.answer, s)) fail(`${at}: the answer, in order, is rejected by the checker`);
              if (s.explain) checkMarkup(`${at} explain`, s.explain);
              break;
            }
            case 'match': {
              checkMarkup(`${at} prompt`, s.prompt);
              if (s.pairs.length < 3 || s.pairs.length > 6) fail(`${at}: 3 to 6 pairs, not ${s.pairs.length}`);
              const lefts = s.pairs.map((p) => p[0]);
              const rights = s.pairs.map((p) => p[1]);
              if (new Set(lefts).size !== lefts.length || new Set(rights).size !== rights.length) fail(`${at}: a left or right side repeats`);
              break;
            }
            default:
              fail(`${at}: unknown step kind`);
          }
        });
      });
    }
    if (!existsSync(join(levelsDir, levelId, 'index.ts'))) fail(`curriculum/${levelId}: no index.ts`);
  }
  notes.push(`${lessonCount} course lessons, ${exerciseCount} exercises`);

  // The placement check: every question names a unit that exists, in course
  // order, and its answer is one of its options.
  const { PLACEMENT } = await load('src/data/curriculum/placement.ts');
  const unitOrder = [];
  for (const levelId of readdirSync(levelsDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)) {
    for (const file of readdirSync(join(levelsDir, levelId)).filter((f) => /^unit\d+\.ts$/.test(f)).sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]))) {
      unitOrder.push(`${levelId}-${Number(file.match(/\d+/)[0])}`);
    }
  }
  let lastIndex = -1;
  PLACEMENT.forEach((p, i) => {
    const at = `placement question ${i + 1}`;
    const idx = unitOrder.indexOf(p.unit);
    if (idx < 0) fail(`${at}: unknown unit ${p.unit}`);
    if (idx < lastIndex) fail(`${at}: out of course order`);
    lastIndex = Math.max(lastIndex, idx);
    if (!Number.isInteger(p.step.answer) || p.step.answer < 0 || p.step.answer >= p.step.options.length) fail(`${at}: answer is not an option`);
  });
  notes.push(`${PLACEMENT.length} placement questions`);

  /* --- Forms Forge (src/data/forms) --- */
  const { PARADIGMS, cellForms } = await load('src/data/forms/index.ts');
  const paradigmIds = new Set();
  let cellCount = 0;
  for (const p of PARADIGMS) {
    const at = `forms: ${p.id}`;
    if (paradigmIds.has(p.id)) fail(`${at}: duplicate id`);
    paradigmIds.add(p.id);
    if (!p.lemma?.trim() || !p.gloss?.trim() || !p.title?.trim()) fail(`${at}: missing lemma, gloss or title`);
    if (p.lesson && !seenLessons.has(p.lesson)) fail(`${at}: unknown lesson ${p.lesson}`);
    if (p.names.length !== p.rows.length) fail(`${at}: ${p.names.length} name rows for ${p.rows.length} rows`);
    p.rows.forEach((r, ri) => {
      if (r.cells.length !== p.cols.length) fail(`${at} ${r.label}: ${r.cells.length} cells for ${p.cols.length} columns`);
      if ((p.names[ri]?.length ?? 0) !== p.cols.length) fail(`${at} ${r.label}: names don't match the columns`);
      for (const c of r.cells) {
        cellCount += 1;
        if (!cellForms(c).length || /[*]/.test(c)) fail(`${at} ${r.label}: bad cell "${c}"`);
      }
    });
  }
  // Forms written out by hand, to catch a slip in the engine's rules.
  const SPOT = [
    ['puella', 1, 1, 'puellārum'], ['servus', 3, 1, 'servōs'], ['puer', 1, 0, 'puerī'], ['ager', 1, 0, 'agrī'],
    ['bellum', 0, 1, 'bella'], ['rex', 4, 0, 'rēge'], ['nomen', 0, 1, 'nōmina'], ['urbs', 1, 1, 'urbium'],
    ['mare', 4, 0, 'marī'], ['manus', 2, 0, 'manuī'], ['res', 1, 0, 'reī'], ['dies', 1, 0, 'diēī'],
    ['bonus', 4, 1, 'bonā'], ['noster', 1, 0, 'nostrī'], ['fortis', 5, 1, 'fortia'], ['acer', 0, 1, 'ācris'],
    ['ingens', 3, 0, 'ingentem'], ['altior', 5, 1, 'altiōra'],
    ['amo-pres-act', 5, 0, 'amant'], ['amo-pres-act', 2, 1, 'amābat'], ['amo-pres-act', 4, 2, 'amābitis'],
    ['moneo-pres-pass', 1, 0, 'monēris'], ['rego-pres-act', 2, 2, 'reget'], ['rego-pres-pass', 1, 2, 'regēris'],
    ['capio-pres-act', 0, 1, 'capiēbam'], ['audio-pres-act', 5, 0, 'audiunt'], ['capio-pres-pass', 1, 0, 'caperis'],
    ['amo-subj-act', 2, 0, 'amet'], ['amo-subj-act', 3, 1, 'amārēmus'], ['amo-subj-act', 5, 2, 'amāverint'],
    ['amo-subj-act', 2, 3, 'amāvisset'], ['rego-subj-pass', 2, 0, 'regātur'], ['moneo-subj-act', 0, 0, 'moneam'],
    ['amo-perf-act', 5, 0, 'amāvērunt'], ['amo-perf-pass', 2, 0, 'amātus est'], ['sequor-pres', 5, 0, 'sequuntur'],
    ['hortor-pres', 1, 2, 'hortāberis'], ['audio-subj-act', 0, 1, 'audīrem'],
  ];
  for (const [id, r, c, want] of SPOT) {
    const got = PARADIGMS.find((p) => p.id === id)?.rows[r]?.cells[c];
    if (!got || !cellForms(got).includes(want)) fail(`forms: ${id} [${r},${c}] is "${got}", expected "${want}"`);
  }
  notes.push(`${PARADIGMS.length} Forms Forge tables, ${cellCount} forms`);
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
