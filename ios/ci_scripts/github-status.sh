# Helper for ci_post_clone.sh and ci_post_xcodebuild.sh (sourced, not run).
#
# Posts an Xcode Cloud action's result to the commit on GitHub as a commit
# status ("Xcode Cloud: Check (archive)", say), with the first error in the
# description. That's how a build's result reaches GitHub, and the sessions
# that read it there, for pushes as well as pull requests. The link on the
# status opens the build in App Store Connect.
#
# Optional: it does nothing until the workflow has a secret environment
# variable GITHUB_STATUS_TOKEN, a fine-grained GitHub token for this one
# repository with only "Commit statuses: Read and write" (ios/XCODE_CLOUD.md).
# Reporting never fails a build: every path here returns 0.

# The kind of action, as a status reads it: build-for-testing and
# test-without-building are the two halves of one test action.
action_kind() {
  case "${CI_XCODEBUILD_ACTION:-}" in
    build-for-testing|test-without-building) echo test ;;
    "") echo build ;;
    *) echo "$CI_XCODEBUILD_ACTION" ;;
  esac
}

# report_status <pending|success|failure|error> <description>
report_status() {
  if [ -z "${GITHUB_STATUS_TOKEN:-}" ]; then
    echo "GitHub status: GITHUB_STATUS_TOKEN isn't set for this workflow, so nothing is posted (ios/XCODE_CLOUD.md)."
    return 0
  fi
  if [ -z "${CI_COMMIT:-}" ] || ! command -v python3 >/dev/null 2>&1; then
    echo "GitHub status: no commit or no python3 here; skipping."
    return 0
  fi
  local repo="${GITHUB_REPOSITORY:-norvodesigns/AP-Latin}"
  local body
  body="$(STATE="$1" DESC="$2" CONTEXT="Xcode Cloud: ${CI_WORKFLOW:-workflow} ($(action_kind))" \
    python3 -c 'import json, os
desc = " ".join(os.environ["DESC"].split())
if len(desc) > 140:
    desc = desc[:139] + "…"
print(json.dumps({"state": os.environ["STATE"], "context": os.environ["CONTEXT"],
                  "description": desc, "target_url": os.environ.get("CI_BUILD_URL", "")}))' 2>/dev/null)" || return 0
  curl -sS -m 20 -o /dev/null -w "GitHub status ($1): HTTP %{http_code}\n" -X POST \
    -H "Authorization: Bearer $GITHUB_STATUS_TOKEN" \
    -H "Accept: application/vnd.github+json" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "https://api.github.com/repos/$repo/statuses/$CI_COMMIT" \
    -d "$body" || echo "GitHub status: couldn't reach GitHub; carrying on."
  return 0
}
