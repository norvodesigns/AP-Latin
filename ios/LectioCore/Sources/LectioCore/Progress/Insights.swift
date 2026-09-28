import Foundation

/// The dashboard's read of a student's history — ports of `weakSpots` and
/// `vocabForecast` (src/lib/progress.ts) and the skill mastery in
/// src/components/Dashboard.tsx.
public enum Insights {
    /// What each weak spot points the student at.
    public enum Destination: Sendable, Equatable {
        case quiz(type: String)
        case grammar, scansion, vocab
    }

    public struct WeakSpot: Sendable, Identifiable, Equatable {
        public let id: String
        public let label: String
        /// Accuracy where there's a denominator; nil for counts (missed tags, leeches).
        public let pct: Int?
        public let detail: String
        public let action: String
        public let destination: Destination
        /// Lower is more urgent.
        public let urgency: Int
    }

    static let minSample = 6

    public static func weakSpots(quizAttempts: [QuizAttempt], translationAttempts: [TranslationAttempt],
                                 scansionAttempts: [ScansionAttempt], vocab: [String: VocabCard],
                                 typeLabels: [String: String]) -> [WeakSpot] {
        var out: [WeakSpot] = []

        // Multiple choice, by question type.
        var byType: [String: Tally] = [:]
        for a in quizAttempts {
            byType[a.type, default: Tally(correct: 0, total: 0)].total += 1
            if a.correct { byType[a.type]?.correct += 1 }
        }
        for (type, s) in byType where s.total >= minSample {
            let pct = Int((Double(s.correct) / Double(s.total) * 100).rounded())
            guard pct < 80 else { continue }
            out.append(WeakSpot(id: "type-\(type)", label: typeLabels[type] ?? type, pct: pct,
                                detail: "\(s.correct) of \(s.total) right", action: "Drill it",
                                destination: .quiz(type: type), urgency: pct))
        }

        // Translation, by the grammar tags of segments missed — a count, not a rate.
        var missed: [String: Int] = [:]
        for a in translationAttempts { for tag in a.missedTags { missed[tag, default: 0] += 1 } }
        for (tag, n) in missed where n >= 3 {
            let words = tag.replacingOccurrences(of: "-", with: " ")
            out.append(WeakSpot(id: "tag-\(tag)", label: words.prefix(1).uppercased() + words.dropFirst(), pct: nil,
                                detail: "missed in \(n) translation segment\(n == 1 ? "" : "s")", action: "Read it up",
                                destination: .grammar, urgency: max(40, 76 - n * 2)))
        }

        // Scansion, over recent attempts only.
        let recent = scansionAttempts.suffix(40)
        let scanned = recent.reduce(0) { $0 + $1.total }
        let right = recent.reduce(0) { $0 + $1.correct }
        if recent.count >= minSample, scanned > 0 {
            let pct = Int((Double(right) / Double(scanned) * 100).rounded())
            if pct < 80 {
                out.append(WeakSpot(id: "scansion", label: "Marking quantities", pct: pct,
                                    detail: "\(pct)% of syllables right across your last \(recent.count) lines",
                                    action: "Scan a line", destination: .scansion, urgency: pct))
            }
        }

        // Cards forgotten twice or more.
        let leeches = vocab.values.filter { $0.lapses >= 2 }.count
        if leeches >= 3 {
            out.append(WeakSpot(id: "leeches", label: "Words that keep slipping", pct: nil,
                                detail: "\(leeches) cards you have forgotten twice or more", action: "Review them",
                                destination: .vocab, urgency: max(45, 70 - leeches)))
        }

        return Array(out.sorted { $0.urgency != $1.urgency ? $0.urgency < $1.urgency : $0.id < $1.id }.prefix(5))
    }

    public struct Forecast: Sendable, Equatable {
        public let dueNow: Int
        /// Cards due today (overdue included), then on each of the next six days.
        public let week: [Int]
        public let mature: Int
        public let learning: Int
    }

    public static func forecast(_ vocab: [String: VocabCard], today: Date = Date()) -> Forecast {
        let todayIso = StudyDates.isoDay(today)
        let todayNumber = StudyDates.dayNumber(todayIso) ?? 0
        var week = Array(repeating: 0, count: 7)
        var dueNow = 0
        var mature = 0
        for c in vocab.values {
            if c.due <= todayIso {
                dueNow += 1
            } else if let d = StudyDates.dayNumber(c.due) {
                let days = d - todayNumber
                if (1...6).contains(days) { week[days] += 1 }
            }
            if c.interval >= 21 { mature += 1 }
        }
        week[0] = dueNow
        return Forecast(dueNow: dueNow, week: week, mature: mature, learning: vocab.count - mature)
    }

    /// The exam's weighting of the three skill categories, in percent.
    public static let skillWeights: [String: Int] = ["1": 70, "2": 11, "3": 19]

    /// Multiple-choice accuracy per skill category.
    public static func mastery(_ attempts: [QuizAttempt]) -> [String: Tally] {
        var out: [String: Tally] = ["1": Tally(correct: 0, total: 0), "2": Tally(correct: 0, total: 0), "3": Tally(correct: 0, total: 0)]
        for a in attempts where out[a.skillCategory] != nil {
            out[a.skillCategory]?.total += 1
            if a.correct { out[a.skillCategory]?.correct += 1 }
        }
        return out
    }
}
