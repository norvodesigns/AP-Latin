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
            studyDay: studyGoalDate
        )
        sendWatchDeck()
        guard snapshot != lastWidgetSnapshot else { return }
        lastWidgetSnapshot = snapshot
        snapshot.save()
        WidgetCenter.shared.reloadAllTimelines()
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

    /// Replaces the pending reminder with one that knows today's numbers.
    /// Called on leaving the app, so the next reminder says how many cards are
    /// actually waiting.
    func rescheduleReminder() async {
        let center = UNUserNotificationCenter.current()
        center.removePendingNotificationRequests(withIdentifiers: [Self.reminderId])
        guard reminderEnabled else { return }

        let tomorrow = StudyDates.today(Date().addingTimeInterval(86_400))
        let due = vocab.values.filter { $0.due <= tomorrow }.count
        let streak = Streaks.current(progress.studyDays)
        let content = UNMutableNotificationContent()
        content.title = "Time for Latin"
        content.body = [
            due > 0 ? "\(due) vocabulary card\(due == 1 ? "" : "s") due." : nil,
            streak > 0 ? "Keep your \(streak)-day streak going." : "\(progress.studyPlan.minutesPerDay) minutes today keeps the plan on track.",
        ].compactMap { $0 }.joined(separator: " ")
        content.sound = .default

        var when = DateComponents()
        when.hour = reminderMinutes / 60
        when.minute = reminderMinutes % 60
        let request = UNNotificationRequest(identifier: Self.reminderId, content: content,
                                            trigger: UNCalendarNotificationTrigger(dateMatching: when, repeats: true))
        try? await center.add(request)
    }
}
