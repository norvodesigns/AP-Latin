import LectioCore
import SwiftUI
import UniformTypeIdentifiers

struct SettingsView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.library) private var library
    @State private var importing = false
    @State private var pendingImport: ProgressDocument?
    @State private var importError: String?

    var body: some View {
        @Bindable var model = model
        NavigationStack {
            Form {
                Section("Appearance") {
                    Picker("Appearance", selection: $model.appearance) {
                        ForEach(AppModel.Appearance.allCases) { Text($0.label).tag($0) }
                    }
                    .pickerStyle(.segmented)
                    Picker("Latin size", selection: $model.latinScale) {
                        Text("Smaller").tag(0.85)
                        Text("Standard").tag(1.0)
                        Text("Larger").tag(1.2)
                        Text("Largest").tag(1.45)
                    }
                }

                Section {
                    Toggle("Glossary in the Reading Room", isOn: Binding(
                        get: { model.progress.glossaryEnabled },
                        set: { _ in model.update { $0.toggleGlossary() } }
                    ))
                } header: {
                    Text("Reading")
                } footer: {
                    Text("Turn the glossary off for a cold read, the way the exam gives you the Latin.")
                }

                Section {
                    ShareLink(item: ProgressExport(json: model.progress.exportJSON()),
                              preview: SharePreview("Lectio backup")) {
                        Label("Export a backup", systemImage: "square.and.arrow.up")
                    }
                    Button("Restore from a backup…", systemImage: "square.and.arrow.down") { importing = true }
                } header: {
                    Text("Your data")
                } footer: {
                    Text("The same file the website's Settings page exports and imports, so a backup moves between the two either way.")
                }

                Section {
                    NavigationLink {
                        AccountView()
                    } label: {
                        if let account = model.account {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(account.displayName).foregroundStyle(Palette.ink)
                                SyncStatusLabel(status: model.syncStatus).font(.footnote)
                            }
                        } else {
                            Label("Sign in to sync with the website", systemImage: "person.crop.circle")
                        }
                    }
                } header: {
                    Text("Account")
                }

                Section {
                    Stepper(value: Binding(
                        get: { model.progress.studyPlan.minutesPerDay },
                        set: { minutes in model.update { $0.setStudyPlan(minutesPerDay: minutes) } }
                    ), in: 5...240, step: 5) {
                        LabeledContent("Daily goal", value: "\(model.progress.studyPlan.minutesPerDay) min")
                    }
                } header: {
                    Text("Study")
                } footer: {
                    Text("Time counts while a study section is open on screen, the same way the website counts it.")
                }

                Section("About") {
                    LabeledContent("Version", value: Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "–")
                    if let library {
                        LabeledContent("Content", value: String(library.manifest.contentHash.prefix(12)))
                    }
                    Link(destination: AppConfig.webBaseURL) {
                        Label("lectio.norvodesigns.com", systemImage: "safari")
                    }
                    Link(destination: AppConfig.web("privacy")) {
                        Label("Privacy", systemImage: "hand.raised")
                    }
                    Link(destination: AppConfig.web("support")) {
                        Label("Support", systemImage: "questionmark.circle")
                    }
                    NavigationLink {
                        LicensesView()
                    } label: {
                        Label("Acknowledgements", systemImage: "text.book.closed")
                    }
                }
            }
            .pageBackground()
            .navigationTitle("Settings")
            .fileImporter(isPresented: $importing, allowedContentTypes: [.json]) { result in
                handleImport(result)
            }
            .confirmationDialog("Replace your progress with this backup?", isPresented: Binding(
                get: { pendingImport != nil }, set: { if !$0 { pendingImport = nil } }
            ), titleVisibility: .visible) {
                Button("Replace", role: .destructive) {
                    if let pendingImport { model.replaceProgress(with: pendingImport) }
                    pendingImport = nil
                }
            } message: {
                Text("Everything on this device is replaced by the file's contents.")
            }
            .alert("Couldn't restore that file", isPresented: Binding(
                get: { importError != nil }, set: { if !$0 { importError = nil } }
            )) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(importError ?? "")
            }
        }
    }

    private func handleImport(_ result: Result<URL, any Error>) {
        do {
            let url = try result.get()
            let scoped = url.startAccessingSecurityScopedResource()
            defer { if scoped { url.stopAccessingSecurityScopedResource() } }
            let text = try String(contentsOf: url, encoding: .utf8)
            pendingImport = try ProgressDocument.importJSON(text)
        } catch ProgressDocument.ImportError.notAnExport {
            importError = "That doesn't look like a Lectio backup file."
        } catch {
            importError = "The file couldn't be read."
        }
    }
}

/// The backup file, handed to the share sheet as JSON.
nonisolated struct ProgressExport: Transferable, Sendable {
    let json: String

    static var transferRepresentation: some TransferRepresentation {
        DataRepresentation(exportedContentType: .json) { export in Data(export.json.utf8) }
            .suggestedFileName("lectio-backup.json")
    }
}

/// The bundled fonts are under the SIL Open Font License, which asks for the
/// licence to travel with them; the Latin texts are public domain.
private struct LicensesView: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                Text("Latin texts are from The Latin Library and are in the public domain. The Course and Exam Description material follows the College Board's published 2025 framework.")
                    .font(.prose(.callout))
                ForEach(["EBGaramond-OFL", "Italianno-OFL"], id: \.self) { name in
                    if let url = Bundle.main.url(forResource: name, withExtension: "txt"),
                       let text = try? String(contentsOf: url, encoding: .utf8) {
                        Text(name.replacingOccurrences(of: "-OFL", with: "")).rubricLabel()
                        Text(text).font(.caption.monospaced()).foregroundStyle(Palette.ink2)
                    }
                }
            }
            .padding(20)
        }
        .pageBackground()
        .navigationTitle("Acknowledgements")
    }
}
