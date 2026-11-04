#!/bin/bash
#
# Xcode Cloud runs this right after it clones the repository, before it
# builds anything (ios/XCODE_CLOUD.md).
#
# Lectio's Xcode project isn't committed: XcodeGen makes it from
# ios/project.yml. So this installs XcodeGen and generates the project, from
# project-uitests.yml so that the UI-test scheme the "UI tests" workflow runs
# exists too (archiving the Lectio scheme still builds only the app and what
# it embeds). Then it copies the committed ios/Package.resolved into the new
# project, since Xcode Cloud never resolves Swift packages on its own.

set -euo pipefail

cd "$(dirname "$0")"
. ./github-status.sh

SETUP_FAILURE="Setup failed before the build (XcodeGen or Swift packages); the log is in Xcode Cloud"
on_exit() {
  local code=$?
  if [ "$code" -ne 0 ]; then
    report_status failure "$SETUP_FAILURE"
  fi
}
trap on_exit EXIT

report_status pending "Building on Xcode Cloud"

IOS="${CI_PRIMARY_REPOSITORY_PATH:?not running in Xcode Cloud}/ios"
cd "$IOS"

echo "==> XcodeGen"
if ! command -v xcodegen >/dev/null 2>&1; then
  brew install xcodegen
fi
# The Icon Composer app icon needs XcodeGen 2.45.1 or later; an older one
# drops it silently and the app ships with the old icon.
have="$(xcodegen --version 2>/dev/null | grep -Eo '[0-9]+\.[0-9]+(\.[0-9]+)?' | head -1)"
echo "XcodeGen $have"
if [ -n "$have" ] && [ "$(printf '%s\n%s\n' 2.45.1 "$have" | sort -V | head -1)" != "2.45.1" ]; then
  brew upgrade xcodegen
fi

echo "==> Generating Lectio.xcodeproj"
xcodegen generate --spec project-uitests.yml

echo "==> Swift packages"
# Xcode Cloud turns off automatic package resolution for every xcodebuild it
# runs, this script's included, so the versions can't be resolved here: they
# come from ios/Package.resolved, made on a Mac and committed
# (ios/XCODE_CLOUD.md, "The package versions").
resolved="Lectio.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved"
if [ ! -f Package.resolved ]; then
  SETUP_FAILURE="ios/Package.resolved is missing: make it on a Mac and commit it (ios/XCODE_CLOUD.md, The package versions)"
  echo "error: ios/Package.resolved is missing. Xcode Cloud can't pick Swift package versions itself; make the file on a Mac and commit it (ios/XCODE_CLOUD.md, \"The package versions\")."
  exit 1
fi
mkdir -p "$(dirname "$resolved")"
cp Package.resolved "$resolved"
echo "Using the committed ios/Package.resolved"
echo "Packages:"
python3 - "$resolved" <<'EOF' || true
import json, sys
for pin in json.load(open(sys.argv[1])).get("pins", []):
    state = pin.get("state", {})
    print("  %s %s" % (pin.get("identity"), state.get("version") or state.get("revision", "")[:12]))
EOF
