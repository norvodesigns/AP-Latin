import Foundation

/// A placement-check question (web: `src/data/curriculum/placement.ts`).
public struct PlacementQuestion: Decodable, Sendable, Hashable {
    /// The unit it checks, e.g. "prima-3".
    public let unit: String
    public let step: ChoiceStep
}

/// Where the placement check puts a student — the web's
/// `src/lib/placement.ts`, exactly.
public enum Placement {
    public struct Answer: Sendable, Hashable {
        public let unit: String
        public let right: Bool
        public init(unit: String, right: Bool) {
            self.unit = unit
            self.right = right
        }
    }

    public static let stopAfterMisses = 3

    /// Whether to ask another question, given the answers so far.
    public static func continues(_ answers: [Answer], total: Int) -> Bool {
        answers.count < total && answers.filter { !$0.right }.count < stopAfterMisses
    }

    /// The unit to start at, or nil when every question was answered right.
    public static func start(_ answers: [Answer]) -> String? {
        answers.first { !$0.right }?.unit
    }
}
