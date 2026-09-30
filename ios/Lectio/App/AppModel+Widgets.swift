import Foundation
import LectioCore
import UserNotifications
import WidgetKit

/// Keeps the widgets and the daily reminder in step with progress.
extension AppModel {
    /// Writes what the widgets need to the shared app group and asks WidgetKit
    /// to redraw. Cheap — a list of due dates and recent study days.
    func refreshWidgets() {
        let snapshot = WidgetSnapshot(
            examDate: content?.meta.examDate ?? "2027-05-14",
            dueDates: vocab.values.map(\.due),
            studyDays: Array(progress.studyDays.sorted().suffix(60)),
            goalMinutes: progress.studyPlan.minutesPerDay,
            studySeconds: studySecondsToday,
            studyDay: studyGoalDate,
            lines: upcomingLines,
            dailyDone: Array(progress.daily.keys.sorted().suffix(10)),
            nextLesson: nextCourseLesson.map {
                .init(id: $0.lesson.id, place: "\($0.level.title) \($0.unit.n).\($0.number)", title: RichText.plain($0.lesson.title))
            }
        )
        sendWatchDeck()
        guard snapshot != lastWidgetSnapshot else { return }
        lastWidgetSnapshot = snapshot
        snapshot.save()
        WidgetCenter.shared.reloadAllTimelines()
    }

    /// The Sententia for today and the next six days, for the widget.
    private var upcomingLines: [WidgetSnapshot.DayLine]? {
        guard let list = content?.sententiae, !list.isEmpty else { return nil }
        let today = dailyDay
        return (0..<7).compactMap { n in
            let day = Daily.shift(today, by: n)
            return Daily.sententia(for: day, in: list).map {
                .init(day: day, latin: $0.latin, english: $0.english, source: RichText.plain($0.source))
            }
        }
    }

    /* -------------------------------------------------------------- */
    /* The daily reminder                                               */
    /* -------------------------------------------------------------- */

    static let reminderId = "lectio.daily-reminder"

    var reminderEnabled: Bool {
        get { UserDefaults.standard.bool(forKey: "reminderEnabled") }
        set { UserDefaults.standard.set(newValue, forKey: "reminderEnabled") }
    }

    /// Minutes after midnight, local time. Defaults to 4pm, after school.
    var reminderMinutes: Int {
        get { UserDefaults.standard.object(forKey: "reminderMinutes") as? Int ?? 16 * 60 }
        set { UserDefaults.standard.set(newValue, forKey: "reminderMinutes") }
    }

    /// Asks for permission the first time, then (re)schedules the reminder.
    func setReminder(enabled: Bool) async -> Bool {
        if enabled {
            let granted = (try? await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound])) ?? false
            reminderEnabled = granted
            await rescheduleReminder()
            return granted
        }
        reminderEnabled = false
        await rescheduleReminder()
        return false
    }

    /// How many days of reminders are scheduled ahead. Each is its own
    /// notification so it can quote that day's Sententia; they're replaced
    /// every time the app goes to the background.
    static let reminderDays = 28

    /// Replaces the pending reminders with ones that know the numbers: cards
    /// due (as of now, so the count is exact for the first and a floor after)
    /// and that day's Sententia.
    func rescheduleReminder() async {
        let center = UNUserNotificationCenter.current()
        let ids = [Self.reminderId] + (0..<Self.reminderDays).map { "\(Self.reminderId).\($0)" }
        center.removePendingNotificationRequests(withIdentifiers: ids)
        guard reminderEnabled else { return }

        let calendar = Calendar.current
        let now = Date()
        let streak = Streaks.current(progress.studyDays)
        let lines = content?.sententiae ?? []
        for n in 0..<Self.reminderDays {
            guard let day = calendar.date(byAdding: .day, value: n, to: now) else { continue }
            var when = calendar.dateComponents([.year, .month, .day], from: day)
            when.hour = reminderMinutes / 60
            when.minute = reminderMinutes % 60
            guard let fire = calendar.date(from: when), fire > now else { continue }

            let dueBy = StudyDates.today(fire)
            let due = vocab.values.filter { $0.due <= dueBy }.count
            let line = Daily.sententia(for: Daily.localDay(fire, calendar: calendar), in: lines)
            let content = UNMutableNotificationContent()
            content.title = "Time for Latin"
            content.body = [
                line.map { "Today's line: \($0.latin)" },
                due > 0 ? "\(due) vocabulary card\(due == 1 ? "" : "s") due." : nil,
                n == 0 && streak > 0 ? "Keep your \(streak)-day streak going." : nil,
                line == nil && due == 0 ? "\(progress.studyPlan.minutesPerDay) minutes today keeps the plan on track." : nil,
            ].compactMap { $0 }.joined(separator: " ")
            content.sound = .default
            let request = UNNotificationRequest(identifier: "\(Self.reminderId).\(n)", content: content,
                                                trigger: UNCalendarNotificationTrigger(dateMatching: when, repeats: false))
            try? await center.add(request)
        }
    }
}
