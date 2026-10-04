import Foundation

/// Laurels — the web's `src/lib/laurels.ts`: achievements across the whole
/// app, worked out from the progress that already syncs, so every device
/// agrees and nothing new is stored. Held to the web by parity fixtures.
public struct Laurel: Sendable, Equatable, Identifiable {
    public let id: String
    public let latin: String
    public let title: String
    public let detail: String
    public let target: Int
    /// How far along, capped at the target.
    public let have: Int
    public let earned: Bool
}

public enum Laurels {
    public struct Spec: Sendable, Equatable, Decodable {
        public let id: String
        public let latin: String
        public let title: String
        public let detail: String
        public let target: Int
    }

    public static let specs: [Spec] = [
        // The course
        Spec(id: "first-lesson", latin: "Prīmus gradus", title: "The first step", detail: "Finish a lesson of the course.", target: 1),
        Spec(id: "unit", latin: "Pēnsum perfectum", title: "A whole unit", detail: "Finish every lesson of a unit.", target: 1),
        Spec(id: "prima", latin: "Prīma perfecta", title: "Level I, done", detail: "Finish every lesson of Prīma.", target: 1),
        Spec(id: "secunda", latin: "Secunda perfecta", title: "Level II, done", detail: "Finish every lesson of Secunda.", target: 1),
        Spec(id: "tertia", latin: "Tertia perfecta", title: "Level III, done", detail: "Finish every lesson of Tertia.", target: 1),
        Spec(id: "quarta", latin: "Quārta perfecta", title: "Level IV, done", detail: "Finish every lesson of Quārta: the whole AP syllabus, read with a guide.", target: 1),
        Spec(id: "verba", latin: "Omnia verba", title: "The whole AP list", detail: "Finish every unit of Verba, the AP word list by letter.", target: 1),
        Spec(id: "lessons-50", latin: "Quīnquāgintā lēctiōnēs", title: "Fifty lessons", detail: "Finish fifty lessons of the course.", target: 50),
        // Habit
        Spec(id: "streak-7", latin: "Septem diēs", title: "A week unbroken", detail: "Study seven days in a row.", target: 7),
        Spec(id: "streak-30", latin: "Trīgintā diēs", title: "A month unbroken", detail: "Study thirty days in a row.", target: 30),
        Spec(id: "streak-100", latin: "Centum diēs", title: "A hundred days unbroken", detail: "Study a hundred days in a row.", target: 100),
        Spec(id: "days-50", latin: "Assiduus", title: "Fifty days of study", detail: "Study on fifty different days.", target: 50),
        // Vocabulary
        Spec(id: "deck-100", latin: "Centum verba", title: "A hundred words", detail: "Have a hundred words in your flashcards.", target: 100),
        Spec(id: "deck-500", latin: "Quīngenta verba", title: "Five hundred words", detail: "Have five hundred words in your flashcards.", target: 500),
        Spec(id: "mature-100", latin: "Memoria tenāx", title: "A hundred words held fast", detail: "Get a hundred cards to an interval of three weeks or more.", target: 100),
        // Reading
        Spec(id: "reader", latin: "Lēctor", title: "Five passages opened", detail: "Open five passages in the Reading Room.", target: 5),
        Spec(id: "annotations", latin: "Adnotātiōnēs", title: "Twenty-five marks", detail: "Make twenty-five highlights and notes while reading.", target: 25),
        Spec(id: "cold-read", latin: "Sine auxiliō", title: "A cold read", detail: "Read a passage with the glossary turned off.", target: 1),
        // Quiz and exam
        Spec(id: "quiz-100", latin: "Centum respōnsa", title: "A hundred questions", detail: "Answer a hundred questions in the Quiz Engine.", target: 100),
        Spec(id: "quiz-1000", latin: "Mīlle respōnsa", title: "A thousand questions", detail: "Answer a thousand questions in the Quiz Engine.", target: 1000),
        Spec(id: "exam", latin: "Probātiō", title: "A practice exam", detail: "Finish a full practice exam.", target: 1),
        Spec(id: "exam-80", latin: "Summa cum laude", title: "Eighty percent", detail: "Score 80% or more on a practice exam’s multiple choice.", target: 80),
        // Writing
        Spec(id: "translations-10", latin: "Interpres", title: "Ten translations", detail: "Finish ten translation drills.", target: 10),
        Spec(id: "frq-5", latin: "Scrīptor", title: "Five free responses", detail: "Submit five free responses in the FRQ Workshop.", target: 5),
        // Scansion
        Spec(id: "scansion-first", latin: "Prīmus versus", title: "A first line scanned", detail: "Scan a line in the Scansion Lab.", target: 1),
        Spec(id: "scansion-50", latin: "Metricus", title: "Fifty lines, perfectly", detail: "Scan fifty different lines without a mistake.", target: 50),
        // Sententia
        Spec(id: "sententia-7", latin: "Sententiōsus", title: "A week of sententiae", detail: "Do the Sententia of the day seven days in a row.", target: 7),
        Spec(id: "sententia-30", latin: "Trīgintā sententiae", title: "Thirty sententiae", detail: "Do the Sententia of the day thirty times.", target: 30),
    ]

