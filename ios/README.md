# Lectio for iPhone and iPad

A native SwiftUI app, built alongside the website from the same content and the same progress
data. It runs on iOS and iPadOS 17 and later (watchOS 10 and later): Liquid Glass on 26 and later,
and a quiet material look with a classic tab bar before that, from one build. The website stays the
place content is written. This folder is the app.

```
ios/
  project.yml         XcodeGen spec. The .xcodeproj is generated from it, never committed
  Content/            The course as JSON, exported from src/data (npm run export:content)
  LectioCore/         Swift package: content models, progress document, SM-2, streaks, sync merge
  Lectio/             The app: App/, Design/, Features/, Resources/
  ExportOptions.plist Used by the TestFlight job in .github/workflows/ios.yml
```

## Running it

You need a Mac with Xcode 26 or later, and [XcodeGen](https://github.com/yonaskolb/XcodeGen).

```bash
brew install xcodegen      # once
cd ios
xcodegen                   # re-run whenever files are added or removed
open Lectio.xcodeproj
```

Pick an iPhone or iPad simulator (or your own device) and press Run. Signing is automatic under
team `M46ZNP323Y`. The first time you run on a physical device, Xcode registers the bundle ID
`com.norvodesigns.lectio` for you.

LectioCore's tests run on their own too, including on Linux:

```bash
cd ios/LectioCore && swift test
```

## How it stays in step with the website

**Content.** The app never has its own copy of the Latin. `scripts/export-content.ts` loads
everything under `src/data` and writes it to `ios/Content` as JSON. It also runs every word of
every passage through the web glossary (`tokenize` → `lookup` → `disambiguateInContext` in
`src/lib/latin.ts`) and stores the result with the word. So the app shows exactly the gloss the
website shows, without re-implementing the stemmer, and a highlight's token range means the same
thing on both. After editing anything in `src/data`:

```bash
npm run export:content     # CI fails if ios/Content is stale
```

New content doesn't have to wait for an App Store release. The website serves the same files at
`/content/v1/` (`src/app/content/v1/[file]/route.ts`). When the app launches or comes to the
foreground, at most every six hours, it compares that manifest with its own and downloads only
the files whose SHA-256 changed. It checks every file against the manifest, decodes the whole set,
and only then swaps it in (`Lectio/App/ContentStore.swift`). The manifest also lists every earlier
content hash (`supersedes`), and the app only takes content whose history includes its own. So a
build that's ahead of the website never goes backwards. A change to the JSON *shape* needs an app
update: bump `SCHEMA_VERSION` in the exporter and `ContentLibrary.supportedSchemaVersion` together,
and older builds keep the content they have.

**Progress.** A student's progress is the same JSON document on both platforms: the web's
`SyncableData`, stored in the `user_progress` table when signed in. The files are:

- `LectioCore/.../ProgressMerge.swift`: port of `src/lib/mergeProgress.ts`.
- `SpacedRepetition.swift` and `Streaks.swift`: ports of `sm2`, `currentStreak` and friends from
  `src/store/useStore.ts`.

Each port is held to the TypeScript by fixtures. The TypeScript is run on chosen inputs, and the
Swift tests must reproduce the output exactly:

```bash
npm run export:fixtures    # after changing mergeProgress.ts or the sm2/streak helpers
```

Progress is handled as order-preserving JSON (`JSONValue`), not decoded into fixed structs. That
way, a field the website adds later survives a round trip through an older app build.

**AI.** Grading and the tutor call the website's own `/api/ai/*` routes. No API keys ship in the
app.

## Design

This is the web's "Rubrica" design, translated. The page is parchment and ink, the Latin set in
EB Garamond, with hairline rules and red rubrication. The page is never glass. Liquid Glass is
for the layer that floats above it:

- On iPhone, the tab bar, which shrinks while you read.
- On iPad, the sidebar.
- Toolbars, the glossary sheet, and the flashcard controls.

Colours are asset-catalog sets under `Lectio/Resources/Assets.xcassets/Palette`, with light and
dark values taken from `src/app/globals.css`.

**Older systems.** Every glass call goes through `Lectio/Design/GlassCompat.swift` (`lectioGlass`,
`glassButton`, `GlassGroup`, `lectioGlassID`). On iOS 26+ each is the system's own Liquid Glass; before
that each is a thin material with a hairline edge in the page's colours. The navigation shell
(`App/RootView.swift`) has three forms: the Tab API with the adaptable sidebar (iOS 18 and 26), a
classic `tabItem` tab bar for iPhone and a split view for iPad (iOS 17). Launch with
`-legacyChrome YES`, or turn on Settings > Preview > Classic look and relaunch, to see the older look
on a device that has glass. CI screenshots it that way too (`*-classic-*` in the screenshots artifact).
A new view should use the wrappers, never `glassEffect` or `.buttonStyle(.glass)` directly: CI builds
with a deployment target of iOS 17, so an unguarded iOS 26 call fails the build.

## Shipping to TestFlight

The step-by-step is in [TESTFLIGHT.md](TESTFLIGHT.md). In short:

Either route works:

- **From Xcode:** Product → Archive, then Distribute App → App Store Connect.
- **From GitHub:** Actions → iOS → Run workflow, then tick "Upload a build to TestFlight". This
  needs three repository secrets (Settings → Secrets and variables → Actions):

  | Secret | Value |
  | --- | --- |
  | `ASC_KEY_ID` | The API key's Key ID |
  | `ASC_ISSUER_ID` | The Issuer ID shown above the keys list |
  | `ASC_KEY_P8` | The full contents of the downloaded `.p8` file |

  Create the key under App Store Connect → Users and Access → Integrations → App Store Connect
  API, with the **Admin** role, so Xcode can create the distribution certificate itself. The
  build number is the workflow run number.

The app record has to exist in App Store Connect before the first upload: Apps → + → New App,
bundle ID `com.norvodesigns.lectio`.

## What's in the app

Every section of the website, rebuilt natively:

| | |
| --- | --- |
| **Today** | Countdown, streaks, today's goal, mastery by skill, weak spots (each opens the right drill), the vocabulary week ahead |
| **Reading Room** | Every passage; tap any word for its gloss; touch and hold to highlight a span in one of four pigments, add a note, or ask the AI tutor about the line; bookmarks, hard-line flags, cold reads, notes and context |
| **Vocabulary** | SM-2 flashcards: Latin → English, English → Latin, or in context; scope by unit or passage; new-card batches; browse and search |
| **Quiz Engine** | Filters by author, passage, unit, skill and type; explanations; review queue |
| **Translate** | FRQ 2 drills, AI-graded per segment or self-scored against the requirements |
| **Sight Reading** | Vetted passages against the clock, plus the AI generator (labelled machine-selected) |
| **Scansion Lab** | The whole Aeneid: quantities, feet and elisions, each asked and scored |
| **Grammar, Devices, Context** | References, study decks, spot-the-device, context quiz |
| **FRQ Workshop** | All five types, timed, official rubric rows, AI essay and short-answer feedback, Course Project passages |
| **Practice Exam** | 52 MCQ / 65 min, 5 FRQ / 115 min, scored report |
| **Study Plan** | Phases back from exam day, schedule, progress |
| **Classroom** | Join with a code, assignments and leaderboard; teachers see their classes |
| **Account** | Sign in, two-way sync with the website, delete account |

Also: Home Screen and Lock Screen **widgets**, a daily **reminder**, and an **Apple Watch** app for
the day's flashcards (the iPhone schedules; grades made on the wrist sync back through it).

### Targets

- `Lectio`: the iPhone and iPad app.
- `LectioWidgets`: the widget extension. It reads a snapshot from the `group.com.norvodesigns.lectio`
  app group.
- `LectioWatch`: the watchOS app, embedded in the iPhone app so it installs on a paired watch. It
  talks to the phone over WatchConnectivity.
- `LectioWatchWidgets`: the watch face complications (cards left to review), embedded in the watch
  app. They read a `WatchGlance` the watch app writes to the same app group on the watch.
- `LectioCore`: shared by all of them.

The app group and the bundle IDs (`com.norvodesigns.lectio.watchkitapp` and
`com.norvodesigns.lectio.watchkitapp.widgets` for the watch) are registered automatically the first
time Xcode signs each target.
