/**
 * Checks the generated scansion corpus against the hand-verified lines.
 *
 *   node scripts/verify-scansion.mjs
 *
 * src/data/scansion.ts holds 22 lines of Aeneid 1 whose quantities were read
 * off a macronised source and checked by hand. The generator derives its
 * answers from the metre alone, with no macrons — so those 22 lines are a real
 * test of whether that derivation is sound. Every foot and every quantity must
 * match, or the corpus is not trustworthy and the build should fail.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';

const OUT = process.argv.includes('--out')
  ? process.argv[process.argv.indexOf('--out') + 1]
  : 'public/scansion';

const { scansionLines } = await import('../src/data/scansion.ts');
// Decode through the same unpacker the app uses, so this checks the round trip
// as well as the scansion itself — a decoder bug would fail here too.
const { unpackLine } = await import('../src/data/scansionCorpus.ts');

const book1 = JSON.parse(await readFile(path.join(OUT, 'aen1.json'), 'utf8'));
const generated = new Map(book1.l.map((l) => [l.i, unpackLine(1, l)]));

let checked = 0;
let missing = 0;
const failures = [];

for (const known of scansionLines) {
  const n = Number(known.citation.split('.')[1]);
  const gen = generated.get(n);
  if (!gen) {
    missing += 1;
    continue;
  }
  checked += 1;

  const problems = [];

  if (gen.feet.join(' ') !== known.feet.join(' ')) {
    problems.push(`feet\n      expected ${known.feet.join(' ')}\n      got      ${gen.feet.join(' ')}`);
  }

  // Compare the metrical syllables: text, quantity and elision must agree.
  const a = known.syllables;
  const b = gen.syllables;
  if (a.length !== b.length) {
    problems.push(`syllable count: expected ${a.length}, got ${b.length}`);
  } else {
    for (let i = 0; i < a.length; i += 1) {
      if (a[i].elides !== b[i].elides) {
        problems.push(`syllable ${i} "${a[i].text}": elision ${a[i].elides} vs ${b[i].elides}`);
        continue;
      }
      if (a[i].elides) continue;
      // The line's last syllable is anceps: it counts long however it scans,
      // so either mark is right and the two sources may legitimately differ.
      if (b[i].anceps) continue;
      if (a[i].quantity !== b[i].quantity) {
        problems.push(`syllable ${i} "${a[i].text}": ${a[i].quantity} vs ${b[i].quantity}`);
      }
    }
  }

  if (problems.length) failures.push({ citation: known.citation, problems });
}

console.log(`\n  hand-verified lines: ${scansionLines.length}`);
console.log(`  present in corpus:   ${checked}`);
console.log(`  absent (ambiguous):  ${missing}`);

if (failures.length) {
  console.error(`\n  ${failures.length} MISMATCH(ES):\n`);
  for (const f of failures) {
    console.error(`  ${f.citation}`);
    for (const p of f.problems) console.error(`    - ${p}`);
  }
  console.error('\n  The derived scansion disagrees with the verified data. Do not ship this corpus.\n');
  process.exit(1);
}

console.log(`\n  All ${checked} agree with the hand-verified data.\n`);
