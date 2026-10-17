import GoogleMobileAds
import LectioCore
import SwiftUI
import UIKit
import UserMessagingPlatform

/// Lectio's ads, kept small. The rules for when one may appear are
/// `LectioCore.AdPolicy`; this starts the SDK when they allow it and holds
/// the one full-screen ad that's waiting. See ios/ADS.md.
///
/// Order matters, for the privacy rules: nothing here runs until the first-run
/// screens are done and a day has passed (so the SDK isn't even started for a
/// new user or an App Review session); then Google's consent form
/// (the User Messaging Platform) runs where the law or AdMob's settings call for it;
/// and only if it says ads may be requested does the SDK start. Requests ask
/// for non-personalised ads, and the app never asks to track.
@MainActor @Observable
final class AdManager {
    /// The SDK has started and consent allows requesting ads.
    private(set) var ready = false
    /// Google's consent form says the "Privacy options" entry must be offered (Settings).
    private(set) var privacyOptionsRequired = false
    private var onboarded = false

    @ObservationIgnored private var preparing = false
    @ObservationIgnored private var loadingInterstitial = false
    @ObservationIgnored private var interstitial: InterstitialAd?
    @ObservationIgnored private let delegate = InterstitialDelegate()

    private static let installedKey = "adsInstalledAt"
    private static let lastInterstitialKey = "adsLastInterstitialAt"

    init() {
        // The first-day clock starts the first time this version runs.
        let defaults = UserDefaults.standard
        if defaults.object(forKey: Self.installedKey) == nil {
            defaults.set(Date.now.timeIntervalSince1970, forKey: Self.installedKey)
        }
        delegate.onDismiss = { [weak self] in self?.loadInterstitial() }
    }

    /// Whether an ad is on offer in this build at all (Settings shows its Ads
    /// section only then).
    var enabled: Bool { AdConfig.enabled }

    private var installedAt: Date {
        #if DEBUG
        // `-adsNow YES` skips the first day, to see test ads while developing.
        if UserDefaults.standard.bool(forKey: "adsNow") { return .distantPast }
        #endif
        return Date(timeIntervalSince1970: UserDefaults.standard.double(forKey: Self.installedKey))
    }

    private var lastInterstitialAt: Date? {
        let t = UserDefaults.standard.double(forKey: Self.lastInterstitialKey)
        return t > 0 ? Date(timeIntervalSince1970: t) : nil
    }

    private func allows(_ placement: AdPolicy.Placement) -> Bool {
        AdPolicy.allows(placement, installedAt: installedAt, now: .now, lastInterstitialAt: lastInterstitialAt, onboarded: onboarded)
    }

    /// Whether Today shows its banner.
    var bannerAllowed: Bool { ready && allows(.todayBanner) }

    /* -------------------------------------------------------------- */
    /* Starting up                                                      */
    /* -------------------------------------------------------------- */

    /// Called when the app is open and the first-run screens are done (and
    /// again if that changes). Does nothing until the policy allows ads.
    func prepare(onboarded: Bool) async {
        self.onboarded = onboarded
        guard AdConfig.enabled, !ready, !preparing, allows(.todayBanner) else { return }
        preparing = true
        defer { preparing = false }

        await askForConsent()
        privacyOptionsRequired = ConsentInformation.shared.privacyOptionsRequirementStatus == .required
        guard ConsentInformation.shared.canRequestAds else { return }
        startSDK()
    }

    /// Google's consent flow: ask Google whether this person must be asked
    /// (the EEA, the UK, and wherever AdMob's Privacy & messaging says so),
    /// and show the form if so. A failed lookup (offline) leaves the answer
    /// from the last launch.
    private func askForConsent() async {
        await withCheckedContinuation { continuation in
            ConsentInformation.shared.requestConsentInfoUpdate(with: RequestParameters()) { _ in
                continuation.resume()
            }
        }
        _ = try? await ConsentForm.loadAndPresentIfRequired(from: nil)
    }

    private func startSDK() {
        // Content suitable for everyone: Lectio is for students.
        MobileAds.shared.requestConfiguration.maxAdContentRating = .general
        MobileAds.shared.start { [weak self] _ in
            Task { @MainActor in
                self?.ready = true
                self?.loadInterstitial()
            }
        }
    }

    /// Settings › Ad privacy choices.
    func showPrivacyOptions() async {
        _ = try? await ConsentForm.presentPrivacyOptionsForm(from: nil)
    }

    /// A request for non-personalised ads. The app doesn't ask to track, so
    /// there's no ad-tracking prompt and nothing is matched across other
    /// apps; this makes that explicit to AdMob.
    static func request() -> Request {
        let request = Request()
        let extras = Extras()
        extras.additionalParameters = ["npa": "1"]
        request.register(extras)
        return request
    }

    /* -------------------------------------------------------------- */
    /* The full-screen ad                                               */
    /* -------------------------------------------------------------- */

    private func loadInterstitial() {
        guard ready, interstitial == nil, !loadingInterstitial else { return }
        loadingInterstitial = true
        Task {
            defer { loadingInterstitial = false }
            guard let ad = try? await InterstitialAd.load(with: AdConfig.interstitialUnit, request: Self.request()) else { return }
            ad.fullScreenContentDelegate = delegate
            interstitial = ad
        }
    }

    /// A finished lesson has just been closed: a natural pause. Shows the
    /// waiting ad if the policy (at most one a day) says it may.
    func lessonFinished() {
        guard ready, let ad = interstitial, allows(.afterLesson) else { return }
        interstitial = nil
        UserDefaults.standard.set(Date.now.timeIntervalSince1970, forKey: Self.lastInterstitialKey)
        Task {
            // After the lesson's own screen has finished closing.
            try? await Task.sleep(for: .milliseconds(800))
            ad.present(from: nil)
        }
    }
}

/// Hears that the full-screen ad was closed, to load tomorrow's.
private final class InterstitialDelegate: NSObject, FullScreenContentDelegate {
    var onDismiss: @MainActor () -> Void = {}

    nonisolated func adDidDismissFullScreenContent(_ ad: FullScreenPresentingAd) {
        Task { @MainActor in self.onDismiss() }
    }
}
