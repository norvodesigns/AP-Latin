import Foundation

/// Where ads come from and whether this build may show them. The three IDs
/// are set in project.yml (ADMOB_*), which puts them in Info.plist.
nonisolated enum AdConfig {
    /// Google's published sample account. Ads from it are test ads, and
    /// nothing from it should ever reach a real user.
    private static let sampleAccount = "ca-app-pub-3940256099942544"

    static var bannerUnit: String { value("LectioAdBannerUnitID") }
    static var interstitialUnit: String { value("LectioAdInterstitialUnitID") }

    /// The build carries real AdMob IDs, not Google's samples.
    static var hasRealUnits: Bool {
        [bannerUnit, interstitialUnit].allSatisfy { !$0.isEmpty && !$0.hasPrefix(sampleAccount) }
    }

    /// Whether this run may show ads at all.
    ///
    /// - A Release build (TestFlight, the App Store) only does with real IDs;
    ///   with the sample IDs it has no ads, so the build can't ship Google's
    ///   test ads by mistake.
    /// - A Debug build (run from Xcode) shows Google's labelled test ads.
    /// - Never in the CI screenshots and UI tests (`-seedDemo`,
    ///   `-showOnboarding`), or with `-adsOff YES`.
    static var enabled: Bool {
        let defaults = UserDefaults.standard
        if defaults.bool(forKey: "adsOff") || defaults.bool(forKey: "seedDemo") || defaults.bool(forKey: "showOnboarding") {
            return false
        }
        #if DEBUG
        return true
        #else
        return hasRealUnits
        #endif
    }

    private static func value(_ key: String) -> String {
        (Bundle.main.object(forInfoDictionaryKey: key) as? String ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
    }
}
