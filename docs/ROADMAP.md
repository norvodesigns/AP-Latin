# Lectio build-out roadmap

The working plan for the web app and the iPhone/iPad/Watch app while the owner is away. Every
session, including an automatic resume, starts here: check CI on `main`, fix anything red, then
take the next unchecked item. Tick items off and add a line to the log at the bottom as you go.

## Ground rules

- Push to `main` only, never a branch. Commit in small, working steps.
- **Web first for anything that is progress.** The website's `mergeSyncable` keeps only the
  fields it knows. A new kind of progress goes into `src/store/useStore.ts` (`SyncableData`,
  `getSyncableData`, the store action), `src/lib/mergeProgress.ts`, the parity fixtures
  (`npm run export:fixtures`), and the Swift port (`ProgressMerge.swift`, `ProgressDocument`),
  all in the same change.
- **Content is written once**, in `src/data`, and reaches the app via `npm run export:content`.
  The app also picks up content changes from the website without an App Store release.
- Before pushing, run the web checks: `npm run typecheck && npm run lint && npm run verify &&
  npm run export:content -- --check && npm run export:fixtures -- --check`, plus `npm run build`
  for anything under `src/app`. For Swift, run `swift test` in `ios/LectioCore` (the toolchain is
  at `/opt/swift/swift-6.2-RELEASE-ubuntu24.04/usr/bin`). CI's macOS job is the proof that the app
  compiles. Watch it, and check the screenshots artifact for anything visual.
- Latin must be right. Use classical forms with macrons in teaching text. Keep sentences simple
  and unambiguous at the level taught. Never reuse copyrighted textbook sentences.
- The live site stays working at every commit.

## 1. Curriculum: from nothing to AP

A leveled course (Course → Level → Unit → Lesson) in `src/data/curriculum/`, taught on the web at
`/learn` and in the app's Learn section. Lesson words join the spaced-repetition deck, and
finishing a lesson counts toward the streak and daily goal.

- [x] Data model and types (`src/data/curriculum/types.ts`), validator in `scripts/verify-content.mjs`
- [x] Progress: `lessons` in `SyncableData` (per lesson: completedAt, best score, attempts), merge
      rule, fixtures, Swift port
- [x] Web: `/learn` course map, lesson player (teach cards, multiple choice, type the ending,
      translate, build the sentence, match), results, next lesson
- [x] iOS: Learn tab with the same course map and lesson player, native and glass
- [x] Exporter: `curriculum.json` in the content bundle
- [x] Level I, *Prīma* (foundations): 8 units, 39 lessons
  - [x] U1 Sounds and first words (pronunciation, *sum*, nouns and gender, why endings matter)
  - [x] U2 First declension and the present tense (nom/acc, 1st conj., gen/dat/abl, reading)
  - [x] U3 Second declension and adjectives (-us/-er, neuter, agreement, 2nd conj.)
  - [x] U4 Prepositions, the ablative, imperfect and future
  - [x] U5 Third declension; 3rd and 4th conjugations; imperatives
  - [x] U6 The perfect system (principal parts, perfect, pluperfect, future perfect)
  - [x] U7 Pronouns (personal, *is ea id*, *hic*, *ille*, relative)
  - [x] U8 3rd-decl. adjectives, 4th and 5th declensions, the passive
- [x] Level II, *Secunda* (intermediate): 8 units, 45 lessons, in `src/data/curriculum/secunda/`:
  - [x] U1 Deponent verbs; irregular *possum, volō, nōlō, eō, ferō*
  - [x] U2 Participles and the ablative absolute
  - [x] U3 Infinitives and indirect statement
  - [x] U4 Comparison of adjectives and adverbs; numbers
  - [x] U5 The subjunctive: present and imperfect; purpose and result clauses
  - [x] U6 Perfect and pluperfect subjunctive; *cum* clauses; indirect questions; sequence of tenses
  - [x] U7 Indirect commands, fear clauses, jussive and hortatory; gerund, gerundive, passive periphrastic
  - [x] U8 Conditions; relative clauses of characteristic; a longer reading
