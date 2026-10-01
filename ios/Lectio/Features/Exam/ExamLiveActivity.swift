import ActivityKit
import Foundation
import LectioCore

/// Starts, updates and ends the Live Activity for a timed exam section.
/// Each call works on whatever activities exist rather than holding one,
/// so a crash or a relaunch never leaves a stale countdown behind for long.
enum ExamLiveActivity {
    nonisolated static func start(_ state: ExamActivityAttributes.ContentState) {
        Task {
            await endAll()
            guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }
            _ = try? Activity.request(attributes: ExamActivityAttributes(), content: ActivityContent(state: state, staleDate: state.endsAt))
        }
    }

    nonisolated static func update(done: Int) {
        Task {
            for activity in Activity<ExamActivityAttributes>.activities {
                var state = activity.content.state
                guard state.done != done else { continue }
                state.done = done
                await activity.update(ActivityContent(state: state, staleDate: state.endsAt))
            }
        }
    }

    nonisolated static func end() {
        Task { await endAll() }
    }

    nonisolated private static func endAll() async {
        for activity in Activity<ExamActivityAttributes>.activities {
            await activity.end(nil, dismissalPolicy: .immediate)
        }
    }
}
