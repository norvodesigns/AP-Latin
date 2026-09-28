import Foundation

/// The signed-in student's cloud copy of their progress.
public struct CloudProgress: Sendable, Equatable {
    public let data: JSONObject
    /// As the server returned it (e.g. "2026-09-28T05:15:29.123+00:00").
    public let updatedAt: String

    public init(data: JSONObject, updatedAt: String) {
        self.data = data
        self.updatedAt = updatedAt
    }
}

/// What this device's local progress currently represents — the web store's
/// `lastSyncedUserId` / `lastSyncedAt`, with the same meaning (see their doc
/// comments in src/store/useStore.ts).
public struct SyncBookkeeping: Codable, Sendable, Equatable {
    /// Whose cloud progress the local document belongs to. Nil means it has
    /// never been tied to any account, so it's safe to adopt into one.
    public var lastSyncedUserId: String?
    /// The cloud row's `updated_at` as of the last successful pull or push.
    public var lastSyncedAt: String?

    public init(lastSyncedUserId: String? = nil, lastSyncedAt: String? = nil) {
        self.lastSyncedUserId = lastSyncedUserId
        self.lastSyncedAt = lastSyncedAt
    }
}

/// The decisions cross-device sync makes — a port of `reconcile` and
/// `pullAndMerge` in src/hooks/useCloudSync.ts, kept free of networking so
/// the three sign-in cases can be tested directly.
public enum CloudSync {
    public struct Reconciliation: Sendable, Equatable {
        /// What the local document becomes.
        public var local: ProgressDocument
        /// What to upload, if anything.
        public var push: ProgressDocument?
        /// `lastSyncedAt` to record when there's nothing to push, or the push fails.
        public var fallbackSyncedAt: String?
    }

    /// Runs once per sign-in or account switch.
    public static func reconcile(userId: String, local: ProgressDocument, bookkeeping: SyncBookkeeping,
                                 cloud: CloudProgress?, now: Date = Date()) -> Reconciliation {
        if let previous = bookkeeping.lastSyncedUserId, previous != userId {
            // A different account just took over this device. Its local data
            // belongs to whoever was signed in before and must never be merged
            // into (or pushed over) this account's progress.
            if let cloud {
                return Reconciliation(local: ProgressDocument(raw: cloud.data, now: now), push: nil,
                                      fallbackSyncedAt: cloud.updatedAt)
            }
            let blank = ProgressDocument.blank(now: now)
            return Reconciliation(local: blank, push: blank, fallbackSyncedAt: nil)
        }

        // Continuing the same account, or adopting never-synced local data into
        // an account for the first time.
        guard let cloud else {
            return Reconciliation(local: local, push: local, fallbackSyncedAt: nil)
        }
        // With no prior sync there's no baseline for "newer", so the cloud —
        // the one copy that may already hold another device's work — wins
        // singleton settings outright.
        let cloudIsNewer = bookkeeping.lastSyncedAt.map { isLater(cloud.updatedAt, than: $0) } ?? true
        let merged = ProgressDocument(raw: ProgressMerge.merge(local: local.raw, cloud: cloud.data, cloudIsNewer: cloudIsNewer), now: now)
        return Reconciliation(local: merged, push: merged, fallbackSyncedAt: cloud.updatedAt)
    }

    /// Folds in a cloud row pulled mid-session (another device pushed), or
    /// returns nil when there's nothing new to fold in.
    public static func mergePulled(userId: String, local: ProgressDocument, bookkeeping: SyncBookkeeping,
                                   cloud: CloudProgress, now: Date = Date()) -> ProgressDocument? {
        guard bookkeeping.lastSyncedUserId == userId else { return nil }
        if let last = bookkeeping.lastSyncedAt, !isLater(cloud.updatedAt, than: last) { return nil }
        return ProgressDocument(raw: ProgressMerge.merge(local: local.raw, cloud: cloud.data, cloudIsNewer: true), now: now)
    }

    /// Whether timestamp `a` is strictly later than `b`. Parsed rather than
    /// compared as strings: the server writes "+00:00" and sometimes
    /// microseconds, the client writes "Z" and milliseconds.
    public static func isLater(_ a: String, than b: String) -> Bool {
        guard let da = parseTimestamp(a), let db = parseTimestamp(b) else { return a > b }
        // Millisecond precision on both sides: the push writes milliseconds,
        // and the same row must never read as newer than itself.
        return (da.timeIntervalSince1970 * 1000).rounded() > (db.timeIntervalSince1970 * 1000).rounded()
    }

    public static func parseTimestamp(_ s: String) -> Date? {
        // Normalise to "yyyy-MM-ddTHH:mm:ss.mmm<zone>", which every
        // ISO 8601 formatter accepts: milliseconds exactly, zone defaulting to UTC.
        let text = s.replacingOccurrences(of: " ", with: "T")
        guard text.count >= 19 else { return nil }
        let head = String(text.prefix(19))
        var rest = Substring(text.dropFirst(19))
        var ms = "000"
        if rest.hasPrefix(".") {
            let digits = rest.dropFirst().prefix { $0.isNumber }
            ms = String((digits + "000").prefix(3))
            rest = rest.dropFirst(1 + digits.count)
        }
        let zone = rest.isEmpty ? "Z" : String(rest)
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f.date(from: "\(head).\(ms)\(zone)")
    }
}
