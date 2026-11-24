import LectioCore
import PhotosUI
import SwiftUI
import VisionKit

/// Bringing any Latin into the Reading Room, as on the website: scan a page
/// with the camera, choose a photo, or type or paste the text; say how it is
/// set out; and it comes in split into numbered rows with every word
/// glossed, ready to read, mark up and print like any syllabus passage.
///
/// The page is read on the phone. Glossing is done by Lectio's server: its
/// dictionary for every word, then, with the reader's permission, the AI
/// for the words the dictionary doesn't have.
struct ImportTextView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    /// Called with the new text's id once it is imported.
    let onImported: (String) -> Void

    @State private var text = ""
    @State private var genre = "prose"
    @State private var genreChosen = false
    @State private var proseLayout = "sentences"
    @State private var startAt = ""
    @State private var title = ""
    @State private var author = ""
    @State private var source = ""

    @State private var scanning = false
    @State private var photo: PhotosPickerItem?
    @State private var reading = false
    @State private var importing = false
    @State private var error: String?
    @State private var aiRequest: AIRequest?
    @FocusState private var editing: Bool

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    if VNDocumentCameraViewController.isSupported {
                        Button(text.isEmpty ? "Scan a page" : "Scan another page", systemImage: "doc.viewfinder") { scanning = true }
                            .accessibilityIdentifier("import-scan")
                    }
                    PhotosPicker(selection: $photo, matching: .images) {
                        Label(text.isEmpty ? "Choose a photo of a page" : "Add a photo of another page", systemImage: "photo")
                    }
                    .accessibilityIdentifier("import-photo")
                    if reading {
                        HStack(spacing: 10) {
                            ProgressView()
                            Text("Reading the page…").foregroundStyle(Palette.inkMuted)
                        }
                    }
                } header: {
                    Text("From a page")
                } footer: {
                    Text("The page is read on your iPhone; the photo isn’t sent anywhere. Or type or paste the Latin below.")
                }

                Section {
                    TextEditor(text: $text)
                        .font(.latin(18, relativeTo: .body))
                        .frame(minHeight: 200)
                        .focused($editing)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)
                        .accessibilityIdentifier("import-latin")
                    if text.isEmpty {
                        Button("Try an example") { example() }
                    }
                } header: {
                    Text("The Latin")
                } footer: {
                    Text(latinFooter)
                }

                Section("How it is set out") {
                    Picker("Kind of text", selection: Binding(get: { genre }, set: { genre = $0; genreChosen = true })) {
                        Text("Prose").tag("prose")
                        Text("Verse").tag("poetry")
                    }
                    .pickerStyle(.segmented)
                    if genre == "prose" {
                        Picker("Each row is", selection: $proseLayout) {
                            Text("A sentence").tag("sentences")
                            Text("A line, as typed").tag("lines")
                        }
                    }
                    LabeledContent("First line number") {
                        TextField("1", text: $startAt)
                            .keyboardType(.numberPad)
                            .multilineTextAlignment(.trailing)
                            .accessibilityIdentifier("import-start")
                    }
                }

                Section("About it") {
                    TextField("Title", text: $title, prompt: Text(titlePrompt))
                        .accessibilityIdentifier("import-title")
                    TextField("Author (optional)", text: $author)
                        .textContentType(.name)
                    TextField("Source (optional), e.g. Aeneid 4.305–330", text: $source)
                }

                Section {
                    if let error {
                        Text(error)
                            .font(.callout)
                            .foregroundStyle(Palette.rubric)
                            .accessibilityIdentifier("import-error")
                    }
                    Button(action: start) {
                        HStack(spacing: 10) {
                            if importing { ProgressView() }
                            Text(importing ? "Glossing every word…" : "Import and gloss")
                                .font(.headline)
                        }
                        .frame(maxWidth: .infinity)
                    }
                    .disabled(!canImport)
                    .accessibilityIdentifier("import-go")
                } footer: {
                    Text("Every word is looked up in Lectio’s dictionary; with AI allowed, the words it doesn’t have are glossed by AI for this text. Glossing needs a connection, and reading the text afterwards doesn’t.")
                }
            }
            .scrollDismissesKeyboard(.interactively)
            .navigationTitle("Import a text")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .keyboard) {
                    HStack {
                        Spacer()
                        Button("Done") { editing = false }
                    }
                }
            }
            .interactiveDismissDisabled(importing || !text.isEmpty)
        }
        .tint(Palette.rubric)
        .fullScreenCover(isPresented: $scanning) {
            DocumentScanner { pages in
                scanning = false
                read(pages)
            }
            .ignoresSafeArea()
        }
        .onChange(of: photo) { _, item in
            guard let item else { return }
            photo = nil
            Task {
                guard let data = try? await item.loadTransferable(type: Data.self), let image = UIImage(data: data) else {
                    error = "That photo couldn’t be opened."
                    return
                }
                read([image])
            }
        }
        .onChange(of: text) { _, now in
            if !genreChosen { genre = ImportGlossing.looksLikeVerse(now) ? "poetry" : "prose" }
        }
        .aiConsent($aiRequest) { run(ai: false) }
    }

    /* -------------------------------------------------------------- */

    private var layout: String { genre == "poetry" ? "lines" : proseLayout }

    private var trimmed: String { text.trimmingCharacters(in: .whitespacesAndNewlines) }

    private var canImport: Bool {
        !importing && !reading && !trimmed.isEmpty && trimmed.count <= ImportGlossing.maxCharacters
    }

    private var latinFooter: String {
        let words = ImportGlossing.wordCount(trimmed)
        if trimmed.count > ImportGlossing.maxCharacters {
            return "That is \(trimmed.count.formatted()) characters; the limit is \(ImportGlossing.maxCharacters.formatted()) (about a thousand words). Import it in two parts."
        }
        if words == 0 {
            return "Line numbers at the start of a line are taken off and used to number the rows."
        }
        return "\(words) word\(words == 1 ? "" : "s"). Check what a scan read: it can drop macrons or mistake a letter. Line numbers at the start of a line are taken off."
    }

    private var titlePrompt: String {
        let first = trimmed.split(separator: "\n").first.map(String.init) ?? ""
        return first.isEmpty ? "Title" : ImportGlossing.defaultTitle([ImportedLine(n: 1, latin: first)])
    }

    private func example() {
        text = "Quo usque tandem abutere, Catilina, patientia nostra? Quam diu etiam furor iste tuus nos eludet? Quem ad finem sese effrenata iactabit audacia?"
        title = "Quo usque tandem"
        author = "Cicero"
        source = "In Catilinam 1.1"
        genre = "prose"
        genreChosen = true
    }

    /// Reads scanned or chosen pages and adds their text to what's there.
    private func read(_ pages: [UIImage]) {
        guard !pages.isEmpty else { return }
        reading = true
        error = nil
        Task {
            defer { reading = false }
            var texts: [String] = []
            var first: Int?
            for page in pages {
                guard let got = try? await PageReader.read(page) else { continue }
                if !got.text.isEmpty { texts.append(got.text) }
                if first == nil { first = got.firstLine }
            }
            let found = texts.joined(separator: "\n\n")
            guard !found.isEmpty else {
                error = "No text could be read on that page. Try a sharper photo, flat and in good light, or type the Latin."
                return
            }
            if trimmed.isEmpty, startAt.isEmpty, let first { startAt = String(first) }
            text = trimmed.isEmpty ? found : trimmed + "\n\n" + found
        }
    }

    private func start() {
        guard canImport else { return }
        editing = false
        error = nil
        aiRequest = AIConsent.ask { run(ai: true) }
    }

    private func run(ai: Bool) {
        importing = true
        var fields = JSONObject([
            ("text", .string(trimmed)),
            ("layout", .string(layout)),
            ("ai", .bool(ai)),
        ])
        if let n = Int(startAt.trimmingCharacters(in: .whitespaces)), n > 0 { fields["startAt"] = .number(Double(n)) }
        let body = fields
        Task {
            defer { importing = false }
            do {
                let reply = try await ImportGlossing.gloss(body, client: model.ai)
                guard !reply.lines.isEmpty else {
                    error = "There is no Latin in that text."
                    return
                }
                let name = title.trimmingCharacters(in: .whitespaces)
                var id = ""
                model.update {
                    if reply.aiGlossed > 0, !reply.cached { $0.recordAiCall(route: "gloss-text") }
                    id = $0.addImportedText(
                        title: String((name.isEmpty ? ImportGlossing.defaultTitle(reply.lines) : name).prefix(ImportGlossing.maxTitle)),
                        author: String(author.trimmingCharacters(in: .whitespaces).prefix(ImportGlossing.maxAuthor)),
                        source: String(source.trimmingCharacters(in: .whitespaces).prefix(ImportGlossing.maxSource)),
                        genre: genre, layout: layout, lines: reply.lines, words: reply.words
                    )
                }
                onImported(id)
            } catch let failure as AIClient.Failure {
                error = failure.message
            } catch {
                self.error = "Couldn’t reach Lectio to gloss the text. Check your connection and try again; your text is still here."
            }
        }
    }
}

/// The system's document camera: finds the page's edges, flattens it, and
/// takes as many pages as the reader likes.
private struct DocumentScanner: UIViewControllerRepresentable {
    let done: ([UIImage]) -> Void

    func makeUIViewController(context: Context) -> VNDocumentCameraViewController {
        let camera = VNDocumentCameraViewController()
        camera.delegate = context.coordinator
        return camera
    }

    func updateUIViewController(_ controller: VNDocumentCameraViewController, context: Context) {}

    func makeCoordinator() -> Coordinator { Coordinator(done: done) }

    final class Coordinator: NSObject, VNDocumentCameraViewControllerDelegate {
        let done: ([UIImage]) -> Void
        init(done: @escaping ([UIImage]) -> Void) { self.done = done }

        func documentCameraViewController(_ controller: VNDocumentCameraViewController, didFinishWith scan: VNDocumentCameraScan) {
            done((0..<scan.pageCount).map { scan.imageOfPage(at: $0) })
        }

        func documentCameraViewControllerDidCancel(_ controller: VNDocumentCameraViewController) {
            done([])
        }

        func documentCameraViewController(_ controller: VNDocumentCameraViewController, didFailWithError error: any Error) {
            done([])
        }
    }
}
