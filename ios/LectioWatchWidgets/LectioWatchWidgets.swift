import LectioCore
import SwiftUI
import WidgetKit

/// Complications for the watch face: the cards left to review today, with
/// the countdown to the exam where there's room. They read the glance the
/// watch app writes to its app group (`WatchGlance`) each time its deck
/// changes. Tapping one opens the watch app.
@main
struct LectioWatchWidgetBundle: WidgetBundle {
    var body: some Widget {
        CardsComplication()
    }
}

nonisolated struct GlanceEntry: TimelineEntry {
    let date: Date
    let glance: WatchGlance?
}

nonisolated struct GlanceProvider: TimelineProvider {
    func placeholder(in context: Context) -> GlanceEntry {
        GlanceEntry(date: .now, glance: .placeholder)
    }

    func getSnapshot(in context: Context, completion: @escaping (GlanceEntry) -> Void) {
        completion(GlanceEntry(date: .now, glance: context.isPreview ? .placeholder : WatchGlance.load()))
    }

    /// Now, and again at midnight, when the count goes stale until the
    /// phone sends the new day's cards (the watch app reloads the timeline
    /// as soon as it does).
    func getTimeline(in context: Context, completion: @escaping (Timeline<GlanceEntry>) -> Void) {
        let glance = WatchGlance.load()
        let calendar = Calendar.current
        let midnight = calendar.date(byAdding: .day, value: 1, to: calendar.startOfDay(for: .now)) ?? .now.addingTimeInterval(86_400)
        completion(Timeline(entries: [GlanceEntry(date: .now, glance: glance), GlanceEntry(date: midnight, glance: glance)], policy: .atEnd))
    }
}

struct CardsComplication: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "LectioWatchCards", provider: GlanceProvider()) { entry in
            CardsComplicationView(entry: entry)
                .containerBackground(for: .widget) { Color.clear }
        }
        .configurationDisplayName("Lectio")
        .description("Cards left to review today.")
        .supportedFamilies([.accessoryCircular, .accessoryRectangular, .accessoryInline, .accessoryCorner])
    }
}

struct CardsComplicationView: View {
    @Environment(\.widgetFamily) private var family
    let entry: GlanceEntry

    /// Nil before any deck has arrived, or when it's only yesterday's.
    private var left: Int? {
        guard let glance = entry.glance, !glance.isStale(now: entry.date) else { return nil }
        return glance.cardsLeft
    }

    private var sentence: String {
        guard let left else { return "Open Lectio on your iPhone" }
        return left == 0 ? "All caught up" : "\(left) card\(left == 1 ? "" : "s") to review"
    }

    var body: some View {
        switch family {
        case .accessoryCircular:
            ZStack {
                AccessoryWidgetBackground()
                VStack(spacing: 0) {
                    Image(systemName: "rectangle.on.rectangle.angled")
                        .font(.caption2)
                    Text(left.map(String.init) ?? "–")
                        .font(.system(.title3, design: .serif).weight(.semibold))
                        .minimumScaleFactor(0.6)
                }
            }
            .widgetAccentable()
            .accessibilityLabel(sentence)
        case .accessoryCorner:
            Image(systemName: "rectangle.on.rectangle.angled")
                .font(.title3)
                .widgetAccentable()
                .widgetLabel { Text(left.map { "\($0) to review" } ?? "Lectio") }
                .accessibilityLabel(sentence)
        case .accessoryInline:
            Text(left.map { $0 == 0 ? "Lectio · all caught up" : "Lectio · \($0) cards" } ?? "Lectio")
        default:
            VStack(alignment: .leading, spacing: 1) {
                Text("Lectio")
                    .font(.headline)
                    .widgetAccentable()
                Text(sentence)
                    .font(.body)
                if let glance = entry.glance {
                    Text("\(glance.daysUntilExam(now: entry.date)) days to the exam")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}
