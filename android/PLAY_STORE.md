# Google Play: everything for a first-try approval

Everything the Play Console asks for, drafted from what the app actually does, plus the checklist of
things only you can do. It mirrors `ios/APP_STORE.md`; the app side of the usual rejection reasons is
already handled in code (see "What's already handled" at the end).

Build and release plumbing is in `.github/workflows/android.yml`; the app itself is described in
`android/README.md`.

## Before you publish: your checklist

Do these in order. Each one is something the code can't do for you.

1. **Open a Google Play developer account** at play.google.com/console ($25, once). Google verifies an
   identity: a person, or an organisation with a D-U-N-S number. Use the same legal name you use for
   Apple (Norvo Designs), because the listing shows it.
   - A **personal** account created after November 2023 has to run a **closed test with at least 12
     testers opted in for 14 days in a row** before Google lets you apply for production access. Start
     that clock as soon as the first build is up: add testers' Google accounts (or a Google Group) under
     Testing › Closed testing, send them the opt-in link, and keep them opted in. (Check the Console for
     the current numbers; Google has changed them before.) An organisation account skips this.
2. **Create the app** (All apps › Create app): name **Lectio: Latin App**, default language English
   (United States), **App** (not game), **Free**, and tick the two declarations (Developer Program
   Policies, US export laws).
3. **Stay on Play App Signing** (the default). Google keeps the real signing key; you sign uploads with
   an upload key, and Google can reset that key if you ever lose it.
4. **Make the upload key and the GitHub secrets.** On any machine with a JDK:

   ```
   scripts/android-keystore.sh
   ```

   It writes `lectio-upload.jks` (keep it and the printed password in a password manager; it is
   git-ignored) and prints the four values to add under GitHub › Settings › Secrets and variables ›
   Actions: `ANDROID_KEYSTORE_BASE64` (the contents of the `.jks.base64` file it also writes),
   `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` and `ANDROID_KEY_PASSWORD`.
