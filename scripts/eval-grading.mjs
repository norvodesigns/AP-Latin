/**
 * Measures how accurately the AI graders score.
 *
 *   node scripts/eval-grading.mjs [--base http://localhost:3000] [--runs 1]
 *
 * Grading feeds the classroom accuracy leaderboard, so "it seems to work" is
 * not good enough — a grader that marks a correct translation wrong costs a
 * student real standing, and one that waves errors through teaches nothing.
 *
 * The cases below have objectively known outcomes, built from the drill data
 * itself rather than from anyone's opinion:
 *
 *   perfect    the drill's own continuous model translation. It is by
 *              definition correct, so the grader must award every segment.
 *   truncated  only the opening of that translation. The closing segments are
 *              genuinely absent and must fail; the opening ones must still pass.
 *   empty      nothing relevant submitted. Everything must fail.
 *
 * False negatives (marking a correct segment wrong) are reported separately
 * from false positives (waving an error through), because they are not equally
 * bad: the first is unfair to the student, the second is merely useless.
 */

import { translationDrills } from '../src/data/translation.ts';

const args = process.argv.slice(2);
const arg = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : fallback;
};

const BASE = arg('--base', 'http://localhost:3000');
const RUNS = Number(arg('--runs', '1'));
/** Gap between requests, to stay inside the providers' per-minute caps. */
const PACING_MS = Number(arg('--pacing', '4000'));

/**
 * The cases.
 *
 * All three are derived from the drill's own continuous model translation,
 * because that is what a student actually submits: unlabelled English prose,
 * not a list of segments. An earlier version built cases by concatenating the
 * segments' accepted literals, which was unsound — a literal that is an
 * ellipsis placeholder ("I ... that you"), one carrying an editorial gloss in
 * parentheses, or a pair that overlap all produce text no honest grader should
 * pass, so every "false negative" it found was really a defect in this file.
 */
function buildCases(drill) {
  const segs = drill.segments;
  const model = drill.modelTranslation;
  const cases = [];

  // 1. Perfect — the drill's own model translation. Correct by construction,
  //    so every segment must be awarded. Any miss is a false negative.
  cases.push({
    name: 'perfect',
    translation: model,
    expectCorrect: new Set(segs.map((s) => s.id)),
    expectWrong: new Set(),
  });

  // 2. Truncated — only the opening of the translation is submitted. Segments
  //    are ordered, so the passage's closing segments are simply not there and
  //    must fail; the opening ones must still pass. Judging only the outer
  //    thirds leaves the middle, where the cut lands and alignment is genuinely
  //    ambiguous, out of the score.
  const words = model.split(/\s+/);
  if (words.length > 20 && segs.length >= 6) {
    const head = Math.max(3, Math.floor(segs.length / 3));
    cases.push({
      name: 'truncated',
      translation: words.slice(0, Math.floor(words.length * 0.45)).join(' '),
      expectCorrect: new Set(segs.slice(0, 2).map((s) => s.id)),
      expectWrong: new Set(segs.slice(-head).map((s) => s.id)),
    });
  }

  // 3. Nothing relevant submitted. Everything must fail.
  cases.push({
    name: 'empty',
    translation: 'I do not know this passage.',
    expectCorrect: new Set(),
    expectWrong: new Set(segs.map((s) => s.id)),
  });

  return cases;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * The grading route is rate limited (GRADING_RULE: 20 calls / 10 minutes per
 * IP). Rather than punching a bypass through a production route for the sake
 * of a test, the eval waits out the window it is told about. That keeps the
 * app with exactly one code path and means the limiter is exercised too.
 */
async function grade(drillId, translation) {
  for (let attempt = 0; ; attempt += 1) {
    const res = await fetch(`${BASE}/api/ai/grade-translation`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ drillId, translation }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) return body;

    if (res.status === 429 && attempt < 8) {
      /*
       * Two different 429s reach here and they need different waits.
       *
       * The route's own limiter reports `retryAfterSeconds`, so honour it.
       * A 429 without that field came from the provider instead — Gemini's
       * free tier allows only 20 requests a minute — and the fix there is to
       * stop bursting, not to retry sooner. Retrying hard on a provider 429
       * is what pushed the fallback into its own rate limit and made a whole
       * run unmeasurable.
       */
      const fromRoute = Number(body.retryAfterSeconds) > 0;
      const wait = fromRoute ? Number(body.retryAfterSeconds) + 2 : 65;
      process.stdout.write(
        `  … ${fromRoute ? 'route' : 'provider'} rate limit, waiting ${wait}s\n`,
      );
      await sleep(wait * 1000);
      continue;
    }
    throw new Error(`${res.status}: ${body.error ?? 'unknown'}`);
  }
}

