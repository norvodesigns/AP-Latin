#!/bin/bash
#
# Xcode Cloud runs this after each xcodebuild command, whether it worked or
# not (ios/XCODE_CLOUD.md).
#
# - After an archive, it checks what the archive holds: the widgets, the
#   watch app and its complications, the course content, the scansion
#   corpus, iOS 17 support and the Icon Composer icon. A build can succeed
#   and still quietly leave one of these out, so a missing one fails it.
# - It posts the result to the commit on GitHub (github-status.sh), with the
#   first error when there is one.
#
# A test action's second half runs on a machine without the repository, only
# this folder, so nothing here reads files outside ci_scripts.

set -uo pipefail

cd "$(dirname "$0")"
. ./github-status.sh

ACTION="${CI_XCODEBUILD_ACTION:-}"
EXIT_CODE="${CI_XCODEBUILD_EXIT_CODE:-0}"

# The first compiler or signing error in this action's build logs, with how
# many more there are: "ReaderView.swift:120:9: error: cannot find 'x' in
# scope (+2 more)".
first_build_error() {
  local logs="${CI_DERIVED_DATA_PATH:-}/Logs"
  [ -d "$logs" ] || return 0
  local errors
  errors="$(find "$logs" -name '*.xcactivitylog' -print0 2>/dev/null \
    | xargs -0 -I{} sh -c 'gunzip -c "$1" 2>/dev/null' _ {} \
    | LC_ALL=C grep -a -o -E '([^[:space:][:cntrl:]"]+:[0-9]+:([0-9]+:)? )?error: [^[:cntrl:]]{1,240}' \
    | sed -E 's#^[^[:space:]]*/([^/]+:[0-9]+)#\1#' \
    | awk '!seen[$0]++')" || true
  [ -n "$errors" ] || return 0
  echo "$errors" | sed 's/^/  /' >&2
  local count
  count="$(printf '%s\n' "$errors" | wc -l | tr -d ' ')"
  if [ "$count" -gt 1 ]; then
    printf '%s (+%s more)' "$(printf '%s\n' "$errors" | head -1)" "$((count - 1))"
  else
    printf '%s' "$errors"
  fi
}

# The first failing test and why, from the test action's result bundle.
first_test_failure() {
  [ -n "${CI_RESULT_BUNDLE_PATH:-}" ] && [ -e "$CI_RESULT_BUNDLE_PATH" ] || return 0
  xcrun xcresulttool get test-results summary --path "$CI_RESULT_BUNDLE_PATH" 2>/dev/null \
    | python3 -c 'import json, sys
try:
    s = json.load(sys.stdin)
except Exception:
    sys.exit()
failures = s.get("testFailures") or []
for f in failures:
    print("  %s: %s" % (f.get("testName", "?"), f.get("failureText", "")), file=sys.stderr)
if failures:
    f = failures[0]
    more = " (+%d more)" % (len(failures) - 1) if len(failures) > 1 else ""
    print("%s failed: %s%s" % (f.get("testName", "A test"), f.get("failureText", ""), more))' || true
}

# What a release archive must contain. Prints each problem; returns 1 if any.
check_archive() {
  local app="${CI_ARCHIVE_PATH:-}/Products/Applications/Lectio.app"
  local problems=0
  problem() { echo "Archive check: $1"; problems=$((problems + 1)); [ -n "${FIRST_PROBLEM:-}" ] || FIRST_PROBLEM="$1"; }

  if [ ! -d "$app" ]; then
    problem "no Lectio.app in the archive"
    return 1
  fi
  echo "Plug-ins:"; ls "$app/PlugIns" 2>/dev/null || true
  [ -d "$app/PlugIns/LectioWidgets.appex" ] || problem "the widgets extension is missing"
  [ -d "$app/Watch/Lectio.app" ] || problem "the watch app isn't embedded"
  [ -d "$app/Watch/Lectio.app/PlugIns/LectioWatchWidgets.appex" ] || problem "the watch complications are missing"
  [ -d "$app/Content" ] || problem "the course content (ios/Content) is missing"
  [ -d "$app/scansion" ] || problem "the scansion corpus (public/scansion) is missing"
  for p in "$app/Info.plist" "$app/Watch/Lectio.app/Info.plist"; do
    [ -f "$p" ] || continue
    echo "$p"; plutil -p "$p" | grep -E 'MinimumOSVersion|CFBundleVersion|CFBundleShortVersionString|WKCompanionAppBundleIdentifier' || true
  done
  plutil -p "$app/Info.plist" 2>/dev/null | grep -q '"MinimumOSVersion" => "17.0"' \
    || problem "the app should support iOS 17 (MinimumOSVersion isn't 17.0)"
  # The icon is an Icon Composer file (Lectio/Resources/Lectio-icon.icon). If
  # project.yml's icon name or XcodeGen's version is wrong, the build still
  # succeeds and quietly keeps the old icon.
  echo "Icon entries:"; plutil -p "$app/Info.plist" 2>/dev/null | grep -i 'icon' || true
  plutil -p "$app/Info.plist" 2>/dev/null | grep -q 'Lectio-icon' \
    || problem "the app icon (Lectio-icon.icon) isn't in the built app: check ASSETCATALOG_COMPILER_APPICON_NAME in project.yml and that XcodeGen is 2.45.1 or later"
  [ -f "$app/Assets.car" ] || problem "no compiled assets (Assets.car) in the app"
  du -sh "$app" 2>/dev/null || true
  [ "$problems" -eq 0 ]
}

if [ "$EXIT_CODE" != 0 ]; then
  if [ "$ACTION" = test-without-building ]; then
    why="$(first_test_failure)"
  else
    why="$(first_build_error)"
  fi
  [ -n "$why" ] || why="xcodebuild $ACTION failed (exit $EXIT_CODE); the log is in Xcode Cloud"
  echo "Failed: $why"
  report_status failure "$why"
  # Xcode Cloud has already failed the action on xcodebuild's own exit code.
  exit 0
fi

case "$ACTION" in
  archive)
    FIRST_PROBLEM=""
    if check_archive; then
      report_status success "Release archive built and checked (widgets, watch app, content, icon)"
    else
      report_status failure "Archive check: $FIRST_PROBLEM"
      exit 1
    fi
    ;;
  build-for-testing)
    report_status pending "Built for testing; running the tests"
    ;;
  test-without-building)
    report_status success "Tests passed"
    ;;
  *)
    report_status success "xcodebuild $ACTION succeeded"
    ;;
esac
exit 0