5. **Let GitHub talk to Play.** In the Play Console › Users and permissions › Invite new users, and in
   Google Cloud create a **service account** (IAM & Admin › Service Accounts), give it a JSON key, and
   invite its email address to the Play Console with the **Release manager** role (or "Release apps to
   testing tracks" and "Release to production" under the app's permissions). Also turn on the
   **Google Play Android Developer API** in that Google Cloud project. Paste the whole JSON key as the
   secret `PLAY_SERVICE_ACCOUNT_JSON`.
6. **Publish the first build.** Actions › Android › Run workflow, tick *Build a signed release and
   upload it to Google Play*, track `internal`, status `draft`. It builds `app-release.aab`, signs it
   with the upload key and uploads it with the notes in `android/play/whatsnew`. *If Play refuses an
   upload to an app that has never had a bundle (it sometimes insists the first one come through the
   Console), download the `lectio-release-bundles` artifact from the run and upload `app-release.aab`
   by hand under Testing › Internal testing. Every later build can use the workflow.*
7. **Fill in the store listing** (Grow › Store presence › Main store listing) from "Listing text"
   below. The pictures:
   - **App icon** 512 × 512: `android/play/listing/icon-512.png`
   - **Feature graphic** 1024 × 500: `android/play/listing/feature-graphic-1024x500.png`
   - **Phone screenshots** (2–8, 1080 × 2160): the **play-store-screenshots** artifact of the latest
     Android run, folder `phone`. Suggested order: 01 Today, 03 Reader, 02 Course, 04 Flashcard,
     05 Quiz, 06 Scansion, 07 Browse, 08 Laurels.
   - **7-inch and 10-inch tablet screenshots**: folders `tablet7` and `tablet10` (1200 × 1920 and
     1600 × 2560). Optional, but they unlock Play's large-screen features, and the app has a real
     tablet layout (a sidebar, from 720 dp wide).
   - **Wear OS screenshots** (if you publish the watch app, see step 12): folder `wear` (454 × 454).
8. **Fill in "App content"** (Policy › App content), from the sections below: Privacy policy, Ads,
   App access, Content rating, Target audience, Data safety, Government apps, Financial features,
   Health, and the account-deletion URL.
9. **Make demo accounts for the reviewer**, exactly as for Apple (`ios/APP_STORE.md`, step 5): a
   teacher account with a classroom called "Review Class", and a student who has joined it and studied
   a few minutes. Put both logins in App access.
10. **Supabase.** Nothing new: the redirect URL `lectio://auth-callback` you added for iOS is the same
    link the Android app answers, and the email templates are the same. Try the sign-up confirmation
    and password reset once on an Android phone.
11. **Test the build Play gives you.** Install from the Internal testing link (that's the same bundle
    that goes to production) and check: the first run, sign-up and sign-in, a password reset, an AI
    grade (it asks permission first), the daily reminder (Settings › Study; Android 13+ shows the
    permission prompt then), a widget, Settings › Account › Delete account on a throwaway account, and
    the Privacy and Support links in Settings › About.
12. **The watch app (optional).** Play lists a Wear OS app under the phone app's listing. Release ›
    Advanced settings › Form factors › add **Wear OS**, complete its tracks, then run the workflow
    with *Also upload the Wear OS watch app* ticked. It uses the track you picked, with a `wear:`
    prefix. Skipping this just means no watch app; the phone app doesn't depend on it.
13. **Promote to production** (Release › Production › Create new release › add from Internal/Closed
    testing), after closed testing has run its course if your account needs it. Choose a staged
    rollout (20% for a few days) if you want a safety net: it's one slider in the Console.

## Listing text

| Field | Value |
| --- | --- |
| App name (30) | **Lectio: Latin App** (17). "AP" stays out of the name: a trademark in the title is a common rejection, while saying which exam the app prepares for, in the description, is fine. |
| Short description (80) | **Latin lessons, flashcards and exam practice for Vergil, Pliny and AP® Latin.** (76) |
| Category | Education |
| Tags | Education, Language learning, Study aids (pick what the Console offers) |
| Email | Use a Google group or a mailbox that isn't your personal one; the Console shows it publicly. |
| Website | https://lectio.norvodesigns.com |
| Privacy policy | https://lectio.norvodesigns.com/privacy |
| Package name | com.norvodesigns.lectio (the watch app uses the same one) |

### Full description (4,000 max; this is 2,260)

```
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
• Review on your Wear OS watch, and see what's due at a glance with Home screen widgets and a daily reminder.

PREPARE FOR EXAM DAY
• A quiz engine in the exam's style. Filter by author, passage, skill or question type; every answer is explained, and misses come back for review.
• Literal translation drills scored in the exam's own segments.
• Timed sight reading, a Scansion Lab with 6,500 lines of the Aeneid, and a workshop for all five free-response question types.
• Full-length practice exams with section timers, and a study plan counted back from exam day.

STUDY TOGETHER
• Sign in to sync with the Lectio website, so study on your laptop and your phone counts as one.
• Join your teacher's classroom with a code to see assignments and the class leaderboard.

No account is needed to study, and there are no ads, no tracking and no purchases. AI feedback is optional, asks before it sends anything, and is always labeled. Every Latin text comes from a public-domain edition.

AP® is a trademark registered by the College Board, which is not affiliated with, and does not endorse, this product.
```

If you drop the watch app (step 12), delete "Review on your Wear OS watch, and" from the description.

## App content

| Form | Answer |
| --- | --- |
| Privacy policy | https://lectio.norvodesigns.com/privacy (it covers the website and all three apps) |
| Ads | **No**, the app contains no ads |
| App access | **All functionality is available without special access**, but give the demo logins anyway so the reviewer can see sync and classrooms (see below) |
| Target audience | **13–15, 16–17 and 18+**. Not for children under 13: the privacy policy says accounts are not meant for them. Don't tick the under-13 groups, or Play's Families policy applies. |
| Appeals to children | **No** |
| News app | No |
| COVID-19 contact tracing or status | No |
| Government app | No |
| Financial features | None |
| Health features | None |
| Advertising ID | **No**. The app doesn't use it, and the manifest doesn't declare the permission. |
| Account deletion | In the app: Settings › Account › Delete account. Web page for the form: **https://lectio.norvodesigns.com/settings** (signed in, "Delete account"). |

### App access note (paste)

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
> ("Generate"), and the Reading Room's line tutor (touch and hold a word, then the sparkle “Ask” button). The
> first AI request shows a permission screen explaining that the Latin and the student's own text are
> sent to our server and on to an AI provider (Google Gemini, or Groq as a backup) to write feedback;
> nothing else about the user is sent. Declining keeps the self-graded path, and Settings › AI
> features changes the choice at any time. AI output is labelled.
>
> Classrooms: teachers create them on our website; students join with a six-character code. The
> leaderboard shows classmates' display names and study time only, with no messaging. The ⋯ menu on a
> name reports it through our support form; teachers can remove a student; students can leave a
> classroom. Reports are reviewed within 24 hours.
>
> The Wear OS watch app (flashcards) is a companion that installs from the phone's listing. Widgets:
> Lectio (days to the exam, cards due, streak), Next lesson, and Sententia of the day.
>
> AP® is a trademark registered by the College Board, which is not affiliated with, and does not
> endorse, this product; the name is used only to say which exam the app prepares for. The Latin texts
> are public domain.

## Data safety

Play's questionnaire. **Data collected: Yes. Encrypted in transit: Yes** (everything is HTTPS).
**Users can request deletion: Yes** (in the app and at the web URL above). No data is *sold*, no
advertising or tracking SDK is in the app, and nothing is collected until someone creates an account.

| Data type | Collected | Shared | Optional | Purpose |
| --- | --- | --- | --- | --- |
| Personal info › Email address | Yes | No | Yes (only with an account) | Account management, App functionality |
| Personal info › Name | Yes (the display name an account chooses) | No | Yes | Account management, App functionality (shown to the teacher and classmates) |
| Personal info › User IDs | Yes (the account ID) | No | Yes | Account management |
| App activity › App interactions | Yes (minutes studied per section, graded-answer counts, for classrooms) | No | Yes | App functionality |
| App activity › Other user-generated content | Yes (synced progress, notes and highlights; and the text sent for AI feedback) | **Yes**: the text sent for AI feedback goes to Google (Gemini) or Groq | Yes | App functionality |
| Messages › Other in-app messages | Yes (a support message or a name report) | No | Yes | App functionality |

- Everything else is **not collected**: location, financial info, health and fitness, photos and
  videos, audio, files and docs, calendar, contacts, web browsing, device or other IDs, and
  app-performance data (no crash-reporting or analytics SDK).
- The AI text is declared as **shared** to be on the safe side: those providers may keep what they
  receive, even though Lectio doesn't. If Google asks whether the sharing is "user-initiated," say yes
  (nothing is sent until a person presses an AI button and has agreed on the permission screen).
- Android's own backup (progress file and settings only, never the sign-in) is the operating system's
  copy on the user's Google account, not data collected by Lectio.

## Content rating (IARC questionnaire)

Answer honestly; a rating that's too low is a rejection and a higher one costs an AP app nothing (its
students are 14 and up). Category: **Reference, education or news**.

