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
 *   perfect    every segment rendered with its own accepted literal. The
 *              grader must award every segment. Any miss is a false negative.
 *   omission   two segments deleted outright. Those two must be marked wrong
 *              and — just as importantly — the rest must still be marked right.
 *   tense      a present verb rendered as a past. That segment must fail.
 *   empty      nothing submitted. Everything must fail.
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

/** Turn a present-tense English rendering into a past one. */
function pastify(text) {
  const swaps = [
    [/\bI sing\b/g, 'I sang'],
    [/\bsings\b/g, 'sang'],
    [/\bis\b/g, 'was'],
    [/\bare\b/g, 'were'],
    [/\bcomes\b/g, 'came'],
    [/\bI tell\b/g, 'I told'],
    [/\bI am\b/g, 'I was'],
  ];
  for (const [re, to] of swaps) {
    if (re.test(text)) return text.replace(re, to);
  }
  return null;
}

function buildCases(drill) {
  const segs = drill.segments;
  const all = segs.map((s) => s.literal);
  const cases = [];

  // 1. Perfect — assembled from the accepted literals themselves.
  cases.push({
    name: 'perfect',
    translation: all.join(' '),
    expectCorrect: new Set(segs.map((s) => s.id)),
    expectWrong: new Set(),
  });

  // 2. Omission — two segments removed.
  if (segs.length >= 6) {
    const dropped = [segs[2].id, segs[Math.min(6, segs.length - 1)].id];
    cases.push({
      name: 'omission',
      translation: segs.filter((s) => !dropped.includes(s.id)).map((s) => s.literal).join(' '),
      expectCorrect: new Set(segs.filter((s) => !dropped.includes(s.id)).map((s) => s.id)),
      expectWrong: new Set(dropped),
    });
  }

  // 3. Tense error in exactly one segment.
  const tenseIdx = segs.findIndex((s) => pastify(s.literal));
  if (tenseIdx >= 0) {
    const broken = [...all];
    broken[tenseIdx] = pastify(segs[tenseIdx].literal);
    cases.push({
      name: 'tense',
      translation: broken.join(' '),
      expectCorrect: new Set(segs.filter((_, i) => i !== tenseIdx).map((s) => s.id)),
      expectWrong: new Set([segs[tenseIdx].id]),
    });
  }

  // 4. Nothing submitted.
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

    if (res.status === 429 && attempt < 4) {
      const wait = Math.max(5, Number(body.retryAfterSeconds) || 60) + 2;
      process.stdout.write(`  … rate limited, waiting ${wait}s\n`);
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
