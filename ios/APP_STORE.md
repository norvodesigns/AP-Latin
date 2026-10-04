# App Store submission: everything for a first-try approval

Everything App Store Connect asks for, drafted from what the app actually does, plus the checklist of
things only you can do. The app side of the usual rejection reasons is already handled in code (see
"What's already handled" at the end).

## Before you submit: your checklist

Do these in order. Each one heads off a specific, common rejection.

1. **Apply the support-messages migration.** In Supabase › SQL Editor, run
   `supabase/migrations/0006_support_messages.sql`. The support page's contact form (and the app's
   "Report name" on a classroom leaderboard) writes there; read messages in Table Editor ›
   `support_messages`. Then send yourself a test message from lectio.norvodesigns.com/support.
   *(Guideline 1.5: the Support URL must offer an easy way to reach you. 1.2: names others can see
   need a way to report them.)*
2. **Check `support_messages` at least daily while the app is in review, and after.** The support page
   promises reports about names are dealt with within a day: remove the student from the classroom (Teach
   page or the app), or edit their display name in Supabase › Table Editor › `profiles`.
3. **Add the redirect URL.** Supabase › Authentication › URL Configuration › Redirect URLs: add
   `lectio://auth-callback`. Your "Confirm signup" email template sends people to the website's
   /auth/confirm, which confirms the address and then shows an **Open Lectio** link; the app answers
   it with "Your email is confirmed" and takes them to Account to sign in. (If the template ever goes
   back to Supabase's own `{{ .ConfirmationURL }}`, the app signs the account straight in from the
   link instead.) Try it once with a throwaway address on your phone.
4. **Make demo accounts for the reviewer** (Guideline 2.1: reviewers must be able to reach every
   feature). On the website:
   - create a **teacher** account, e.g. `lectio.review.teacher@<a domain you control>`, and a classroom
     called "Review Class";
   - create a **student** account, e.g. `lectio.review.student@…`, confirm its email, and join Review
     Class with the code;
   - in the app, signed in as the student, study a few minutes (a lesson, some flashcards) so the
     leaderboard and assignments have something to show; add one assignment as the teacher.
   Put both logins in App Review Information (below). Don't use your personal email.
5. **Make sure AI works on the live site.** The Vercel project needs its Gemini (and/or Groq) key. If
   AI is off, the AI buttons simply don't appear, which is fine, but the review notes below describe
   them, so check one grading request works first.
6. **Run the release build once from TestFlight** (the same binary App Review gets) and check: the
   first run, sign-up and sign-in, an AI grade (it should ask permission first), Settings › Account ›
   Delete account on a throwaway account, and the Privacy and Support links in Settings › About.
7. **Fill in App Store Connect** from the sections below: App Information, the 1.0 version page,
   App Privacy, Age Rating, App Review Information, Pricing (Free) and Availability.
8. **Content rights** (App Information): answer **Yes**, the app contains third-party content, and
   **Yes**, you have the rights: the Latin texts are public domain, and the vocabulary list is the
   words of the College Board's published course framework with Lectio's own definitions.

## App information

| Field | Value |
| --- | --- |
| Name (30) | **Lectio** if it's free. It probably isn't: a Danish school app already uses it. Then **Lectio: Latin Reader & Drills** (29). Keep "AP" out of the name: a trademark in the name is a common 5.2.1 rejection, while describing what exam the app prepares for, in the subtitle and description, is fine. |
| Subtitle (30) | **Vergil & Pliny for AP® Latin** (28) |
| Bundle ID | com.norvodesigns.lectio |
| SKU | lectio-ios |
| Primary category | Education |
| Secondary category | Reference |
| Privacy Policy URL | https://lectio.norvodesigns.com/privacy |
| Support URL | https://lectio.norvodesigns.com/support |
| Marketing URL | https://lectio.norvodesigns.com |
| Copyright | © 2026 Norvo Designs |
| Version | 1.0.0 (already set in the build) |
| Price | Free, no in-app purchases |

## Promotional text (170)

Every passage of Vergil and Pliny on the AP® Latin syllabus, with a tap-any-word glossary,
spaced-repetition vocabulary, a step-by-step course and full practice exams.

## Description

Lectio is a complete study environment for Latin students preparing for the AP® Latin exam, built
around Vergil's Aeneid and Pliny's Letters as the 2025 Course and Exam Description sets them.

