# Building and shipping Lectio from Xcode

Lectio is a plain Xcode project that you edit and ship on your own Mac: no Expo, no cloud builder, and
no monthly build limit. This is the route to use. (The Expo files still in `ios/` are an optional
fallback; see the end.)

## One-time setup

1. **A Mac with a release Xcode, 26.2 or later** (Mac App Store, or developer.apple.com/download/all).
   Open it once so it finishes installing its components. **Not a beta**: Apple refuses uploads built
   with one, even though the build itself works. If you keep a beta around for trying new iOS versions,
   point the build at the release one (see the table below).
2. **Sign in to your Apple ID in Xcode:** Xcode > Settings > Accounts > + > Apple ID. It must be the one on
   the developer team (`M46ZNP323Y`) with the Account Holder, Admin or App Manager role. Lectio signs
   itself with *Automatically manage signing*: Xcode creates the certificates and profiles for the app,
   the widgets, the watch app and its complications, and registers the app group
   `group.com.norvodesigns.lectio`. Everything Expo created earlier is reused where it can be.
3. **XcodeGen**, which builds the Xcode project from `ios/project.yml`: `brew install xcodegen`
   ([Homebrew](https://brew.sh) first, if you don't have it).
4. **The code:**
   ```bash
   git clone https://github.com/norvodesigns/AP-Latin.git ~/AP-Latin
   cd ~/AP-Latin/ios
   xcodegen generate
   open Lectio.xcodeproj
   ```
   The first open resolves the Swift packages (LectioCore, and the ad SDKs), which takes a minute.
5. **To run on your own iPhone:** turn on Developer Mode (Settings > Privacy & Security > Developer Mode),
   plug it in, pick it in Xcode's device menu (top), and press Run (the play button).

## Editing

- **The app's code is ordinary Swift in `ios/Lectio/`** (`Features/` is one folder per screen). Edit it in
  Xcode, run it, commit it. `git pull` before you start, and commit and push to `main` when you're done.
- **`Lectio.xcodeproj` is generated and never committed.** It's rebuilt from `ios/project.yml`, so:
  - **Settings** (version, bundle IDs, capabilities, ad IDs, Info.plist entries) are changed in
    `project.yml`, not in Xcode's target settings; Xcode's edits are lost the next time you run XcodeGen.
  - **After adding, renaming or deleting a file**, run `xcodegen generate` again (Xcode keeps the project
    open; it reloads).
- **The course and passage text isn't in the Swift files.** It's JSON in `ios/Content/`, exported from the
  website's `src/data/`. `git pull` brings the latest. To regenerate it after editing `src/data/`, run
  `npm install && npm run export:content` in the repo root (Node 20+).
- **Tests:** `cd ios/LectioCore && swift test` (the shared logic), or Product > Test in Xcode.
- **The simulator:** the sample progress button (Settings > Developer) shows only in Debug builds; or
  launch with `-seedDemo YES` in the scheme's Arguments to fill an empty install.

## Shipping to TestFlight

One command, from the repo root:

```bash
scripts/ios-testflight.sh
```

It stamps a build number that always rises (a timestamp), regenerates the project, archives the Release
build with all four targets, signs it, and uploads it to App Store Connect. About 5 to 10 minutes. Apple
then processes the build for 10 to 30 minutes and emails you. After that:

- **TestFlight:** App Store Connect > your app > TestFlight > the new build > add it to your internal
  testing group. Internal testers skip Beta App Review.
- **The App Store:** on the version's page, Build > Add Build, pick it, and submit for review.

**Each App Store release needs a higher version number than the last one Apple approved.** Once a version
is approved, Apple takes no more builds under it (the upload fails with *train version … is closed* /
*must contain a higher version*). So for every release: raise `MARKETING_VERSION` in `ios/project.yml`
(`1.1.0` > `1.2.0`, or `1.1.1` for a small fix) and commit it; create that version in App Store Connect
(your app > **+** next to *iOS App*); then run the script. The build number takes care of itself. TestFlight
builds follow the same rule, because they're uploaded to the same version.

### Prefer clicking? Use the Organizer

`scripts/ios-testflight.sh --archive-only` archives and signs, then opens the archive in Xcode's
Organizer. Choose Distribute App > App Store Connect > Distribute. (Or, inside Xcode: pick *Any iOS
Device (arm64)*, Product > Archive, and do the same. If you archive this way, raise
`CURRENT_PROJECT_VERSION` in `project.yml` first; Apple refuses a build number it has seen.)

### Signing with an API key instead of your Apple ID

Useful on a second Mac, or if Xcode keeps losing its sign-in. Create a key in App Store Connect (Users and
Access > Integrations > App Store Connect API, role **Admin**), keep the `.p8` file somewhere private
(never in the repo, never pasted anywhere), and run:

```bash
ASC_KEY_PATH=~/keys/AuthKey_ABC123.p8 ASC_KEY_ID=ABC123 ASC_ISSUER_ID=<issuer id> scripts/ios-testflight.sh
```

## If something goes wrong

The script prints the usual cause under its error and keeps the full log in `ios/archive.log` or
`ios/export.log`. The common ones:

| You see | What to do |
| --- | --- |
| *train version '1.x.x' is closed for new build submissions* / *must contain a higher version than … previously approved* | That version number is already approved. Raise `MARKETING_VERSION` in `ios/project.yml`, commit, add the new version in App Store Connect, re-run. |
| *Unsupported SDK or Xcode version* (the upload fails, after the archive worked) | The Xcode in use is a beta. Check with `xcodebuild -version` and `xcode-select -p`, then build with the release one: `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer scripts/ios-testflight.sh` (adjust the name to the release Xcode in `ls -d /Applications/Xcode*`), or switch for good with `sudo xcode-select -s /Applications/Xcode.app`. The script now stops early if the selected Xcode is named beta. |
| *No Accounts* / *Unable to authenticate* | Xcode > Settings > Accounts: add (or re-add) your Apple ID. |
| *No profiles for 'com.norvodesigns.lectio…'* | Open the project, each target > Signing & Capabilities: *Automatically manage signing* on, team set, no red errors. Re-run. |
| *Maximum number of Distribution certificates* | developer.apple.com > Certificates: revoke an unused one (the one Expo made is fine to revoke once you've stopped using Expo). Re-run. |
| *The bundle version must be higher* / already used | Wait a minute and re-run (the number is a timestamp), or set `BUILD_NUMBER=` to something higher. |
| *Upload Symbols Failed … GoogleMobileAds.framework / UserMessagingPlatform.framework* | A warning, not an error: Google ships its ad frameworks without debug symbols. Only crash reports for Google's own code are affected. |
| *Missing package product* / *Failed to resolve* | File > Packages > Reset Package Caches, then re-run. Needs internet the first time. |
| *Developer Mode required* (running on your phone) | Settings > Privacy & Security > Developer Mode, then restart the phone. |

CI builds the same release configuration on every push (unsigned), so a failure that mentions *compiling*
rather than *signing* is usually something just changed, and the CI log shows where.

## Expo (optional fallback)

`ios/package.json`, `app.json`, `eas.json` and `.eas/` are the old cloud route
([TESTFLIGHT.md](TESTFLIGHT.md)). Nothing depends on them, they cost nothing to leave, and
`npm run verify` still checks them. They only matter if you want a build without a Mac, within Expo's free
monthly allowance. The other no-Mac route is **Actions > iOS > Run workflow** with *Upload a build to
TestFlight* ticked, which uses GitHub's own Macs and App Store Connect API keys stored as repository
secrets.
