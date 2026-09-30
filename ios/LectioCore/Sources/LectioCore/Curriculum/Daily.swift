import Foundation

/// Sententia of the day — the web's `src/data/daily` and `src/lib/daily.ts`:
/// one famous line of Latin, the words for it, and three quick questions.
/// Everyone gets the same line on the same calendar day, on their own clock.
public struct Sententia: Decodable, Sendable, Hashable, Identifiable {
    public let id: String
    public let latin: String
    public let english: String
    /// Who wrote or said it, and where (may hold *italic* markup).
    public let source: String
    /// A few sentences of context, shown once the questions are done.
    public let note: String
    public let gloss: [ReadStep.Gloss]
    public let steps: [LessonStep]
}

/// `daily.json`.
public struct DailyFile: Decodable, Sendable {
    public let sententiae: [Sententia]
}

public enum Daily {
    /// Daily lessons have ids `daily-YYYY-MM-DD`.
    public static let prefix = "daily-"

    /// Today's date on the student's own clock (the web's `localDay`).
    public static func localDay(_ date: Date = Date(), calendar: Calendar = .current) -> String {
        let c = calendar.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", c.year ?? 1970, c.month ?? 1, c.day ?? 1)
    }

    /// The date `n` days after (or before) `day`.
    public static func shift(_ day: String, by n: Int) -> String {
        guard let d = StudyDates.dayNumber(day) else { return day }
        return StudyDates.isoDay(Date(timeIntervalSince1970: Double(d + n) * 86_400))
    }

    public static func sententia(for day: String, in list: [Sententia]) -> Sententia? {
        guard !list.isEmpty, let d = StudyDates.dayNumber(day) else { return nil }
        let n = list.count
        return list[((d % n) + n) % n]
    }

    public static func isDaily(_ id: String) -> Bool { id.hasPrefix(prefix) }

    /// The day a daily lesson belongs to, from its id.
    public static func day(ofLesson id: String) -> String { String(id.dropFirst(prefix.count)) }

    /// The line as a three-minute lesson: read it with its glosses, answer
    /// the questions, then see the translation and where it comes from.
    public static func lesson(_ s: Sententia, day: String) -> LessonPlace {
        let lesson = Lesson(
            id: prefix + day,
            title: "Sententia of the day",
            summary: "One famous line of Latin, the words you need for it, and three quick questions.",
            minutes: 3,
            objectives: ["Read a line of real Latin", "Notice one point of grammar in it", "Meet an English word that comes from it"],
            words: [],
            steps: [
                .teach(TeachStep(
                    title: "*\(s.latin)*",
                    body: ["Read it aloud, then work out what it says. The words you may not know:"],
                    table: nil,
                    examples: s.gloss.map { TeachStep.Example(la: $0.word, en: $0.meaning, note: nil) },
                    tip: nil
                )),
            ] + s.steps + [
                .teach(TeachStep(title: "*\(s.latin)*", body: ["“\(s.english)”", "— \(s.source)", s.note], table: nil, examples: nil, tip: nil)),
            ]
        )
        let unit = CurriculumUnit(id: "daily", n: 0, title: "Sententia", blurb: "", lessons: [lesson])
        let level = CurriculumLevel(id: "daily", numeral: "", title: "Sententia", subtitle: "", blurb: "", units: [unit])
        return LessonPlace(lesson: lesson, unit: unit, level: level, index: -1)
    }

    /// Days in a row with the line done, counting today, or yesterday if
    /// today isn't done yet.
    public static func streak(_ daily: [String: DailyResult], today: String) -> Int {
        var day = daily[today] != nil ? today : shift(today, by: -1)
        var n = 0
        while daily[day] != nil {
            n += 1
            day = shift(day, by: -1)
        }
        return n
    }
}
