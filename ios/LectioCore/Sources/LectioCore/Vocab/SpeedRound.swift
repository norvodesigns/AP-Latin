import Foundation

/// Speed round — the web's `src/lib/speed.ts`: a minute of matching Latin
/// words to their meanings, five pairs to a board. A wrong pair costs two
/// seconds. The short glosses are the web's exactly (parity-tested).
public enum SpeedRound {
    public static let seconds = 60
    public static let boardSize = 5
    public static let missPenalty = 2

    public struct Word: Sendable, Hashable, Identifiable {
        public let id: String
        public let latin: String
        public let english: String

        public init(id: String, latin: String, english: String) {
            self.id = id
            self.latin = latin
            self.english = english
        }
    }

    /// A definition cut down to fit a tile: the first group of senses (before
    /// any semicolon), without notes in brackets, at most two senses, and one
    /// if two would be long.
    public static func shortGloss(_ definition: String) -> String {
        let first = String(definition.split(separator: ";", maxSplits: 1, omittingEmptySubsequences: false).first ?? "")
            .replacing(/\[[^\]]*\]|\([^)]*\)/, with: "")
        let senses = first.split(separator: ",", omittingEmptySubsequences: false)
            .map { String($0).replacing(/\s+/, with: " ").trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
        guard let one = senses.first else { return definition.trimmingCharacters(in: .whitespacesAndNewlines) }
        let two = senses.prefix(2).joined(separator: ", ")
        // UTF-16 length, as JavaScript counts it.
        return two.utf16.count <= 26 || senses.count == 1 ? two : one
    }

    /// The words a round can use: no proper names, none whose meaning just
    /// repeats the Latin, and no two with the same short gloss.
    public static func words(_ entries: [VocabEntry]) -> [Word] {
        var seen = Set<String>()
        var out: [Word] = []
        for e in entries {
            if let c = e.headword.unicodeScalars.first, ("A"..."Z").contains(c) { continue }
            let english = shortGloss(e.definition)
            let key = english.lowercased()
            if english.isEmpty || seen.contains(key) || key.contains(e.headword.lowercased()) { continue }
            seen.insert(key)
            out.append(Word(id: e.id, latin: e.headword, english: english))
        }
        return out
    }

    /// A board: `size` words from the pool, and their meanings in another order.
    public static func deal<G: RandomNumberGenerator>(_ pool: [Word], size: Int = boardSize, using rng: inout G) -> (left: [Word], right: [Word]) {
        var bag = pool
        var left: [Word] = []
        var latin = Set<String>()
        while left.count < size, !bag.isEmpty {
            let w = bag.remove(at: Int.random(in: 0..<bag.count, using: &rng))
            guard latin.insert(w.latin).inserted else { continue }
            left.append(w)
        }
        var right = left.shuffled(using: &rng)
        // Never leave every meaning beside its own word.
        if right.count > 1, right == left { right.append(right.removeFirst()) }
        return (left, right)
    }
}