- [x] Level 3, *Tertia* (toward AP), 8 units, 37 lessons: adapted Caesar and Pliny, poetic word order, meter and
      scansion basics, translation technique, reading at sight. Hands off to the AP section.

## 2. Onboarding and placement

- [x] First run on web and iOS: who you are (new to Latin, some Latin, AP student, teacher),
      daily goal, reminder, optional sign-in, then a starting point
- [x] Placement check: a short adaptive quiz that suggests a starting lesson
- [x] Home adapts: a beginner's Today leads with the next lesson, an AP student's with the exam

## 3. New modes and learning functions

- [x] Forms Forge: declension and conjugation drills generated from the paradigm tables (fill the
      chart, name the form, make the form)
- [x] Course review: ten exercises drawn from finished lessons, weighted toward weak scores
      and lessons not done for a while
- [x] Sentence builder: put Latin tiles in order to match an English sentence
- [x] Derivatives: English words from Latin roots, as a quick game and on every vocab card
- [x] Daily challenge: one line of Latin a day with a few tasks; its own streak (Sententia of the day)
- [x] Speed round: timed vocabulary matching
- [ ] Achievements across the whole app, not just scansion
- [x] Word of the day (web card, iOS widget): done as the Sententia of the day, a card on the web and a Home and Lock Screen widget

## 4. Apple platform extras

- [x] App Shortcuts / Siri: "Review my Latin", "Continue my lesson", "Today's Latin line"
- [ ] Watch complication: cards due
- [x] Lock Screen widget for the next lesson
- [ ] Live Activity for a timed practice-exam section

## 5. Quality

- [x] Screenshot job covers Learn, a lesson in progress, onboarding
- [ ] Accessibility pass: VoiceOver labels on every new control, Dynamic Type at XXL
- [ ] Performance: content decode time, big lists
- [ ] Review pass over every new screen on iPhone and iPad, light and dark

## Log

- 2026-09-30: Roadmap written. iOS app feature-complete against the website, over-the-air
  content, screenshot CI. Starting the curriculum.
- 2026-09-30: Course groundwork: lesson progress synced on both platforms, the lesson model and
  validator, answer checking, `/learn` (course map, lesson player with all seven step kinds),
  course on the dashboard, nav and splash. Level I units 1–2 written (8 lessons, 80 exercises).
  Owner action later: apply `supabase/migrations/0004_course_section.sql`, then add `learn` to
  `ASSIGNABLE_SECTIONS`, so teachers can assign course time.
- 2026-09-30: The app's Learn section (course map, full-screen native lesson player, Course tab
  for beginners, Continue on Today) builds green. Level I finished: 8 units, 39 lessons, 323
  exercises, every one checked by `npm run verify`. Next: onboarding, then Level II.
- 2026-09-30: Onboarding on both platforms (track, placement check that stops after three
  misses, daily goal, reminder, sign-in; a returning student can sign in from the first
  screen). CI screenshots four onboarding steps. The motto was bad Latin ("mārca" isn't a
  word, "meminī" is "I remember"); now *lege, notā, mementō*. Level II units 1–4 written
  (23 lessons: deponents and irregulars, participles and the ablative absolute, indirect
  statement, comparison/numbers/pronouns), each ending in an adapted Livy or Ovid story.
  `verify` now runs every exercise's model answer through the real checker.
- 2026-09-30: Level II finished: units 5–8 (the subjunctive: purpose and result, *cum*,
  sequence of tenses, indirect questions, indirect commands, fear clauses, independent
  subjunctives, gerund and gerundive, passive periphrastic, conditions, characteristic,
  *dum*, and a review of every use). Readings: Androcles, Pyramus and Thisbe, Regulus,
  Orpheus and Eurydice. The course is now 84 lessons and 690 exercises; placement covers
  both levels (32 questions). Next: Level III, *Tertia*.
