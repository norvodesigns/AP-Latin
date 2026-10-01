import LectioCore
import SwiftUI

/// A word the reader tapped, for the glossary sheet.
nonisolated struct WordSelection: Identifiable, Hashable, Sendable {
    let passageId: String
    let lineN: Int
    let tokenIndex: Int
    let token: Token
    var id: String { "\(passageId)|\(lineN)|\(tokenIndex)" }
}

/// A run of tokens on one line, chosen for highlighting — never across lines,
/// as on the web, so an anchor is just a line number and a token range.
nonisolated struct SpanSelection: Equatable, Sendable {
    let lineN: Int
    var start: Int
    var end: Int

    func contains(_ i: Int) -> Bool { i >= start && i <= end }
}

nonisolated struct NoteTarget: Identifiable, Sendable {
    let span: SpanSelection
    let text: String
    let existingId: String?
    let note: String
    var id: String { "\(span.lineN):\(span.start):\(span.end)" }
}

/// One passage, set as a manuscript page: line numbers in the margin, the
/// Latin as large as the screen allows, and every word tappable for its
/// gloss.
///
/// Tap a word for its gloss. Touch and hold a word to start a highlight, tap
/// further words on the same line to extend it, and pick a pigment, add a
/// note, or ask the tutor about the line from the glass bar that appears.
struct PassageReaderView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.library) private var library
    let passage: Passage

    @State private var selection: WordSelection?
    @State private var span: SpanSelection?
    @State private var noteTarget: NoteTarget?
    @State private var askLine: PassageLine?
    @State private var showNotes = false
    @State private var scrollTarget: Int?

    var body: some View {
        let state = model.progress.passage(passage.id)
        ScrollViewReader { proxy in
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    header
                    if let salutation = passage.salutation {
                        Text(salutation)
                            .font(.latinItalic(18, relativeTo: .callout, scale: model.latinScale))
                            .foregroundStyle(Palette.ink2)
                            .padding(.bottom, 12)
                    }
                    ForEach(passage.lines) { line in
                        LineRow(
                            passage: passage,
                            line: line,
                            annotations: state.annotations.filter { $0.lineN == line.n },
                            flagged: state.flaggedLines.contains(line.n),
                            glossed: selection?.lineN == line.n ? selection?.tokenIndex : nil,
                            span: span?.lineN == line.n ? span : nil,
                            glossaryEnabled: model.progress.glossaryEnabled,
                            onTap: { tapped(line: line, index: $0) },
                            onHold: { held(line: line, index: $0) },
                            onNote: { openNote($0) },
                            onAsk: { askLine = line }
                        )
                        .id(line.n)
                    }
                    footer
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 60)
                .frame(maxWidth: 760, alignment: .leading)
                .frame(maxWidth: .infinity)
            }
            .onChange(of: scrollTarget) { _, target in
                guard let target else { return }
                withAnimation { proxy.scrollTo(target, anchor: .center) }
                scrollTarget = nil
            }
        }
        .pageBackground()
        .navigationTitle(passage.citation)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar { toolbar(state: state) }
        .safeAreaInset(edge: .bottom) {
            if let span {
                SpanToolbar(
                    current: existingAnnotation(for: span, in: state),
                    onColor: { applyColor($0) },
                    onNote: { openNote(for: span, state: state) },
                    onAsk: { askLine = passage.lines.first { $0.n == span.lineN } },
                    onRemove: removeSpanAnnotation,
                    onDone: { withAnimation(.spring(duration: 0.3)) { self.span = nil } }
                )
                .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .animation(.spring(duration: 0.35), value: span)
        .sheet(item: $selection) { GlossarySheet(selection: $0) }
        .sheet(item: $noteTarget) { NoteEditor(target: $0, passageId: passage.id) }
        .sheet(item: $askLine) { AskAboutLineSheet(passage: passage, line: $0) }
        .sheet(isPresented: $showNotes) {
            PassageNotesSheet(passage: passage) { line in
                showNotes = false
                scrollTarget = line
            }
        }
        .onAppear { model.update { $0.markOpened(passage.id) } }
        .task { await model.checkAI() }
    }

    /* -------------------------------------------------------------- */
    /* Header, footer, toolbar                                          */
    /* -------------------------------------------------------------- */

    private var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(passage.required ? "CED reading \(passage.cedReading ?? "")" : "Supplementary").rubricLabel()
            Text(passage.title)
                .font(.system(.title2, design: .serif))
                .foregroundStyle(Palette.ink)
            Text("\(passage.work) · \(passage.wordCount) words")
                .font(.subheadline)
                .foregroundStyle(Palette.inkMuted)
            Hairline(color: Palette.redLine).padding(.top, 10)
        }
        .padding(.top, 12)
        .padding(.bottom, 18)
    }

    private var footer: some View {
        let all = library?.passages ?? []
        let i = all.firstIndex { $0.id == passage.id }
        let prev = i.flatMap { $0 > 0 ? all[$0 - 1] : nil }
        let next = i.flatMap { $0 + 1 < all.count ? all[$0 + 1] : nil }
        return VStack(alignment: .leading, spacing: 18) {
            Text("Tap a word for its gloss. Touch and hold to highlight, add a note, or ask about the line.")
                .font(.footnote)
                .foregroundStyle(Palette.inkFaint)
            Hairline()
            HStack(alignment: .top) {
                if let prev {
                    NavigationLink(value: prev) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("← Previous").quietLabel()
                            Text(prev.citation).font(.latin(17)).foregroundStyle(Palette.ink)
                        }
                    }
                }
                Spacer()
                if let next {
                    NavigationLink(value: next) {
                        VStack(alignment: .trailing, spacing: 2) {
                            Text("Next →").quietLabel()
                            Text(next.citation).font(.latin(17)).foregroundStyle(Palette.ink)
                        }
                    }
                }
            }
        }
        .padding(.top, 28)
    }

    @ToolbarContentBuilder
    private func toolbar(state: PassageState) -> some ToolbarContent {
        ToolbarItemGroup(placement: .topBarTrailing) {
            Button(state.bookmarked ? "Remove bookmark" : "Bookmark",
                   systemImage: state.bookmarked ? "bookmark.fill" : "bookmark") {
                model.update { $0.toggleBookmark(passage.id) }
            }
            .sensoryFeedback(.selection, trigger: state.bookmarked)
            .keyboardShortcut("b", modifiers: [])

            Button("Notes and context", systemImage: "text.alignleft") { showNotes = true }
                .keyboardShortcut("n", modifiers: [])

            if passage.isPoetry && passage.author == "vergil" && passage.required {
                NavigationLink {
                    ScansionLabView(startPassageId: passage.id)
                        .environment(\.isPushedSection, true)
                } label: {
                    Label("Scan this passage", systemImage: "waveform.path")
                }
            }

            Menu("Reading options", systemImage: "textformat.size") {
                Toggle(isOn: Binding(
                    get: { model.progress.glossaryEnabled },
                    set: { _ in model.update { $0.toggleGlossary() } }
                )) {
                    Label("Glossary (off for a cold read)", systemImage: "character.book.closed")
                }
                Divider()
                Picker("Latin size", selection: Binding(get: { model.latinScale }, set: { model.latinScale = $0 })) {
                    Text("Smaller").tag(0.85)
                    Text("Standard").tag(1.0)
                    Text("Larger").tag(1.2)
                    Text("Largest").tag(1.45)
                }
            }
        }
    }

    /* -------------------------------------------------------------- */
    /* Interaction                                                      */
    /* -------------------------------------------------------------- */

    private func tapped(line: PassageLine, index: Int) {
        if var current = span {
            if current.lineN == line.n {
                // Extending the highlight to take in the tapped word.
                current.start = min(current.start, index)
                current.end = max(current.end, index)
                span = current
                return
            }
            span = nil
        }
        guard model.progress.glossaryEnabled else { return }
        let token = line.tokens[index]
        selection = WordSelection(passageId: passage.id, lineN: line.n, tokenIndex: index, token: token)
        // Looking a word up is how vocabulary gets tracked, exactly as on the
        // web: an exact dictionary match seeds it into the review rotation.
        // Stem matches are guesses and are not trusted enough to seed.
        if let top = token.glosses.first, top.isExact {
            model.update {
                $0.encounterWord(top.id, passageId: passage.id)
                $0.markStudied()
            }
        }
    }

    private func held(line: PassageLine, index: Int) {
        selection = nil
        span = SpanSelection(lineN: line.n, start: index, end: index)
    }

    private func spanText(_ s: SpanSelection) -> String {
        guard let line = passage.lines.first(where: { $0.n == s.lineN }) else { return "" }
        return line.tokens[s.start...s.end].map(\.text).joined().trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private func existingAnnotation(for s: SpanSelection, in state: PassageState) -> Annotation? {
        state.annotations.first { $0.lineN == s.lineN && $0.startTok == s.start && $0.endTok == s.end }
    }

    private func applyColor(_ color: HighlightColor?) {
        guard let s = span else { return }
        let text = spanText(s)
        let existing = existingAnnotation(for: s, in: model.progress.passage(passage.id))
        // Tapping the pigment a span already has takes it off again.
        let next = existing?.color == color ? nil : color
        model.update {
            $0.setHighlight(passageId: passage.id, lineN: s.lineN, startTok: s.start, endTok: s.end, text: text, color: next)
            $0.markStudied()
        }
        withAnimation(.spring(duration: 0.3)) { span = nil }
    }

    private func removeSpanAnnotation() {
        guard let s = span, let existing = existingAnnotation(for: s, in: model.progress.passage(passage.id)) else { return }
        model.update { $0.removeAnnotation(passageId: passage.id, annotationId: existing.id) }
        withAnimation(.spring(duration: 0.3)) { span = nil }
    }

    private func openNote(for s: SpanSelection, state: PassageState) {
        let existing = existingAnnotation(for: s, in: state)
        noteTarget = NoteTarget(span: s, text: spanText(s), existingId: existing?.id, note: existing?.note ?? "")
        span = nil
    }

    private func openNote(_ annotation: Annotation) {
        noteTarget = NoteTarget(span: SpanSelection(lineN: annotation.lineN, start: annotation.startTok, end: annotation.endTok),
                                text: annotation.text, existingId: annotation.id, note: annotation.note)
    }
}