/* ------------------------------------------------------------------ */

const totals = {
  cases: 0,
  segments: 0,
  agree: 0,
  falseNegative: 0, // grader marked wrong something that is right
  falsePositive: 0, // grader marked right something that is wrong
  failures: [],
};

console.log(`\n  Grading eval against ${BASE}`);
console.log(`  ${translationDrills.length} drills × cases × ${RUNS} run(s)\n`);

for (const drill of translationDrills) {
  for (const testCase of buildCases(drill)) {
    for (let run = 0; run < RUNS; run += 1) {
      let result;
      try {
        // Stay well inside the providers' per-minute caps. A burst trips the
        // primary, then the fallback, and the run stops measuring anything.
        if (totals.cases > 0) await sleep(PACING_MS);
        result = await grade(drill.id, testCase.translation);
      } catch (e) {
        console.log(`  ✗ ${drill.citation} / ${testCase.name}: ${e.message}`);
        totals.failures.push(`${drill.id}/${testCase.name}: ${e.message}`);
        continue;
      }

      totals.cases += 1;
      // The response schema keys each judgement by `segmentId` (see
      // translationGradeSchema in src/lib/ai/schemas.ts), not `id`.
      const byId = new Map((result.segments ?? []).map((s) => [s.segmentId, s]));
      let fn = 0;
      let fp = 0;

      for (const id of testCase.expectCorrect) {
        totals.segments += 1;
        const got = byId.get(id);
        // "partial" on a segment built from its own accepted literal is still
        // a miss: the text is exactly what the key calls correct.
        if (got && got.verdict === 'correct') totals.agree += 1;
        else {
          fn += 1;
          totals.falseNegative += 1;
        }
      }
      for (const id of testCase.expectWrong) {
        totals.segments += 1;
        const got = byId.get(id);
        if (got && got.verdict !== 'correct') totals.agree += 1;
        else {
          fp += 1;
          totals.falsePositive += 1;
        }
      }

      const mark = fn === 0 && fp === 0 ? '✓' : '·';
      console.log(
        `  ${mark} ${drill.citation.padEnd(22)} ${testCase.name.padEnd(9)}` +
          ` ${String(fn).padStart(2)} false-neg  ${String(fp).padStart(2)} false-pos` +
          `  [${result._meta?.provider ?? '?'}]`,
      );
      if (fn > 0) {
        for (const id of testCase.expectCorrect) {
          const got = byId.get(id);
          if (!got || got.verdict !== 'correct') {
            const seg = drill.segments.find((s) => s.id === id);
            console.log(
              `        marked "${seg.literal}" as ${got?.verdict ?? 'not returned'} — ${got?.reason ?? ''}`,
            );
          }
        }
      }
    }
  }
}

const pct = (n) => (totals.segments ? `${((n / totals.segments) * 100).toFixed(1)}%` : 'n/a');
console.log(`
  ── Results ──────────────────────────────
  cases run          ${totals.cases}
  segment judgements ${totals.segments}
  agreed with key    ${totals.agree}  (${pct(totals.agree)})
  false negatives    ${totals.falseNegative}  (${pct(totals.falseNegative)})  marked a correct segment wrong
  false positives    ${totals.falsePositive}  (${pct(totals.falsePositive)})  let an error through
`);
if (totals.failures.length) {
  console.log(`  ${totals.failures.length} request failure(s):`);
  for (const f of totals.failures) console.log(`    ${f}`);
}
process.exit(totals.falseNegative + totals.falsePositive > 0 ? 1 : 0);