- 2026-09-30: Home adapts (course-first dashboard and Today for students in the course; no
  empty AP meters for them). Forms Forge on web (/forge) and iOS (Drill section): a small
  morphology engine in `src/data/forms` generates 66 tables (1,274 forms: every declension,
  the regular conjugations in all tenses, voices and moods, the irregulars and pronouns),
  spot-checked in `verify`, exported as `forms.json`. Three modes: make the form, name the
  form (never offers a second right answer; Swift tests prove it), fill the chart. Study
  time counts as section "forge".
- 2026-09-30: Level III written: reading real sentences (Caesar BG 1.1), Pliny on Vesuvius
  (6.16, adapted then original), the ghost / Trajan / Calpurnia letters, poetic Latin and
  Aeneid 1.1–11, the hexameter (every scansion worked out by hand), figures of speech and
  the storm (1.81–91), Aeneid readings (1.92–101, 2.40–49, 2.268–276) and exam translation,
  and a last unit at sight (Martial, Ovid's Daphne) with the exam's structure. The course
  is 121 lessons, 887 exercises, from *salvē* to Vergil. Fixed three missing macrons in the
  Reading Room's Aeneid 1. Forms Forge's first iOS build failed (a `Verdict` name clash with
  Translate) and was fixed within the hour.
- 2026-09-30: Course review on both platforms: a Review row on the course page opens a
  ten-exercise lesson drawn from finished lessons (not readings), weighted toward low scores
  and old dates, with "Another review" at the end. It counts the day studied but records no
  lesson. Same weighting in `src/lib/review.ts` and LectioCore `Course.review`, which has
  Swift tests (65 now).
- 2026-09-30: Sententia of the day on both platforms: 47 famous lines (Vergil, Horace, Cicero,
  Catullus, Juvenal, Ovid, Livy, Tacitus, Caesar, Seneca, Terence, Plautus...), each with
  glosses and three questions (meaning, a point of grammar, an English derivative), then the
  translation, source and a note. Same line for everyone on a calendar day; its own streak,
  synced as a new `daily` progress field (merge ported to Swift, parity fixtures extended).
  Card on the web dashboard and on Today in the app; /daily, and `lectio://learn/daily`.
  `verify` checks every line and question. A missed question now comes back before a
  lesson's closing steps, not after them.
- 2026-09-30: Apple extras: two new widgets (Sententia of the day, Home and Lock Screen,
  turning over at midnight from a week of lines in the snapshot; Next lesson, Lock Screen and
  small) and three App Shortcuts for Siri and Spotlight (the day's line, continue the course,
  review cards), routed like lectio:// links. Forms Forge no longer opens with nothing in play
  for someone who hasn't reached a lesson with a table.
- 2026-09-30: Speed round on both platforms (/vocab/speed; Vocabulary in the app): a minute
  to match Latin words to meanings, five pairs a board, two seconds off for a wrong pair,
  the mixed-up words listed at the end with a button to add them to the flashcards. Words
  from your deck, the whole AP list or a unit; best score kept per device. The short glosses
  are parity-tested against the web for every definition on the AP list.
- 2026-09-30: Derivatives on both platforms: the English words the course lists with its
  words now show on the flashcards and the vocabulary list, and a ten-question drill
  (/vocab/derivatives; Vocabulary in the app) asks both ways, "Which English word comes from
  pugnō?" and "Pugnacious comes from which Latin word?", from the words of finished lessons.
  Wrong options are chosen so none could also be right (manuscript never sets manus against
  scrībō); a Swift test checks it over many rounds.
- 2026-09-30: Sentence builder on both platforms (course page, and /learn/sentences): eight of
  the course's 186 sentences a round. Where Forms Forge knows other forms of two of a
  sentence's words, the student builds the Latin from the English in any order, with those
  forms as decoys (servum beside servōs); otherwise the English from the Latin, with near
  misses (sailor beside sailors) that are always words the course itself uses. Parity
  fixtures hold the app's forms and near misses to the web's. Accessibility: an axe audit of
  30 web pages is clean in both themes (contrast, headings, table headers, a real 404 page);
  the app's faint ink matches; CI now screenshots four screens at a large accessibility text
  size. A disabled primary button no longer loses its label under the pointer.
