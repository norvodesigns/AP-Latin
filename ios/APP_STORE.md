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
4. **Point the password-reset email at the website.** Supabase › Authentication › Emails ›
   Templates › **Reset password**: make the link
   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery` (the same shape as your
   Confirm signup link, with `type=recovery`). "Forgot your password?" in the app's sign-in opens
   lectio.norvodesigns.com/forgot-password; the email's link leads to "Choose a new password", then
   back to the app with **Open Lectio**. Try it once. Supabase's built-in sender allows only a few emails
   an hour for the whole project, so if many students will sign up at once, add your own SMTP
   (Authentication › Emails › SMTP Settings).
5. **Make demo accounts for the reviewer** (Guideline 2.1: reviewers must be able to reach every
   feature). On the website:
   - create a **teacher** account, e.g. `lectio.review.teacher@<a domain you control>`, and a classroom
     called "Review Class";
   - create a **student** account, e.g. `lectio.review.student@…`, confirm its email, and join Review
     Class with the code;
   - in the app, signed in as the student, study a few minutes (a lesson, some flashcards) so the
     leaderboard and assignments have something to show; add one assignment as the teacher.
   Put both logins in App Review Information (below). Don't use your personal email.
6. **Make sure AI works on the live site.** The Vercel project needs its Gemini (and/or Groq) key. If
   AI is off, the AI buttons simply don't appear, which is fine, but the review notes below describe
   them, so check one grading request works first.
7. **Run the release build once from TestFlight** (the same binary App Review gets) and check: the
   first run, sign-up and sign-in, a password reset, an AI grade (it should ask permission first),
   Settings › Account › Delete account on a throwaway account, and the Privacy and Support links in
   Settings › About.
8. **Fill in App Store Connect** from the sections below: App Information, the 1.0 version page,
   App Privacy, Age Rating, App Review Information, Pricing (Free) and Availability.
9. **Content rights** (App Information): answer **Yes**, the app contains third-party content, and
   **Yes**, you have the rights: the Latin texts are public domain, and the vocabulary list is the
   words of the College Board's published course framework with Lectio's own definitions.

## App information

| Field | Value |
| --- | --- |
| Name (30) | **Lectio: Latin App** (what the record uses). Keep "AP" out of the name: a trademark in the name is a common 5.2.1 rejection, while saying which exam the app prepares for, in the subtitle and description, is fine. |
| Subtitle (30) | **Vergil & Pliny for AP® Latin** (28) |
| Bundle ID | com.norvodesigns.lectio |
| SKU | lectio-ios |
| Primary category | Education |
| Secondary category | Reference |
| Privacy Policy URL | https://lectio.norvodesigns.com/privacy |
| Support URL | https://lectio.norvodesigns.com/support |
| Marketing URL | https://lectio.norvodesigns.com |
| Copyright | 2026 Norvo Designs (Apple's format: the year, then the owner) |
| Version | **1.0.0**, exactly as the build has it. The version page's Build section only offers builds whose version matches this field, so "1.0" won't find a 1.0.0 build. |
| Routing App Coverage File | Leave empty (for navigation apps only). |
| Price | Free, no in-app purchases |

## Promotional text (170)

Start where you are: a quick check finds your level, then short lessons take you from your first Latin word to Vergil, Pliny and the AP® Latin exam.

(148 characters.)

## Description

Lectio takes you from your first Latin word to the AP® Latin exam: short lessons that find your level, every passage of Vergil and Pliny with each word glossed, and flashcards that come back just before you forget.

START WHERE YOU ARE
• A quick level check places you in the course, so you skip what you already know.
• A step-by-step course from the first declension to the Aeneid, in short lessons with instant feedback.
• A vocabulary track that works through the AP® Latin word list letter by letter, with a test for each part that lets you skip the words you already know.

READ THE REAL TEXTS
• Every required passage of Vergil's Aeneid and Pliny's Letters, and more, with a glossary on every word.
• Highlight in four manuscript colors, add notes, flag hard lines, and read cold with the glossary off, the way the exam gives you the Latin.
• Ask about any line: a parse, a construction, the scansion.

REMEMBER WHAT YOU LEARN
• Spaced-repetition flashcards: each word returns just before you'd forget it.
• Words you look up while reading join your deck automatically.
• A timed speed round, English derivatives, and a new line of Latin every day.
• Review on Apple Watch, and see what's due at a glance with Home Screen and Lock Screen widgets.

PREPARE FOR EXAM DAY
• A quiz engine in the exam's style. Filter by author, passage, skill or question type; every answer is explained, and misses come back for review.
• Literal translation drills scored in the exam's own segments.
• Timed sight reading, a Scansion Lab with 6,500 lines of the Aeneid, and a workshop for all five free-response question types.
• Full-length practice exams, and a study plan counted back from exam day.

STUDY TOGETHER
• Sign in to sync with the Lectio website, so study on your laptop and your phone counts as one.
• Join your teacher's classroom with a code to see assignments and the class leaderboard.

No account is needed to study, and there are no ads, no tracking and no purchases. AI feedback is optional, asks before it sends anything, and is always labeled. Every Latin text comes from a public-domain edition.

AP® is a trademark registered by the College Board, which is not affiliated with, and does not endorse, this product.

(2228 of 4,000 characters.)

## Keywords (100)

`aeneid,virgil,classics,vocabulary,flashcards,grammar,translation,scansion,declension,exam,prep,roman`

That's exactly 100 characters. The words already in the name and subtitle (Lectio, Latin,
Vergil, Pliny, AP) are indexed anyway, and trademarked terms in keywords are a 2.3.7 rejection, so
"AP" stays out.

## Header image

`ios/Brand/AppStore-header-3840x1646.png` (landscape) and `ios/Brand/AppStore-header-1544x2950.png`
(portrait), whichever size the form asks for: the icon's L on a disc between laurels, over the
opening of the Aeneid set faintly as a manuscript page, in the app's parchment and pigments. No
words over the art, since the App Store sets the app's name over it; the middle third holds
everything that matters, so a crop still works.

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
not `-classic-`, `-bigtext-` or `-onboarding-` (those are for checking the design). Every screenshot
must show the app itself; no marketing text over them is needed for approval.

**Apple Watch screenshots are required too**, because the build includes a watch app: App Store
Connect shows an Apple Watch section on the version page and won't submit without at least one. The
same artifact has `watch-home.png` and `watch-review.png`, from the Series 11 (46 mm) simulator
(416 × 496, an accepted size), showing a sample deck. Upload both.

## Accessibility Nutrition Labels (optional)

App Store Connect › your app › Accessibility lets you declare which accessibility features Lectio
supports on each device. It's voluntary and not part of review, but whatever you declare must be true.
Safe to declare now: **Dark Interface**, **Larger Text** (every screen follows Dynamic Type; CI
screenshots the largest sizes) and **Reduced Motion** (the first run and the course respect it).
Declare **VoiceOver** only after you've walked through the main tasks with it on a device.

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
