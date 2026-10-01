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

- [x] Level IV, *Quārta*, 7 units, 44 lessons: guided lessons through the AP syllabus passages (Aeneid and Pliny),
      each tied to its Reading Room passage: read a section, then comprehension, grammar and
      style questions of the exam's kinds
  - [x] U1 Pliny: Vesuvius, Letters 6.16 and 6.20 (7 lessons)
  - [x] U2 Pliny: Sura, Calpurnia, Trajan: 7.27 whole, 6.4, 6.7, 10.5–7, 10.37 and 10.90 (8 lessons)
  - [x] U3 Aeneid 1: the proem, Juno, the storm, Dido at the temple (1.1–33, 88–107, 496–508; 6 lessons)
  - [x] U4 Aeneid 2 and 4: Laocoön and the serpents (2.40–56, 201–249); Dido in love, the cave, Fama (4.74–89, 165–197); 6 lessons
  - [x] U5 Aeneid 4 and 6: Dido and Aeneas face to face (4.305–361); Dido's shade, Augustus, *tū regere imperiō* (6.450–476, 788–800, 847–853); 7 lessons
  - [x] U6 Aeneid 7 and 11: Latinus, Turnus, Camilla (7.45–58, 783–792, 803–817); Camilla's childhood (11.532–594); 6 lessons
  - [x] U7 Aeneid 12: Jupiter and Juno (12.791–828); the death of Turnus (12.919–952); 4 lessons

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
- [x] Achievements across the whole app, not just scansion (Laurels)
- [x] Sententia: 120 lines, so a year repeats three times rather than eight
- [x] The daily reminder quotes the day's Sententia
- [x] A weekly recap on Today and the dashboard: lessons, minutes, words, the streak (minutes left out: they are kept per device, not synced)
- [x] Word of the day (web card, iOS widget): done as the Sententia of the day, a card on the web and a Home and Lock Screen widget
- [x] Scansion Lab: work through a set passage line by line (picker, `?passage=` links, "Scan this
      passage" in the Reading Room), now that corpus line numbers match the syllabus
- [x] Fill the syllabus gaps in the scansion corpus: 144 of the 448 required Aeneid lines were
      ambiguous from bare text; the course's macronized Level IV readings settle 121 more lines
      (424 of 448 now), each checked against what the bare text allows
- [x] Printable passage sheets: the Reader prints as a clean handout (Latin with line numbers, the
      passage's vocabulary, room to write), for teachers and for annotating on paper
- [x] Quiz from the Reader: "Questions on this passage" opens the quiz filtered to it

## 4. Apple platform extras

- [x] App Shortcuts / Siri: "Review my Latin", "Continue my lesson", "Today's Latin line"
- [x] Watch complication: cards due
- [x] Lock Screen widget for the next lesson
- [x] Live Activity for a timed practice-exam section

## 4b. Exam practice content

- [x] Quiz bank: AP-style multiple choice for every required passage, at least four each (24 of 32
      had none; the practice exam draws 52 at a time)
  - [x] Pliny: 6.16.13–22, 6.20, 7.27.9–16, 6.4, 6.7, 10.5–7, 10.37, 10.90 (35 questions)
  - [x] Aeneid 1, 2 and 4
  - [x] Aeneid 6, 7, 11 and 12 (65 Vergil questions in all)
  - [x] Top up the passages still under four (10.5, 10.6, 10.7, 10.34, 10.90, Aen. 12.791–812)
- [x] More sight passages with question sets (15: 7 poetry, 8 prose, each with three questions)
- [x] More translation drills (19: one for each required passage group)

## 5. Quality

- [x] Screenshot job covers Learn, a lesson in progress, onboarding
- [ ] Accessibility pass: VoiceOver labels on every new control, Dynamic Type at XXL
  - [x] Answer choices say in words what the colours show: "Correct answer", "Your answer,
        incorrect", and "selected" while choosing (lessons, Forms Forge, sight reading, the
        practice exam, placement, devices); the goal banner reads as a button
  - [x] axe audit of the pages changed on 1 October (lab passage mode, Reader, Sight, Translate,
        filtered quiz), light and dark: clean
  - [ ] VoiceOver walk-through on a device (owner, with TestFlight)
- [ ] Performance: content decode time, big lists
  - [x] Web: pages no longer download the whole course, glossary and passages (the 404 page's client
        components resolved to the dashboard's chunks; first-run and search data now load on demand)
  - [x] Web: the dashboard, course map and lesson pages load a generated outline (or just their own
        lesson) instead of the whole course; the Sententia lines load with their card
  - [x] Web: pages that list or quote passages no longer load the glossary with them (only the
        reader and Vocabulary, which use it)
  - [x] App: content load measured (release build, Linux CI-class machine): 0.27 s for the whole
        library, of which 0.10 s was building the sentence builder for one screen; it is now built
        on first use and warmed in the background after launch. Passages 0.08 s, the course 0.03 s,
        vocabulary 0.02 s. The app logs the load time ("Content loaded in …", subsystem
        com.norvodesigns.lectio) so it can be read off a device in Console
  - [ ] App: confirm the launch time on a device (owner, with TestFlight)
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
- 2026-09-30: Laurels, on both platforms: 26 achievements (the course, study habit, vocabulary,
  reading, quiz and exam, writing, scansion, the Sententia), each with a Latin name and a
  progress count, worked out from progress that already syncs, so no new storage and every
  device agrees; a parity fixture holds the app to the web. /laurels and a line on the
  dashboard; a Laurels row on Today in the app that names a new one once. The app's daily
  reminder is now four weeks of single notifications, each quoting that day's Sententia.
- 2026-09-30: Sententia grows from 47 to 120 lines: more Vergil (the opening, the Sibyl,
  Dido, the underworld), Horace, Catullus, Ovid, Cicero, Seneca, Livy, Tacitus, Suetonius's
  emperors, Pliny on Vesuvius, Martial, Publilius Syrus, Phaedrus, Lucretius, and the
  mottoes on the dollar bill. Laurels in the app count from raw JSON instead of decoding
  every record, since Today works them out on each redraw.
- 2026-09-30: Level IV, *Quārta*, begins: Unit 1 reads Pliny's Letters 6.16 and 6.20 whole
  in seven lessons (why he writes, the cloud like a pine, the rescue, calm at Stabiae, the
  death on the shore, the night at Misenum, the darkness), each a macronized reading with
  glosses, five questions of the exam's kinds (grammar, figures, what a detail is for), a
  translation and an essay tip. The placement check gains a question for each Tertia unit,
  and a student who answers everything right now starts on Quārta instead of at the top.
- 2026-09-30: Quārta Unit 2 reads the rest of the syllabus Pliny as he wrote it, in eight
  lessons: the ghost letter to Sura whole (Curtius Rufus, the house at Athens, Athenodorus,
  the haircuts and the plea for a verdict), both letters to Calpurnia, the doctor's
  citizenship (10.5–7, with Trajan's reply) and the aqueducts of Nicomedia and Sinope. Unit
  1's right answers are spread across all four positions.
- 2026-09-30: Quārta Unit 3, Aeneid 1 in six lessons: the proem (with its scansion), the
  Muse and Carthage, Juno's reasons and *tantae mōlis*, the storm and Aeneas's first speech,
  the ship broken in sound and meter, and Dido at the temple likened to Diana. Level IV is
  now planned as six units, so every required Vergil passage has a guided lesson.
- 2026-09-30: Quārta Unit 4, six lessons: Laocoön's spear, the serpents, the horse hauled
  into Troy (with the half-line explained), Dido's love and the stopped city, the cave, and
  Rumor. The Book 4 speeches move to Unit 5, beside Dido's shade in Book 6.
- 2026-10-01: Large text in the app: at accessibility sizes, rows of figures (Today, Vocabulary,
  a lesson's result, the practice exam report, Scansion) stack instead of breaking words
  mid-letter, and label rows with a note at the end (the Sententia card, Laurels) put the note
  underneath. Found in CI's large-text screenshots.
- 2026-10-01: Quārta Unit 5, seven lessons: Dido's reproach in two parts (*Mēne fugis?*,
  *parvulus Aenēās*), Aeneas's answer in two (*hic amor, haec patria est*, *Ītaliam nōn sponte
  sequor*), Dido's silent shade (*Quem fugis?*), Augustus and the golden age, and *parcere
  subiectīs et dēbellāre superbōs*, pointed at the poem's last scene.
- 2026-10-01: Quārta Unit 6, six lessons on the Italians: Latinus and the portents (*maius
  opus*), Turnus's Chimaera helmet and Io shield, Camilla running over the grain, and all of
  Diana's story of her (the flight, the baby on the spear, the huntress, the avenging arrow).
- 2026-10-01: Level IV, *Quārta*, is complete: Unit 7 reads the end of the Aeneid in four
  lessons (Jupiter forbids Juno, *occidit, occideritque sinās cum nōmine Trōia*, Turnus's plea,
  *Pallās tē immolat*), closing on the echo of 1.92 and a note that the course is done. Every
  passage on the AP syllabus now has a guided lesson: 165 lessons in four levels. A new laurel,
  *Quārta perfecta*, with a parity case for a whole level earned; Tertia's last lesson now points
  to Level IV instead of calling itself the end.
- 2026-10-01: Web performance: every page was downloading about 700 kB of compressed JS, the whole
  course, the glossary and all passages. Cause: the 404 page (added for the dark-mode fix) used
  client components, and Next resolves the root not-found's client modules against the home page's
  chunk list, which is included in every route. It is now plain markup. The first-run screens
  (with the course for the placement check) load only for a new visitor, and the search palette
  fetches the passage list when first opened. Settings now loads 203 kB; Quiz, Read and the course
  about 410 kB.
- 2026-10-01: Web performance, part two. A generated course outline (titles, ids and minutes, no
  steps; `npm run export:outline`, checked in CI like the iOS bundle) now feeds the dashboard, the
  course map and laurels, and each lesson page is handed only its own lesson by the server. The
  dashboard's Sententia card fetches the lines when drawn. JS loaded per page (compressed, before
  onload): home 699 → 240 kB, course map 702 → 213 kB, a lesson 706 → 206 kB, Settings 203 kB.
- 2026-10-01: Web performance, part three: `passageVocabIds` moved out of the passages index, which
  had made every page that touches a passage (Quiz, Reading Room, Grammar, Exam, Translate, FRQ,
  Devices, Study Plan) download the whole glossary. Each drops by about 140 kB (Quiz 419 → 277 kB,
  Reading Room 402 → 260 kB).
- 2026-10-01: The week in review, on the dashboard and on Today in the app (*Hebdomas · the last
  seven days*): days of study, lessons finished, quiz questions and how many right, flashcards
  reviewed, sententiae, lines scanned and translations, each beside the week before. Worked out
  from synced progress with the store's UTC days, so it agrees with the streak; a parity fixture
  holds the app to the web. Hidden until a fortnight has anything in it.
- 2026-10-01: Watch complications: a watchOS widget extension (`LectioWatchWidgets`) with circular,
  corner, inline and rectangular complications showing the cards left to review, and the exam
  countdown where there is room. The watch app writes a small `WatchGlance` to its app group each
  time its deck arrives or a card is graded, and reloads the complications; at midnight they say so
  until the phone sends the new day's cards.
- 2026-10-01: A Live Activity for the practice exam: each timed section shows on the Lock Screen
  and in the Dynamic Island with the system-drawn countdown and how many questions are answered,
  starting with the section and ending when it does, when the exam is scored, or when it is left.
- 2026-10-01: Review now draws on reading lessons too, taking only the questions that carry their
  own Latin (translations, and choices that quote their line); the rest need the passage in front
  of you. Until now Level IV, every lesson of which is a reading, could never be reviewed. Shared
  rule on both platforms (`reviewExercises`), with a test that a passage-bound question stays out.
- 2026-10-01: Quiz bank, Pliny: 35 new AP-style questions (grammar and syntax, translation choice,
  figures, inference, context) for every Pliny letter on the syllabus that had none or few, each
  with an explanation, answers spread across positions. 107 questions in all, on both platforms.
- 2026-10-01: Quiz bank, Vergil: 65 AP-style questions for the 16 required Aeneid passages that had
  none (Books 1, 2, 4, 6, 7, 11, 12): syntax, translation choice, scansion checked against the
  scansion corpus, figures, allusion and context. 172 questions in all.
- 2026-10-01: Scansion corpus audit. The generator was confidently wrong on whole classes of
  lines: consonantal i after a prefix (co-ni-unx for con-iunx), Greek vocalic i (Iū-lī for Ĭ-ū-lī,
  26 phantom spondaic endings), false diphthongs (Troes, Danaum, aenus), Greek eu read as two
  vowels (every Te-u-crī line), the page's u-for-v typos, and a line count that drifted one
  ahead for most of Books 4, 5, 7 and 10 (wrapped and transposed lines), so citations there were
  off by one. All fixed in the generator; ambiguous words (Trōia noun or adjective, aera) are
  tried both ways and dropped unless one reading scans. Every AP passage line now matches its
  corpus line by number, book lengths match the OCT (9,896), and the only spondaic fifth feet left
  are Vergil's real ones (11). One hand-checked line (1.30) was itself wrong and is corrected; two
  quiz questions built on the bad data are rewritten.
- 2026-10-01: Quiz bank complete: 22 more questions bring every passage, required or supplementary,
  to four or more (194 in all). The summaries of Letters 10.5 and 10.6 were wrong (10.5 described
  the ius trium liberorum of 10.2 and an Alexandrian step Pliny had not yet learned of) and are
  rewritten from the Latin.
- 2026-10-01: Right answers spread across positions. Options are never shuffled on screen, and all
  59 original quiz questions, all 13 sight questions, most of Tertia (units at 90–100%) and the
  placement check had the answer in one slot, so "always pick A" passed. `scripts/rebalance-
  answers.mjs` moves each right option to an evenly spread slot (wrong options keep their order;
  lists with a natural order, like cases or numbers, stay as written): 351 items moved. `verify`
  now fails any bank or unit with more than half its answers in one slot.
- 2026-10-01: Sight reading grows from 6 passages to 15, every text copied from The Latin Library
  rather than recalled, and all from the authors the page names: Martial 1.32, Ovid's Daedalus
  (Met. 8.183–187), Catullus 101, Tibullus 1.1.1–6, Cicero In Catilinam 1.1 and Pro Archia 16,
  Seneca Epistulae 47.1, Livy on Horatius at the bridge (2.10.9–11) and Nepos on Hannibal's oath.
  Each has glosses, a summary and three questions; new questions take their stimulus from the
  passage itself, so the Latin is written once.
- 2026-10-01: Translation drills grow from 8 to 19, one for every required passage group on the
  syllabus: Pliny 6.16.16 (*ratiō ratiōnem … timōrem timor*), 6.20.14 (the cries in the dark),
  7.27.12 (the haircut dream), 10.37.2 (the aqueduct's source), 10.5.1–2 (Harpocras) and 6.4.4–5;
  Aeneid 2.40–44 (Laocoön), 7.808–811 (Camilla over the grain), 11.539–543 (Metabus names her),
  12.823–828 (Juno's terms) and 12.947–952, the poem's last lines. Each is cut from the passage data
  and scored in 15 segments, with what earns the point, a common slip and grammar tags.
- 2026-10-01: Scansion Lab, set passages: on both platforms the lab can now work through any of the
  19 required Aeneid passages in order (304 of their 448 lines are in the corpus), starting at the
  first line not yet mastered and showing how many are done. The web opens one from
  `/scansion?passage=…`, and both Readers have "Scan this passage" on required Vergil.
- 2026-10-01: Practice from the Reader: on the web a passage with quiz questions shows "N questions",
  opening the Quiz Engine set to it (`/quiz?passage=…`; the count is taken on the server so the
  question bank is not sent with the page). In the app a Practice menu in the Reader's toolbar
  starts a set on the passage's questions and, for required Vergil, opens the Scansion Lab on it.
- 2026-10-01: The scansion corpus now uses the course's own macronized readings: where bare text
  leaves a line open, Level IV's marked text (an unmarked open vowel is short) usually settles it,
  and only an answer the bare text allows is taken. 121 lines settled; the syllabus passages go from
  304 to 424 of 448 lines. Run over the lines the metre settles alone, the same mode is an audit: it
  found the page's remaining u-for-v spellings (ualidis, uox; now a rule), the iaciō compounds that
  make the prefix long (sub-ji-ci-unt), consonantal u in suādeō (swā-), cōnūbium (both quantities in
  Vergil, so left out), the anceps i of mihi, and a ȳ the letter class dropped. Five lines' answers
  changed (2.9, 2.50, 4.81, 5.807, 11.254), 14 doubtful ones left. The lab no longer shows macrons,
  which gave answers away on the lines of Book 1 that had them.
- 2026-10-01: Printable handouts: the Reader has a Print button, and on paper a passage becomes a
  worksheet: author and citation with Name and Date lines, the Latin with its line or section
  numbers and room to write between lines, and the passage's vocabulary in two columns (the CED words
  the glossary finds in this text, worked out when the page is idle). Navigation, buttons, tips and
  the side rail are left off, and paper is always black on white, even from dark mode.
- 2026-10-01: Free-response fixes. The practice exam's Section II showed the first twelve lines of a
  passage rather than the lines its prompt is set on (Pliny 6.16.18–20 showed the opening of the
  letter); prompts now carry a `lineRange`, and the exam, the workshop and the app show just those
  lines. The Pliny model answer quoted Latin that is not in the letter; rewritten from the text,
  and `verify` now fails a model answer that quotes Latin outside its passage, or a prompt whose
  lines are not in the passage. The exam's FRQ 2 is now drawn from all 19 translation drills (a
  retake sets a different passage) on both platforms, with the choice in LectioCore and a test.
- 2026-10-01: Toward the first TestFlight build. The app now runs on iOS 17 and later (watchOS 10 and
  later) from one build: Liquid Glass on 26+, a material look before it. Every glass call goes through
  `GlassCompat.swift` (`lectioGlass`, `glassButton`, `GlassGroup`, `lectioGlassID`); the navigation
  shell has the Tab API and adaptable sidebar (iOS 18, 26), and a classic tab bar and split view
  (iOS 17), with a badge on Vocab where the glass accessory pill is missing. `-legacyChrome YES`, or
  Settings > Preview > Classic look, shows the older look on a glass device, and CI screenshots it
  (`*-classic-*`). New: a Release archive for a real device in CI (unsigned, watch app embedded and
  checked), the TestFlight job checks its secrets first and keeps its logs, Settings > Preview can load
  sample progress when signed out, and `ios/TESTFLIGHT.md` holds the setup steps and the text to paste
  into TestFlight's What to Test.
