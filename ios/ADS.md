# Ads in the Lectio app

A small amount of advertising, through Google AdMob, built to stay out of the way. The code is in the app
and **does nothing until you add real AdMob IDs**: a Release build with Google's sample IDs (what
`project.yml` has now) shows no ads at all, so nothing ships by accident.

## What a student sees

- **Nothing for the first 24 hours**, and nothing during the first-run screens. Not even the ad SDK
  starts, so the first impression is the app itself.
- **A banner** (Google's standard 320 × 50, labelled "Advertisement") at the very bottom of the Today
  screen, below every panel. It appears only if an ad actually arrives; otherwise there's no empty box.
- **One full-screen ad a day at most**, after a finished *course lesson* is closed with **Done**, the
  natural pause. Never during a lesson, quiz, practice exam, flashcard session or while reading, and never
  at launch.
- **Settings › Ads** says all of this and, where Google's consent form applies, has **Ad privacy choices**.

The rules are one small file, `LectioCore/Sources/LectioCore/Ads/AdPolicy.swift`, with tests
(`AdPolicyTests.swift`). Change a number there (the free day, the once-a-day limit) and the tests say
what moved.

I didn't put a full-screen ad at first launch, as first suggested: it's the worst moment for one (the
student hasn't seen the app yet), it would sit on top of the first-run screens, an ad on first open is
the thing reviewers and one-star reviews notice most, and Google's own guidance is to show full-screen ads
at natural pauses. The first-day-free rule also means App Review never sees one.

## How it respects privacy (and why there's no tracking prompt)

- **Consent first.** Google's consent form (the User Messaging Platform) runs before the SDK starts, and
  asks where the law or your AdMob settings say it must: the UK and European Economic Area, and (if you
  create the message) some US states. If it says ads may not be requested, none are.
- **Non-personalized ads only**, and the app never asks to track, so there's **no App Tracking
  Transparency prompt** (the "Allow Lectio to track your activity" box). The trade: ads pay somewhat less.
  The gain: no scary prompt, a simpler App Privacy answer, and a good fit for an app used by students under 18.
- **Suitable for everyone:** content rating is capped at G.
- No account, name, progress or writing ever goes to Google.

## Turning on real ads (you)

None of this needs me, and none of it is urgent; the code waits.

1. **An AdMob account.** admob.google.com, sign in with a Google account, accept the terms, and add your
   payment details (address, and tax information) so you can be paid when you reach the minimum payout.
2. **Add the app.** Apps > Add app > iOS. If it isn't live in the App Store yet, say so; AdMob still gives
   you the **App ID** (`ca-app-pub-…~…`). Once it's live, link it to the store listing.
3. **Make two ad units** in that app: a **Banner** ("Today banner") and an **Interstitial** ("After
   lesson"). Copy each **ad unit ID** (`ca-app-pub-…/…`).
4. **Paste the three IDs into `ios/project.yml`**, replacing Google's samples in the `ADMOB_APP_ID`,
   `ADMOB_BANNER_UNIT_ID` and `ADMOB_INTERSTITIAL_UNIT_ID` lines (they're marked). Nothing else changes.
5. **Set up the consent messages.** AdMob > Privacy & messaging: create the **European regulations**
   message (it covers the UK too) and, if you like, a **US states regulations** message, and publish them
   to the Lectio app. Without the European one, Google won't serve ads to people in the EEA or UK.
6. **`app-ads.txt`.** Lets advertisers confirm you own the app. In `public/` add `app-ads.txt` containing
   one line, with your publisher ID from AdMob (Settings > Account information, `pub-` and 16 digits):
   ```
   google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
   ```
   so it's served at `lectio.norvodesigns.com/app-ads.txt` (the Marketing URL's address). AdMob shows
   whether it found it, under the app's settings. (I'll add the file if you send me the publisher ID.)
7. **Update App Store Connect** before the first build that ships ads: the list under *When ads ship*
   in [APP_STORE.md](APP_STORE.md). It takes ten minutes, and a mismatch between what the app does and what
   the App Privacy answers say is a common reason for rejection.
8. **Ship it as a new version** (1.1.0 in `project.yml`), with the description's "no ads" line changed.

### Order matters

Don't put the ad SDK in a build you want approved *before* the App Privacy answers say so. The code is
in `main` now (it's inactive: sample IDs, and a Release build then shows nothing, and nothing starts for a
day), but a build made from it still contains Google's SDK. If version 1.0 isn't approved yet, either update
the App Privacy answers first (step 7) or make that build from the commit before the ads
(`git log` shows it: "Reading Room: holding a word highlights again…"). After 1.0 is approved, ship ads as 1.1.

## Testing

- **In Xcode (Debug)** Google's labelled *Test Ad*s show. Skip the first-day wait with the scheme
  argument `-adsNow YES` (Product > Scheme > Edit Scheme > Run > Arguments). The banner shows on Today;
  the full-screen ad after finishing a lesson (the first load takes a few seconds).
- **With real IDs on your own phone** (TestFlight): the ads are real and you must **never tap your own
  ads**. Google treats it as invalid traffic and can disable an AdMob account. Look; don't tap. If you
  want to test the tapping flow, use a Debug build, which always uses test ads.
- **CI and screenshots never show ads** (`-seedDemo`, `-showOnboarding`, `-adsOff YES`).

## What to expect from the money

A small, niche app earns very little from ads: cents a day until there are thousands of daily users, and
more per student in the US than elsewhere. If it ever matters, the usual next step is a one-time "Remove
ads" purchase, which also makes ads easier to justify to students. It's a bigger change (StoreKit, App
Store Connect products), so I haven't built it.

## Where things are

| | |
| --- | --- |
| Rules | `ios/LectioCore/Sources/LectioCore/Ads/AdPolicy.swift` (+ `AdPolicyTests.swift`) |
| IDs and the Release safety | `ios/project.yml` (ADMOB_*), `ios/Lectio/App/Ads/AdConfig.swift` |
| Consent, SDK start, the full-screen ad | `ios/Lectio/App/Ads/AdManager.swift` |
| The banner on Today | `ios/Lectio/App/Ads/AdViews.swift`, placed in `Features/Today/TodayView.swift` |
| The lesson hook | `finish()` in `Features/Learn/LessonView.swift` |
| Settings › Ads | `Features/Settings/SettingsView.swift` |
| The privacy policy's ads section | `src/app/privacy/page.tsx` |
