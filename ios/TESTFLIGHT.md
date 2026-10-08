# Getting Lectio onto TestFlight

For a first build you can put on your own devices and give feedback on. Do the setup once, in order;
after that a build is one button.

## The route: Expo EAS (same as Palette, no Mac needed)

Lectio builds in the cloud with **EAS Build**, the way the Palette app does. EAS isn't only for React
Native: it runs `xcodebuild` on its own Macs, and a *custom build config* lets it build a plain SwiftUI
project. The wrapper is the five files in `ios/`: `package.json` (just `expo`, which `eas-cli` needs to
recognise the project; nothing from it ships in the app), `app.json` (bundle IDs and the app group for
the app, widgets, watch app and complications), `eas.json` (the `production` profile on the Xcode 26
image), `.eas/build/build-ios.yml` (install XcodeGen, stamp the build number, generate the project, sign,
archive) and `package-lock.json`. `npm run verify` checks that `app.json` still matches `project.yml`.

### One-time setup (you), about an hour, mostly waiting on Apple

1. **Apple Developer Program:** done. **Expo account:** the one Palette uses is fine.
2. **Link the project to Expo** (2 minutes, any computer with Node 20+, Mac not needed):
   ```bash
   git pull
   cd ios && npm ci
   npx eas-cli@latest login
   npx eas-cli@latest init        # writes extra.eas.projectId into ios/app.json
   git commit -am "Link EAS project" && git push
   ```
   (Or send me your Expo username and the project ID from expo.dev and I'll add them.)
3. **First build and upload, interactively** (30 to 45 minutes):
   ```bash
   cd ios
   npx eas-cli@latest build --platform ios --profile production --auto-submit
   ```
   It has to be interactive once because EAS needs you to sign in to Apple: to create the distribution
   certificate and four provisioning profiles, to register the bundle IDs
   (`com.norvodesigns.lectio`, `.widgets`, `.watchkitapp`, `.watchkitapp.widgets`) and to register the
   app group `group.com.norvodesigns.lectio` (Apple only lets a signed-in Apple ID do that part). Say
   yes to generating the certificate and profiles. When it asks for the App Store Connect app, create
   it: name **"Lectio"**, or **"Lectio: AP Latin"** if that's taken (the name under the icon stays
   "Lectio" either way). Don't use `npx testflight` here; it's Expo's one-command build for Expo
   projects and expects one.
4. **Wait for processing** (5 to 30 minutes), then in TestFlight create an **Internal Testing** group,
   add your Apple ID, and add the build. Internal testers skip Beta App Review. Install the TestFlight
   app on your device and accept the invitation. Paste the text under "What to Test" below into the
   build's *Test Details*.

### Later builds: one tap from GitHub

1. On expo.dev: Account settings > Access tokens, create a token. In GitHub: Settings > Secrets and
   variables > Actions > New repository secret, named `EXPO_TOKEN`.
2. For unattended submission EAS needs an App Store Connect API key: `npx eas-cli credentials` > iOS >
   production > *App Store Connect: Manage your API Key* > let it generate one. Then add the app's
   Apple ID (App Store Connect > App Information) to `ios/eas.json`:
   `"submit": { "production": { "ios": { "ascAppId": "1234567890" } } }`.
3. **Actions > TestFlight > Run workflow.** It queues the build on EAS and, when it finishes, submits it.
   By default it waits and, if the build fails, prints the tail of EAS's log in the run so it can be
   read from GitHub; untick *Wait* to queue and exit instead (follow it on expo.dev).

Build numbers are a timestamp (`yymmddHHMM`), set on every build, so they always rise and all four
targets agree. You never edit them.

If your connection drops while the terminal is waiting on a build or its submission (an
"api.expo.dev ... TLS" or "GraphQL request failed" error), nothing is lost: EAS keeps going in the
cloud. Check expo.dev > the lectio project > Builds and Submissions. If the build finished but was not
submitted, run `npx eas-cli@latest submit --platform ios --latest` from `ios/`.

### What may need a round or two

This route hasn't run yet: EAS needs your Expo and Apple logins, which I don't have. It follows Expo's
documented recipe for native iOS projects, but that recipe is lightly used, and a watch app with
complications is the least-trodden part. If the first build fails, send me the failing phase's log (or
run the TestFlight workflow, which prints it) and I'll fix the recipe. The routes below don't depend
on EAS and stay as the fallback.

## Fallback routes

- **From Xcode, on a Mac.** `brew install xcodegen`; Xcode 26 or later. `cd ios && xcodegen && open
  Lectio.xcodeproj`, select the **Lectio** scheme and your iPhone, Run (turn on Developer Mode on the
  phone first: Settings > Privacy & Security). Xcode signs automatically under team `M46ZNP323Y` and
  registers all four bundle IDs and the app group. Create the app record (App Store Connect > Apps > +
  > New App, bundle ID `com.norvodesigns.lectio`), then *Any iOS Device (arm64)*, Product > Archive,
  Distribute App > App Store Connect > Distribute. Best for a first build, since errors are easiest to
  read there.
