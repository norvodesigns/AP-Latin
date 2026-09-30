import AppIntents
import Observation

/// Siri, Spotlight and the Shortcuts app: "Today's Latin line", "Continue my
/// Latin lesson", "Review my Latin cards". Each opens the app and hands a
/// route to `ShortcutRouter`, which RootView follows exactly as it follows a
/// lectio:// link.
@Observable
final class ShortcutRouter {
    static let shared = ShortcutRouter()
    /// A route like "learn/daily", waiting for RootView to open it.
    var pending: String?
}

nonisolated struct OpenSententiaIntent: AppIntent {
    static let title: LocalizedStringResource = "Today's Sententia"
    static let openAppWhenRun = true

    @MainActor
    func perform() async throws -> some IntentResult {
        ShortcutRouter.shared.pending = "learn/daily"
        return .result()
    }
}

nonisolated struct ContinueLessonIntent: AppIntent {
    static let title: LocalizedStringResource = "Continue the Course"
    static let openAppWhenRun = true

    @MainActor
    func perform() async throws -> some IntentResult {
        ShortcutRouter.shared.pending = "learn/next"
        return .result()
    }
}

nonisolated struct ReviewCardsIntent: AppIntent {
    static let title: LocalizedStringResource = "Review Vocabulary"
    static let openAppWhenRun = true

    @MainActor
    func perform() async throws -> some IntentResult {
        ShortcutRouter.shared.pending = "vocab"
        return .result()
    }
}

nonisolated struct LectioShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: OpenSententiaIntent(),
            phrases: ["Today's Latin line in \(.applicationName)", "Open the Sententia in \(.applicationName)"],
            shortTitle: "Sententia",
            systemImageName: "text.quote"
        )
        AppShortcut(
            intent: ContinueLessonIntent(),
            phrases: ["Continue my \(.applicationName) lesson", "Continue the course in \(.applicationName)"],
            shortTitle: "Continue Course",
            systemImageName: "graduationcap"
        )
        AppShortcut(
            intent: ReviewCardsIntent(),
            phrases: ["Review my \(.applicationName) cards", "Review Latin vocabulary in \(.applicationName)"],
            shortTitle: "Review Cards",
            systemImageName: "rectangle.on.rectangle.angled"
        )
    }
}