LEARN
• A course from first declensions to the AP texts, with a short level check that finds where you
  should start.
• A vocabulary track that works through the AP® Latin vocabulary list letter by letter, with a test
  at the end of each unit that lets you skip what you already know.

READ
• Every required passage, and more, with a glossary on every word.
• Highlight in four manuscript pigments, add notes, flag hard lines, and read cold with the glossary
  off.
• Ask the line tutor about any line: a parse, a construction, the scansion.

DRILL
• Spaced-repetition flashcards: Latin → English, English → Latin, or in context from the readings.
  Words you look up while reading join your deck automatically.
• A Quiz Engine in the exam's style. Filter by author, passage, unit, skill or question type; every
  answer is explained, and misses go to a review queue.
• Literal translation drills scored in the exam's own segments, self-scored or graded by AI.
• Timed sight reading from the authors the exam draws on.
• A Scansion Lab covering 6,500 lines of the Aeneid, checking every quantity, foot and elision.

PREPARE
• An FRQ Workshop for all five free-response types, with rubric rows.
• Full practice exams: 52 questions in 65 minutes, then five free responses in 115.
• A study plan counted back from exam day, with daily goals and streaks.

TOGETHER
• Sign in to sync with lectio.norvodesigns.com, so study on your laptop and your phone counts as one.
• Join your teacher's classroom with a code to see assignments and the leaderboard.

Plus Home Screen and Lock Screen widgets, a daily reminder, and flashcards on Apple Watch.

No account is needed, and there are no ads, no tracking and no purchases. AI features are optional,
ask before sending anything, and are always labelled. Every Latin text is from a public-domain
edition.

AP® is a trademark registered by the College Board, which is not affiliated with, and does not
endorse, this product.

## Keywords (100)

`latin,vergil,aeneid,pliny,scansion,vocabulary,flashcards,translation,classics,grammar,hexameter,exam`

That's exactly 100 characters. Words already in the name or subtitle are indexed anyway, and
trademarked terms in keywords are a 2.3.7 rejection, so "AP" stays out.

## What's New (1.0)

Leave blank for a first release.

## App Review Information

**Sign-in required:** No. Enter the student demo account anyway, so the reviewer can see sync and
classrooms.

**Notes** (paste, filling in the two logins):

> Lectio is a study app for the AP® Latin exam (Vergil and Pliny). Every feature works without an
> account; signing in only adds sync with our website and classrooms.
>
> Demo accounts. Student: <email> / <password>; it is a member of the classroom "Review Class".
> Teacher: <email> / <password>; it teaches that classroom. Sign in at Settings › Account.
>
> Account deletion: Settings › Account › Delete account. It deletes the account and its data on the
> server immediately.
>
> AI features: Translate ("Grade with AI"), the FRQ Workshop ("Grade … with AI"), Sight Reading
> ("Generate"), and the Reading Room's line tutor (touch and hold a line › Ask about line). The first
> AI request shows a permission sheet explaining that the Latin and the student's own text are sent to
> our server and on to an AI provider (Google Gemini, or Groq as a backup) to write feedback; nothing
> else about the user is sent. Declining keeps the self-graded path, and Settings › AI features
> changes the choice at any time. AI output is labelled.
>
> Classrooms: teachers create them on our website; students join with a six-character code. The
> leaderboard shows classmates' display names and study time only, with no messaging. Swipe (or touch
> and hold) a name to report it through our support form; teachers can remove a student; students can
> leave a classroom. Reports are reviewed within 24 hours.
>
> The Apple Watch app (flashcards) installs with the iPhone app. Widgets: Lectio (days to the exam,
> cards due, streak), Next lesson, and Sententia of the day.
>
> AP® is a trademark registered by the College Board, which is not affiliated with, and does not
> endorse, this product; the name is used only to say which exam the app prepares for. The Latin texts
> are public domain.

**Contact:** your name and phone number (App Review only; not shown publicly).

## App Privacy ("nutrition label") answers

Data collection: **Yes**. Tracking: **No** for every type. All purposes: **App Functionality** only.

| Data type | Linked to the user | Why |
| --- | --- | --- |
| Contact Info › Email Address | Yes | Account sign-in (only when someone creates an account) |
| Contact Info › Name | Yes | The display name an account chooses, shown to their teacher and classmates |
| User Content › Other User Content | Yes | Synced progress (notes, highlights, answers), and the text sent to the AI provider when an AI feature is used |
| User Content › Customer Support | No | Messages sent through the support form or a name report |
| Identifiers › User ID | Yes | The account ID |
| Usage Data › Product Interaction | Yes | Minutes studied per section and graded-answer counts, for classrooms |

