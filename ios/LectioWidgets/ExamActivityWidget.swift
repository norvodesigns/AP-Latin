import ActivityKit
import LectioCore
import SwiftUI
import WidgetKit

/// A timed practice-exam section on the Lock Screen and in the Dynamic
/// Island. The countdown is drawn by the system from the section's end
/// time, so it stays right with the app in the background.
struct ExamActivityWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: ExamActivityAttributes.self) { context in
            ExamLockScreenView(state: context.state)
                .activityBackgroundTint(WidgetPalette.parchment)
                .activitySystemActionForegroundColor(WidgetPalette.rubric)
        } dynamicIsland: { context in
            let state = context.state
            return DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(state.section).font(.headline)
                        Text(state.detail).font(.caption).foregroundStyle(.secondary)
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(timerInterval: state.startedAt...state.endsAt, countsDown: true)
                        .font(.title2.monospacedDigit())
                        .multilineTextAlignment(.trailing)
                        .foregroundStyle(WidgetPalette.rubric)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text("\(state.done) of \(state.total) answered")
                        .font(.caption)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            } compactLeading: {
                Image(systemName: "timer").foregroundStyle(WidgetPalette.rubric)
            } compactTrailing: {
                Text(timerInterval: state.startedAt...state.endsAt, countsDown: true)
                    .monospacedDigit()
                    .frame(maxWidth: 52)
            } minimal: {
                Image(systemName: "timer").foregroundStyle(WidgetPalette.rubric)
            }
        }
    }
}

struct ExamLockScreenView: View {
    let state: ExamActivityAttributes.ContentState

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .firstTextBaseline) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Practice exam · \(state.section)")
                        .font(.system(.headline, design: .serif))
                        .foregroundStyle(WidgetPalette.ink)
                    Text("\(state.detail) · \(state.done) of \(state.total) answered")
                        .font(.caption)
                        .foregroundStyle(WidgetPalette.muted)
                }
                Spacer()
                Text(timerInterval: state.startedAt...state.endsAt, countsDown: true)
                    .font(.system(.title, design: .serif).monospacedDigit())
                    .multilineTextAlignment(.trailing)
                    .foregroundStyle(WidgetPalette.rubric)
            }
            ProgressView(timerInterval: state.startedAt...state.endsAt, countsDown: true) {
                EmptyView()
            } currentValueLabel: {
                EmptyView()
            }
            .tint(WidgetPalette.rubric)
        }
        .padding(16)
    }
}
