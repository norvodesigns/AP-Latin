# Test builds: Xcode Cloud, GitHub and your Mac

The iOS app's test builds run on **Xcode Cloud**, which comes with the Apple Developer Program (25 hours
of build time a month, free). The website's and the Android app's checks stay on **GitHub Actions**, on
its Linux machines, where they cost very little. GitHub's Macs are only used when you ask for them.

## What runs where

| What | Where | When | Cost |
| --- | --- | --- | --- |
| Website: types, lint, content checks, export checks, `next build` | GitHub Actions, Linux (`verify.yml`) | Every push and pull request | About 1 minute each |
| Website deploys | Vercel | Every push that touches the website | Vercel's own builds |
| LectioCore tests (Swift, on Linux) | GitHub Actions, Linux (`ios.yml`, *core*) | Pushes and pull requests that touch `ios/` | About 1 minute |
| Android: tests, lint, bundles, screenshots | GitHub Actions, Linux (`android.yml`) | Pushes and pull requests that touch `android/` | About 10 to 15 minutes |
| iOS: release archive, with the widgets, watch app, content and icon checked | **Xcode Cloud, "Check"** | Pushes to `main` and pull requests that touch `ios/` or `public/scansion/` | Free (Xcode Cloud hours) |
| iOS: UI tests (Reading Room, line tutor) | **Xcode Cloud, "UI tests"** | Pushes to `main` that touch `ios/` | Free (Xcode Cloud hours) |
| TestFlight | Your Mac (`scripts/ios-testflight.sh`), or Xcode Cloud (optional "TestFlight" workflow) | When you ship | Free |
| App Store screenshots | Your Mac (`scripts/ios-screenshots.sh`) | When you want them | Free |
| GitHub's Mac jobs: full build log, UI tests, screenshots, TestFlight | GitHub Actions, macOS (`ios.yml`) | Only by hand: Actions > iOS > Run workflow | GitHub macOS minutes, or free on your own Mac (below) |

**Why the change.** GitHub bills macOS minutes at about ten times the Linux rate ($0.062 a minute against
$0.006), and every push to the iOS app ran about 70 minutes of Mac jobs (an 8-minute build, 14 minutes of
UI tests and a 47-minute screenshot run): about $4.30 of a monthly allowance of $12 (GitHub Free) or $18
(Pro). Three or four iOS pushes used up the month. Everything left on GitHub now is Linux, a few dollars a
month at most, so the repository can stay private without running out.

**Can Xcode Cloud build the website too?** Not usefully. Xcode Cloud only runs Xcode's own actions (build,
test, analyze, archive) on an Xcode project. A custom script could run `npm` alongside an iOS build, but it
would spend Mac hours on Linux work and only run when an iOS build does. The website's checks cost about a
minute of Linux time per push, and Vercel builds the site on every change anyway, so they stay where they
are.

## Setting up Xcode Cloud (once, about 20 minutes, on your Mac)

You need a release Xcode (26.2 or later) signed in to your Apple ID with the Account Holder, Admin or App
Manager role (Xcode > Settings > Accounts), and to be an admin of the GitHub repository. The scripts Xcode
Cloud runs are in `ios/ci_scripts/`; they have to be on `main` before the first build.

