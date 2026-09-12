# Master fix pass — summary

This is the record of a ten-phase remediation pass run against an external audit ("LECTIO —
MASTER FIX PASS") of the whole app: content accuracy, security, and a few UI bugs. Ground rules
were to work directly on `main`, one commit per phase, `npm run verify && npm run verify:scansion`
after every phase, and a stop-and-ask checkpoint before the required-reading list (Phase 3), the
supplementary lexicon codemod (Phase 7), and macronizing every Aeneid passage (Phase 8).

The single most important thing this pass found is not in any phase below: **the audit's specific
claims were wrong more often than they were right.** Not wrong in spirit — the categories of
problem it named were mostly real — but wrong in the specifics: line numbers, word spellings,
counts, root causes, even whether a described entry exists at all. Every phase here starts from
independent verification against the actual codebase, the actual passage text, or the actual CED
PDF, not from trusting the brief's description of what it found. Where the brief's specific claim
didn't hold up, that's stated plainly below rather than silently corrected or silently complied
with.

## What changed, phase by phase

**Phase 0 — production sum fix.** The brief's premise (a branch with an unmerged fix) was stale:
the fix was already on `main`. Confirmed and moved on. No commit.

**Phase 1 — corrupted core vocabulary rows** (`d5902d2`). `hic` was missing its adverbial sense
("here"), `ne` was missing its prohibitive-imperative sense, `paro`'s principal parts were
literally `quaero`'s (copy-paste error), and four entries had part-of-speech tags that didn't match
their own definitions (`etiam`, `contra`, `rursusorrursum`, `tot`). Fixed all seven; added the two
missing senses as their own entries rather than overloading one entry with two parts of speech.

**Phase 2 — unauthenticated AI routes** (`f13639c`). The brief's premise (no rate limiting) was
also stale — `src/lib/ai/guard.ts` already rate-limits every AI route by IP. The one real gap:
`/api/ai/status` echoed which providers were configured to anyone, unauthenticated. Now it returns
only `{ configured: boolean }` to a logged-out caller; the provider/model breakdown requires a
session.

**Phase 3 — required-reading flags (checkpoint).** Independently checked all 17 passages the brief
named as "should be required but isn't" against the actual CED PDF (Appendix 2/3, Effective Fall
2025) rather than the brief's description of it. Every one of the 17 was correctly *not* required
already. No changes. Presented to the user as a checkpoint per the ground rules; the response was
to keep going with the rest of the pass using best judgment.

**Phase 4 — practice exam FRQ scoring** (`adc121f`). Real bug: the graded practice exam was
administering all 6 stored FRQ prompts, including *two* short-essay alternates (a Pliny option and
a Vergil option) simultaneously, worth more than the real exam's 53-point Section II. Fixed to pick
one prompt per FRQ type, seeded so a given exam attempt is reproducible. Added a `verify-content.mjs`
assertion that the graded set is exactly 5 types summing to 53 points, so this can't silently
regress.

**Phase 5 — scansion ledger silent failure** (`9dfdb44`). If the scansion corpus fetch failed, the
Dashboard's "lines scanned" ledger row rendered `0 / 0` — indistinguishable from a student who had
genuinely scanned zero lines. Now renders "data unavailable" and zeroes the meter bar without
implying failure. Scansion Lab gets the equivalent explicit error state with a retry button. Also
fixed `build-scansion.mjs` to report `sourceTotal` (lines in the source text) alongside the scanned
count, so the UI can say "6,562 of 9,883 lines" instead of presenting the scanned subset as the
whole poem. Real number, not adjustable: **66.4%** of the Aeneid corpus scans cleanly; the rest is
dropped for ambiguity or no solution, per book range 61.3%–69.3%.

**Phase 6 — sight questions with no Latin rendered** (`0dfaeb5`). 13 of the sight-reading quiz
questions (`sight-cat5-*`, `sight-ovid-*`, `sight-sen-*`, `sight-nep-*`, `sight-livy-*`) were
missing the `stimulus` field entirely — the question rendered with no passage to read. Copied the
exact `latin`/`citation`/`genre`/`gloss` from each question's parent passage. Verified the bug
reproduced before the fix and was gone after, via a live run against the local dev server.

**Phase 7 — supplementary lexicon generation (checkpoint).** See its own section below — this was
the largest phase by far and the brief's claims here needed the most correction.

**Phase 8 — macronize Aeneid passages (checkpoint, skipped).** Presented the scope (join Reading
Room passages to the scansion corpus by book+line, handle the ~34% of lines the corpus doesn't
cover, wire up the currently-dead `showMacrons` setting) and asked before touching anything, per
the ground rules. Decision: skip. No changes made; `showMacrons` is still unwired, and only
`aen-1-1-33` carries hand-added macrons, same as before this pass.

**Phase 9 — homograph disambiguation overrides** (`0a616a3`). Verified all 11 brief-proposed
overrides against the actual line text before adding any. Two didn't hold up: `robur` has only one
dictionary entry, so there's nothing to disambiguate; and `pliny-10-34`'s "uti" is utor's infinitive
in context ("...to make use of the assembled populace" — the passage's own pre-existing summary
already says this), not the conjunction "ut" the brief claimed. Added 9 real overrides. Found and
fixed two gaps the brief didn't mention: `pareo` didn't exist in either dictionary at all (confirmed
via the CED PDF that it isn't core vocabulary before adding it to supplementary), and `frons`/`frons`
(brow vs. foliage) are true homographs that even share `pos: noun` — extended the disambiguation
schema with an `entryId` field for the rare case where headword and part of speech both fail to
tell two entries apart.

**Phase 10 — guardrails** (`b2472ca`). `eslint.config.mjs` excluded the two largest data files for
no documented reason; timed linting them with the exclusion removed (zero errors, under a second
of extra cost) and removed it. `verify-content.mjs` never loaded the supplementary lexicon or the
disambiguation table at all, despite the supplementary list being 2.4x the size of the core one —
added checks that every vocabulary id is unique across both lists, that a lemma's first word
matches its headword (tolerant of a headword that's itself an attested inflected form), that a
required passage carries its CED reading number, and that every disambiguation entry references a
real passage/line/headword. That last check caught one genuine, pre-existing bug on its first run:
a byte-identical duplicate override for `aen-1-88-107` line 95, entered twice under two different
comment blocks. Fixed. Declined two of the brief's proposed checks as unsafe for this specific
corpus — see "Deliberately not done" below. Added `.github/workflows/verify.yml`; there was no CI
at all before this.

## Phase 7 in detail

The brief's specific list of "9 wrong entries" and "9 missing entries" mostly didn't survive
contact with the actual data: 5 of the 9 claimed-wrong entries (`hilari`, `caeci`, `poli`, `cassi`,
`di`) don't exist in this file in any form, and 2 more (`heu`, `ceras`) are simply misquoted — the
real entries already read "oh! ah! alas!" and "kind of wild parsnip," not "Eve" or "cherry-tree."
Of the 9 claimed-missing words, 4 (`polus`, `dēmēns`, `suus`, `minor`) already exist, and the other
5 (`aes`, `invisus`, `as`, `Titus`, `Līvius`) don't appear anywhere in this app's own passages, so
adding them would be encyclopedic padding against a file whose whole stated purpose is "real Latin
this app's corpus actually uses." Left out. The one real, confirmed-wrong entry was `id 37493`,
headword `"tr"` — a second, worse copy of the numeral "three" (the correct entry, `tres, tria`,
was already there) with a headword that isn't a word. Excluded.

The real, substantial problem was the lemma-reconstruction logic in `scripts/build-supplement.mjs`
itself — the generator that produces `supplementaryVocabulary.ts` from Whitaker's WORDS dictionary
data. Wherever it couldn't confidently rebuild a citation form, it fell back to joining Whitaker's
raw internal stems with commas: `amans, amant` instead of `amans, amantis`; `abundans, abundant,
abundanti, abundantissi` instead of a real citation at all. This wasn't only a display bug. This
app's lookup index registers every comma-separated fragment of a lemma as an exact-match key, and
some of those raw stems are themselves real, different Latin words — `amant` is "they love," the
3rd-person-plural of `amo`, not a form of `amans` ("lover"). So the broken lemma for one word was
quietly poisoning lookups for an unrelated one.

Fixed the generator's reconstruction logic directly (never hand-patched the output — a future
regeneration would just undo a hand-patch), then regenerated the file:

- Regular 3rd-declension nouns and adjectives (nominative + oblique stem) now get the standard
  `nominative, stem+is` citation. Checked against every gender and declension-variant this cache
  actually produces, including the Greek-pattern loanwords (`basis`, `tigris`, `nomas`, `herois`,
  `karthago`, `regio`) — holds everywhere except `Achilleus` (a different, Greek `-eus` declension
  pattern: genitive `Achillei`, not `-is`) and `Mammon` (an indeclinable Semitic loanword that
  isn't really 3rd declension), both excluded by id rather than guessed at.
- 2nd-declension `-er` nouns (`auster`, `culter`, `liber`...) get `-i`, not `-is`.
- Adverbs capable of comparison (`bene`/`melius`/`optime`) are three different words, not principal
  parts of one — reformatted to the conventional `bene (melius, optime)`.
- Compound numerals (`centum`/`centesim`/`centen`/`cent`) are four different words (cardinal,
  ordinal, distributive, adverbial), not principal parts either — kept only the cardinal.
- Word-initial consonantal *u* (this cache's `uideo`, `uenio`, `uiuo`) now displays as *v*
  (`video`, `venio`, `vivo`), matching this app's own core vocabulary. Deliberately did **not**
  touch mid-word *u* — that same letter pattern also occurs in genuine diphthongs (`audio`,
  `gaudeo`), and telling the two apart needs syllable-level judgment this pass doesn't attempt.
- Whitaker's data tags some senses with a raw subject-area code that was leaking straight into
  student-facing definitions (`"B:tetanus"`, `"G:digress"`) — expanded to a plain label
  (`"(medicine) tetanus"`, `"(grammar) digress"`).
- 28 pairs of entries were exact duplicates under two different Whitaker ids — alternate attested
  spellings of the same principal part (`abscondi`/`abscondidi`, `reppuli`/`repuli`) that are
  indistinguishable once reduced to headword and definition. Kept one of each.

Checked the tokenizer/Roman-numeral concern directly rather than assuming it: real embedded
figures in Pliny's letters (`XXX`, `CCCXVIII`, `CC`, `CL`, Ep. 10.37 and 10.33) already resolve to
"no match" today, not a wrong guess. There's no collision to fix, so the tokenizer wasn't touched.

Regenerating a mechanically-derived file is exactly the kind of change that can silently break
things a purely structural check won't catch, so it was verified against actual word coverage, not
just shape: `scripts/audit-vocab.mjs` run against the whole corpus before and after (not just its
capped "top 60" printout, which hid the real picture on the first pass). Four words came back
newly resolved as a side effect (`auspiciis`, `coniugium`, `indicium`, `iudicium`). Five went the
other way at first — `bis`, `semel`, `dio`, `quartum`, `ulterior` — each one had been resolving
only by accident, as a stray comma-fragment of some *other* word's mangled lemma, and fixing that
other word's lemma correctly removed the accident. Rather than let a real fix cause a real
regression, each of the five got its own correct, hand-verified entry: `bis`/`semel` as the
ordinary adverbs they are, `quartus` as a normal adjective (regular stem matching already handles
`quartum`), `ulterior` as the comparative-only adjective it is (absent from Whitaker's cache
entirely — it never had *any* entry before), and `dio` as the archaic idiom it actually is
("sub dio," "in the open air" — Pliny, *Epistulae* 6.16.16). Net, verified effect on the whole
corpus: distinct unresolved words went from 75 to 71, zero regressions.

One more thing this regeneration caught: Phase 9 had added a `pareo` entry by hand directly to the
generated file. The generator has no memory of a hand-edit to its own output, so regenerating would
have silently deleted it. Ported it into `build-supplement.mjs`'s own hand-added list so it
survives future regenerations instead of only this one.

## Verified in production (or as close to it as this environment allows)

External network access to the live site is blocked for this sandbox's browser process (`curl`
reaches the internet fine; Chromium does not, even for `example.com`). Every behavioral fix in this
pass — Phase 4's FRQ selection, Phase 5's scansion ledger and error states, Phase 6's sight
questions, Phase 9's disambiguation resolving `frons`/`pareo` correctly per-occurrence — was
reproduced as broken, fixed, and then re-verified live against the local dev server with a
throwaway Playwright script, not just asserted from reading the diff. Phases 0, 1, 2, 3, 7, 8, 9
(the dictionary/data side), and 10 are content and configuration changes verified by
`npm run typecheck`, `npm run lint`, `npm run verify && npm run verify:scansion`, and
`npm run build` after every phase — plus, for Phase 7 specifically, a direct full-corpus coverage
comparison via `scripts/audit-vocab.mjs`, since a structural check alone can't catch a coverage
regression.

`npm run typecheck` reports **zero errors** on `main`, both before this pass started and now. The
brief's ground rules assumed a pre-existing baseline of ~25 `any`-related errors in `useStore.ts`;
that premise didn't hold, so a clean 0-error baseline was used instead and diffed after every
phase.

## Deliberately not done

- **Phase 8, in full** (see above) — the user's explicit call at the checkpoint.
- **Two of Phase 9's brief-proposed overrides** — `robur` (nothing to disambiguate; one entry
  total) and `pliny-10-34`'s "uti" (the brief's proposed reading contradicts both a close reading
  of the sentence and the passage's own existing summary).
- **Phase 7's five claimed-missing words** that don't appear anywhere in this app's corpus (`aes`,
  `invisus`, `as`, `Titus`, `Līvius`) — adding words nothing here actually uses would be scope
  creep against `supplementaryVocabulary.ts`'s own stated purpose.
- **Two of Phase 10's proposed semantic checks**, tried and rejected rather than skipped outright:
  "no duplicate definitions across different headwords" flagged 57 groups on the real corpus, and
  56 of them are genuine synonym or spelling-variant doublets inherent to a WORDS-derived lexicon
  (`dea`/`diva`, `abicio`/`abiicio`, active/deponent pairs like `miro`/`miror`) — enforcing it would
  fail the build on legitimate content. "No supplementary lemma is a bare stem list" needs exactly
  the per-part-of-speech grammatical judgment Phase 7's reconstruction work above had to build by
  hand; a naive heuristic flagged 1,300 of 2,428 entries, most of them perfectly well-formed
  principal parts.
- **Phase 7.8's tokenizer change** — investigated and found no actual bug (see above); building
  Roman-numeral arithmetic parsing for a problem that doesn't exist would be an unrequested
  feature, not a fix.
- **`assis` = "plank, board"** — the brief called this wrong, but it's a plausible alternate
  Lewis & Short sense (a variant spelling of `axis` in this meaning) and, unlike the 7 other named
  entries, couldn't be independently confirmed wrong. Given the brief's track record on this exact
  list, left in rather than deleted on an unconfirmed claim.

## What the brief didn't anticipate

The recurring theme across all ten phases: **specific claims in an AI-authored audit need the same
independent verification as any other unverified source**, even one written for exactly this
purpose. Concretely, this pass found:

- Three separate phases (0, 2, 3) built on a stale snapshot of the codebase — fixes already merged,
  a security control already in place, a required-reading list already correct.
- Phase 4's actual bug was different in kind from what the brief described: not "extra questions
  leaking in," but two alternates for the *same* exam slot being administered together.
- Phase 7's proposed fix for its "ordering bug" (reorder `lookup()`'s tiers to check core-stem
  before supplementary-exact) would have *caused* a regression — it directly contradicts a
  deliberate design decision documented in `lookup()`'s own docstring (the `hortor`/`hortus` case:
  a correct supplementary exact match must outrank a wrong core stem guess). The real root cause
  the brief was gesturing at was the mangled-lemma problem fixed in Phase 7 above, not the tier
  order.
- Phase 7's specific "9 wrong / 9 missing" lists were majority-wrong on inspection (7 of 9 wrong
  claims didn't hold, 4 of 9 missing claims didn't hold) — see above.
- The generator/output relationship itself was a latent risk the brief never mentioned:
  `supplementaryVocabulary.ts` looks like ordinary checked-in data, but it's fully regenerated from
  a script, so a hand-edit to the file (like Phase 9's `pareo` addition) silently disappears the
  next time anyone runs the generator, unless it's also added to the generator's own source. Found
  this the hard way — this pass's own Phase 7 regeneration nearly deleted Phase 9's fix within the
  same session — and fixed it by porting the hand-edit into the generator.
