#if canImport(ActivityKit) && os(iOS)
import ActivityKit
import Foundation

/// A timed practice-exam section as a Live Activity, on the Lock Screen and
/// in the Dynamic Island: which section, the time left (counted by the
/// system, so it runs on while the phone is locked) and how much is
/// answered. Shared by the app, which starts it, and the widget extension,
/// which draws it.
public struct ExamActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable, Sendable {
        /// "Section I".
        public var section: String
        /// "Multiple choice".
        public var detail: String
        public var startedAt: Date
        public var endsAt: Date
        /// Questions answered so far, of `total`.
        public var done: Int
        public var total: Int

        public init(section: String, detail: String, startedAt: Date, endsAt: Date, done: Int, total: Int) {
            self.section = section
            self.detail = detail
            self.startedAt = startedAt
            self.endsAt = endsAt
            self.done = done
            self.total = total
        }
    }

    public init() {}
}
#endif
