#!/usr/bin/env bash
#
# Builds Lectio for the App Store on this Mac, with Xcode, and uploads it to
# TestFlight. No Expo, no cloud builder, no build limit.
#
#     scripts/ios-testflight.sh                 archive, sign and upload
#     scripts/ios-testflight.sh --archive-only  archive and sign, then open the
#                                               archive in Xcode's Organizer
#                                               (to Distribute App by hand)
#     scripts/ios-testflight.sh --check         archive unsigned and stop: what
#                                               CI runs to prove the release
#                                               build compiles
#
# Needs: a Mac with Xcode 26.2 or later, signed in to your Apple ID under
# Xcode > Settings > Accounts, and XcodeGen (installed for you with Homebrew
# if missing). The app record already exists in App Store Connect.
#
# Optional, to sign in with an App Store Connect API key instead of the Apple
# ID Xcode is signed in with:
#     ASC_KEY_PATH=~/keys/AuthKey_ABC123.p8 ASC_KEY_ID=ABC123 ASC_ISSUER_ID=... \
#       scripts/ios-testflight.sh
#
# Every upload needs a build number higher than the last. It's a timestamp
# (yymmddHHMM, UTC), the same scheme the cloud routes use, so builds from any
# route can be mixed. The version users see is MARKETING_VERSION in
# ios/project.yml; change it there for a new release (1.0.0 -> 1.1.0).

set -euo pipefail

MODE=upload
case "${1:-}" in
  "") ;;
  --archive-only) MODE=archive ;;
  --check) MODE=check ;;
  -h|--help) sed -n '2,/^set -euo/p' "$0" | sed '$d;s/^# \{0,1\}//'; exit 0 ;;
  *) echo "Unknown option: $1 (try --help)" >&2; exit 2 ;;
esac

say() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
die() { printf '\n\033[31mError:\033[0m %s\n' "$*" >&2; exit 1; }

[ "$(uname)" = Darwin ] || die "This builds with Xcode, so it has to run on a Mac."
command -v xcodebuild >/dev/null || die "Xcode isn't installed (or its command-line tools aren't selected: sudo xcode-select -s /Applications/Xcode.app)."

cd "$(cd "$(dirname "$0")/.." && pwd)/ios"

if ! command -v xcodegen >/dev/null; then
  command -v brew >/dev/null || die "XcodeGen is missing and Homebrew isn't installed. Install it from https://brew.sh, then run: brew install xcodegen"
  say "Installing XcodeGen"
  brew install xcodegen
fi

# Apple only takes builds made with a release Xcode (or a Release Candidate),
# never a beta: the archive would build and the upload would then be refused.
# Say which Xcode this is, and stop early if it looks like a beta.
DEV_DIR="${DEVELOPER_DIR:-$(xcode-select -p 2>/dev/null || true)}"
say "Using $(xcodebuild -version 2>/dev/null | head -1) ($DEV_DIR)"
if [ "$MODE" != check ] && [ -z "${ALLOW_BETA_XCODE:-}" ] && printf '%s' "$DEV_DIR" | grep -qi beta; then
  die "This is a beta Xcode, and App Store Connect refuses builds made with one. Use the release Xcode, either just for this run:
    DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer scripts/ios-testflight.sh
  or for everything: sudo xcode-select -s /Applications/Xcode.app
  (Installed Xcodes: ls -d /Applications/Xcode*. The release is on the Mac App Store or developer.apple.com/download/all.)"
fi

# An Icon Composer app icon (Lectio/Resources/*.icon) needs XcodeGen 2.45.1 or
# later to be put in the project; an older one drops it and the app keeps its
# old icon.
if compgen -G "Lectio/Resources/*.icon" >/dev/null; then
  HAVE_XCODEGEN="$(xcodegen --version 2>/dev/null | grep -Eo '[0-9]+\.[0-9]+(\.[0-9]+)?' | head -1)"
  if [ -n "$HAVE_XCODEGEN" ] && [ "$(printf '%s\n%s\n' 2.45.1 "$HAVE_XCODEGEN" | sort -V | head -1)" != "2.45.1" ]; then
    die "XcodeGen $HAVE_XCODEGEN is too old for the Icon Composer app icon (it needs 2.45.1 or later). Run: brew upgrade xcodegen"
  fi
fi

