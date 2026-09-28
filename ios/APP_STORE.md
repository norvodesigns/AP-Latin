# App Store Connect — draft listing

Everything App Store Connect asks for, drafted from what the app actually does. Edit freely before
submitting.

## App information

| Field | Value |
| --- | --- |
| Name | Lectio (fallback if taken: "Lectio: AP Latin") |
| Subtitle (30) | AP Latin: Vergil and Pliny |
| Bundle ID | com.norvodesigns.lectio |
| Primary category | Education |
| Secondary category | Reference |
| Age rating | 4+. No objectionable content, no unrestricted web access, no user-to-user communication. The classroom leaderboard shows display names and study time only. |
| Privacy Policy URL | https://lectio.norvodesigns.com/privacy |
| Support URL | https://lectio.norvodesigns.com/support |
| Marketing URL | https://lectio.norvodesigns.com |
| Copyright | © 2026 Norvo Designs |

## Promotional text (170)

Every passage of Vergil and Pliny on the 2025 AP Latin syllabus, with a tap-any-word glossary,
spaced-repetition vocabulary, and full practice exams.

## Description

Lectio is a complete study environment for the AP Latin exam: Vergil's Aeneid and Pliny's Letters,
under the 2025 Course and Exam Description.

READ
• Every required passage, and more, with a glossary on every word, drawn from the official
  990-word vocabulary list.
• Highlight in four manuscript pigments, add notes, flag hard lines, and read cold with the
  glossary off.
• Ask the AI tutor about any line: a parse, a construction, the scansion.

DRILL
• Spaced-repetition vocabulary: Latin → English, English → Latin, or in context from the readings.
  Words you look up while reading join your deck automatically.
• An AP-style Quiz Engine. Filter by author, passage, unit, skill or question type; every answer is
  explained, and misses go to a review queue.
• Literal translation drills scored in the exam's own 15 segments, AI-graded or self-scored.
• Timed sight reading from the authors the exam draws on.
• A Scansion Lab covering 6,500 lines of the Aeneid. Mark quantities, feet and elisions, with each
  one checked.

PREPARE
• An FRQ Workshop for all five free-response types, with the official rubric rows.
• Full practice exams: 52 questions in 65 minutes, then five free responses in 115.
• A study plan measured back from exam day, with daily goals and streaks.

TOGETHER
• Sign in to sync with lectio.norvodesigns.com, so study on your laptop and your phone counts as one.
• Join your teacher's classroom with a code to see assignments and the leaderboard.

Plus Home Screen and Lock Screen widgets, a daily reminder, and flashcards on Apple Watch.

Every Latin text is from a public-domain edition, and AI-generated material is always labelled.
No account is needed, and there are no ads or tracking.

## Keywords (100)

AP Latin,Latin,Vergil,Aeneid,Pliny,scansion,vocabulary,flashcards,translation,classics,exam,study

## App Privacy ("nutrition label") answers

Data collection: **yes**, only when the user creates an account.

| Data type | Collected | Linked to user | Used for tracking | Purpose |
| --- | --- | --- | --- | --- |
| Contact Info › Email Address | Yes | Yes | No | App Functionality (account) |
| User Content › Other User Content (notes, highlights, answers, as the synced progress copy) | Yes | Yes | No | App Functionality |
| Usage Data › Product Interaction (minutes studied per section, graded-answer counts, for classrooms) | Yes | Yes | No | App Functionality |
| Identifiers › User ID | Yes | Yes | No | App Functionality |

- Not collected: location, contacts, health, financial, browsing history, diagnostics, and
  advertising data.
- Tracking: **no**.
- AI features send the Latin passage and the student's own text to the server when the student asks
  for grading. This is disclosed on the privacy page. It is not stored against the account.

## Review notes

- A demo account isn't required: every feature works without signing in. To review sync and
  classrooms, create an account in-app (Settings → Account). Email confirmation may be switched on.
- Account deletion is at Settings → Account → Delete account.
- AI features call the developer's own web service (lectio.norvodesigns.com/api/ai). If AI is
  unavailable, every AI feature falls back to a self-graded path.

## Export compliance

The app uses only standard HTTPS, so it's exempt. `ITSAppUsesNonExemptEncryption` is already set to
`false` in the build.

## Screenshots

Every push to `main` that touches the app captures them. Open the latest run under Actions → iOS
and download the **screenshots** artifact. It has the iPhone 17 Pro Max (1320 × 2868, the 6.9"
size) and the 13" iPad Pro (2064 × 2752), in light and dark, for Today, the Reading Room, Vocab,
Quiz, Scansion, Grammar, Practice Exam, Study Plan, Settings and two passages. They're taken with
sample progress (`-seedDemo YES`), so the dashboard has something to show. Those two sizes are all
App Store Connect requires; it scales them for smaller devices.

Suggested for the listing, in order: Today, the Aeneid passage, Vocab, Scansion, Quiz, Study Plan.
The watch needs its own screenshots (from the watch simulator in Xcode) only if you want the watch
app shown on the listing.
