/**
 * Spreads the right answers of multiple-choice items evenly across positions.
 *
 *   node scripts/rebalance-answers.mjs [files…]
 *
 * Neither the quiz, the practice exam, the placement check nor the lesson
 * player shuffles options (an explanation or a lesson can then talk about
 * them in a fixed order), so the order written in the data is the order a
 * student sees. Written by hand, right answers bunch up: at one point all 59
 * original quiz questions, every sight question and whole units of the course
 * had the answer in the same slot, so "always pick A" scored full marks.
 *
 * For each item the right option is moved to a target slot and the wrong
 * ones keep their order. Targets come from shuffled blocks of slots (one of
 * each per block), seeded by the file name, so a file comes out balanced
 * without a visible rotation. Lists with a natural order of their own (cases,
 * persons, tenses, numbers, singular/plural) are left as written.
 *
 * Rewrites the files in place; `npm run verify` checks the result.
 */
import ts from 'typescript';
import { readFileSync, writeFileSync } from 'node:fs';

const ORDERS = [
  ['nominative', 'genitive', 'dative', 'accusative', 'ablative', 'vocative', 'locative'],
  ['first', 'second', 'third', 'fourth', 'fifth'],
  ['1st', '2nd', '3rd', '4th', '5th'],
  ['masculine', 'feminine', 'neuter'],
  ['singular', 'plural'],
  ['present', 'imperfect', 'future', 'perfect', 'pluperfect', 'future perfect'],
  ['indicative', 'subjunctive', 'imperative', 'infinitive', 'participle'],
  ['active', 'passive'],
  ['positive', 'comparative', 'superlative'],
  ['yes', 'no'],
  ['true', 'false'],
  ['long', 'short'],
  ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
    'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'],
];

const bare = (s) => s.toLowerCase().replace(/[*_.,;:!?“”"'’]/g, '').trim();

/** True when the options are an ascending run from one natural sequence, or numbers. */
function hasNaturalOrder(texts) {
  const b = texts.map(bare);
  if (b.every((t) => /^-?\d+(\.\d+)?$/.test(t))) {
    const n = b.map(Number);
    return n.every((x, i) => i === 0 || x > n[i - 1]);
  }
  for (const order of ORDERS) {
    const idx = b.map((t) => order.indexOf(t));
    if (idx.every((x) => x >= 0) && idx.every((x, i) => i === 0 || x > idx[i - 1])) return true;
  }
  // "Seventeen", "Twenty-two": number words, possibly hyphenated.
  const words = ORDERS[ORDERS.length - 1];
  const num = (t) => t.split('-').reduce((a, w) => a + (words.indexOf(w) + 1 || (w === 'thirty' ? 30 : NaN)), 0);
  const n = b.map(num);
  if (n.every((x) => Number.isFinite(x) && x > 0)) return n.every((x, i) => i === 0 || x > n[i - 1]);
  return false;
}

function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (s) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);

/** Balanced targets per option count: shuffled blocks of 0..k-1. */
function targets(file) {
  const rnd = mulberry32(hash(file));
  const queues = new Map();
  return (k) => {
    let q = queues.get(k);
    if (!q || q.length === 0) {
      q = [...Array(k).keys()];
      for (let i = q.length - 1; i > 0; i -= 1) {
        const j = Math.floor(rnd() * (i + 1));
        [q[i], q[j]] = [q[j], q[i]];
      }
      queues.set(k, q);
    }
    return q.shift();
  };
}

const isStr = (n) => ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n);
const prop = (obj, name) =>
  obj.properties.find((p) => ts.isPropertyAssignment(p) && p.name && p.name.getText() === name)?.initializer;

/** Collect every item as { texts: [node…], answer: node, kind }. */
function items(sf, file) {
  const out = [];
  const visit = (node) => {
    if (ts.isObjectLiteralExpression(node)) {
      const kind = prop(node, 'kind');
      const options = prop(node, 'options');
      const answer = prop(node, 'answer');
      if (kind && isStr(kind) && kind.text === 'choice' && options && ts.isArrayLiteralExpression(options)
        && answer && ts.isNumericLiteral(answer) && options.elements.every(isStr)) {
        out.push({ els: [...options.elements], answer, form: 'index' });
      }
      const answerId = prop(node, 'answerId');
      if (options && ts.isArrayLiteralExpression(options) && answerId && isStr(answerId)
        && options.elements.every((e) => ts.isObjectLiteralExpression(e) && prop(e, 'text') && prop(e, 'id'))) {
        out.push({ els: options.elements.map((e) => prop(e, 'text')), ids: options.elements.map((e) => prop(e, 'id')), answer: answerId, form: 'id' });
      }
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && ['q', 'sq'].includes(node.expression.text)) {
      const a = node.arguments;
      // q(id, type, skill, unit, prompt, options, answerIndex, explanation, extra?) — the quiz banks
      // sq(passageId, id, type, skill, prompt, options, answerIndex, explanation, difficulty) — sight
      // q(unit, prompt, latin, options, answer, explain) — the placement check
      const [oi, ai] = a.length >= 8 ? [5, 6] : a.length === 6 ? [3, 4] : [-1, -1];
      if (oi >= 0 && ts.isArrayLiteralExpression(a[oi]) && a[oi].elements.every(isStr) && ts.isNumericLiteral(a[ai])) {
        out.push({ els: [...a[oi].elements], answer: a[ai], form: 'index' });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

let moved = 0;
let kept = 0;
for (const file of process.argv.slice(2)) {
  const src = readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true);
  const next = targets(file);
  const edits = [];
  for (const it of items(sf, file)) {
    const k = it.els.length;
    const texts = it.els.map((e) => e.text);
    const right = it.form === 'index' ? Number(it.answer.text) : it.ids.findIndex((i) => i.text === it.answer.text);
    if (k < 2 || right < 0 || right >= k || hasNaturalOrder(texts)) { kept += 1; continue; }
    const t = next(k);
    if (t === right) continue;
    const order = it.els.map((_, i) => i).filter((i) => i !== right);
    order.splice(t, 0, right);
    it.els.forEach((e, i) => edits.push({ start: e.getStart(sf), end: e.getEnd(), text: it.els[order[i]].getText(sf) }));
    if (it.form === 'index') edits.push({ start: it.answer.getStart(sf), end: it.answer.getEnd(), text: String(t) });
    else {
      const q = it.answer.getText(sf)[0];
      edits.push({ start: it.answer.getStart(sf), end: it.answer.getEnd(), text: `${q}${it.ids[t].text}${q}` });
    }
    moved += 1;
  }
  edits.sort((a, b) => b.start - a.start);
  let out = src;
  for (const e of edits) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  if (out !== src) writeFileSync(file, out);
}
console.log(`moved ${moved} answers; ${kept} lists kept in their natural order`);