/* ------------------------------------------------------------------ */
/* A line                                                              */
/* ------------------------------------------------------------------ */

private struct LineRow: View {
    @Environment(AppModel.self) private var model
    @Environment(\.horizontalSizeClass) private var sizeClass
    let passage: Passage
    let line: PassageLine
    let annotations: [Annotation]
    let flagged: Bool
    let glossed: Int?
    let span: SpanSelection?
    let glossaryEnabled: Bool
    let onTap: (Int) -> Void
    let onHold: (Int) -> Void
    let onNote: (Annotation) -> Void
    let onAsk: () -> Void

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 12) {
            // Verse is numbered every fifth line, as printed; prose sections always.
            Button {
                model.update { $0.toggleFlaggedLine(passage.id, line: line.n) }
            } label: {
                Text(showNumber || flagged ? "\(line.n)" : " ")
                    .font(.caption.monospacedDigit())
                    .foregroundStyle(flagged ? Palette.rubric : Palette.inkFaint)
                    .frame(width: 30, alignment: .trailing)
            }
            .buttonStyle(.plain)
            .accessibilityLabel(flagged ? "Line \(line.n), flagged as hard" : "Line \(line.n)")
            .accessibilityHint("Double-tap to \(flagged ? "unflag" : "flag") this line")

            FlowLayout(lineSpacing: 2) {
                ForEach(chunks, id: \.lowerBound) { chunk in
                    HStack(spacing: 0) {
                        ForEach(chunk, id: \.self) { i in token(i) }
                    }
                }
            }
            // A little larger on an iPad, where the page is held further away.
            .font(.latin(passage.isPoetry ? 22 : 21, scale: model.latinScale * (sizeClass == .regular ? 1.2 : 1)))
            .foregroundStyle(Palette.ink)
        }
        .padding(.vertical, passage.isPoetry ? 3 : 8)
        .contextMenu {
            Button("Ask about line \(line.n)", systemImage: "sparkles", action: onAsk)
            Button(flagged ? "Unflag line \(line.n)" : "Flag line \(line.n) as hard",
                   systemImage: flagged ? "flag.slash" : "flag") {
                model.update { $0.toggleFlaggedLine(passage.id, line: line.n) }
            }
        }
    }

    @ViewBuilder
    private func token(_ i: Int) -> some View {
        let token = line.tokens[i]
        let mark = highlight(at: i)
        let inSpan = span?.contains(i) ?? false
        let text = Text(token.text)
            .padding(.horizontal, token.isWord ? 1 : 0)
            .background(background(mark: mark, inSpan: inSpan, glossed: glossed == i), in: .rect(cornerRadius: 3))
            .overlay(alignment: .bottom) {
                if inSpan { Rectangle().fill(Palette.rubric).frame(height: 1.5) }
            }
        if token.isWord {
            text
                .foregroundStyle(Palette.ink)
                .contentShape(Rectangle())
                .onTapGesture { onTap(i) }
                .onLongPressGesture(minimumDuration: 0.35) { onHold(i) }
                .accessibilityAddTraits(.isButton)
                .accessibilityHint(glossaryEnabled ? "Shows the gloss. Touch and hold to highlight." : "Touch and hold to highlight.")
        } else {
            text
        }
        if let noted = annotations.last(where: { $0.endTok == i && !$0.note.trimmingCharacters(in: .whitespaces).isEmpty }) {
            Button { onNote(noted) } label: {
                Image(systemName: "text.bubble.fill")
                    .font(.system(size: 11))
                    .foregroundStyle(Palette.rubric)
                    .baselineOffset(10)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Your note on \(noted.text)")
        }
    }

    /// The newest mark covering a token is the one shown, as on the web.
    private func highlight(at i: Int) -> HighlightColor? {
        annotations.last { $0.color != nil && i >= $0.startTok && i <= $0.endTok }?.color
    }

    private func background(mark: HighlightColor?, inSpan: Bool, glossed: Bool) -> Color {
        if inSpan || glossed { return Palette.redTint }
        guard let mark else { return .clear }
        return Color("Wash" + mark.rawValue.capitalized)
    }

    private var showNumber: Bool { !passage.isPoetry || line.n % 5 == 0 || line.n == passage.lines.first?.n }

    /// Token index ranges, each a word plus the punctuation and space after
    /// it, so the flow layout never starts a line with a stray space.
    private var chunks: [Range<Int>] {
        var out: [Range<Int>] = []
        var start = 0
        for (i, token) in line.tokens.enumerated() where token.isWord && i > start {
            out.append(start..<i)
            start = i
        }
        if start < line.tokens.count { out.append(start..<line.tokens.count) }
        return out
    }
}

