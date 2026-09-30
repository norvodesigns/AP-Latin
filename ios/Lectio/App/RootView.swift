import LectioCore
import SwiftUI
import UIKit

/// Every section of the app — the web's NAV (src/lib/nav.ts), plus search.
nonisolated enum AppTab: String, Hashable, Sendable {
    case today, learn, read, vocab, quiz
    case translate, sight, scansion, forge
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
/// every day, plus search; the tab bar shrinks away while reading. The other
/// sections open as pages pushed onto Today, from its "Everything" list or
/// from anywhere that selects them. On iPad `.sidebarAdaptable` turns the
/// tabs into a glass sidebar holding every section, grouped as the website's
/// sidebar groups them.
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
                // The first run: where the student is starting, and a goal.
                .fullScreenCover(isPresented: Binding(get: { model.showOnboarding }, set: { model.showOnboarding = $0 })) {
                    OnboardingView()
                        .environment(\.library, library)
                }
                .environment(\.library, library)
                // A course lesson opens over everything, from wherever it was started.
                .fullScreenCover(item: Binding(get: { model.activeLesson }, set: { model.activeLesson = $0 })) { place in
                    LessonView(place: place)
                        .environment(\.library, library)
                        .id(place.id)
                }
                .onOpenURL { url in
                    // lectio://vocab, lectio://read, … (the widget), and
                    // lectio://read/<passage-id> to open a passage.
                    open(host: url.host(), path: url.lastPathComponent, in: library)
                }
                .onAppear {
                    // `-startTab read/aen-1-1-33` on launch — how CI takes
                    // its screenshots without a URL prompt in the way.
                    if let start = UserDefaults.standard.string(forKey: "startTab") {
                        let parts = start.split(separator: "/", maxSplits: 1).map(String.init)
                        open(host: parts.first, path: parts.count > 1 ? parts[1] : "", in: library)
                    }
                }
        }
    }

    private func open(host: String?, path: String, in library: ContentLibrary) {
        guard let tab = AppTab(host: host) else { return }
        model.selectedTab = tab
        if tab == .read, path != "/", !path.isEmpty, let passage = library.passage(path) {
            model.readPath = [passage]
        }
        // lectio://learn/<lesson-id> opens that lesson.
        if tab == .learn, path != "/", !path.isEmpty {
            model.openLesson(path)
        }
    }
}

/// iPhone (and an iPad window narrow enough to be compact) gets a tab bar of
/// the four daily places plus search; everything else opens from Today.
/// A full-width iPad gets the sidebar holding every section.
private struct Tabs: View {
    @Environment(\.horizontalSizeClass) private var sizeClass

    var body: some View {
        if sizeClass == .compact || UIDevice.current.userInterfaceIdiom == .phone {
            PhoneTabs()
        } else {
            SidebarTabs()
        }
    }
}

private struct PhoneTabs: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        // A section outside the tab bar shows as a page pushed onto Today.
        let tabs = model.phoneTabs
        let selection = Binding<AppTab>(
            get: { tabs.contains(model.selectedTab) ? model.selectedTab : .today },
            set: { model.selectedTab = $0 }
        )
        TabView(selection: selection) {
            Tab("Today", systemImage: "sun.horizon", value: AppTab.today) { TodayView() }
            // A beginner's second tab is the course; an AP student's, the quiz.
            if model.courseInTabBar {
                Tab("Course", systemImage: "graduationcap", value: AppTab.learn) { CourseView() }
            } else {
                Tab("Quiz", systemImage: "checklist", value: AppTab.quiz) { QuizView() }
            }
            Tab("Read", systemImage: "book.closed", value: AppTab.read) { ReadIndexView() }
            Tab("Vocab", systemImage: "rectangle.on.rectangle.angled", value: AppTab.vocab) { VocabView() }
            Tab(value: AppTab.search, role: .search) { SearchView() }
        }
        .tabBarMinimizeBehavior(.onScrollDown)
        .tabViewBottomAccessory { DueAccessory() }
        .overlay(alignment: .top) {
            if model.goalJustReached { GoalToast() }
        }
        .animation(.spring(duration: 0.5), value: model.goalJustReached)
        .onChange(of: model.selectedTab, initial: true) { old, new in
            if !tabs.contains(new) {
                model.todayPath = NavigationPath([new])
            } else if !tabs.contains(old) {
                model.todayPath = NavigationPath()
            }
        }
        .onChange(of: model.todayPath.count) { _, count in
            // Back from a pushed section is back to Today.
            if count == 0, !model.phoneTabs.contains(model.selectedTab) { model.selectedTab = .today }
        }
    }
}

/// A section by its tab, for pushing onto Today's stack.
struct PushedSection: View {
    let tab: AppTab

    var body: some View {
        Group {
            switch tab {
            case .translate: TranslateView()
            case .sight: SightReadingView()
            case .scansion: ScansionLabView()
            case .forge: ForgeView()
            case .grammar: GrammarView()
            case .devices: DevicesView()
            case .context: ContextView()
            case .frq: FrqWorkshopView()
            case .exam: PracticeExamView()
            case .plan: StudyPlanView()
            case .classroom: ClassroomView()
            case .settings: SettingsView()
            case .learn: CourseView()
            case .quiz: QuizView()
            case .today, .read, .vocab, .search: EmptyView()
            }
        }
        .environment(\.isPushedSection, true)
        // A pushed page takes an inline title, like the Reader. (A large one
        // was drawn over the top of a pushed scroll view's content.)
        .navigationBarTitleDisplayMode(.inline)
    }
}

private struct SidebarTabs: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        @Bindable var model = model
        TabView(selection: $model.selectedTab) {
            Tab("Today", systemImage: "sun.horizon", value: AppTab.today) { TodayView() }
            Tab("Course", systemImage: "graduationcap", value: AppTab.learn) { CourseView() }
            Tab("Read", systemImage: "book.closed", value: AppTab.read) { ReadIndexView() }
            Tab("Vocab", systemImage: "rectangle.on.rectangle.angled", value: AppTab.vocab) { VocabView() }
            Tab("Quiz", systemImage: "checklist", value: AppTab.quiz) { QuizView() }

            TabSection("Drill") {
                Tab("Translate", systemImage: "character.book.closed", value: AppTab.translate) { TranslateView() }
                Tab("Sight Reading", systemImage: "eye", value: AppTab.sight) { SightReadingView() }
                Tab("Scansion", systemImage: "waveform.path", value: AppTab.scansion) { ScansionLabView() }
                Tab("Forms Forge", systemImage: "hammer", value: AppTab.forge) { ForgeView() }
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

            // A tab view's builder takes at most ten children, so these two
            // share a section.
            TabSection("You") {
                Tab("Classroom", systemImage: "person.3", value: AppTab.classroom) { ClassroomView() }
                Tab("Settings", systemImage: "gearshape", value: AppTab.settings) { SettingsView() }
            }
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
        // The sidebar shows every section itself; nothing is pushed on Today.
        .onAppear { model.todayPath = NavigationPath() }
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
