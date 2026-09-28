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

    public init(examDate: String, dueDates: [String], studyDays: [String], goalMinutes: Int, studySeconds: Double, studyDay: String) {
        self.examDate = examDate
        self.dueDates = dueDates
        self.studyDays = studyDays
        self.goalMinutes = goalMinutes
        self.studySeconds = studySeconds
        self.studyDay = studyDay
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