/* ------------------------------------------------------------------ */
/* The highlight bar                                                    */
/* ------------------------------------------------------------------ */

/// Floats over the page while a span is selected: the four manuscript
/// pigments, a note, the tutor, and remove — glass, because it's a control.
private struct SpanToolbar: View {
    let current: Annotation?
    let onColor: (HighlightColor) -> Void
    let onNote: () -> Void
    let onAsk: () -> Void
    let onRemove: () -> Void
    let onDone: () -> Void
    @Namespace private var glass

    var body: some View {
        GlassEffectContainer(spacing: 10) {
            HStack(spacing: 10) {
                HStack(spacing: 14) {
                    ForEach(HighlightColor.allCases, id: \.self) { color in
                        Button { onColor(color) } label: {
                            Circle()
                                .fill(Self.fill(color))
                                .frame(width: 26, height: 26)
                                .overlay {
                                    if current?.color == color {
                                        Image(systemName: "checkmark").font(.caption.bold()).foregroundStyle(.white)
                                    }
                                }
                        }
                        .buttonStyle(PressStyle())
                        .accessibilityLabel(color.rawValue.capitalized)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .glassEffect(.regular.interactive(), in: .capsule)
                .glassEffectID("pigments", in: glass)

                HStack(spacing: 4) {
                    Button("Note", systemImage: "square.and.pencil", action: onNote)
                    Button("Ask", systemImage: "sparkles", action: onAsk)
                    if current != nil {
                        Button("Remove", systemImage: "trash", role: .destructive, action: onRemove)
                    }
                    Button("Done", systemImage: "xmark", action: onDone)
                }
                .labelStyle(.iconOnly)
                .buttonStyle(.glass)
                .glassEffectID("actions", in: glass)
            }
        }
        .padding(.horizontal, 16)
        .padding(.bottom, 8)
        .sensoryFeedback(.selection, trigger: current?.color)
    }

    static func fill(_ color: HighlightColor) -> Color {
        switch color {
        case .gilt: Palette.gilt
        case .verdigris: Color("FillVerdigris")
        case .woad: Color("FillWoad")
        case .rubric: Palette.rubric
        }
    }
}

/* ------------------------------------------------------------------ */
/* Note editor                                                          */
/* ------------------------------------------------------------------ */

private struct NoteEditor: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    let target: NoteTarget
    let passageId: String
    @State private var draft = ""
    @FocusState private var focused: Bool

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 14) {
                Text("“\(target.text)” · line \(target.span.lineN)")
                    .font(.latinItalic(19))
                    .foregroundStyle(Palette.ink2)
                TextEditor(text: $draft)
                    .focused($focused)
                    .font(.prose())
                    .scrollContentBackground(.hidden)
                    .padding(10)
                    .background(Palette.slip, in: .rect(cornerRadius: 12))
                    .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(Palette.rule, lineWidth: 0.5))
            }
            .padding(20)
            .background(Palette.parchment.ignoresSafeArea())
            .navigationTitle("Note")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) { Button("Save", action: save) }
            }
        }
        .presentationDetents([.medium, .large])
        .onAppear {
            draft = target.note
            focused = true
        }
    }

    private func save() {
        let note = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        model.update { doc in
            // Mirrors the web's ensureAnnotation: a note needs an annotation
            // to hang on, so one is created (colorless) if the span had none.
            let id = target.existingId ?? doc.setHighlight(passageId: passageId, lineN: target.span.lineN,
                                                            startTok: target.span.start, endTok: target.span.end,
                                                            text: target.text, color: nil).id
            doc.setAnnotationNote(passageId: passageId, annotationId: id, note: note)
        }
        dismiss()
    }
}
