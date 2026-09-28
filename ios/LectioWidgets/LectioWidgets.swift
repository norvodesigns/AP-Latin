import LectioCore
import SwiftUI
import WidgetKit

/// Home Screen and Lock Screen widgets: days to the exam, cards due, the
/// streak, and today's study time. They read the snapshot the app writes to
/// the shared app group (`WidgetSnapshot`), and count due cards and the
/// streak for the moment they're shown, so they stay right overnight.
@main
struct LectioWidgetBundle: WidgetBundle {
    var body: some Widget {
        TodayWidget()
    }
}

nonisolated struct TodayEntry: TimelineEntry {
    let date: Date
    let snapshot: WidgetSnapshot
}

nonisolated struct TodayProvider: TimelineProvider {
    func placeholder(in context: Context) -> TodayEntry {
        TodayEntry(date: .now, snapshot: .placeholder)
    }

    func getSnapshot(in context: Context, completion: @escaping (TodayEntry) -> Void) {
        completion(TodayEntry(date: .now, snapshot: WidgetSnapshot.load() ?? .placeholder))
    }

    /// One entry now and one at each of the next few midnights, when the
    /// countdown, due cards and streak roll over.
    func getTimeline(in context: Context, completion: @escaping (Timeline<TodayEntry>) -> Void) {
        let snapshot = WidgetSnapshot.load() ?? .placeholder
        let calendar = Calendar.current
        var entries = [TodayEntry(date: .now, snapshot: snapshot)]
        var day = calendar.startOfDay(for: .now)
        for _ in 0..<3 {
            day = calendar.date(byAdding: .day, value: 1, to: day) ?? day.addingTimeInterval(86_400)
            entries.append(TodayEntry(date: day, snapshot: snapshot))
        }
        completion(Timeline(entries: entries, policy: .atEnd))
    }
}

struct TodayWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "LectioToday", provider: TodayProvider()) { entry in
            TodayWidgetView(entry: entry)
                .containerBackground(for: .widget) { WidgetPalette.parchment }
                .widgetURL(URL(string: "lectio://vocab"))
        }
        .configurationDisplayName("Lectio")
        .description("Days to the exam, cards due, and your streak.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryCircular, .accessoryRectangular, .accessoryInline])
    }
}

/// The app's parchment and rubric, restated for the widget process.
enum WidgetPalette {
    static let parchment = Color(light: (0xF6, 0xF1, 0xE6), dark: (0x17, 0x14, 0x0F))
    static let ink = Color(light: (0x22, 0x1F, 0x1A), dark: (0xEF, 0xE7, 0xD5))
    static let muted = Color(light: (0x6D, 0x64, 0x55), dark: (0xA2, 0x96, 0x7F))
    static let rubric = Color(light: (0x9D, 0x2F, 0x24), dark: (0xE0, 0x79, 0x6A))
}

extension Color {
    /// Nonisolated so the provider closure can run on whatever thread
    /// UIKit resolves colours on.
    nonisolated init(light: (Int, Int, Int), dark: (Int, Int, Int)) {
        self.init(uiColor: UIColor { traits in
            let c = traits.userInterfaceStyle == .dark ? dark : light
            return UIColor(red: CGFloat(c.0) / 255, green: CGFloat(c.1) / 255, blue: CGFloat(c.2) / 255, alpha: 1)
        })
    }
}

struct TodayWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: TodayEntry

    var body: some View {
        let s = entry.snapshot
        let days = s.daysUntilExam(on: entry.date)
        let due = s.cardsDue(on: entry.date)
        let streak = s.streak(on: entry.date)
        switch family {
        case .accessoryCircular:
            Gauge(value: Double(min(due, 100)), in: 0...100) {
                Image(systemName: "rectangle.on.rectangle.angled")
            } currentValueLabel: {
                Text("\(due)")
            }
            .gaugeStyle(.accessoryCircularCapacity)
            .accessibilityLabel("\(due) cards due")
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 1) {
                Text("\(days) days to AP Latin").font(.headline).widgetAccentable()
                Text("\(due) cards due · \(streak)-day streak").font(.caption)
            }
        case .accessoryInline:
            Text("\(days) days · \(due) cards due")
        case .systemMedium:
            HStack(alignment: .top, spacing: 18) {
                countdown(days)
                Spacer(minLength: 0)
                VStack(alignment: .leading, spacing: 10) {
                    stat("\(due)", due == 1 ? "card due" : "cards due")
                    stat("\(streak)", "day streak")
                    stat("\(s.minutesToday(on: entry.date))/\(s.goalMinutes)", "min today")
                }
            }
        default:
            VStack(alignment: .leading, spacing: 8) {
                countdown(days)
                Spacer(minLength: 0)
                Text("\(due) cards due").font(.subheadline.weight(.semibold)).foregroundStyle(WidgetPalette.ink)
                Text("\(streak)-day streak").font(.caption).foregroundStyle(WidgetPalette.muted)
            }
        }
    }

    private func countdown(_ days: Int) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("\(days)")
                .font(.system(size: 44, weight: .semibold, design: .serif))
                .foregroundStyle(WidgetPalette.rubric)
                .minimumScaleFactor(0.6)
                .contentTransition(.numericText())
            Text(days == 1 ? "DAY TO THE EXAM" : "DAYS TO THE EXAM")
                .font(.system(size: 9, weight: .semibold)).tracking(1.1)
                .foregroundStyle(WidgetPalette.muted)
        }
    }

    private func stat(_ value: String, _ label: String) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(value).font(.system(.title3, design: .serif).weight(.semibold)).foregroundStyle(WidgetPalette.ink).monospacedDigit()
            Text(label.uppercased()).font(.system(size: 8, weight: .semibold)).tracking(1).foregroundStyle(WidgetPalette.muted)
        }
    }
}
