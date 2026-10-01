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
                // Siri and the Shortcuts app (Shortcuts.swift) leave a route here.
                .onChange(of: ShortcutRouter.shared.pending, initial: true) { _, route in
                    guard let route else { return }
                    ShortcutRouter.shared.pending = nil
                    let parts = route.split(separator: "/", maxSplits: 1).map(String.init)
                    open(host: parts.first, path: parts.count > 1 ? parts[1] : "", in: library)
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
        // lectio://learn/<lesson-id> opens that lesson; learn/daily the
        // Sententia of the day, learn/review a review, learn/next the next
        // lesson of the course.
        if tab == .learn, path != "/", !path.isEmpty {
            switch path {
            case "daily": model.openDaily()
            case "review": model.openReview()
            case "sentences": model.openSentences()
            case "derivatives": model.openDerivatives()
            case "next": if let next = model.nextCourseLesson { model.openLesson(next.lesson.id) }
            default: model.openLesson(path)
            }
        }
    }
}

/// iPhone (and an iPad window narrow enough to be compact) gets a tab bar of
/// the four daily places plus search; everything else opens from Today.
/// A full-width iPad gets the sidebar holding every section.
private struct Tabs: View {
    @Environment(\.horizontalSizeClass) private var sizeClass

    var body: some View {
        let compact = sizeClass == .compact || UIDevice.current.userInterfaceIdiom == .phone
        // iOS 18 introduced the Tab API and the adaptable sidebar; before it
        // (and for `-legacyChrome YES`) the classic tab bar and a split view.
        if LectioChrome.forceLegacy {
            classic(compact: compact)
        } else if #available(iOS 18.0, *) {
            if compact { PhoneTabs() } else { SidebarTabs() }
        } else {
            classic(compact: compact)
        }
    }

    @ViewBuilder
    private func classic(compact: Bool) -> some View {
        if compact { ClassicPhoneTabs() } else { ClassicSidebar() }
    }
}

/// What every phone tab bar does, whichever API draws it: a section outside
/// the tab bar is a page pushed onto Today, the goal toast floats on top.
private struct PhoneRouting: ViewModifier {
    @Environment(AppModel.self) private var model

    func body(content: Content) -> some View {
        let tabs = model.phoneTabs
        content
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

/// iOS 26's minimising tab bar and the due-cards pill above it. Earlier
/// systems have neither, so the Vocab tab carries a badge instead.
@available(iOS 18.0, *)
private struct GlassTabChrome: ViewModifier {
    func body(content: Content) -> some View {
        if LectioChrome.forceLegacy {
            content
        } else if #available(iOS 26.0, *) {
            content
                .tabBarMinimizeBehavior(.onScrollDown)
                .tabViewBottomAccessory { DueAccessory() }
        } else {
            content
        }
    }
}

/// Cards due, for a badge on the Vocab tab where there's no accessory pill.
private func dueCount(_ model: AppModel) -> Int {
    LectioChrome.usesGlass ? 0 : SpacedRepetition.due(model.vocab.values, on: StudyDates.today()).count
}

@available(iOS 18.0, *)
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
                .badge(dueCount(model))
            Tab(value: AppTab.search, role: .search) { SearchView() }
        }
        .modifier(GlassTabChrome())
        .modifier(PhoneRouting())
    }
}

/// The iPhone tab bar before iOS 18's Tab API (and for `-legacyChrome YES`):
/// the same five places, drawn with `tabItem`.
private struct ClassicPhoneTabs: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        let tabs = model.phoneTabs
        let selection = Binding<AppTab>(
            get: { tabs.contains(model.selectedTab) ? model.selectedTab : .today },
            set: { model.selectedTab = $0 }
        )
        TabView(selection: selection) {
            TodayView()
                .tabItem { Label("Today", systemImage: "sun.horizon") }
                .tag(AppTab.today)
            if model.courseInTabBar {
                CourseView()
                    .tabItem { Label("Course", systemImage: "graduationcap") }
                    .tag(AppTab.learn)
            } else {
                QuizView()
                    .tabItem { Label("Quiz", systemImage: "checklist") }
                    .tag(AppTab.quiz)
            }
            ReadIndexView()
                .tabItem { Label("Read", systemImage: "book.closed") }
                .tag(AppTab.read)
            VocabView()
                .tabItem { Label("Vocab", systemImage: "rectangle.on.rectangle.angled") }
                .tag(AppTab.vocab)
                .badge(dueCount(model))
            SearchView()
                .tabItem { Label("Search", systemImage: "magnifyingglass") }
                .tag(AppTab.search)
        }
        .modifier(PhoneRouting())
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

