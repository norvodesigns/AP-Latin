import LectioCore
import SwiftUI

/// A text the reader imported, open in the Reader. It is rebuilt from the
/// progress document each time, so glosses that come in later (gloss the
/// rest, or a sync from the website) show at once.
struct ImportedReaderView: View {
    @Environment(AppModel.self) private var model
    let id: String

    var body: some View {
        if let text = model.progress.importedText(id) {
            PassageReaderView(passage: Passage(imported: text), imported: text)
        } else {
            ContentUnavailableView(
                "This text is gone",
                systemImage: "doc.text",
                description: Text("It was deleted, here or on another device you sync with.")
            )
            .pageBackground()
        }
    }
}

/// Under an imported text's title: how much of it is glossed, and a way to
/// gloss the words still missing.
struct ImportedSummary: View {
    let text: ImportedText
    let glossing: Bool
    let onGlossRest: () -> Void

    var body: some View {
        let coverage = text.glossCoverage
        let missing = text.unglossedWords.count
        let percent = coverage.total == 0 ? 100 : coverage.glossed * 100 / coverage.total
        HStack(alignment: .firstTextBaseline, spacing: 12) {
            Text(missing == 0 ? "Every word glossed" : "\(percent)% of the words glossed")
                .font(.footnote)
                .foregroundStyle(Palette.inkMuted)
            if missing > 0 {
                Button(action: onGlossRest) {
                    HStack(spacing: 6) {
                        if glossing { ProgressView().controlSize(.mini) }
                        Text(glossing ? "Glossing…" : "Gloss the \(missing) still missing")
                    }
                    .font(.footnote.weight(.semibold))
                }
                .tint(Palette.rubric)
                .disabled(glossing)
                .accessibilityIdentifier("imported-gloss-rest")
            }
        }
    }
}

/// What the Reader can do with a text the reader imported: gloss the words
/// still missing (with the AI, so after asking permission), edit its title
/// and source, or delete it.
struct ImportedActions: ViewModifier {
    struct Flags {
        /// Set to ask for the missing words to be glossed.
        var glossRest = false
        /// The request is out.
        var glossing = false
        var editing = false
        var confirmDelete = false
    }

    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    let text: ImportedText?
    @Binding var state: Flags
    @State private var aiRequest: AIRequest?
    @State private var note: String?

    func body(content: Content) -> some View {
        content
            .onChange(of: state.glossRest) { _, asked in
                guard asked else { return }
                state.glossRest = false
                start()
            }
            .aiConsent($aiRequest)
            .sheet(isPresented: $state.editing) {
                if let text { ImportedDetailsEditor(text: text) }
            }
            .confirmationDialog("Delete this text?", isPresented: $state.confirmDelete, titleVisibility: .visible) {
                Button("Delete the text and your notes on it", role: .destructive, action: delete)
            } message: {
                Text("Its highlights, notes and marks go with it, on every device you sync with.")
            }
            .alert("Glossing the rest", isPresented: Binding(get: { note != nil }, set: { if !$0 { note = nil } })) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(note ?? "")
            }
    }

    private func start() {
        guard let text, !state.glossing else { return }
        aiRequest = AIConsent.ask {
            state.glossing = true
            Task {
                note = await ImportGlossing.glossRest(text, model: model)
                state.glossing = false
            }
        }
    }

    private func delete() {
        guard let text else { return }
        dismiss()
        model.update { $0.deleteImportedText(text.id) }
    }
}

/// An imported text's title, author and source. Its Latin can't be edited:
/// the reader's highlights and notes are anchored to its words.
struct ImportedDetailsEditor: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    let text: ImportedText
    @State private var title = ""
    @State private var author = ""
    @State private var source = ""

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Title", text: $title)
                    TextField("Author (optional)", text: $author)
                    TextField("Source (optional)", text: $source)
                } footer: {
                    Text("The Latin itself can’t be changed once it’s imported, because your highlights and notes are anchored to its words. To correct it, import it again.")
                }
            }
            .navigationTitle("Your text")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        let name = title.trimmingCharacters(in: .whitespaces)
                        model.update {
                            $0.updateImportedText(
                                text.id,
                                title: String((name.isEmpty ? text.title : name).prefix(ImportGlossing.maxTitle)),
                                author: String(author.trimmingCharacters(in: .whitespaces).prefix(ImportGlossing.maxAuthor)),
                                source: String(source.trimmingCharacters(in: .whitespaces).prefix(ImportGlossing.maxSource))
                            )
                        }
                        dismiss()
                    }
                }
            }
        }
        .presentationDetents([.medium, .large])
        .onAppear {
            title = text.title
            author = text.author
            source = text.source
        }
    }
}
