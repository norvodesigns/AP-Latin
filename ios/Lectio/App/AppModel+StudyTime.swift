import Foundation
import LectioCore

/// Active study time — the app's `useStudyTimeSync` (src/hooks/useStudyTimeSync.ts).
///
/// Time counts only while the app is in the foreground on a study section
/// (not Today, Settings or Search). It feeds today's goal on this device and,
/// when signed in, the teacher's roster via `bump_study_seconds`, flushed
/// every 30 seconds, on changing section, and on leaving the app.
extension AppModel {
    static let studyFlushSeconds: Double = 30

    /// The web's assignable section id for a tab, or nil for chrome.
    static func studySection(for tab: AppTab) -> String? {
        switch tab {
        case .read: "read"
        case .translate: "translate"
        case .sight: "sight"
        case .quiz: "quiz"
        case .vocab: "vocab"
        case .grammar: "grammar"
        case .scansion: "scansion"
        case .devices: "devices"
        case .context: "context"
        case .frq: "frq"
        case .exam: "exam"
        case .plan: "plan"
        case .today, .settings, .search: nil
        }
    }

    var dailyGoalSeconds: Double { Double(progress.studyPlan.minutesPerDay * 60) }

    func restoreStudyDay() {
        let d = UserDefaults.standard
        studyGoalDate = d.string(forKey: "studyGoalDate") ?? StudyDates.today()
        goalCelebratedDate = d.string(forKey: "goalCelebratedDate")
        studySecondsToday = studyGoalDate == StudyDates.today() ? d.double(forKey: "studySecondsToday") : 0
    }

    func startStudyTicker() {
        studyTicker?.cancel()
        pendingStudySection = Self.studySection(for: selectedTab)
        studyTicker = Task { [weak self] in
            var sinceFlush: Double = 0
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(1))
                guard let self, !Task.isCancelled else { return }
                guard self.sceneActive, let section = Self.studySection(for: self.selectedTab) else { continue }
                self.pendingStudySection = section
                self.pendingStudySeconds += 1
                self.addStudySeconds(1)
                sinceFlush += 1
                if sinceFlush >= Self.studyFlushSeconds {
                    sinceFlush = 0
                    self.flushStudyTime()
                }
            }
        }
    }

    func stopStudyTicker() {
        studyTicker?.cancel()
        studyTicker = nil
    }

    func studySectionChanged() {
        flushStudyTime()
        pendingStudySection = Self.studySection(for: selectedTab)
    }

    /// Sends accrued seconds under the section they were spent on.
    func flushStudyTime() {
        let seconds = pendingStudySeconds
        let section = pendingStudySection
        pendingStudySeconds = 0
        guard seconds > 0, let section, account != nil else { return }
        Task { [auth] in
            guard let token = try? await auth.accessToken() else { return }
            try? await auth.api.rpc("bump_study_seconds", JSONObject([
                ("p_section", .string(section)),
                ("p_day", .string(StudyDates.today())),
                ("p_delta", .number(seconds.rounded())),
            ]), accessToken: token)
        }
    }

    /// Adds to today's tally, rolling over on a new day and flagging the
    /// moment the daily goal is first crossed — the web's `addStudySeconds`.
    func addStudySeconds(_ seconds: Double) {
        let today = StudyDates.today()
        let before = studyGoalDate == today ? studySecondsToday : 0
        let after = before + seconds
        let goal = dailyGoalSeconds
        if goal > 0, before < goal, after >= goal, goalCelebratedDate != today {
            goalCelebratedDate = today
            goalJustReached = true
            UserDefaults.standard.set(today, forKey: "goalCelebratedDate")
            update { $0.markStudied() }
        }
        studyGoalDate = today
        studySecondsToday = after
        let d = UserDefaults.standard
        d.set(today, forKey: "studyGoalDate")
        d.set(after, forKey: "studySecondsToday")
    }
}