BUILD="${BUILD_NUMBER:-$(date -u +%y%m%d%H%M)}"
VERSION="$(sed -n 's/^ *MARKETING_VERSION: *"\{0,1\}\([^"]*\)"\{0,1\} *$/\1/p' project.yml | head -1)"
say "Lectio $VERSION, build $BUILD ($(git rev-parse --short HEAD 2>/dev/null || echo 'no git')$(git diff --quiet 2>/dev/null || echo ', with uncommitted changes'))"

say "Generating the Xcode project"
xcodegen generate

# How Xcode signs in to Apple, for the profiles and certificates it creates.
AUTH=()
if [ -n "${ASC_KEY_PATH:-}" ]; then
  : "${ASC_KEY_ID:?ASC_KEY_ID is needed with ASC_KEY_PATH}" "${ASC_ISSUER_ID:?ASC_ISSUER_ID is needed with ASC_KEY_PATH}"
  [ -f "$ASC_KEY_PATH" ] || die "ASC_KEY_PATH ($ASC_KEY_PATH) isn't a file."
  AUTH=(-authenticationKeyPath "$ASC_KEY_PATH" -authenticationKeyID "$ASC_KEY_ID" -authenticationKeyIssuerID "$ASC_ISSUER_ID")
fi

if [ "$MODE" = check ]; then
  SIGNING=(CODE_SIGNING_ALLOWED=NO)
else
  SIGNING=(-allowProvisioningUpdates ${AUTH[@]+"${AUTH[@]}"})
fi

hint() {
  # $1: a log file. Says what the usual cause of its error is.
  if grep -qiE "closed for new build submissions|must contain a higher version|previously approved version" "$1"; then
    echo "  -> Apple has already approved this version number, so it takes no more builds under it. Raise MARKETING_VERSION in ios/project.yml (1.1.0 -> 1.1.1 or 1.2.0), commit it, create that version in App Store Connect (your app > + next to iOS App), and run this again."
  elif grep -qiE "Unsupported SDK or Xcode version" "$1"; then
    echo "  -> This Xcode (or its SDK) is a beta, or no longer accepted. Check which one this is: xcodebuild -version; xcode-select -p. Then use the release Xcode: DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer scripts/ios-testflight.sh (or sudo xcode-select -s /Applications/Xcode.app). Archives made with a beta can't be uploaded; this run builds a fresh one."
  elif grep -qiE "No Accounts|no account for team|Unable to authenticate" "$1"; then
    echo "  -> Xcode isn't signed in. Open Xcode > Settings > Accounts, add your Apple ID (the one on the developer team), and run this again."
  elif grep -qiE "No profiles for|Provisioning profile .* doesn't|requires a provisioning profile" "$1"; then
    echo "  -> Xcode couldn't create the signing profiles. Open ios/Lectio.xcodeproj, select each target > Signing & Capabilities and check 'Automatically manage signing' shows the team with no red errors, then run this again."
  elif grep -qiE "maximum number of (generated )?(Apple )?Distribution certificates|certificate.*limit" "$1"; then
    echo "  -> Your account has the most distribution certificates Apple allows. Revoke an unused one at developer.apple.com > Certificates (the one Expo made is safe to revoke if you've stopped using Expo), then run this again."
  elif grep -qiE "bundle version|CFBundleVersion|already been used|build number" "$1"; then
    echo "  -> Apple has a build with this number already. Wait a minute and run again, or set BUILD_NUMBER to a higher one."
  fi
}

say "Archiving (a few minutes)"
rm -rf build/Lectio.xcarchive
xcodebuild archive \
  -project Lectio.xcodeproj \
  -scheme Lectio \
  -destination 'generic/platform=iOS' \
  -archivePath build/Lectio.xcarchive \
  -derivedDataPath build \
  ${SIGNING[@]+"${SIGNING[@]}"} \
  CURRENT_PROJECT_VERSION="$BUILD" \
  | tee archive.log | grep -E '(error:|ARCHIVE (SUCCEEDED|FAILED))' || true
if ! grep -q 'ARCHIVE SUCCEEDED' archive.log; then
  hint archive.log
  die "The archive failed. The full log is ios/archive.log."
fi

case "$MODE" in
  check)
    say "Archive built (unsigned): the release build compiles."
    ;;
  archive)
    say "Archive signed: ios/build/Lectio.xcarchive. Opening it in Xcode's Organizer; choose Distribute App > App Store Connect > Distribute."
    open build/Lectio.xcarchive
    ;;
  upload)
    say "Uploading to App Store Connect"
    rm -rf build/export
    xcodebuild -exportArchive \
      -archivePath build/Lectio.xcarchive \
      -exportOptionsPlist ExportOptions.plist \
      -exportPath build/export \
      -allowProvisioningUpdates \
      ${AUTH[@]+"${AUTH[@]}"} \
      | tee export.log | grep -E '(error:|EXPORT (SUCCEEDED|FAILED)|Upload|Uploaded)' || true
    if ! grep -qE 'EXPORT SUCCEEDED|Uploaded' export.log; then
      hint export.log
      die "The upload failed. The full log is ios/export.log."
    fi
    say "Uploaded: Lectio $VERSION ($BUILD)."
    cat <<EOF

App Store Connect now processes it, which takes 10 to 30 minutes; you'll get
an email. Then:
  - TestFlight: appstoreconnect.apple.com > your app > TestFlight > the build
    (add it to your internal testing group).
  - App Store: on the version page, Build > Add Build, and pick it.
EOF
    ;;
esac
