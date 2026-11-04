#!/usr/bin/env bash
#
# Screenshots of the iOS app on this Mac's simulators: every screen on an
# iPhone and an iPad, light and dark, large text, the first run step by step,
# the older "classic" look, and the Apple Watch app. They land in ios/shots/,
# ready for App Store Connect or for checking a design change.
#
#     scripts/ios-screenshots.sh
#
# Needs a Mac with Xcode 26.2 or later, its iPhone, iPad and watchOS
# simulators (Xcode > Settings > Components), and XcodeGen (installed for you
# with Homebrew if missing). Takes about 45 minutes and keeps the simulators
# busy; the Mac is otherwise free to use.
#
# The same script runs on GitHub when you ask for it (Actions > iOS > Run
# workflow > Screenshots), which is the way to get them without your Mac, at
# about 45 minutes of GitHub's macOS time.

set -euo pipefail

case "${1:-}" in
  "") ;;
  -h|--help) sed -n '2,/^set -euo/p' "$0" | sed '$d;s/^# \{0,1\}//'; exit 0 ;;
  *) echo "Unknown option: $1 (try --help)" >&2; exit 2 ;;
esac

say() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
die() { printf '\n\033[31mError:\033[0m %s\n' "$*" >&2; exit 1; }

[ "$(uname)" = Darwin ] || die "This uses Xcode's simulators, so it has to run on a Mac."
command -v xcodebuild >/dev/null || die "Xcode isn't installed (or its command-line tools aren't selected: sudo xcode-select -s /Applications/Xcode.app)."

cd "$(cd "$(dirname "$0")/.." && pwd)/ios"

if ! command -v xcodegen >/dev/null; then
  command -v brew >/dev/null || die "XcodeGen is missing and Homebrew isn't installed. Install it from https://brew.sh, then run: brew install xcodegen"
  say "Installing XcodeGen"
  brew install xcodegen
fi

BUNDLE=com.norvodesigns.lectio
WATCH_BUNDLE=com.norvodesigns.lectio.watchkitapp
APP=build/Build/Products/Debug-iphonesimulator/Lectio.app
WATCH_APP=build/Build/Products/Debug-watchsimulator/Lectio.app

say "Generating the Xcode project"
xcodegen generate

say "Building for the simulator"
xcodebuild build -project Lectio.xcodeproj -scheme Lectio \
  -destination 'generic/platform=iOS Simulator' -derivedDataPath build CODE_SIGNING_ALLOWED=NO \
  | grep -E 'error|BUILD (SUCCEEDED|FAILED)' || true
[ -d "$APP" ] || die "The simulator build failed (run it in Xcode to see why)."

rm -rf shots
mkdir -p shots

# The first available simulator whose name contains one of the arguments, in
# order of preference. $1 is the runtime family: iOS or watchOS.
pick() {
  xcrun simctl list devices available -j | python3 -c "
import json, sys
family, want = sys.argv[1], sys.argv[2:]
devices = [d for runtime, ds in json.load(sys.stdin)['devices'].items() if family in runtime for d in ds]
for w in want:
    for d in devices:
        if w in d['name']:
            print(d['udid']); sys.exit()
" "$@"
}

# One launch of the app on one screen, then a screenshot of it.
snap() {
  local udid="$1" file="$2" wait="$3"; shift 3
  xcrun simctl terminate "$udid" "$BUNDLE" >/dev/null 2>&1 || true
  xcrun simctl launch "$udid" "$BUNDLE" "$@" >/dev/null
  sleep "$wait"
  xcrun simctl io "$udid" screenshot "shots/$file.png" >/dev/null 2>&1
  echo "  $file"
}

