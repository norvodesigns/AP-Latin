# Getting Lectio onto TestFlight

For a first build you can put on your own devices and give feedback on. Do the setup once, in order;
after that a build is one button.

## One-time setup (you)

1. **A Mac with Xcode, and XcodeGen.** `brew install xcodegen`. Xcode 26 or later (the project is
   written against the iOS 26 SDK; it runs on iOS 17 and later).
2. **Run it once from Xcode, on your own iPhone.** This registers everything with Apple for you.
   ```bash
   git pull
   cd ios && xcodegen && open Lectio.xcodeproj
   ```
   Select the **Lectio** scheme and your iPhone, Run. Xcode signs automatically under team
   `M46ZNP323Y` and registers `com.norvodesigns.lectio`, the widgets
   (`.widgets`), the watch app (`.watchkitapp`), its complications (`.watchkitapp.widgets`) and the app
   group `group.com.norvodesigns.lectio`. If Xcode complains about any of them, send me the message.
   Turn on Developer Mode on the phone first (Settings > Privacy & Security).
3. **Create the app record.** App Store Connect > Apps > + > New App. Platform iOS, name "Lectio" (or
   "Lectio: AP Latin" if taken), English (U.S.), bundle ID `com.norvodesigns.lectio`, any SKU.
4. **Upload the first build.** Either:
   - **From Xcode** (best for the first one, since errors are easiest to read): choose
     *Any iOS Device (arm64)* as the destination, Product > Archive, then Distribute App > App Store
     Connect > Distribute.
   - **From GitHub:** create an App Store Connect API key (Users and Access > Integrations > App Store
     Connect API, role **Admin**), add the repository secrets `ASC_KEY_ID`, `ASC_ISSUER_ID` and
     `ASC_KEY_P8` (the whole .p8 file), then Actions > iOS > Run workflow with *Upload a build to
     TestFlight* ticked. The job checks the three secrets in seconds and says which is missing. Never
     paste the .p8 anywhere but the secret.
5. **Wait for processing** (5 to 30 minutes), then in TestFlight create an **Internal Testing** group,
   add your Apple ID, and add the build. Internal testers skip Beta App Review. Install the TestFlight
   app on your device and accept the invitation. Paste the text under "What to Test" below into the
   build's *Test Details*.

CI already proves most of this before you start: every push builds the app, runs the tests, builds an
unsigned **Release archive for a real device** with the watch app embedded (the part a simulator build
skips), and screenshots both looks. What it can't prove is signing, and how things feel on glass.

## Two looks, one build

- **iOS 26 and later** gets Liquid Glass: the glass tab bar that shrinks while you scroll, the
  due-cards pill above it, glass buttons and sheets.
- **iOS 17 and 18** gets the backup: the same screens with a material look instead of glass, a classic
  tab bar on iPhone (Vocab carries a badge for cards due) and a sidebar list on iPad.

To judge the backup without an old device, turn on **Settings > Preview > Classic look** and relaunch.
**Load sample progress** (same section, offered only while signed out) fills an empty device with a few
weeks of study so Today, Laurels and the weekly recap have something to show; **Clear all progress**
undoes it. Sample progress never reaches an account.

## What to Test (paste into TestFlight)

> This is the first look at the Lectio app for iPhone, iPad and Apple Watch, for judging how it looks
> and feels. Please don't worry about the Latin content yet.
>
> First: Settings > Preview > Load sample progress, so the screens have something to show (skip it if
> you'd rather start fresh). Then try, on iPhone and iPad, in light and dark, and once at your largest
> text size (Settings > Accessibility > Display & Text Size > Larger Text):
>
> 1. The first-run screens (delete and reinstall to see them again).
> 2. Today, then each tab, then the Everything list.
> 3. The Course: open a lesson and finish it.
> 4. The Reading Room: open Aeneid 1.1–33, tap words, hold to highlight, add a note.
> 5. Vocabulary: a flashcard session, and the Speed round.
> 6. Quiz, the Scansion Lab, Translate, Sight Reading.
> 7. The Practice Exam, just to the first few questions.
> 8. Home Screen and Lock Screen widgets, and the watch app's flashcards.
>
> What to tell me: anything cut off, overlapping, too small, too faint, slow, or that just looks off,
> and anything confusing about where to tap. A screenshot sent from TestFlight (take a screenshot, then
> tap Share Beta Feedback) is perfect. Also try Settings > Preview > Classic look and tell me which look
> you prefer.

## Known gaps, so they don't surprise you

- Nothing here has run on a physical device yet. Fonts, safe areas, widgets, the Live Activity (a timed
  practice-exam section) and the watch complications may look different from the simulator.
- Notifications ask for permission the first time a reminder is switched on.
- AI features (the tutor, grading) need the website's AI to be configured; if it isn't, the buttons
  are hidden and everything falls back to self-grading.
- Signing in needs the sign-up email link to return to the app: add `lectio://auth-callback` to
  Supabase > Authentication > URL Configuration > Redirect URLs.
- Teachers assigning *course* time needs `supabase/migrations/0004_course_section.sql` applied and
  `learn` added to `ASSIGNABLE_SECTIONS`; nothing else depends on it.

## If an upload is rejected

Send me the full message from Xcode's Organizer or the failed Actions job (the *testflight-logs*
artifact has the archive and export logs). The usual suspects are a missing app record (step 3), an
app group that wasn't registered (step 2), or an unaccepted agreement in App Store Connect (Business).
