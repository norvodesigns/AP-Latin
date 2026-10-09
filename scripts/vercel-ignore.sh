#!/bin/sh
# Vercel's "Ignored Build Step" (vercel.json › ignoreCommand).
# Exit 0 skips the deploy, exit 1 builds it.
#
# Commits that only touch the iOS or Android app don't redeploy the website,
# except changes to ios/Content, which the website serves at /content/v1. Anything
# this script can't decide (say, the last deployed commit isn't in Vercel's
# shallow clone) builds, because building is always safe.

base="${VERCEL_GIT_PREVIOUS_SHA:-HEAD^}"

if ! git cat-file -e "$base^{commit}" 2>/dev/null; then
  echo "Last deployed commit $base isn't in this clone; building."
  exit 1
fi

if git diff --quiet "$base" HEAD -- . ':(exclude)ios' ':(exclude)android' ':(exclude).github/workflows/ios.yml' ':(exclude).github/workflows/testflight.yml' ':(exclude).github/workflows/android.yml' &&
  git diff --quiet "$base" HEAD -- ios/Content; then
  echo "Only a native app changed since $base; skipping the website build."
  exit 0
fi

echo "The website changed since $base; building."
exit 1
