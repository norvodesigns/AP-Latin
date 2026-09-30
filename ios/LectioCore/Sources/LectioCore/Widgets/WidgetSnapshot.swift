import Foundation

/// What the Home Screen and Lock Screen widgets show, written by the app into
/// the shared app group whenever progress changes.
///
/// It stores the raw ingredients (every card's due date, recent study days)
/// rather than finished numbers, so a widget rendered tomorrow morning counts
/// tomorrow's due cards and streak correctly without the app having run.
public struct WidgetSnapshot: Codable, Sendable, Equatable {
    public static let appGroup = "group.com.norvodesigns.lectio"
    static let key = "widgetSnapshot"

    public var examDate: String
    /// Every vocabulary card's `due` date (UTC ISO day, as the web writes it).
    public var dueDates: [String]
    /// Recent study days, newest last.
    public var studyDays: [String]
    public var goalMinutes: Int
    /// Today's study seconds, and the day they belong to.
    public var studySeconds: Double
    public var studyDay: String
    /// The Sententia of the day for today and the next few days, so the
    /// widget turns over at midnight on its own. Nil in a snapshot written
    /// before it existed.
    public var lines: [DayLine]?
    /// The days the Sententia was done, recent ones only.
    public var dailyDone: [String]?
    /// The course lesson to do next, if there is one.
    public var nextLesson: NextLesson?

    /// One day's Sententia, as plain text.
    public struct DayLine: Codable, Sendable, Equatable {
        public var day: String
        public var latin: String
        public var english: String
        public var source: String

        public init(day: String, latin: String, english: String, source: String) {
            self.day = day
            self.latin = latin
            self.english = english
            self.source = source
        }
    }

    public struct NextLesson: Codable, Sendable, Equatable {
        public var id: String
        /// Where it sits, e.g. "Prīma 2.3".
        public var place: String
        public var title: String

        public init(id: String, place: String, title: String) {
            self.id = id
            self.place = place
            self.title = title
        }
    }

    public init(examDate: String, dueDates: [String], studyDays: [String], goalMinutes: Int, studySeconds: Double, studyDay: String,
                lines: [DayLine]? = nil, dailyDone: [String]? = nil, nextLesson: NextLesson? = nil) {
        self.examDate = examDate
        self.dueDates = dueDates
        self.studyDays = studyDays
        self.goalMinutes = goalMinutes
        self.studySeconds = studySeconds
        self.studyDay = studyDay
        self.lines = lines
        self.dailyDone = dailyDone
        self.nextLesson = nextLesson
    }

    public static let placeholder = WidgetSnapshot(examDate: "2027-05-14", dueDates: Array(repeating: "2000-01-01", count: 12),
                                                   studyDays: [], goalMinutes: 30, studySeconds: 900, studyDay: "")

    public func daysUntilExam(on date: Date, calendar: Calendar = .current) -> Int {
        Streaks.daysUntilExam(examDate, from: date, calendar: calendar)
    }

    public func cardsDue(on date: Date) -> Int {
        let day = StudyDates.isoDay(date)
        return dueDates.filter { $0 <= day }.count
    }

    public func streak(on date: Date, calendar: Calendar = .current) -> Int {
        Streaks.current(studyDays, now: date, calendar: calendar)
    }

    public func minutesToday(on date: Date) -> Int {
        studyDay == StudyDates.isoDay(date) ? Int(studySeconds / 60) : 0
    }

    /// The Sententia for the local day of `date`, if the app wrote it.
    public func line(on date: Date, calendar: Calendar = .current) -> DayLine? {
        let day = Daily.localDay(date, calendar: calendar)
        return lines?.first { $0.day == day }
    }

    /// Whether the Sententia of the local day of `date` has been done.
    public func dailyDone(on date: Date, calendar: Calendar = .current) -> Bool {
        dailyDone?.contains(Daily.localDay(date, calendar: calendar)) ?? false
    }

    /* -------------------------------------------------------------- */

    public static func load(from defaults: UserDefaults? = UserDefaults(suiteName: appGroup)) -> WidgetSnapshot? {
        guard let data = defaults?.data(forKey: key) else { return nil }
        return try? JSONDecoder().decode(WidgetSnapshot.self, from: data)
    }

    public func save(to defaults: UserDefaults? = UserDefaults(suiteName: appGroup)) {
        guard let data = try? JSONEncoder().encode(self) else { return }
        defaults?.set(data, forKey: Self.key)
    }
}