@available(iOS 18.0, *)
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
        .modifier(GlassTabChrome())
        .overlay(alignment: .top) {
            if model.goalJustReached { GoalToast() }
        }
        .animation(.spring(duration: 0.5), value: model.goalJustReached)
        // The sidebar shows every section itself; nothing is pushed on Today.
        .onAppear { model.todayPath = NavigationPath() }
    }
}

/// The iPad sidebar before iOS 18 has no adaptable tab view: a split view
/// with a list of every section, grouped as the website's sidebar groups
/// them, and the section on the right.
private struct ClassicSidebar: View {
    @Environment(AppModel.self) private var model

    private struct Row: Identifiable {
        let tab: AppTab
        let title: String
        let systemImage: String
        var id: AppTab { tab }
    }

    private static let groups: [(title: String?, rows: [Row])] = [
        (nil, [
            Row(tab: .today, title: "Today", systemImage: "sun.horizon"),
            Row(tab: .learn, title: "Course", systemImage: "graduationcap"),
            Row(tab: .read, title: "Read", systemImage: "book.closed"),
            Row(tab: .vocab, title: "Vocab", systemImage: "rectangle.on.rectangle.angled"),
            Row(tab: .quiz, title: "Quiz", systemImage: "checklist"),
        ]),
        ("Drill", [
            Row(tab: .translate, title: "Translate", systemImage: "character.book.closed"),
            Row(tab: .sight, title: "Sight Reading", systemImage: "eye"),
            Row(tab: .scansion, title: "Scansion", systemImage: "waveform.path"),
            Row(tab: .forge, title: "Forms Forge", systemImage: "hammer"),
        ]),
        ("Reference", [
            Row(tab: .grammar, title: "Grammar", systemImage: "text.book.closed"),
            Row(tab: .devices, title: "Devices", systemImage: "wand.and.stars"),
            Row(tab: .context, title: "Context", systemImage: "building.columns"),
        ]),
        ("Exam", [
            Row(tab: .frq, title: "FRQ Workshop", systemImage: "pencil.and.list.clipboard"),
            Row(tab: .exam, title: "Practice Exam", systemImage: "timer"),
            Row(tab: .plan, title: "Study Plan", systemImage: "calendar"),
        ]),
        ("You", [
            Row(tab: .classroom, title: "Classroom", systemImage: "person.3"),
            Row(tab: .settings, title: "Settings", systemImage: "gearshape"),
            Row(tab: .search, title: "Search", systemImage: "magnifyingglass"),
        ]),
    ]

    var body: some View {
        let selection = Binding<AppTab?>(
            get: { model.selectedTab },
            set: { if let tab = $0 { model.selectedTab = tab } }
        )
        NavigationSplitView {
            List(selection: selection) {
                ForEach(Array(Self.groups.enumerated()), id: \.offset) { _, group in
                    if let title = group.title {
                        Section(title) { rows(group.rows) }
                    } else {
                        Section { rows(group.rows) }
                    }
                }
            }
            .navigationTitle("Lectio")
        } detail: {
            detail
        }
        .overlay(alignment: .top) {
            if model.goalJustReached { GoalToast() }
        }
        .animation(.spring(duration: 0.5), value: model.goalJustReached)
        // The sidebar shows every section itself; nothing is pushed on Today.
        .onAppear { model.todayPath = NavigationPath() }
    }

    @ViewBuilder
    private func rows(_ rows: [Row]) -> some View {
        ForEach(rows) { row in
            Label(row.title, systemImage: row.systemImage)
                .badge(row.tab == .vocab ? dueCount(model) : 0)
                .tag(row.tab)
        }
    }

    @ViewBuilder
    private var detail: some View {
        switch model.selectedTab {
        case .today: TodayView()
        case .learn: CourseView()
        case .read: ReadIndexView()
        case .vocab: VocabView()
        case .quiz: QuizView()
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
        case .search: SearchView()
        }
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
            .lectioGlass(in: .capsule)
            .padding(.top, 8)
            .transition(.move(edge: .top).combined(with: .opacity))
            .sensoryFeedback(.success, trigger: model.goalJustReached)
            .onTapGesture { model.goalJustReached = false }
            .accessibilityAddTraits(.isButton)
            .accessibilityHint("Dismisses this message")
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
