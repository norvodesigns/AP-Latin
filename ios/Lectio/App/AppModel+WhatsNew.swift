import Foundation

/// The "What's new" sheet (Features/Onboarding/WhatsNewSheet.swift): shown
/// once, on the first launch of a release that has one, to a student who was
/// already using the app. The website's splash (src/components/SplashScreen.tsx)
/// does the same for the same release.
extension AppModel {
    private static let whatsNewKey = "whatsNewSeen"

    /// Whether this launch should show it. Never in the screenshots or the UI
    /// tests (`-seedDemo`, `-showOnboarding`); `-showWhatsNew YES` forces it.
    var needsWhatsNew: Bool {
        let defaults = UserDefaults.standard
        if defaults.bool(forKey: "showWhatsNew") { return true }
        if defaults.bool(forKey: "seedDemo") || defaults.bool(forKey: "showOnboarding") { return false }
        return defaults.string(forKey: Self.whatsNewKey) != WhatsNew.release
    }

    /// Records that this release's sheet has been seen, or needn't be: a
    /// brand-new student gets the first-run screens, which already show
    /// what the app does.
    func markWhatsNewSeen() {
        UserDefaults.standard.set(WhatsNew.release, forKey: Self.whatsNewKey)
        if showWhatsNew { showWhatsNew = false }
    }
}