- **From GitHub, on a GitHub Mac.** Create an App Store Connect API key (Users and Access >
  Integrations > App Store Connect API, role **Admin**), add the repository secrets `ASC_KEY_ID`,
  `ASC_ISSUER_ID` and `ASC_KEY_P8` (the whole .p8 file), then Actions > iOS > Run workflow with
  *Upload a build to TestFlight* ticked. The job checks the three secrets in seconds and says which is
  missing. The app record and the app group must already exist (one Xcode run does both). Never paste
  the .p8 anywhere but the secret.

CI already proves most of this before you start: every push builds the app, runs the tests, builds an
unsigned **Release archive for a real device** with the watch app embedded (the part a simulator build
skips), and screenshots both looks. What it can't prove is signing, and how things feel on glass.

## Two looks, one build

- **iOS 26 and later** gets Liquid Glass: the glass tab bar that shrinks while you scroll, the
  due-cards pill above it, glass buttons and sheets.
- **iOS 17 and 18** gets the backup: the same screens with a material look instead of glass, a classic
  tab bar on iPhone (Vocab carries a badge for cards due) and a sidebar list on iPad.

To judge the backup without an old device, turn on **Settings > Appearance > Classic look** and
relaunch. That switch is a normal setting, so it stays in the App Store build.

TestFlight builds are the same binary the App Store gets, so there is no testers-only section any more
(App Review rejects test tools left in a release). **Load sample progress** now lives only in Debug
builds (run from Xcode, or the simulator with `-seedDemo YES`); **Settings > Your data > Clear all
progress on this device** (signed out only) is an ordinary setting.

## What to Test (paste into TestFlight)

> This is the first look at the Lectio app for iPhone, iPad and Apple Watch, for judging how it looks
> and feels. Please don't worry about the Latin content yet.
>
> Do a lesson or two and a few flashcards first, so the screens have something to show. Then try, on
> iPhone and iPad, in light and dark, and once at your largest text size (Settings > Accessibility >
> Display & Text Size > Larger Text):
>
> 1. The first run (delete and reinstall to see it again): the welcome, the three-page tour, each
>    answer to "Where are you starting?" (the level check is behind "I know some Latin"), and the plan
>    at the end. Then the first-visit tips on Today, a passage and Browse. Settings > Take the tour
>    again replays the tour.
> 2. Today (scroll through every panel), then each tab, then Browse (the search tab), which lists every
>    section of the app, with Jump to on Today as the quick way to the same places.
> 3. The Course: try Find my level, then a lesson on each track (Grammar and Vocabulary), and a unit test
>    on the Vocabulary track.
> 4. The Reading Room: open Aeneid 1.1–33, tap words, hold to highlight, add a note.
> 5. Vocabulary: a flashcard session, and the Speed round.
> 6. Quiz, the Scansion Lab, Translate, Sight Reading.
> 7. The Practice Exam, just to the first few questions.
> 8. Home Screen and Lock Screen widgets, and the watch app's flashcards.
>
> What to tell me: anything cut off, overlapping, too small, too faint, slow, or that just looks off,
> and anything confusing about where to tap. A screenshot sent from TestFlight (take a screenshot, then
> tap Share Beta Feedback) is perfect. Also try Settings > Appearance > Classic look and tell me which
> look you prefer.

## Known gaps, so they don't surprise you

- Nothing here has run on a physical device yet. Fonts, safe areas, widgets, the Live Activity (a timed
  practice-exam section) and the watch complications may look different from the simulator.
- Notifications ask for permission the first time a reminder is switched on.
- AI features (the tutor, grading) need the website's AI to be configured; if it isn't, the buttons
  are hidden and everything falls back to self-grading. The first AI button asks permission to send
  your text to the AI provider; Settings > AI features turns it back off.
- The sign-up email link confirms the address on the website, whose page has an **Open Lectio** link
  back to the app's sign-in. Add `lectio://auth-callback` to Supabase > Authentication > URL
  Configuration > Redirect URLs as well.
- Teachers assigning *course* time needs `supabase/migrations/0004_course_section.sql` applied and
  `learn` added to `ASSIGNABLE_SECTIONS`; nothing else depends on it.

## If an upload is rejected

Send me the full message from Xcode's Organizer, the failed TestFlight job, or expo.dev (for the
GitHub Mac route, the *testflight-logs* artifact has the archive and export logs). The usual suspects are a missing app record, an app group that
wasn't registered, or an unaccepted agreement in App Store Connect (Business).