    /// Longest run of consecutive YYYY-MM-DD days in a list.
    static func longestRun(_ days: [String]) -> Int {
        let sorted = Set(days.compactMap(StudyDates.dayNumber)).sorted()
        var best = 0
        var run = 0
        for (i, d) in sorted.enumerated() {
            run = i > 0 && d == sorted[i - 1] + 1 ? run + 1 : 1
            best = max(best, run)
        }
        return best
    }

    /// Every laurel, and how far along the student is. Reads the document's
    /// raw JSON for counts rather than decoding every record, since Today
    /// works this out on each redraw and a keen student has thousands of
    /// quiz answers.
    public static func all(_ doc: ProgressDocument, course: Course) -> [Laurel] {
        let done = doc.lessons
        let isDone = { (id: String) in done[id] != nil }
        // Unit tests aside: a unit is done when its lessons are.
        let units = course.levels.flatMap(\.units).map { $0.lessons.filter { !$0.isTest }.map(\.id) }
        let unitsDone = units.filter { !$0.isEmpty && $0.allSatisfy(isDone) }.count
        let levelDone = { (id: String) -> Int in
            let us = course.levels.first { $0.id == id }?.units ?? []
            return !us.isEmpty && us.allSatisfy { $0.lessons.filter { !$0.isTest }.allSatisfy { isDone($0.id) } } ? 1 : 0
        }
        let intervals = doc.raw.object("vocab").map { $0.value["interval"]?.doubleValue ?? 0 }
        let passages = doc.raw.object("passages").map(\.value)
        let exams = doc.examResults
        let bestExam = exams.map { $0.mcqTotal > 0 ? Int((Double($0.mcqCorrect) / Double($0.mcqTotal) * 100).rounded(.down)) : 0 }.max() ?? 0
        let scans = doc.raw.array("scansionAttempts")
        // A line is mastered once any attempt at it scored every syllable.
        let mastered = Set(scans.compactMap { a -> String? in
            let total = a["total"]?.doubleValue ?? 0
            return total > 0 && a["correct"]?.doubleValue == total ? a["lineId"]?.stringValue : nil
        }).count
        let daily = Array(doc.daily.keys)
        let studyDays = doc.studyDays
        let longest = Streaks.longest(studyDays)
        let quizzes = doc.raw.array("quizAttempts").count

        let have: [String: Int] = [
            "first-lesson": done.count,
            "unit": unitsDone,
            "prima": levelDone("prima"),
            "secunda": levelDone("secunda"),
            "tertia": levelDone("tertia"),
            "quarta": levelDone("quarta"),
            "verba": levelDone("verba"),
            "lessons-50": done.count,
            "streak-7": longest,
            "streak-30": longest,
            "streak-100": longest,
            "days-50": Set(studyDays).count,
            "deck-100": intervals.count,
            "deck-500": intervals.count,
            "mature-100": intervals.filter { $0 >= 21 }.count,
            "reader": passages.filter { ($0["lastOpened"]?.stringValue ?? "").isEmpty == false }.count,
            "annotations": passages.reduce(0) { $0 + ($1["annotations"]?.arrayValue?.count ?? 0) },
            "cold-read": passages.reduce(0) { $0 + Int($1["coldReads"]?.doubleValue ?? 0) },
            "quiz-100": quizzes,
            "quiz-1000": quizzes,
            "exam": exams.count,
            "exam-80": bestExam,
            "translations-10": doc.raw.array("translationAttempts").count,
            "frq-5": doc.raw.array("frqResponses").filter { $0["submitted"]?.boolValue == true }.count,
            "scansion-first": scans.count,
            "scansion-50": mastered,
            "sententia-7": longestRun(daily),
            "sententia-30": daily.count,
        ]
        return specs.map { s in
            let n = have[s.id] ?? 0
            return Laurel(id: s.id, latin: s.latin, title: s.title, detail: s.detail, target: s.target, have: min(n, s.target), earned: n >= s.target)
        }
    }

    /// The unearned laurel closest to done, by fraction of its target.
    public static func next(_ list: [Laurel]) -> Laurel? {
        let open = list.filter { !$0.earned && $0.have > 0 }
        guard let first = open.first else { return list.first { !$0.earned } }
        return open.dropFirst().reduce(first) { a, b in
            Double(b.have) / Double(b.target) > Double(a.have) / Double(a.target) ? b : a
        }
    }
}
