import LectioCore
import SwiftUI

/// Everything the reader has written on a passage, in one place: their own
/// notes on it, every highlight, note and sentence mark (to jump to, edit or
/// take off), the lines flagged as hard, and then the passage's English,
/// context, themes and vocabulary coverage. The web Reader's side rail.
struct PassageNotesSheet: View {
    @Environment(AppModel.self) private var model
    let passage: Passage
    /// Whether the English translation is showing with the Latin.
    @Binding var englishOn: Bool
    /// Jumps the reader to a line (and closes the sheet).
    let onJump: (Int) -> Void

    @State private var draft = ""
    @State private var loaded = false
    @State private var showSummary = false
    @State private var noteTarget: NoteTarget?
    @State private var confirmClear = false
    @FocusState private var writing: Bool

    var body: some View {
        let state = model.progress.passage(passage.id)
        let highlights = Self.groups(state.annotations)
        let marks = Self.groups(state.allMarks)
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 28) {
                    section("Your notes on the passage") {
                        TextField("The sense of it, the hard spots, what to remember…", text: $draft, axis: .vertical)
                            .lineLimit(3...14)
                            .focused($writing)
                            .font(.prose())
                            .padding(12)
                            .background(Palette.slip, in: .rect(cornerRadius: 12))
                            .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(Palette.rule, lineWidth: 0.5))
                            .accessibilityIdentifier("passage-notes")
                    }

                    if !highlights.isEmpty || !marks.isEmpty {
                        section("On your page") {
                            ForEach(highlights, id: \.first?.id) { group in
                                highlightRow(group, state: state)
                                Hairline(color: Palette.hair)
                            }
                            ForEach(marks, id: \.first?.id) { group in
                                markRow(group)
                                Hairline(color: Palette.hair)
                            }
                            Button("Clear the page", systemImage: "trash", role: .destructive) { confirmClear = true }
                                .font(.footnote)
                        }
                    } else {
                        section("On your page") {
                            Text("Nothing yet. Touch and hold a word, or turn on Mark up, to colour a phrase, mark the parts of a sentence, or write a note on it.")
                                .font(.footnote)
                                .foregroundStyle(Palette.inkMuted)
                        }
                    }

                    if !state.flaggedLines.isEmpty {
                        section("Flagged as hard") {
                            FlowLayout(lineSpacing: 8) {
                                ForEach(state.flaggedLines, id: \.self) { n in
                                    Button("\(passage.lineWord.capitalized) \(n)") { onJump(n) }
                                        .glassButton()
                                        .padding(.trailing, 6)
                                }
                            }
                        }
                    }

                    if passage.lines.contains(where: { $0.english != nil }) {
                        section("English translation") {
                            Text("Literal and line by line, in the AP style, with the words English needs in [brackets]. Construe first, then check.")
                                .font(.footnote)
                                .foregroundStyle(Palette.inkMuted)
                            Toggle("Show it with the Latin", isOn: $englishOn)
                                .tint(Palette.rubric)
                            DisclosureGroup("Summary", isExpanded: $showSummary) {
                                Text(passage.summary)
                                    .font(.prose())
                                    .foregroundStyle(Palette.ink2)
                                    .padding(.top, 6)
                            }
                            .tint(Palette.ink)
                        }
                    } else {
                        section("Summary") {
                            if showSummary {
                                Text(passage.summary).font(.prose()).foregroundStyle(Palette.ink)
                            } else {
                                Button("Reveal the English summary") { withAnimation { showSummary = true } }
                                    .glassButton()
                            }
                        }
                    }