- Not collected: location, contacts, health, financial info, browsing history, search history,
  purchases, diagnostics, device ID, and advertising data. The app has no analytics or crash-reporting
  SDK.
- The AI text counts as collected because the providers may keep it, even though Lectio doesn't.
  The privacy policy says so, and the app asks before sending any.

## Age rating

Answer the questionnaire honestly. Don't shade an answer to get a lower rating: a rating that's too
low is a rejection, and a higher one costs an AP app nothing (its students are 14 and up).

| Question | Answer | Why |
| --- | --- | --- |
| Realistic violence | Infrequent/Mild | The Aeneid: the fall of Troy, battles |
| Mature or suggestive themes | Infrequent/Mild | Dido and Aeneas, Dido's death |
| Everything else in the content section (sexual content, profanity, horror, drugs, gambling, medical) | None | |
| Unrestricted web access | No | Links open the website's own pages in Safari |
| User-generated content | Yes | Classmates see each other's display names on a leaderboard (with report, remove and leave) |
| Messaging and chat | No | |
| Advertising | No | |
| Parental controls, age assurance | No | |
| AI-generated content or chatbot (if asked) | Yes | The line tutor writes free-text answers about a Latin line |

Expect 9+ or 13+. Either is fine. Leave "Made for Kids" unticked: the Kids category has rules this
app isn't built for.

## Export compliance

The app uses only standard HTTPS, so it's exempt. `ITSAppUsesNonExemptEncryption` is already
`false` in the build, so App Store Connect won't ask.

## Screenshots

Every push to `main` that touches the app captures them. Open the latest run under Actions › iOS and
download the **screenshots** artifact. It has the iPhone 17 Pro Max (1320 × 2868, the 6.9" size) and
the 13" iPad Pro (2064 × 2752), in light and dark. They're taken with sample progress
(`-seedDemo YES`), so the dashboard has something to show. Those two sizes are all App Store Connect
requires; it scales them for smaller devices.

Suggested order: Today, the Aeneid passage, the Course, Vocab, Scansion, Quiz. Use the plain ones,
not `-classic-` or `-bigtext-`. Every screenshot must show the app itself; no marketing text over
them is needed for approval. The watch needs its own screenshots (from the watch simulator in Xcode)
only if you want it on the listing.

## What's already handled in the app

| Common rejection | Guideline | What Lectio does |
| --- | --- | --- |
| Test or debug features in a release | 2.1, 2.2 | No testers' section. Sample progress exists only in Debug builds. Version is 1.0.0. |
| Placeholder or "coming soon" screens | 2.1 | None. The unused "open on the web" placeholder view was deleted. |
| Sending personal data to an AI without consent | 5.1.2(i) | A permission sheet before the first AI request; Settings › AI features to withdraw. |
| No in-app account deletion | 5.1.1(v) | Settings › Account › Delete account deletes the auth user, which cascades through every table. |
| Forcing sign-up | 5.1.1 | No account needed for anything but sync and classrooms. |
| Privacy policy gaps | 5.1.1(i) | The policy covers what's collected, every third party, retention, deletion, AI, support messages and children. It's linked in-app (Settings › About) and from the AI permission sheet. |
| Missing privacy manifest | 5.1.1 | `PrivacyInfo.xcprivacy` in all four targets (app, widgets, watch, watch widgets), declaring UserDefaults reasons CA92.1 and 1C8F.1, no tracking. |
| User-generated content without moderation | 1.2 | Report a name (swipe or hold), teachers remove students (app and web), students leave, support form. |
| Support URL with no way to make contact | 1.5 | A contact form on /support, with no personal email on the page. |
| Trademark misuse | 5.2.1 | "AP" only describes the exam; the College Board notice is in Settings › About, the Acknowledgements, the website's footers and the description. |
| Sign in with Apple | 4.8 | Not required: email and password only, with no third-party login. |
| Notification permission without context | 4.5.4 | Asked only when the user switches on the daily reminder. |
| Encryption questions | export | `ITSAppUsesNonExemptEncryption = false`. |
| iPad layout | 2.4.1 | Full iPad UI: sidebar, every orientation, its own screenshots. |