1. **Get the code and generate the project, with the UI tests.**
   ```bash
   cd ~/AP-Latin && git checkout main && git pull
   cd ios && xcodegen generate --spec project-uitests.yml
   open Lectio.xcodeproj
   ```
   Wait until Xcode has finished resolving the packages (the status bar at the top goes quiet).
   `project-uitests.yml` is the usual project plus the UI-test target; Xcode Cloud generates the same one,
   so the `LectioUITests` scheme you'll pick below exists there too.

   **Then commit the package versions** (once; Xcode Cloud can't choose them itself, see
   [The package versions](#the-package-versions)). Still in `ios/`:
   ```bash
   xcodebuild -resolvePackageDependencies -project Lectio.xcodeproj -scheme Lectio
   cp Lectio.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved Package.resolved
   git add Package.resolved && git commit -m "Pin the Swift package versions for Xcode Cloud" && git push
   ```

2. **Start.** Open the Report navigator (the last icon above the file list, or ⌘9), click **Cloud**, then
   **Get Started**. Pick the product **Lectio** and click Next. If Xcode asks for a team, choose
   `M46ZNP323Y`.

3. **Make the first workflow "Check".** Click **Edit Workflow** and set:
   - **General:** Name `Check`.
   - **Environment:** Xcode version *Latest Release*, macOS version *Latest Release*. (Latest Release
     is what builds the app with the iOS 27.1 SDK that iPhone Duo needs; don't pin an older Xcode.)
   - **Start Conditions:** select the *Branch Changes* condition already there. Source Branch: *Custom
     Branches*, `main`. Files and Folders: *Custom Conditions*, then **Start a Build** if **Any File**
     changes in the folder `ios`, and add a second condition for the folder `public/scansion`. Turn on
     **Auto-cancel Builds**.
     Then **+** > *Pull Request Changes*: Source Branch *Any Branch*, Target Branch *Custom Branches* `main`,
     the same two folder conditions, Auto-cancel Builds on.
   - **Actions:** the suggested *Archive - iOS*. Scheme `Lectio`, Platform iOS, **Distribution
     Preparation: None** (this workflow only proves the release build is sound).
   - Leave the Post-Actions as they are (Xcode Cloud emails you about each build) and click **Save**.

4. **Let Xcode Cloud read the repository.** Click Next, then **Grant Access**. GitHub opens and asks to
   install the *Xcode Cloud* app: choose **Only select repositories**, pick **AP-Latin**, and install. Back
   in Xcode, click Next, then **Complete**.

5. **First build.** Choose the branch `main` and click **Start Build**. The first one takes longest (about
   15 to 20 minutes) because it downloads the ad SDKs. Follow it in the Report navigator under Cloud: the
   log for *ci_post_clone.sh* shows `==> XcodeGen` and `==> Generating Lectio.xcodeproj`, and the archive
   ends with the archive check (`Plug-ins: LectioWidgets.appex`). A green tick means the release build,
   the watch app and the widgets all built and were found in the archive.

6. **Add the "UI tests" workflow.** In the Report navigator's Cloud tab, Control-click **Lectio** >
   **Manage Workflows** > **+**:
   - **General:** Name `UI tests`. **Environment:** Latest Release, as before.
   - **Start Conditions:** *Branch Changes*, Custom Branches `main`, Custom Conditions: Start a Build if Any
     File changes in `ios`. Auto-cancel Builds on. (No pull-request condition: it saves hours, and the
     tests run as soon as a change reaches `main`.)
   - **Actions:** remove any suggested Archive, then **+** > **Test**. Platform iOS, Scheme
     **LectioUITests**, Destination: one iPhone simulator (iPhone 17 Pro, latest iOS). Every extra device
     adds about the same time again.
   - **Save.** Start a build of it on `main` once to see it pass.

7. **Show the results on GitHub (recommended, 5 minutes).** Xcode Cloud reports on pull requests by
   itself; this makes every build, pushes to `main` included, post its result to the commit, with the
   first error, so Claude can see it there and fix it without you copying logs.
   - github.com > your picture > **Settings** > **Developer settings** > **Personal access tokens** >
     **Fine-grained tokens** > **Generate new token**.
   - Name `Xcode Cloud statuses`. Expiration: a year (put a reminder in your calendar) or none.
   - Repository access: **Only select repositories** > **AP-Latin**.
   - Permissions > Repository permissions > **Commit statuses: Read and write**. Nothing else (GitHub adds
     *Metadata: Read* itself). This token can mark commits passed or failed and do nothing more.
   - Generate it and copy it.
   - In Xcode: Manage Workflows > **Check** > **Environment** > Environment Variables > **+**. Name
     `GITHUB_STATUS_TOKEN`, value the token, tick **Secret**. Save. Do the same for **UI tests**. (App Store
     Connect > Lectio > Xcode Cloud > Manage Workflows works too.)
   - The next build shows on its commit as **Xcode Cloud: Check (archive)** or **Xcode Cloud: UI tests
     (test)**, with a tick or a cross. The Details link opens the build in App Store Connect.

That's all. GitHub stops running Mac jobs on pushes as soon as this change is on `main`; nothing to switch
off there.

## Optional: TestFlight from Xcode Cloud

`scripts/ios-testflight.sh` on your Mac stays the main way to ship. To also be able to ship without the Mac
(from App Store Connect in a browser):

1. Manage Workflows > **+**. Name `TestFlight`.
2. **Start Conditions:** remove *Branch Changes*; add **Manual Start** for the branch `main`.
3. **Actions:** *Archive - iOS*, Scheme `Lectio`, Distribution Preparation: the option that includes the
   App Store (*App Store Connect*), not *TestFlight (Internal Testing Only)*, so the same build can go
   to review.
4. **Post-Actions:** **+** > **TestFlight Internal Testing**, and pick your internal group.
5. To ship: App Store Connect > Lectio > **Xcode Cloud** > the TestFlight workflow > **Start Build**.

Xcode Cloud numbers its own builds 1, 2, 3 and so on, where the Mac script uses a timestamp (2611041530).
App Store Connect takes both, since each version and build number pair is still unique; the version itself
still comes from `MARKETING_VERSION` in `project.yml`. Shipping each version from one route keeps
TestFlight's list easy to read.

## Optional: GitHub's Mac jobs on your own Mac, free

The Mac jobs in **Actions > iOS > Run workflow** (a full build log, UI tests, screenshots, TestFlight) use
GitHub's macOS minutes. They can run on your Mac instead, for nothing:

1. GitHub > AP-Latin > **Settings** > **Actions** > **Runners** > **New self-hosted runner** > macOS, and
   run the commands it shows in Terminal. `./svc.sh install && ./svc.sh start` (from the same folder) keeps
   it running in the background.
2. Settings > **Secrets and variables** > **Actions** > **Variables** > New repository variable:
   `MAC_RUNNER` = `self-hosted`.

From then on those jobs run on your Mac whenever it's awake. Delete the variable to go back to GitHub's
Macs. The runner runs whatever the workflow files in the repository say, as the macOS user it's installed
under, which is fine for a private repository that only you (and Claude sessions you start) push to. For
more separation, install it under a second, standard macOS user.

## Building on your Mac

| | |
| --- | --- |
| The website's checks, as GitHub runs them | `npm run check` |
| The release archive, unsigned (what "Check" proves) | `scripts/ios-testflight.sh --check` |
| The UI tests | `cd ios && xcodegen generate --spec project-uitests.yml`, open the project, pick the **LectioUITests** scheme, Product > Test (⌘U) |
| Screenshots for App Store Connect | `scripts/ios-screenshots.sh` (about 45 minutes; into `ios/shots/`) |
| Ship to TestFlight | `scripts/ios-testflight.sh` ([XCODE.md](XCODE.md)) |

## The package versions

Xcode Cloud never picks Swift package versions itself: it turns off automatic package resolution for every
build, including any `xcodebuild` a script runs, and builds exactly the versions a `Package.resolved` file
lists. A committed project would carry that file; Lectio's project is generated, so the file is kept at
`ios/Package.resolved` and `ci_post_clone.sh` copies it into the new project. Without it the build stops
with *ios/Package.resolved is missing*.

Make it (or bring it up to date) on your Mac, from `ios/`:

```bash
xcodegen generate --spec project-uitests.yml
xcodebuild -resolvePackageDependencies -project Lectio.xcodeproj -scheme Lectio
cp Lectio.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved Package.resolved
git add Package.resolved && git commit -m "Update the Swift package versions" && git push
```

Do this again whenever a package in `project.yml` is added, removed or given a new version range, and
whenever you want newer versions of the ones there (File > Packages > Update to Latest Package Versions in
Xcode first). Until then, Xcode Cloud keeps building the versions in the file.

## When a build fails

- **Where to look.** Xcode Cloud emails you, the commit on GitHub shows the first error (with the token
  from step 7), and the build's log is in Xcode (Report navigator > Cloud) or App Store Connect (Lectio >
  Xcode Cloud > Builds). For a log Claude can read in full: Actions > iOS > Run workflow, with *Build*
  ticked (about 8 minutes of GitHub's Mac, or free on your own).
- **"Setup failed before the build".** `ci_post_clone.sh` stopped: usually Homebrew couldn't install
  XcodeGen. Its log says why. A network hiccup goes away with **Rebuild**.
- **"ios/Package.resolved is missing", "a resolved file is required" or "out-of-date resolved file".** The
  committed package versions are missing or no longer match `project.yml` (a package was added or its
  version range changed). Make a fresh `ios/Package.resolved` on your Mac and commit it
  ([The package versions](#the-package-versions)).
- **Signing errors in "Check".** Xcode Cloud signs with certificates Apple keeps for the team. The app's
  four bundle IDs and the app group were registered by earlier uploads; if one was removed, building and
  running each target once in Xcode on your Mac registers it again.
- **"Archive check: ...".** The build worked but the archive is missing something (the widgets, the watch
  app, the content, the icon); the message says what. These are the same checks GitHub's macOS job used to
  run.
- **Hours.** App Store Connect > Xcode Cloud > **Usage** shows the month so far. Expect about 10 to 15
  minutes for a Check and 15 to 20 for the UI tests. If they run short, change the UI tests' start
  condition to *On a Schedule for a Branch* (`main`, daily) instead of every push. A commit whose message
  contains `[ci skip]` starts no build (on GitHub either).
