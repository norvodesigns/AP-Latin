import Foundation
import LectioCore
import Observation
import SwiftUI

/// The app's single source of state: the content library and the student's
/// progress document, plus a few device-only preferences.
///
/// Progress is written to Application Support after every edit (debounced),
/// the way the web app writes localStorage — local first, always, so nothing
/// waits on a network. Cloud sync layers on top of this in the next phase.
@Observable
final class AppModel {
    enum ContentState {
        case loading
        case ready(ContentLibrary)
        case failed(String)
    }

    nonisolated enum Appearance: String, CaseIterable, Identifiable, Sendable {
        case system, light, dark
        var id: String { rawValue }
        var label: String { rawValue.capitalized }
        var colorScheme: ColorScheme? {
            switch self {
            case .system: nil
            case .light: .light
            case .dark: .dark
            }
        }
    }

    private(set) var contentState: ContentState = .loading
    private(set) var progress: ProgressDocument {
        didSet { vocab = progress.vocab }
    }
    /// The decoded vocabulary deck, kept in step with `progress` so screens
    /// that read it several times per render don't re-decode it each time.
    private(set) var vocab: [String: VocabCard] = [:]
    var selectedTab: AppTab = .today

    /// Device-only: whether this device follows the system appearance. Kept
    /// out of the synced document on purpose — a phone following the system's
    /// dark mode shouldn't flip the student's laptop.
    var appearance: Appearance {
        didSet { UserDefaults.standard.set(appearance.rawValue, forKey: "appearance") }
    }

    /// Multiplier on the Latin type size, like the web's `--ls`.
    var latinScale: Double {
        didSet { UserDefaults.standard.set(latinScale, forKey: "latinScale") }
    }

    private let progressURL = URL.applicationSupportDirectory.appending(path: "progress.json")
    @ObservationIgnored private var saveTask: Task<Void, Never>?

    init() {
        let stored = Self.readProgress(from: progressURL) ?? .blank()
        progress = stored
        vocab = stored.vocab
        appearance = Appearance(rawValue: UserDefaults.standard.string(forKey: "appearance") ?? "") ?? .system
        let scale = UserDefaults.standard.double(forKey: "latinScale")
        latinScale = scale > 0 ? scale : 1
    }

    var content: ContentLibrary? {
        if case .ready(let library) = contentState { library } else { nil }
    }

    /* -------------------------------------------------------------- */
    /* Content                                                          */
    /* -------------------------------------------------------------- */

    func loadContent() async {
        guard case .loading = contentState else { return }
        do {
            let library = try await Task.detached(priority: .userInitiated) {
                guard let url = Bundle.main.url(forResource: "Content", withExtension: nil) else {
                    throw CocoaError(.fileNoSuchFile)
                }
                return try ContentLibrary(directory: url)
            }.value
            contentState = .ready(library)
        } catch {
            contentState = .failed(String(describing: error))
        }
    }

    /* -------------------------------------------------------------- */
    /* Progress                                                         */
    /* -------------------------------------------------------------- */

    /// Applies an edit to the progress document and schedules a save.
    func update(_ edit: (inout ProgressDocument) -> Void) {
        edit(&progress)
        scheduleSave()
    }

    /// Replaces the whole document — a restore from a backup file.
    func replaceProgress(with document: ProgressDocument) {
        progress = document
        scheduleSave()
    }

    /// Writes immediately — called when the app leaves the foreground.
    func saveNow() {
        saveTask?.cancel()
        Self.write(progress, to: progressURL)
    }

    private func scheduleSave() {
        saveTask?.cancel()
        let snapshot = progress
        let url = progressURL
        saveTask = Task.detached(priority: .utility) {
            try? await Task.sleep(for: .milliseconds(500))
            guard !Task.isCancelled else { return }
            AppModel.write(snapshot, to: url)
        }
    }

    nonisolated private static func readProgress(from url: URL) -> ProgressDocument? {
        guard let data = try? Data(contentsOf: url),
              let object = try? JSONValue.parse(data).objectValue
        else { return nil }
        return ProgressDocument(raw: object)
    }

    nonisolated private static func write(_ document: ProgressDocument, to url: URL) {
        do {
            try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
            try Data(JSONValue.object(document.raw).serialized().utf8).write(to: url, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
        } catch {
            print("[progress] save failed: \(error)")
        }
    }
}