                    section("Context") {
                        Text(passage.context).font(.prose()).foregroundStyle(Palette.ink2)
                    }
                    if !passage.themes.isEmpty {
                        section("Themes") {
                            FlowLayout(lineSpacing: 8) {
                                ForEach(passage.themes, id: \.self) { theme in
                                    Text(theme)
                                        .font(.subheadline)
                                        .padding(.horizontal, 10)
                                        .padding(.vertical, 5)
                                        .background(Palette.redTint, in: .capsule)
                                        .padding(.trailing, 6)
                                }
                            }
                        }
                    }
                    if !passage.vocabIds.isEmpty { coverage }
                }
                .padding(20)
            }
            .scrollDismissesKeyboard(.interactively)
            .background(Palette.parchment.ignoresSafeArea())
            .navigationTitle(passage.citation)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) { printMenu }
                ToolbarItemGroup(placement: .keyboard) {
                    Spacer()
                    Button("Done") { writing = false }
                }
            }
            .confirmationDialog("Take every highlight, note and mark off this passage?",
                                isPresented: $confirmClear, titleVisibility: .visible) {
                Button("Clear the page", role: .destructive, action: clearPage)
            } message: {
                Text("Your notes on the passage and the flagged lines stay.")
            }
            .sheet(item: $noteTarget) { NoteEditor(target: $0, passageId: passage.id) }
        }
        .presentationDetents([.medium, .large])
        .onAppear {
            draft = state.notes
            loaded = true
        }
        .onChange(of: writing) { _, now in
            if !now { commitNotes() }
        }
        .onDisappear { commitNotes() }
    }

    /* -------------------------------------------------------------- */

    private var printMenu: some View {
        Menu("Print", systemImage: "printer") {
            Button("Study sheet") { printSheet(.study, english: false) }
            if passage.lines.contains(where: { $0.english != nil }) {
                Button("Study sheet with the English") { printSheet(.study, english: true) }
            }
            Button("Clean handout to write on") { printSheet(.clean, english: false) }
        }
    }

    private func highlightRow(_ group: [Annotation], state: PassageState) -> some View {
        let first = group[0]
        let pigment = group.compactMap(\.shownPigment).first
        let noted = group.first(where: \.hasNote)
        let words = group.map(\.text).joined(separator: " ")
        return VStack(alignment: .leading, spacing: 6) {
            Button { onJump(first.lineN) } label: {
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    if let pigment {
                        Circle().fill(Ink.fill(pigment)).frame(width: 10, height: 10)
                    }
                    Text("“\(words)”")
                        .font(.latinItalic(18))
                        .foregroundStyle(Palette.ink)
                        .multilineTextAlignment(.leading)
                    Text("· \(lineWord) \(first.lineN)").quietLabel()
                }
            }
            .buttonStyle(.plain)
            .accessibilityHint("Shows it in the passage")
            if let noted {
                Text(noted.note)
                    .font(.prose(.callout))
                    .foregroundStyle(Palette.ink2)
                    .fixedSize(horizontal: false, vertical: true)
            }
            HStack(spacing: 18) {
                Button(noted == nil ? "Add a note" : "Edit note") { editNote(first, state: state) }
                if pigment != nil, noted != nil {
                    Button("Remove colour") { uncolor(group) }
                }
                Button("Remove", role: .destructive) { remove(group) }
            }
            .font(.footnote)
            .tint(Palette.rubric)
        }
    }

    private func markRow(_ group: [SyntaxMark]) -> some View {
        let first = group[0]
        let role = first.roleValue
        return HStack(alignment: .firstTextBaseline, spacing: 10) {
            Text(role?.short ?? first.role)
                .font(.footnote.weight(.bold))
                .foregroundStyle(Palette.rubric)
                .frame(minWidth: 34, alignment: .leading)
            VStack(alignment: .leading, spacing: 4) {
                Button { onJump(first.lineN) } label: {
                    HStack(alignment: .firstTextBaseline, spacing: 8) {
                        Text("“\(group.map(\.text).joined(separator: " "))”")
                            .font(.latinItalic(17))
                            .foregroundStyle(Palette.ink)
                            .multilineTextAlignment(.leading)
                        Text("· \(lineWord) \(first.lineN)").quietLabel()
                    }
                }
                .buttonStyle(.plain)
                HStack(spacing: 8) {
                    if let role { MarkSample(role: role) }
                    Text(role?.label ?? first.role)
                        .font(.footnote)
                        .foregroundStyle(Palette.inkMuted)
                }
            }
            Spacer(minLength: 8)
            Button("Remove", role: .destructive) { removeMarks(group) }
                .font(.footnote)
        }
    }

    private var coverage: some View {
        let inRotation = passage.vocabIds.filter { model.vocab[$0] != nil }.count
        let total = passage.vocabIds.count
        let pct = total > 0 ? Int((Double(inRotation) / Double(total) * 100).rounded()) : 0
        return section("Vocabulary coverage") {
            HStack(alignment: .firstTextBaseline) {
                ProgressView(value: Double(inRotation), total: Double(max(total, 1))).tint(Palette.rubric)
                Text("\(pct)%").font(.latin(20)).monospacedDigit()
            }
            Text("\(inRotation) of \(total) words in your deck. Tapping a word while reading adds it automatically.")
                .font(.footnote)
                .foregroundStyle(Palette.inkMuted)
            if inRotation < total {
                Button("Add all to deck") { model.update { $0.seedVocab(passage.vocabIds) } }
                    .glassButton()
            }
        }
    }

    private func section<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title).rubricLabel()
            content()
        }
    }

    private var lineWord: String { passage.lineWord }

    /* -------------------------------------------------------------- */

    /// Records grouped as the reader made them (a phrase across lines is one
    /// entry), in reading order.
    private static func groups<T: LineAnchored & Identifiable>(_ items: [T]) -> [[T]] where T.ID == String {
        var seen = Set<String>()
        var out: [[T]] = []
        for x in items.sorted(by: { ($0.lineN, $0.startTok) < ($1.lineN, $1.startTok) })
        where seen.insert(x.group ?? x.id).inserted {
            out.append(groupOf(x, in: items))
        }
        return out
    }

    private func commitNotes() {
        guard loaded, draft != model.progress.passage(passage.id).notes else { return }
        model.update { $0.setPassageNotes(passage.id, notes: draft) }
    }

    private func editNote(_ a: Annotation, state: PassageState) {
        let pieces = passage.pieces(of: passage.rangeOfGroup(a, in: state.annotations))
        noteTarget = NoteTarget.on(pieces, in: state, lines: passage.linesLabel(pieces))
    }

    private func uncolor(_ group: [Annotation]) {
        model.update { doc in
            for x in group {
                doc.setHighlight(passageId: passage.id, lineN: x.lineN, startTok: x.startTok, endTok: x.endTok,
                                 text: x.text, color: nil)
            }
        }
    }

    private func remove(_ group: [Annotation]) {
        model.update { doc in
            for x in group { doc.removeAnnotation(passageId: passage.id, annotationId: x.id) }
        }
    }

    private func removeMarks(_ group: [SyntaxMark]) {
        model.update { doc in
            for x in group { doc.removeMark(passageId: passage.id, markId: x.id) }
        }
    }

    private func clearPage() {
        model.update { doc in
            let p = doc.passage(passage.id)
            for a in p.annotations { doc.removeAnnotation(passageId: passage.id, annotationId: a.id) }
            for m in p.allMarks { doc.removeMark(passageId: passage.id, markId: m.id) }
        }
    }

    private func printSheet(_ kind: StudySheet.Kind, english: Bool) {
        commitNotes()
        StudySheetPrinter.present(passage: passage, state: model.progress.passage(passage.id), kind: kind,
                                  withEnglish: english)
    }
}
