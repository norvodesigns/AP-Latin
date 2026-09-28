import LectioCore
import SwiftUI

@main
struct LectioApp: App {
    @State private var model = AppModel()
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(model)
                .preferredColorScheme(model.appearance.colorScheme)
                .task { await model.loadContent() }
        }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active { model.sceneBecameActive() } else { model.sceneResignedActive() }
        }
        .commands {
            // The website's `g`-then-letter jumps, as ⌘-number on an iPad keyboard.
            CommandMenu("Go") {
                Button("Today") { model.selectedTab = .today }.keyboardShortcut("1")
                Button("Reading Room") { model.selectedTab = .read }.keyboardShortcut("2")
                Button("Vocabulary") { model.selectedTab = .vocab }.keyboardShortcut("3")
                Button("Quiz Engine") { model.selectedTab = .quiz }.keyboardShortcut("4")
                Button("Translate") { model.selectedTab = .translate }.keyboardShortcut("5")
                Button("Scansion Lab") { model.selectedTab = .scansion }.keyboardShortcut("6")
                Button("Grammar & Syntax") { model.selectedTab = .grammar }.keyboardShortcut("7")
                Button("FRQ Workshop") { model.selectedTab = .frq }.keyboardShortcut("8")
                Button("Practice Exam") { model.selectedTab = .exam }.keyboardShortcut("9")
                Divider()
                Button("Search") { model.selectedTab = .search }.keyboardShortcut("f")
                Button("Settings") { model.selectedTab = .settings }.keyboardShortcut(",")
            }
        }
    }
}
