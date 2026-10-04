import LectioCore
import SwiftUI
import UniformTypeIdentifiers

struct SettingsView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.library) private var library
    @State private var importing = false
    @State private var pendingImport: ProgressDocument?
    @State private var importError: String?
    @State private var reminderOn = UserDefaults.standard.bool(forKey: "reminderEnabled")
    /// Read at launch by LectioChrome, so a change applies on the next open.
    @AppStorage("legacyChrome") private var classicLook = false
    @AppStorage(AIConsent.key) private var aiAllowed = false
    @State private var confirmClear = false

    var body: some View {
        @Bindable var model = model
        SectionStack {
            Form {
                Section {
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
                    if #available(iOS 26.0, *) {
                        Toggle("Classic look", isOn: $classicLook)
                    }
                } header: {
                    Text("Appearance")
                } footer: {
                    if #available(iOS 26.0, *) {
                        Text("Classic look swaps Liquid Glass for solid bars and buttons. It takes effect the next time you open Lectio.")
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
                    // Only while signed out, so an empty device can never
                    // sync over an account.
                    if model.account == nil {
                        Button("Clear all progress on this device", systemImage: "trash", role: .destructive) { confirmClear = true }
                    }
                } header: {
                    Text("Your data")
                } footer: {
                    Text("The same file the website's Settings page exports and imports, so a backup moves between the two either way.")
                }

                Section {
                    Toggle("Allow AI features", isOn: $aiAllowed)
                    Link(destination: AppConfig.web("privacy")) {
                        Label("How AI features use your text", systemImage: "hand.raised")
                    }
                } header: {
                    Text("AI features")
                } footer: {
                    Text("AI grading, the line tutor and sight-passage selection send the Latin and what you wrote or asked to an AI provider (Google Gemini, or Groq as a backup). Nothing is sent until you press an AI button. With AI off, every feature still has its self-graded path.")
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
                    Toggle("Daily reminder", isOn: Binding(
                        get: { reminderOn },
                        set: { on in Task { reminderOn = await model.setReminder(enabled: on) } }
                    ))
                    if reminderOn {
                        DatePicker("Remind me at", selection: Binding(
                            get: { Calendar.current.date(bySettingHour: model.reminderMinutes / 60, minute: model.reminderMinutes % 60, second: 0, of: Date()) ?? Date() },
                            set: { d in
                                let c = Calendar.current.dateComponents([.hour, .minute], from: d)
                                model.reminderMinutes = (c.hour ?? 16) * 60 + (c.minute ?? 0)
                                Task { await model.rescheduleReminder() }
                            }
                        ), displayedComponents: .hourAndMinute)
                    }
                } header: {
                    Text("Study")
                } footer: {
                    Text("Time counts while a study section is open on screen, the same way the website counts it. The reminder says how many cards are due.")
                }

                #if DEBUG
                // Debug builds only (never TestFlight or the App Store): fill
                // an empty device with sample progress, so every screen has
                // something to show. Offered only while signed out, so it can
                // never sync into an account; left out of the screenshots.
                if model.account == nil, !UserDefaults.standard.bool(forKey: "seedDemo") {
                    Section("Developer") {
                        Button("Load sample progress", systemImage: "tray.and.arrow.down") { model.loadSampleProgress() }
                            .disabled(!model.progress.vocab.isEmpty)
                    }
                }
                #endif

                Section {
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
                } header: {
                    Text("About")
                } footer: {
                    Text(AppConfig.trademarkNotice)
                }
            }
            .readableColumn()
            .pageBackground()
            .navigationTitle("Settings")
            .fileImporter(isPresented: $importing, allowedContentTypes: [.json]) { result in
                handleImport(result)
            }
            .confirmationDialog("Clear all progress on this device?", isPresented: $confirmClear, titleVisibility: .visible) {
                Button("Clear progress", role: .destructive) {
                    model.replaceProgress(with: .blank(prefersDark: model.appearance == .dark))
                }
            } message: {
                Text("This can't be undone. Export a backup first if you want to keep it.")
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
                Text("Latin texts are from The Latin Library and are in the public domain. The course follows the College Board's published AP® Latin Course and Exam Description (2025), and the vocabulary track teaches the words on its vocabulary list; the definitions, notes, questions and lessons are Lectio's own.")
                    .font(.prose(.callout))
                Text(AppConfig.trademarkNotice)
                    .font(.prose(.footnote))
                    .foregroundStyle(Palette.inkMuted)
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
        .readableColumn()
        .pageBackground()
        .navigationTitle("Acknowledgements")
    }
}