shoot() {
  local udid="$1" label="$2"
  [ -n "$udid" ] || { echo "No $label simulator is installed; skipping it."; return 0; }
  say "Screenshots: $label"
  xcrun simctl boot "$udid" 2>/dev/null || true
  xcrun simctl bootstatus "$udid" -b
  xcrun simctl status_bar "$udid" override --time 9:41 --batteryState charged --batteryLevel 100 || true
  xcrun simctl install "$udid" "$APP"
  for mode in light dark; do
    xcrun simctl ui "$udid" appearance "$mode"
    # A fresh launch per screen, opened with -startTab: a lectio:// URL from
    # simctl stops at an "Open in Lectio?" prompt.
    for tab in today learn learn/prima-2-3 learn/verba-1-1 learn/daily learn/sentences read vocab quiz scansion forge grammar exam plan settings search laurels read/aen-1-1-33 read/pliny-6-16-a; do
      snap "$udid" "$label-$mode-${tab//\//-}" 8 -seedDemo YES -startTab "$tab"
    done
    # The course's vocabulary track.
    snap "$udid" "$label-$mode-learn-vocabulary" 8 -seedDemo YES -startTab learn -courseTrackOnLaunch vocabulary
    # Today's lower panels: scrolled to by -todayScroll.
    for scroll in jump panels end; do
      snap "$udid" "$label-$mode-today-scroll-$scroll" 10 -seedDemo YES -startTab today -todayScroll "$scroll"
    done
    # Large text (Dynamic Type, accessibility sizes), a few screens.
    if [ "$mode" = light ]; then
      xcrun simctl ui "$udid" content_size accessibility-extra-large || true
      for tab in today learn/prima-2-3 learn/daily vocab; do
        snap "$udid" "$label-$mode-bigtext-${tab//\//-}" 8 -seedDemo YES -startTab "$tab"
      done
      xcrun simctl ui "$udid" content_size large || true
    fi
    # The first run, a step at a time, and each page of its tour.
    for step in welcome tour track check grammar path goal reminder account ready; do
      snap "$udid" "$label-$mode-onboarding-$step" 8 -showOnboarding YES -onboardingStep "$step"
    done
    for page in 1 2; do
      snap "$udid" "$label-$mode-onboarding-tour-$page" 8 -showOnboarding YES -onboardingStep tour -onboardingTourPage "$page"
    done
    # The Home Screen, with the app closed: the app icon, light and dark.
    xcrun simctl terminate "$udid" "$BUNDLE" >/dev/null 2>&1 || true
    sleep 4
    xcrun simctl io "$udid" screenshot "shots/$label-$mode-homescreen.png" >/dev/null 2>&1
    echo "  $label-$mode-homescreen"
  done
  # The look older systems get (-legacyChrome YES): no glass, a classic tab
  # bar on iPhone and a split view on iPad.
  xcrun simctl ui "$udid" appearance light
  for tab in today learn learn/prima-2-3 read read/aen-1-1-33 vocab quiz scansion settings; do
    snap "$udid" "$label-classic-${tab//\//-}" 8 -seedDemo YES -legacyChrome YES -startTab "$tab"
  done
  xcrun simctl shutdown "$udid" || true
}

shoot "$(pick iOS 'iPhone 17 Pro Max' 'Pro Max' 'iPhone')" iphone
shoot "$(pick iOS '13-inch' 'iPad Pro' 'iPad')" ipad

# App Store Connect asks for Apple Watch screenshots too, because the app
# ships a watch app. The watch shows a sample deck (-seedDemo YES) rather
# than waiting for a paired iPhone. Best effort: a missing watch simulator
# or a slow one doesn't lose the phone and tablet shots above.
watch() {
  say "Screenshots: Apple Watch"
  xcodebuild build -project Lectio.xcodeproj -scheme LectioWatch \
    -destination 'generic/platform=watchOS Simulator' -derivedDataPath build CODE_SIGNING_ALLOWED=NO \
    | grep -E 'error|BUILD (SUCCEEDED|FAILED)' || true
  [ -d "$WATCH_APP" ] || { echo "The watch app didn't build; skipping its screenshots."; return 0; }
  local udid
  udid="$(pick watchOS 'Series 11 (46mm)' 'Ultra 3' 'Series 10 (46mm)' 'Apple Watch')"
  [ -n "$udid" ] || { echo "No watch simulator is installed; skipping it."; return 0; }
  xcrun simctl boot "$udid" 2>/dev/null || true
  xcrun simctl bootstatus "$udid" -b
  xcrun simctl status_bar "$udid" override --time 9:41 || true
  xcrun simctl install "$udid" "$WATCH_APP"
  # A first launch to warm up, unrecorded.
  xcrun simctl launch "$udid" "$WATCH_BUNDLE" -seedDemo YES >/dev/null || true
  sleep 20
  for screen in home review; do
    xcrun simctl terminate "$udid" "$WATCH_BUNDLE" >/dev/null 2>&1 || true
    xcrun simctl launch "$udid" "$WATCH_BUNDLE" -seedDemo YES -watchScreen "$screen" >/dev/null
    # The watch simulator is slow to finish launching: wait past the icon
    # animation, or the screenshot is of that.
    sleep 25
    xcrun simctl io "$udid" screenshot "shots/watch-$screen.png" >/dev/null 2>&1
    echo "  watch-$screen"
  done
  xcrun simctl shutdown "$udid" || true
}
watch || echo "The Apple Watch screenshots didn't finish; the others are done."

say "Done: $(find shots -name '*.png' | wc -l | tr -d ' ') screenshots in ios/shots/"
[ -z "${CI:-}" ] && open shots || true
