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
- [ ] Level II, *Secunda* (intermediate), in `src/data/curriculum/secunda/`:
  - [ ] U1 Deponent verbs; irregular *possum, volō, nōlō, eō, ferō*
  - [ ] U2 Participles and the ablative absolute
  - [ ] U3 Infinitives and indirect statement
  - [ ] U4 Comparison of adjectives and adverbs; numbers
  - [ ] U5 The subjunctive: present and imperfect; purpose and result clauses
  - [ ] U6 Perfect and pluperfect subjunctive; *cum* clauses; indirect questions; sequence of tenses
  - [ ] U7 Indirect commands, fear clauses, jussive and hortatory; gerund, gerundive, passive periphrastic
  - [ ] U8 Conditions; relative clauses of characteristic; a longer reading
- [ ] Level 3, *Tertia* (toward AP): adapted Caesar and Pliny, poetic word order, meter and
      scansion basics, translation technique, reading at sight. Hands off to the AP section.

## 2. Onboarding and placement

- [ ] First run on web and iOS: who you are (new to Latin, some Latin, AP student, teacher),
      daily goal, reminder, optional sign-in, then a starting point
- [ ] Placement check: a short adaptive quiz that suggests a starting lesson
- [ ] Home adapts: a beginner's Today leads with the next lesson, an AP student's with the exam

## 3. New modes and learning functions

- [ ] Forms Forge: declension and conjugation drills generated from the paradigm tables (fill the
      chart, name the form, make the form)
- [ ] Sentence builder: put Latin tiles in order to match an English sentence
- [ ] Derivatives: English words from Latin roots, as a quick game and on every vocab card
- [ ] Daily challenge: one line of Latin a day with a few tasks; its own streak
- [ ] Speed round: timed vocabulary matching
- [ ] Achievements across the whole app, not just scansion
- [ ] Word of the day (web card, iOS widget)

## 4. Apple platform extras

- [ ] App Shortcuts / Siri: "Review my Latin", "Continue my lesson"
- [ ] Watch complication: cards due
- [ ] Lock Screen widget for the next lesson
- [ ] Live Activity for a timed practice-exam section

## 5. Quality

- [ ] Screenshot job covers Learn, a lesson in progress, onboarding
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
