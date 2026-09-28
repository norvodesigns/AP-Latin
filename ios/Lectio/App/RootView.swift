import LectioCore
import SwiftUI

/// Every section of the app — the web's NAV (src/lib/nav.ts), plus search.
nonisolated enum AppTab: String, Hashable, Sendable {
    case today, read, vocab, quiz
    case translate, sight, scansion
    case grammar, devices, context
    case frq, exam, plan
    case classroom, settings, search

    /// A deep link's host — lectio://vocab opens Vocabulary.
    init?(host: String?) {
        guard let host else { return nil }
        self.init(rawValue: host)
    }
}

/// The app's frame.
///
/// On iPhone it's a Liquid Glass tab bar with the four places a student goes
/// every day, plus search; the tab bar shrinks away while reading. On iPad
/// `.sidebarAdaptable` turns the same tabs into a glass sidebar holding every
/// section, grouped as the website's sidebar groups them. Sections not in the
/// iPhone tab bar are reachable from Today.
struct RootView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        switch model.contentState {
        case .loading:
            LaunchView()
        case .failed(let message):
            ContentUnavailableView("Couldn't open the course", systemImage: "exclamationmark.triangle", description: Text(message))
                .pageBackground()
        case .ready(let library):
            Tabs()
                .environment(\.library, library)
                .onOpenURL { url in
                    // lectio://vocab, lectio://read, … (the widget), and
                    // lectio://read/<passage-id> to open a passage.
                    guard let tab = AppTab(host: url.host()) else { return }
                    model.selectedTab = tab
                    let id = url.lastPathComponent
                    if tab == .read, id != "/", !id.isEmpty, let passage = library.passage(id) {
                        model.readPath = [passage]
                    }
                }
        }
    }
}

private struct Tabs: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        @Bindable var model = model
        TabView(selection: $model.selectedTab) {
            Tab("Today", systemImage: "sun.horizon", value: AppTab.today) { TodayView() }
            Tab("Read", systemImage: "book.closed", value: AppTab.read) { ReadIndexView() }
            Tab("Vocab", systemImage: "rectangle.on.rectangle.angled", value: AppTab.vocab) { VocabView() }
            Tab("Quiz", systemImage: "checklist", value: AppTab.quiz) { QuizView() }

            TabSection("Drill") {
                Tab("Translate", systemImage: "character.book.closed", value: AppTab.translate) { TranslateView() }
                Tab("Sight Reading", systemImage: "eye", value: AppTab.sight) { SightReadingView() }
                Tab("Scansion", systemImage: "waveform.path", value: AppTab.scansion) { ScansionLabView() }
            }
            .defaultVisibility(.hidden, for: .tabBar)

            TabSection("Reference") {
                Tab("Grammar", systemImage: "text.book.closed", value: AppTab.grammar) { GrammarView() }
                Tab("Devices", systemImage: "wand.and.stars", value: AppTab.devices) { DevicesView() }
                Tab("Context", systemImage: "building.columns", value: AppTab.context) { ContextView() }
            }
            .defaultVisibility(.hidden, for: .tabBar)

            TabSection("Exam") {
                Tab("FRQ Workshop", systemImage: "pencil.and.list.clipboard", value: AppTab.frq) { FrqWorkshopView() }
                Tab("Practice Exam", systemImage: "timer", value: AppTab.exam) { PracticeExamView() }
                Tab("Study Plan", systemImage: "calendar", value: AppTab.plan) { StudyPlanView() }
            }
            .defaultVisibility(.hidden, for: .tabBar)

            Tab("Classroom", systemImage: "person.3", value: AppTab.classroom) { ClassroomView() }
                .defaultVisibility(.hidden, for: .tabBar)

            Tab("Settings", systemImage: "gearshape", value: AppTab.settings) { SettingsView() }
                .defaultVisibility(.hidden, for: .tabBar)

            Tab(value: AppTab.search, role: .search) { SearchView() }
        }
        .tabViewStyle(.sidebarAdaptable)
        .tabBarMinimizeBehavior(.onScrollDown)
        .tabViewBottomAccessory { DueAccessory() }
        .overlay(alignment: .top) {
            if model.goalJustReached { GoalToast() }
        }
        .animation(.spring(duration: 0.5), value: model.goalJustReached)
    }
}

/// The web's DailyGoalToast: a glass capsule the moment today's study-time
/// goal is first reached, gone again on its own.
private struct GoalToast: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        Label("Today's \(model.progress.studyPlan.minutesPerDay)-minute goal reached", systemImage: "laurel.leading")
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(Palette.rubric)
            .padding(.horizontal, 18)
            .padding(.vertical, 12)
            .glassEffect(.regular, in: .capsule)
            .padding(.top, 8)
            .transition(.move(edge: .top).combined(with: .opacity))
            .sensoryFeedback(.success, trigger: model.goalJustReached)
            .onTapGesture { model.goalJustReached = false }
            .task {
                try? await Task.sleep(for: .seconds(5))
                model.goalJustReached = false
            }
    }
}

/// The glass pill above the tab bar: what's waiting today, one tap from Vocab.
private struct DueAccessory: View {
    @Environment(AppModel.self) private var model
    @Environment(\.library) private var library

    var body: some View {
        let due = SpacedRepetition.due(model.vocab.values, on: StudyDates.today()).count
        let streak = Streaks.current(model.progress.studyDays)
        Button {
            model.selectedTab = .vocab
        } label: {
            HStack(spacing: 14) {
                Label(due == 0 ? "No cards due" : "\(due) card\(due == 1 ? "" : "s") due", systemImage: "rectangle.on.rectangle.angled")
                Spacer(minLength: 0)
                Label("\(streak)", systemImage: "flame")
                    .foregroundStyle(streak > 0 ? Palette.rubric : Palette.inkMuted)
                    .accessibilityLabel("\(streak)-day streak")
            }
            .font(.subheadline.weight(.medium))
            .padding(.horizontal, 16)
        }
        .buttonStyle(.plain)
    }
}

/// Shown for the moment the content bundle takes to decode.
private struct LaunchView: View {
    var body: some View {
        VStack(spacing: 8) {
            Text("Lectio").font(.wordmark(72)).foregroundStyle(Palette.rubric)
            ProgressView().tint(Palette.inkMuted)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Palette.parchment.ignoresSafeArea())
    }
}

/* ------------------------------------------------------------------ */
/* Environment                                                         */
/* ------------------------------------------------------------------ */

extension EnvironmentValues {
    /// The loaded course content. Only read below `RootView`, which provides
    /// it once loading finishes.
    @Entry var library: ContentLibrary? = nil
}
