# Lectio for Android

A native Kotlin app (Jetpack Compose), built alongside the website and the iPhone app from the same
content and the same progress data. It runs on Android 8.0 and later: phones, tablets and foldables,
with a Wear OS watch app and Home screen widgets. The look is the iPhone app's (the Rubrica palette,
EB Garamond, the manuscript's panels and rules) without the Liquid Glass: panels are slips of parchment
with a hairline edge. The website stays the place content is written. This folder is the app.

```
android/
  core/    Pure Kotlin (no Android): the Kotlin port of LectioCore. Content models, the progress document
           and its merge, SM-2, streaks, the course and adaptive path, scansion grading, Supabase sync.
           Held to the same parity fixtures as the Swift package and the website.
  app/     The app: App state (AppModel), the design system (ui/), one folder per feature (features/),
           data/ (content store, files, HTTP, the AI client), widgets/, notifications/, watch/.
  wear/    The Wear OS flashcards app and its watch-face complication.
  play/    Release notes, and the Play listing's icon and feature graphic.
  PLAY_STORE.md  Everything the Play Console asks for, and the owner's checklist.
```

## What matches the iPhone app

Every section: Today, the Course (grammar and the AP vocabulary track, lessons, the level check), the
Reading Room (glossary, highlights, notes, the line tutor), Vocabulary (flashcards, speed round,
derivatives), the Quiz Engine, Translate, Sight Reading, the Scansion Lab, Forms Forge, Grammar, Literary
Devices, Context, the FRQ Workshop and course project, the Practice Exam (with a countdown notification
in place of the Live Activity), the Study Plan, Laurels, Classrooms, Search and Settings (backup and
restore, AI consent, reminders), and the first run. Accounts and sync use the same Supabase project; AI
features use the website's `/api/ai/*` routes.

What's Android's own: a bottom bar on phones and a sidebar from 720 dp wide; widgets (Lectio, Next lesson,
Sententia of the day) built with Glance; launcher shortcuts (long-press the icon); a daily reminder that
quotes the day's line; Android's backup carries the progress file to a new phone; and the Wear OS app.

Over-the-air content updates work as on iOS: the app bundles the course at build time and checks
`lectio.norvodesigns.com/content/v1` for a newer one.

## Running it

You need a JDK 21 and the Android SDK (Android Studio brings both). Open `android/` in Android Studio,
or:

```bash
cd android
echo "sdk.dir=$ANDROID_HOME" > local.properties     # once
./gradlew :app:installDebug                          # a connected phone or emulator
```

The build copies the course from `ios/Content` and the scansion corpus from `public/scansion` into the
app's assets, so run `npm run export:content` after editing `src/data` and the Android app stays in step
with the others. Debug builds have a "Load sample progress" button in Settings (signed out only) that
fills an empty install with a few weeks of study.

## Tests

```bash
./gradlew :core:test                    # the Kotlin core, against the web's fixtures (ios/LectioCore/Tests/.../Fixtures)
./gradlew :app:testDebugUnitTest        # the screens, rendered and walked through on the JVM (Robolectric)
./gradlew :wear:testDebugUnitTest       # the watch's screens
./gradlew :app:lintDebug :wear:lintDebug
```

`InteractionTests` taps through the first run, a quiz, flashcards, the reader, Forms Forge and the exam, and
opens every section inside the real shell. `ScreenshotTests` and `StoreScreenshots` render the screens
to PNGs (`./gradlew :app:recordRoborazziDebug`; output in `app/build/outputs/roborazzi` and
`app/build/outputs/play`), which is how the layout is checked without a device and where the Play
listing's screenshots come from.

On a machine that can't reach Maven Central through a proxy, set `ROBOLECTRIC_DIR` to a folder holding
Robolectric's `android-all-instrumented` jar for SDK 35, and the tests run offline.

## Releasing

See [PLAY_STORE.md](./PLAY_STORE.md). In short: `scripts/android-keystore.sh` makes the upload key, five
GitHub secrets let Actions › Android › Run workflow sign and upload to Google Play, and the same file
holds the listing text, the Data safety and content-rating answers, and review notes to paste.

The version is `versionName` in `app/build.gradle.kts` (and `wear/`); the CI passes the run number as
the version code (offset past anything uploaded by hand; the watch app's is a million higher, as Play
keeps one list of version codes per app).
