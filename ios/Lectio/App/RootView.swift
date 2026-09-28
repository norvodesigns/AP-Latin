import LectioCore
import SwiftUI

/// Every section of the app — the web's NAV (src/lib/nav.ts), plus search.
nonisolated enum AppTab: Hashable, Sendable {
    case today, read, vocab, quiz
    case translate, sight, scansion
    case grammar, devices, context
    case frq, exam, plan
    case settings, search
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
            Tab("Quiz", systemImage: "checklist", value: AppTab.quiz) {
                ComingSoonView(title: "Quiz Engine", systemImage: "checklist", webPath: "quiz",
                               blurb: "AP-style multiple choice, filtered by author, passage, unit, skill or question type, with a review queue for anything you miss.")
            }

            TabSection("Drill") {
                Tab("Translate", systemImage: "character.book.closed", value: AppTab.translate) {
                    ComingSoonView(title: "Translate", systemImage: "character.book.closed", webPath: "translate",
                                   blurb: "Literal-translation drills in the exam's own 15-segment shape, with self- and AI-grading.")
                }
                Tab("Sight Reading", systemImage: "eye", value: AppTab.sight) {
                    ComingSoonView(title: "Sight Reading", systemImage: "eye", webPath: "sight",
                                   blurb: "Timed unseen prose and poetry from the authors the exam draws on.")
                }
                Tab("Scansion", systemImage: "waveform.path", value: AppTab.scansion) {
                    ComingSoonView(title: "Scansion Lab", systemImage: "waveform.path", webPath: "scansion",
                                   blurb: "Mark quantities, elisions, feet and caesurae across the whole Aeneid.")
                }
            }
            .defaultVisibility(.hidden, for: .tabBar)

            TabSection("Reference") {
                Tab("Grammar", systemImage: "text.book.closed", value: AppTab.grammar) { GrammarView() }
                Tab("Devices", systemImage: "wand.and.stars", value: AppTab.devices) {
                    ComingSoonView(title: "Literary Devices", systemImage: "wand.and.stars", webPath: "devices",
                                   blurb: "Style reference cards and a spot-the-device drill.")
                }
                Tab("Context", systemImage: "building.columns", value: AppTab.context) {
                    ComingSoonView(title: "Context & Culture", systemImage: "building.columns", webPath: "context",
                                   blurb: "Vergil, Augustan Rome, Pliny's world, Vesuvius, and the Roman background the syllabus assumes.")
                }
            }
            .defaultVisibility(.hidden, for: .tabBar)

            TabSection("Exam") {
                Tab("FRQ Workshop", systemImage: "pencil.and.list.clipboard", value: AppTab.frq) {
                    ComingSoonView(title: "FRQ Workshop", systemImage: "pencil.and.list.clipboard", webPath: "frq",
                                   blurb: "All five free-response types, timed, with the official rubrics.")
                }
                Tab("Practice Exam", systemImage: "timer", value: AppTab.exam) {
                    ComingSoonView(title: "Practice Exam", systemImage: "timer", webPath: "exam",
                                   blurb: "The full exam: 52 multiple-choice questions in 65 minutes, then five free responses.")
                }
                Tab("Study Plan", systemImage: "calendar", value: AppTab.plan) {
                    ComingSoonView(title: "Study Plan", systemImage: "calendar", webPath: "plan",
                                   blurb: "A schedule measured backwards from exam day.")
                }
            }
            .defaultVisibility(.hidden, for: .tabBar)

            Tab("Settings", systemImage: "gearshape", value: AppTab.settings) { SettingsView() }
                .defaultVisibility(.hidden, for: .tabBar)

            Tab(value: AppTab.search, role: .search) { SearchView() }
        }
        .tabViewStyle(.sidebarAdaptable)
        .tabBarMinimizeBehavior(.onScrollDown)
        .tabViewBottomAccessory { DueAccessory() }
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
