# Lectio for iPhone and iPad

A native SwiftUI app with Liquid Glass (iOS/iPadOS 26+), built alongside the website from the same
content and the same progress data. The website stays the place content is written. This folder
is the app.

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

## Shipping to TestFlight

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

## What's here and what's next

**Built so far:**

- Today: countdown, streaks, cards due, pick up where you left off.
- Reading Room: every passage, with tap-any-word glossary, bookmarks, flagged lines, and a cold-read
  toggle.
- Vocabulary: SM-2 flashcards, with units added a unit at a time.
- Grammar reference with paradigm charts.
- Search across passages, vocabulary and grammar.
- Settings: appearance, Latin size, backup export and import in the website's own file format.

The remaining sections open their web version for now.

**Next:**

1. Sign-in and two-way sync with the website.
2. Quiz Engine.
3. Highlights and notes in the Reader.
4. The rest of the drills and exam sections.
5. Widgets and reminders.
6. Apple Watch flashcards (a watchOS target on the same LectioCore).
