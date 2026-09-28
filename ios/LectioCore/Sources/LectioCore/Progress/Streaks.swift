import Foundation

/// Streak and countdown maths — ports of `currentStreak`, `longestStreak` and
/// `daysUntilExam` from src/store/useStore.ts.
public enum Streaks {
    /// Current consecutive-day study streak, counting today or yesterday as live.
    public static func current(_ studyDays: [String], now: Date = Date(), calendar: Calendar = .current) -> Int {
        guard !studyDays.isEmpty else { return 0 }
        let days = Set(studyDays)
        var d = now
        if !days.contains(StudyDates.isoDay(d)) {
            d = StudyDates.adding(days: -1, to: d, calendar: calendar)
            if !days.contains(StudyDates.isoDay(d)) { return 0 }
        }
        var n = 0
        while days.contains(StudyDates.isoDay(d)) {
            n += 1
            d = StudyDates.adding(days: -1, to: d, calendar: calendar)
        }
        return n
    }

    /// The longest unbroken run anywhere in the history.
    public static func longest(_ studyDays: [String]) -> Int {
        let sorted = Set(studyDays).compactMap(StudyDates.dayNumber).sorted()
        guard !sorted.isEmpty else { return 0 }
        var best = 1
        var run = 1
        for i in sorted.indices.dropFirst() {
            run = sorted[i] - sorted[i - 1] == 1 ? run + 1 : 1
            best = max(best, run)
        }
        return best
    }

    /// Whole days from the start of `from`'s local day to the exam's local
    /// midnight, never negative.
    public static func daysUntilExam(_ examDate: String, from: Date = Date(), calendar: Calendar = .current) -> Int {
        let parts = examDate.split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3,
              let exam = calendar.date(from: DateComponents(year: parts[0], month: parts[1], day: parts[2]))
        else { return 0 }
        let start = calendar.startOfDay(for: from)
        return max(0, calendar.dateComponents([.day], from: start, to: exam).day ?? 0)
    }
}
