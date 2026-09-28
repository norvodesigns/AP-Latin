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
    }
}
