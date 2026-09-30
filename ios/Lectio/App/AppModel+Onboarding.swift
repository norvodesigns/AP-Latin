import Foundation
import LectioCore

/// The first run (Features/Onboarding): who sees it, and what finishing it
/// does. The web's `needsOnboarding` asks the same question of its store.
extension AppModel {
    private static let onboardedKey = "onboarded"

    /// A first launch with nothing to show for it: no account, no lessons,
    /// no deck, no quiz answers, no passages opened. Anyone who already has
    /// work — synced from the website or from before this screen existed —
    /// goes straight in. `-showOnboarding YES` forces it (CI screenshots).
    var needsOnboarding: Bool {
        let defaults = UserDefaults.standard
        if defaults.bool(forKey: "showOnboarding") { return true }
        if defaults.bool(forKey: "seedDemo") { return false }
        if defaults.bool(forKey: Self.onboardedKey) { return false }
        if account != nil { return false }
        let p = progress
        return p.learner == nil && p.lessons.isEmpty && p.vocab.isEmpty && p.quizAttempts.isEmpty
            && (p.raw["passages"]?.objectValue?.isEmpty ?? true)
    }

    /// Records what the student chose (nil when they skipped) and takes them
    /// to the right first screen: a beginner into their first lesson, an AP
    /// student to Today, a teacher to Classroom.
    func finishOnboarding(_ profile: LearnerProfile?, minutes: Int? = nil) {
        UserDefaults.standard.set(true, forKey: Self.onboardedKey)
        if let profile {
            update { doc in
                doc.setLearner(profile)
                if let minutes { doc.setStudyPlan(minutesPerDay: minutes) }
            }
        }
        showOnboarding = false
        guard let profile else { return }
        // After the cover has gone, so the lesson's own cover can present.
        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(650))
            switch profile.track {
            case .new, .some:
                selectedTab = .learn
                if profile.track == .new, let start = profile.startLessonId { openLesson(start) }
            case .ap:
                selectedTab = .today
            case .teacher:
                selectedTab = .classroom
            }
        }
    }
}
