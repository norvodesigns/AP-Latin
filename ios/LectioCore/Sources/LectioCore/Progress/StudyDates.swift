import Foundation

/// Date conventions shared with the web app.
///
/// The web store writes every "day" — `studyDays`, a card's `due` and
/// `lastReviewed`, `lastSeen` — as `new Date().toISOString().slice(0, 10)`:
/// the **UTC** calendar date, not the local one. Both platforms write into
/// the same synced document and compare those strings against each other,
/// so this app uses exactly the same convention even where a local date
/// would read more naturally. A different convention on each side would make
/// a card reviewed on the phone look overdue on the laptop, or split one
/// study session across two streak days.
public enum StudyDates {
    /// `YYYY-MM-DD` of `date` in UTC — the web's `toISOString().slice(0, 10)`.
    public static func isoDay(_ date: Date) -> String {
        let c = utcCalendar.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", c.year!, c.month!, c.day!)
    }

    /// The web's `today()`.
    public static func today(_ now: Date = Date()) -> String { isoDay(now) }

    /// Full ISO 8601 timestamp with milliseconds, as `toISOString()` writes it.
    public static func isoTimestamp(_ date: Date) -> String {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        f.timeZone = TimeZone(identifier: "UTC")
        return f.string(from: date)
    }

    /// `date` moved by whole days on `calendar` — the web's `d.setDate(d.getDate() + n)`,
    /// which steps the *local* calendar (so a DST change never skips a day).
    public static func adding(days: Int, to date: Date, calendar: Calendar) -> Date {
        calendar.date(byAdding: .day, value: days, to: date) ?? date.addingTimeInterval(Double(days) * 86_400)
    }

    /// Days since 1970-01-01 for a `YYYY-MM-DD` string, or nil if it isn't one.
    /// Exact day arithmetic, free of time zones and daylight saving.
    public static func dayNumber(_ iso: String) -> Int? {
        let parts = iso.split(separator: "-")
        guard parts.count == 3, let y = Int(parts[0]), let m = Int(parts[1]), let d = Int(parts[2]) else { return nil }
        // Days-from-civil (Howard Hinnant's algorithm).
        let yy = m <= 2 ? y - 1 : y
        let era = (yy >= 0 ? yy : yy - 399) / 400
        let yoe = yy - era * 400
        let mp = (m + 9) % 12
        let doy = (153 * mp + 2) / 5 + d - 1
        let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy
        return era * 146_097 + doe - 719_468
    }

    static let utcCalendar: Calendar = {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: "UTC")!
        return c
    }()
}