| Question | Answer | Why |
| --- | --- | --- |
| Violence | Mild, in text only | The Aeneid: the fall of Troy, battles |
| Sexual content or nudity | Mild references in text only | Dido and Aeneas |
| Profanity, controlled substances, gambling | None | |
| Fear / horror | None | |
| Users can interact or exchange content | Yes, limited | Classmates see each other's display names on a leaderboard (report, remove and leave). There is no chat. |
| Shares location, or digital purchases | No | |
| Unrestricted web access | No | Links open the website's own pages |

Expect **Everyone 10+** or **Teen**; either is fine.

## What's already handled in the app

| Common rejection | Policy | What Lectio does |
| --- | --- | --- |
| Target API level | Target API level | Targets Android 16 (API 36), which meets Play's current requirement, and builds with compile SDK 37. Minimum Android 8.0. |
| Bundle format, 64-bit | App Bundle, 64-bit | Ships an Android App Bundle with no native code. |
| Sending personal data to an AI without consent | User Data | A permission screen before the first AI request (it names the data, the recipient and the right to withdraw); Settings › AI features to change it; every AI feature has a self-graded path. |
| No in-app account deletion, or no web link | Account deletion | Settings › Account › Delete account deletes the auth user, which cascades through every table; the web page for it is /settings. |
| Forcing sign-up | | No account is needed for anything except sync and classrooms. |
| Privacy policy gaps | User Data | The policy covers what's collected, every third party, retention, deletion, AI, support messages and children, for the website and all the apps. It's linked in the app (Settings › About) and from the AI permission screen. |
| User-generated content without moderation | UGC | Report a name (the ⋯ menu), teachers remove students (app and web), students leave, and the support form. |
| Notification permission without context | Permissions | Asked only when the user turns on the daily reminder (and, once, when a timed exam starts). Everything works if it is declined. |
| Unneeded permissions | Permissions | Only `INTERNET` and `POST_NOTIFICATIONS`. No location, contacts, storage, camera or microphone. |
| Trademark misuse | Impersonation / intellectual property | "AP" only describes the exam; the College Board notice is in Settings › About, the Acknowledgements, the website's footers and the description. |
| Deceptive behaviour | Deceptive Behavior | Nothing hidden: the app does what the listing says. Sample progress exists only in debug builds. |
| Ads, tracking | Ads, Families | None. The advertising ID isn't used. |
| Large screens | Large screen quality | A tablet layout (sidebar, readable column widths), all orientations, edge-to-edge. |
| Accessibility | | Text scales with the system font size, controls carry content descriptions for TalkBack, buttons are at least 48 dp tall, and the app follows system light and dark. |
