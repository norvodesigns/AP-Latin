import Foundation

/// When Lectio may show an ad. The rules are kept here, apart from the ad
/// SDK, so they can be read in one place and tested on every push; the app
/// only asks `allows(...)`.
///
/// Lectio's ads are meant to be easy to ignore:
///
///   - **None while setting up, and none on the first day.** Nothing before
///     the first-run screens are done, and nothing for 24 hours after the app
///     is first opened, so the first impression is the app itself and the
///     SDK (and its consent form) isn't even started yet.
///   - **A banner** at the very bottom of Today, below everything else.
///   - **One full-screen ad a day at most**, only between lessons, when a
///     finished lesson has just been closed. Never during a lesson, a quiz,
///     an exam, a flashcard session or while reading.
public enum AdPolicy {
    public enum Placement: Sendable, Equatable {
        /// The banner under Today's panels.
        case todayBanner
        /// The full-screen ad after a finished lesson is closed.
        case afterLesson
    }

    /// How long after first launch there are no ads at all.
    public static let freeInterval: TimeInterval = 24 * 60 * 60

    public static func allows(
        _ placement: Placement,
        installedAt: Date,
        now: Date,
        lastInterstitialAt: Date?,
        onboarded: Bool,
        calendar: Calendar = .current
    ) -> Bool {
        guard onboarded else { return false }
        // `<` also covers a clock set back to before the install.
        guard now.timeIntervalSince(installedAt) >= freeInterval else { return false }
        switch placement {
        case .todayBanner:
            return true
        case .afterLesson:
            guard let last = lastInterstitialAt else { return true }
            return !calendar.isDate(last, inSameDayAs: now)
        }
    }
}
