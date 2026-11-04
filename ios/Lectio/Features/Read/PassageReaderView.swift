import LectioCore
import SwiftUI
import TipKit
import UIKit

/// A word the reader tapped, for the glossary sheet.
nonisolated struct WordSelection: Identifiable, Hashable, Sendable {
    let passageId: String
    let lineN: Int
    let tokenIndex: Int
    let token: Token
    var id: String { "\(passageId)|\(lineN)|\(tokenIndex)" }
}

/// Reading, where a tap shows a word's gloss, or marking up, where a tap
/// selects words — the web Reader's two modes.
nonisolated enum ReaderMode: Sendable {
    case read, markup
}

/// The mark-up bar's two faces: colours and actions, or the sentence parts.
nonisolated enum BarPanel: Sendable {
    case main, roles
}

/// Where the English translation goes: hidden, under each line, or beside
/// it (on a wide screen; under each line on a phone).
nonisolated enum EnglishView: String, Sendable {
    case off, under, side
}

/// One passage, set as a manuscript page: line numbers in the margin, the
/// Latin as large as the screen allows, and every word tappable for its
/// gloss.
///
/// Tap a word for its gloss; tapping another swaps the gloss in place. Touch
/// and hold a word, or turn on Mark up, to select words, then tap the last
/// word of the phrase (on any line) to take in everything between. The bar
/// that comes up colours the words, marks what part of the sentence they
/// are, writes a note on them, asks the tutor, or takes it all off again.
struct PassageReaderView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.library) private var library
    @Environment(\.horizontalSizeClass) private var sizeClass
    let passage: Passage

    @State private var mode: ReaderMode = .read
    /// The word whose gloss is showing. The sheet stays up while the reader
    /// taps other words, and its content changes, rather than closing and
    /// opening again (which in 1.1 brought the second word up full screen).
    @State private var gloss: WordSelection?
    @State private var glossShown = false
    @State private var glossDetent: PresentationDetent = .height(300)
    /// The selected words, from one to another, across lines if need be,
    /// with the rules for how a tap changes them (in LectioCore, shared
    /// with the web's).
    @State private var sel = MarkupSelection()
    @State private var panel: BarPanel = .main
    @State private var noteTarget: NoteTarget?
    @State private var askLine: PassageLine?
    @State private var showNotes = false
    @State private var scrollTarget: Int?
    /// A practice set on this passage's quiz questions, opened from the toolbar.
    @State private var quiz: QuizSession?
    /// Pushes the Scansion Lab, set to this passage.
    @State private var scanning = false
    /// Counts selections started by a hold, for the haptic that says one has.
    @State private var holds = 0
    /// The bottom of the screen, to tell when a tapped word is under a sheet.
    @State private var screenBottom: CGFloat = 0
    @AppStorage("readerEnglish") private var englishView: EnglishView = .off
    @AppStorage("readerEnglishLast") private var englishLast: EnglishView = .under

    var body: some View {
        let state = model.progress.passage(passage.id)
        let pick = SelectionContents(range: sel.range, in: passage, state: state)
        ScrollViewReader { proxy in
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    header
                    TipView(GlossTip()).lectioTipStyle().padding(.bottom, 16)
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
                            marks: state.allMarks.filter { $0.lineN == line.n },
                            flagged: state.flaggedLines.contains(line.n),
                            glossed: glossShown && gloss?.lineN == line.n ? gloss?.tokenIndex : nil,
                            selected: pick.pieces.first { $0.lineN == line.n }.map { $0.startTok...$0.endTok },
                            english: showsEnglish ? line.english : nil,
                            sideBySide: sideBySide,
                            markingUp: mode == .markup,
                            glossaryEnabled: model.progress.glossaryEnabled,
                            onTap: { tapped(line: line, index: $0, at: $1) },
                            onHold: { held(line: line, index: $0) },
                            onNote: { editNote($0) },
                            onAsk: { askLine = line }
                        )
                        .id(line.n)
                    }
                    footer
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 60)
                .frame(maxWidth: sideBySide ? 1180 : 760, alignment: .leading)
                .frame(maxWidth: .infinity)
            }
            // Room to scroll the last lines up above the gloss.
            .contentMargins(.bottom, glossShown ? 300 : 0, for: .scrollContent)
            .onChange(of: scrollTarget) { _, target in
                guard let target else { return }
                withAnimation { proxy.scrollTo(target, anchor: .center) }
                scrollTarget = nil
            }
        }
        .background {
            GeometryReader { g in
                let bottom = g.frame(in: .global).maxY
                Color.clear
                    .onAppear { screenBottom = bottom }
                    .onChange(of: bottom) { _, now in screenBottom = now }
            }
            .ignoresSafeArea()
        }
        .background { shortcuts }
        .pageBackground()
        .navigationTitle(passage.citation)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar { toolbar(state: state) }
        .fullScreenCover(item: $quiz) { QuizSessionView(session: $0) }
        .navigationDestination(isPresented: $scanning) {
            ScansionLabView(startPassageId: passage.id)
                .environment(\.isPushedSection, true)
        }
        .safeAreaInset(edge: .bottom) {
            if !pick.isEmpty {
                MarkupBar(
                    text: pick.text,
                    lines: passage.linesLabel(pick.pieces),
                    panel: $panel,
                    pigment: pick.pigment,
                    role: pick.role,
                    hasExisting: pick.hasExisting,
                    hasNote: pick.noted != nil,
                    onPigment: applyPigment,
                    onRole: applyRole,
                    onNote: openNote,
                    onAsk: { ask(lineN: pick.pieces[0].lineN, closingSheet: false) },
                    onCopy: { UIPasteboard.general.string = pick.text },
                    onRemove: removeSelected,
                    onDone: clearSelection
                )
                .transition(.move(edge: .bottom).combined(with: .opacity))
            } else if mode == .markup {
                MarkupHint { setMode(.read) }
                    .transition(.opacity)
            }
        }
        .animation(.spring(duration: 0.35), value: sel)
        .animation(.spring(duration: 0.35), value: mode)
        .sensoryFeedback(.impact(weight: .medium), trigger: holds)
        .sheet(isPresented: $glossShown) {
            Group {
                if let word = gloss {
                    GlossarySheet(
                        passage: passage,
                        selection: word,
                        onAsk: { ask(lineN: word.lineN, closingSheet: true) },
                        onMarkUp: { markUp(from: word) },
                        onEditNote: { editNoteFromGloss($0) }
                    )
                    .id(word.id)
                }
            }
            .presentationDetents([.height(300), .medium, .large], selection: $glossDetent)
            .presentationBackgroundInteraction(.enabled(upThrough: .medium))
        }
        .sheet(item: $noteTarget) { NoteEditor(target: $0, passageId: passage.id) }
        .sheet(item: $askLine) { AskAboutLineSheet(passage: passage, line: $0) }
        .sheet(isPresented: $showNotes) {
            PassageNotesSheet(passage: passage, englishOn: englishOn) { line in
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
            Text(passage.required ? "CED reading \(passage.cedReading ?? "")"
                 : passage.project.map { "Course Project · \($0)" } ?? "Supplementary").rubricLabel()
            Text(passage.title)
                .font(.system(.title2, design: .serif))
                .foregroundStyle(Palette.ink)
            Text("\(passage.project != nil ? "\(passage.authorLabel), " : "")\(passage.work) · \(passage.wordCount) words")
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
            Text("Tap a word for its gloss. Touch and hold a word, or turn on Mark up, to select a phrase across lines, then colour it, mark the parts of the sentence, or write a note.")
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
            // A phone's bar has room for four; the bookmark goes in More.
            if sizeClass == .regular { bookmarkButton(state) }

            Toggle(isOn: Binding(get: { mode == .markup }, set: { setMode($0 ? .markup : .read) })) {
                Label("Mark up", systemImage: "highlighter")
            }
            .toggleStyle(.button)
            .accessibilityIdentifier("markup-toggle")
            .accessibilityHint("Tap words to select them, then colour them, mark them or write a note.")

            if hasEnglish {
                Toggle(isOn: englishOn) {
                    Label("English translation", systemImage: "translate")
                }
                .toggleStyle(.button)
                .accessibilityIdentifier("english-toggle")
            }

            Button("Notes", systemImage: "text.alignleft") { showNotes = true }
                .accessibilityIdentifier("reader-notes")

            moreMenu(state)
        }
    }

    private func bookmarkButton(_ state: PassageState) -> some View {
        Button(state.bookmarked ? "Remove bookmark" : "Bookmark",
               systemImage: state.bookmarked ? "bookmark.fill" : "bookmark") {
            model.update { $0.toggleBookmark(passage.id) }
        }
        .sensoryFeedback(.selection, trigger: state.bookmarked)
    }

    private func moreMenu(_ state: PassageState) -> some View {
        let questions = library?.questions.filter { $0.passageId == passage.id } ?? []
        let scannable = passage.isPoetry && passage.author == "vergil" && passage.required
        return Menu("More", systemImage: "ellipsis.circle") {
            if sizeClass != .regular { bookmarkButton(state) }

            if !questions.isEmpty || scannable {
                Section("Practice") {
                    if !questions.isEmpty {
                        Button("\(questions.count) questions on this passage", systemImage: "checklist") {
                            quiz = QuizSession(questions: questions.shuffled(), isReview: false)
                        }
                    }
                    if scannable {
                        Button("Scan this passage", systemImage: "waveform.path") { scanning = true }
                    }
                }
            }

            Section("Print") {
                Button("Study sheet", systemImage: "printer") { printSheet(.study, english: false) }
                if hasEnglish {
                    Button("Study sheet with the English", systemImage: "printer") { printSheet(.study, english: true) }
                }
                Button("Clean handout to write on", systemImage: "doc.plaintext") { printSheet(.clean, english: false) }
            }

            Section("Reading") {
                Toggle(isOn: Binding(
                    get: { model.progress.glossaryEnabled },
                    set: { _ in model.update { $0.toggleGlossary() } }
                )) {
                    Label("Glossary (off for a cold read)", systemImage: "character.book.closed")
                }
                if hasEnglish {
                    Picker(selection: Binding(get: { englishView }, set: { showEnglish($0) })) {
                        Text("Hidden").tag(EnglishView.off)
                        Text("Under each line").tag(EnglishView.under)
                        if sizeClass == .regular {
                            Text("Side by side").tag(EnglishView.side)
                        }
                    } label: {
                        Label("English translation", systemImage: "translate")
                    }
                    .pickerStyle(.menu)
                }
                Picker("Latin size", selection: Binding(get: { model.latinScale }, set: { model.latinScale = $0 })) {
                    Text("Smaller").tag(0.85)
                    Text("Standard").tag(1.0)
                    Text("Larger").tag(1.2)
                    Text("Largest").tag(1.45)
                }
            }
        }
        .accessibilityIdentifier("reader-more")
    }

    /// The web Reader's keys, for an iPad with a keyboard: `m` mark up, `t`
    /// English, `n` notes, `b` bookmark, `c` cold read; with words selected,
    /// `1`–`8` a colour, Delete takes everything off, Escape lets go.
    private var shortcuts: some View {
        ZStack {
            Button("Mark up") { setMode(mode == .markup ? .read : .markup) }
                .keyboardShortcut("m", modifiers: [])
            Button("English") { toggleEnglish() }
                .keyboardShortcut("t", modifiers: [])
                .disabled(!hasEnglish)
            Button("Notes") { showNotes = true }
                .keyboardShortcut("n", modifiers: [])
            Button("Bookmark") { model.update { $0.toggleBookmark(passage.id) } }
                .keyboardShortcut("b", modifiers: [])
            Button("Cold read") { model.update { $0.toggleGlossary() } }
                .keyboardShortcut("c", modifiers: [])
            Button("Let go") { clearSelection() }
                .keyboardShortcut(.escape, modifiers: [])
                .disabled(sel.isEmpty)
            Button("Remove") { removeSelected() }
                .keyboardShortcut(.delete, modifiers: [])
                .disabled(sel.isEmpty)
            ForEach(Array(Pigment.allCases.enumerated()), id: \.element) { n, p in
                Button(p.plainName) { applyPigment(p) }
                    .keyboardShortcut(KeyEquivalent(Character(String(n + 1))), modifiers: [])
                    .disabled(sel.isEmpty)
            }
        }
        .opacity(0)
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }

    /* -------------------------------------------------------------- */
    /* English                                                          */
    /* -------------------------------------------------------------- */

    private var hasEnglish: Bool { passage.lines.contains { $0.english != nil } }
    private var showsEnglish: Bool { hasEnglish && englishView != .off }
    private var sideBySide: Bool { showsEnglish && englishView == .side && sizeClass == .regular }

    private var englishOn: Binding<Bool> {
        Binding(get: { englishView != .off }, set: { on in
            if on != (englishView != .off) { toggleEnglish() }
        })
    }

    private func toggleEnglish() {
        if englishView == .off {
            // Side by side on an iPad the first time; under each line on a phone.
            englishView = englishLast == .under && sizeClass == .regular && !UserDefaults.standard.bool(forKey: "readerEnglishChosen")
                ? .side : englishLast
        } else {
            englishLast = englishView
            englishView = .off
        }
    }

    private func showEnglish(_ view: EnglishView) {
        UserDefaults.standard.set(true, forKey: "readerEnglishChosen")
        if view != .off { englishLast = view }
        englishView = view
    }

    /* -------------------------------------------------------------- */
    /* The selection                                                    */
    /* -------------------------------------------------------------- */

    private var state: PassageState { model.progress.passage(passage.id) }
    private var contents: SelectionContents { SelectionContents(range: sel.range, in: passage, state: state) }

    private func select(_ r: TokenRange, settled: Bool, anchor: TokenPoint? = nil) {
        glossShown = false
        sel.select(r, settled: settled, anchor: anchor)
        panel = .main
    }

    private func clearSelection() {
        sel.clear()
        panel = .main
    }

    private func setMode(_ next: ReaderMode) {
        mode = next
        glossShown = false
        if next == .read { clearSelection() }
    }

    /* -------------------------------------------------------------- */
    /* Taps                                                             */
    /* -------------------------------------------------------------- */

    private func tapped(line: PassageLine, index: Int, at location: CGPoint) {
        GlossTip().invalidate(reason: .actionPerformed)
        let here = TokenPoint(lineN: line.n, tok: index)
        if mode == .read, let range = sel.range, sel.settled, !passage.contains(range, here) {
            // Done with that selection: back to reading.
            clearSelection()
        } else if mode == .markup || !sel.isEmpty {
            glossShown = false
            sel.tap(at: here, in: passage, state: state)
            panel = .main
            reveal(line.n, at: location, under: 230)
            return
        }

        guard model.progress.glossaryEnabled else { return }
        let token = line.tokens[index]
        gloss = WordSelection(passageId: passage.id, lineN: line.n, tokenIndex: index, token: token)
        if !glossShown {
            glossDetent = .height(300)
            glossShown = true
        }
        reveal(line.n, at: location, under: glossDetent == .height(300) ? 300 : 480)
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

    /// Touch and hold: select, whatever mode the page is in.
    private func held(line: PassageLine, index: Int) {
        glossShown = false
        sel.selectFresh(at: TokenPoint(lineN: line.n, tok: index), in: passage, state: state)
        panel = .main
        holds += 1
    }

    /// Scrolls a line up when the word tapped on it is about to be covered
    /// by the gloss or the bar.
    private func reveal(_ lineN: Int, at location: CGPoint, under cover: CGFloat) {
        guard screenBottom > 0, location.y > screenBottom - cover - 24 else { return }
        scrollTarget = lineN
    }

    /// Opens the line tutor. From the glossary sheet, that sheet goes first:
    /// one sheet can't open while another is still closing.
    private func ask(lineN: Int, closingSheet: Bool) {
        let line = passage.lines.first { $0.n == lineN }
        guard closingSheet else {
            askLine = line
            return
        }
        glossShown = false
        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(450))
            askLine = line
        }
    }

    /// "Mark up" on a word's gloss: into mark-up mode with that word selected.
    private func markUp(from word: WordSelection) {
        let here = TokenPoint(lineN: word.lineN, tok: word.tokenIndex)
        mode = .markup
        select(TokenRange(here), settled: false, anchor: here)
    }

    /* -------------------------------------------------------------- */
    /* Doing things to the selection                                    */
    /* -------------------------------------------------------------- */

    private func applyPigment(_ p: Pigment) {
        let s = contents
        guard !s.isEmpty else { return }
        model.update { $0.applyPigment(p, to: s, passageId: passage.id) }
        sel.settle()
    }

    private func applyRole(_ r: SyntaxRole) {
        let s = contents
        guard !s.isEmpty else { return }
        model.update { $0.applyRole(r, to: s, passageId: passage.id) }
        sel.settle()
        panel = .main
    }

    /// Takes everything stored on exactly these words off the page.
    private func removeSelected() {
        let s = contents
        guard s.hasExisting else { return }
        model.update { $0.removeEverything(on: s, passageId: passage.id) }
        clearSelection()
    }

    private func openNote() {
        let s = contents
        guard !s.isEmpty else { return }
        sel.settle()
        noteTarget = NoteTarget.on(s.pieces, in: state, lines: passage.linesLabel(s.pieces))
    }

    /// A note's mark in the text, or Edit note: the note's words selected
    /// and its editor open.
    private func editNote(_ a: Annotation) {
        let state = self.state
        let r = passage.rangeOfGroup(a, in: state.annotations)
        let pieces = passage.pieces(of: r)
        select(r, settled: true)
        noteTarget = NoteTarget.on(pieces, in: state, lines: passage.linesLabel(pieces))
    }

    private func editNoteFromGloss(_ a: Annotation) {
        glossShown = false
        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(450))
            editNote(a)
        }
    }

    private func printSheet(_ kind: StudySheet.Kind, english: Bool) {
        StudySheetPrinter.present(passage: passage, state: state, kind: kind, withEnglish: english)
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
    let marks: [SyntaxMark]
    let flagged: Bool
    let glossed: Int?
    /// The selected tokens on this line.
    let selected: ClosedRange<Int>?
    let english: String?
    let sideBySide: Bool
    let markingUp: Bool
    let glossaryEnabled: Bool
    let onTap: (Int, CGPoint) -> Void
    let onHold: (Int) -> Void
    let onNote: (Annotation) -> Void
    let onAsk: () -> Void

    /// What a highlight looks like on one token: a pill, round only where
    /// the run of words begins and ends.
    private struct Wash {
        let color: Color
        let start: Bool
        let end: Bool
    }

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 12) {
            number
            if let english, sideBySide {
                HStack(alignment: .firstTextBaseline, spacing: 32) {
                    latin.frame(maxWidth: .infinity, alignment: .leading)
                    englishText(english).frame(maxWidth: .infinity, alignment: .leading)
                }
            } else {
                VStack(alignment: .leading, spacing: 2) {
                    latin
                    if let english { englishText(english).padding(.bottom, 8) }
                }
            }
        }
        .padding(.vertical, passage.citesByLine ? 3 : 8)
    }

    private var number: some View {
        // Verse is numbered every fifth line, as printed; prose sections
        // always (and every line once the English is showing, to match the
        // two up). Tap the number to flag the line; hold it for the line's
        // menu. (Not a context menu on the whole row: that would take over
        // touch-and-hold on a word, which selects it.)
        Menu {
            Button("Ask about line \(line.n)", systemImage: "sparkles", action: onAsk)
            Button(flagged ? "Unflag line \(line.n)" : "Flag line \(line.n) as hard",
                   systemImage: flagged ? "flag.slash" : "flag", action: toggleFlag)
        } label: {
            Text(showNumber || flagged ? "\(line.n)" : " ")
                .font(.caption.monospacedDigit())
                .foregroundStyle(flagged ? Palette.rubric : Palette.inkFaint)
                .frame(width: 30, alignment: .trailing)
                .contentShape(Rectangle())
        } primaryAction: {
            toggleFlag()
        }
        .menuIndicator(.hidden)
        .accessibilityIdentifier("line-\(line.n)")
        .accessibilityLabel(flagged ? "Line \(line.n), flagged as hard" : "Line \(line.n)")
        .accessibilityHint("Double-tap to \(flagged ? "unflag" : "flag") this line. Touch and hold to ask about it.")
    }

    private var latin: some View {
        // Room under the line for the marks' underlines and their labels.
        let labelled = !underlines.isEmpty
        return FlowLayout(lineSpacing: labelled ? 22 : 2) {
            ForEach(chunks, id: \.lowerBound) { chunk in
                HStack(spacing: 0) {
                    ForEach(chunk, id: \.self) { i in token(i) }
                }
            }
        }
        // A little larger on an iPad, where the page is held further away.
        .font(.latin(passage.isPoetry ? 22 : 21, scale: model.latinScale * (sizeClass == .regular ? 1.2 : 1)))
        .foregroundStyle(Palette.ink)
        .padding(.bottom, labelled ? 20 : 0)
    }

    private func englishText(_ english: String) -> some View {
        Text(english)
            .font(.prose(.callout))
            .foregroundStyle(Palette.inkMuted)
            .fixedSize(horizontal: false, vertical: true)
            .accessibilityLabel("English: \(english)")
    }

    private func toggleFlag() {
        model.update { $0.toggleFlaggedLine(passage.id, line: line.n) }
    }

    @ViewBuilder
    private func token(_ i: Int) -> some View {
        let opens = clauses.filter { $0.startTok == i }.count
        let closes = clauses.filter { $0.endTok == i }.count
        if opens > 0 { bracket(String(repeating: "[", count: opens)) }
        word(i, line.tokens[i])
        if closes > 0 { bracket(String(repeating: "]", count: closes)) }
        if let noted = annotations.last(where: { $0.endTok == i && $0.hasNote }) {
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

    @ViewBuilder
    private func word(_ i: Int, _ token: Token) -> some View {
        let fill = wash(at: i)
        let mark = underline(at: i)
        let labels = underlines.filter { $0.startTok == i }.compactMap { $0.roleValue?.short }
        let isSelected = selected?.contains(i) ?? false
        let text = Text(token.text)
            .padding(.horizontal, token.isWord ? 1 : 0)
            .background {
                if let fill {
                    PillSegment(start: fill.start, end: fill.end)
                        .fill(fill.color)
                        .padding(.leading, fill.start ? -3 : 0)
                        .padding(.trailing, fill.end ? -3 : 0)
                }
            }
            .overlay(alignment: .bottom) {
                if isSelected {
                    Rectangle().fill(Palette.rubric).frame(height: 1.5)
                }
            }
            .overlay(alignment: .bottom) {
                if let mark, let role = mark.roleValue {
                    MarkRule(double: role == .verb)
                        .stroke(Ink.mark(role), style: StrokeStyle(lineWidth: 1.5, lineCap: .round, dash: Ink.dash(role)))
                        .frame(height: role == .verb ? 4.5 : 1.5)
                        .offset(y: role == .verb ? 7 : 4)
                        .allowsHitTesting(false)
                }
            }
            .overlay(alignment: .bottomLeading) {
                if !labels.isEmpty {
                    Text(labels.joined(separator: " · "))
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(Palette.inkMuted)
                        .fixedSize()
                        .offset(y: 21)
                        .allowsHitTesting(false)
                        .accessibilityHidden(true)
                }
            }
        if token.isWord {
            text
                .contentShape(Rectangle())
                .onTapGesture(coordinateSpace: .global) { onTap(i, $0) }
                .onLongPressGesture(minimumDuration: 0.35, maximumDistance: 14) { onHold(i) }
                .accessibilityAddTraits(isSelected ? [.isButton, .isSelected] : .isButton)
                .accessibilityValue(describe(i))
                .accessibilityIdentifier("word-\(line.n)-\(token.text)")
                .accessibilityHint(hint)
        } else {
            text
        }
    }

    private func bracket(_ s: String) -> some View {
        Text(s)
            .fontWeight(.semibold)
            .foregroundStyle(Palette.rubric)
            .accessibilityLabel(s == "[" ? "clause begins" : "clause ends")
    }

    private var hint: String {
        if markingUp { return "Selects the word. Tap another word to take in everything between." }
        return glossaryEnabled ? "Shows the gloss. Touch and hold to select it." : "Touch and hold to select it."
    }

    /// What VoiceOver says after the word: its colour, marks, and whether
    /// it is selected.
    private func describe(_ i: Int) -> String {
        var parts: [String] = []
        if let p = winner(i)?.shownPigment { parts.append("highlighted \(p.plainName)") }
        for m in marks where i >= m.startTok && i <= m.endTok {
            if let r = m.roleValue { parts.append(r.label.lowercased()) }
        }
        if selected?.contains(i) ?? false { parts.append("selected") }
        return parts.joined(separator: ", ")
    }

    /// The newest highlight covering a token is the one shown, as on the web.
    private func winner(_ i: Int) -> Annotation? {
        annotations.last { $0.color != nil && i >= $0.startTok && i <= $0.endTok }
    }

    private func wash(at i: Int) -> Wash? {
        if let sel = selected, sel.contains(i) {
            // A selected highlight keeps its colour; the rubric rule under it
            // says it is selected.
            let color = winner(i)?.shownPigment.map(Ink.wash) ?? Palette.redTint
            return Wash(color: color, start: i == sel.lowerBound, end: i == sel.upperBound)
        }
        if glossed == i { return Wash(color: Palette.redTint, start: true, end: true) }
        guard let a = winner(i), let p = a.shownPigment else { return nil }
        let start = i == 0 || winner(i - 1)?.id != a.id
        let end = i + 1 >= line.tokens.count || winner(i + 1)?.id != a.id
        return Wash(color: Ink.wash(p), start: start, end: end)
    }

    private var underlines: [SyntaxMark] {
        marks.filter { $0.roleValue != nil && $0.roleValue != .clause }
    }

    private var clauses: [SyntaxMark] {
        marks.filter { $0.roleValue == .clause }
    }

    /// The innermost mark decides a word's underline.
    private func underline(at i: Int) -> SyntaxMark? {
        underlines
            .filter { i >= $0.startTok && i <= $0.endTok }
            .min { ($0.endTok - $0.startTok) < ($1.endTok - $1.startTok) }
    }

    private var showNumber: Bool {
        !passage.citesByLine || english != nil || line.n % 5 == 0 || line.n == passage.lines.first?.n
    }

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

/// One token's share of a highlight: a pill, with round ends only where the
/// run of words starts and stops, so a phrase reads as one stroke of colour.
private nonisolated struct PillSegment: Shape {
    var start: Bool
    var end: Bool

    // SwiftUI's Path, spelled out: LectioCore has a `Path` too (the course's
    // adaptive path), and a bare `Path` in a type is ambiguous here.
    func path(in rect: CGRect) -> SwiftUI.Path {
        let full = rect.height / 2
        // A short word with both ends round can't take more than half its width.
        let r = min(full, start && end ? rect.width / 2 : rect.width)
        return UnevenRoundedRectangle(topLeadingRadius: start ? r : 0, bottomLeadingRadius: start ? r : 0,
                                      bottomTrailingRadius: end ? r : 0, topTrailingRadius: end ? r : 0,
                                      style: .circular)
            .path(in: rect)
    }
}

/* ------------------------------------------------------------------ */
/* The mark-up bar                                                      */
/* ------------------------------------------------------------------ */

/// What can be done with the selected words: colour them, mark what part of
/// the sentence they are, write a note, ask the tutor, copy, or take it all
/// off. One bar for every way of selecting, as on the web.
private struct MarkupBar: View {
    let text: String
    let lines: String
    @Binding var panel: BarPanel
    let pigment: Pigment?
    let role: SyntaxRole?
    let hasExisting: Bool
    let hasNote: Bool
    let onPigment: (Pigment) -> Void
    let onRole: (SyntaxRole) -> Void
    let onNote: () -> Void
    let onAsk: () -> Void
    let onCopy: () -> Void
    let onRemove: () -> Void
    let onDone: () -> Void

    @State private var group: SyntaxRole.Group = .sentence

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                Text("“\(text)”")
                    .font(.latinItalic(17))
                    .foregroundStyle(Palette.ink2)
                    .lineLimit(1)
                    .truncationMode(.middle)
                Text(lines).quietLabel().fixedSize()
                Spacer(minLength: 8)
                Button("Done", action: onDone)
                    .font(.subheadline.weight(.semibold))
                    .tint(Palette.rubric)
                    .accessibilityIdentifier("highlight-done")
            }
            switch panel {
            case .main: main
            case .roles: roles
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .lectioGlass(in: RoundedRectangle(cornerRadius: 26, style: .continuous))
        .padding(.horizontal, 12)
        .padding(.bottom, 6)
        .frame(maxWidth: 560)
        .sensoryFeedback(.selection, trigger: pigment)
        .sensoryFeedback(.selection, trigger: role)
    }

    private var main: some View {
        VStack(spacing: 8) {
            HStack(spacing: 0) {
                ForEach(Array(Pigment.allCases.enumerated()), id: \.element) { n, p in
                    swatch(p, key: n + 1)
                }
            }
            Hairline(color: Palette.hair)
            HStack(spacing: 0) {
                action(role.map { "Marked \($0.short)" } ?? "Mark part", systemImage: "underline", id: "highlight-mark") {
                    panel = .roles
                }
                action(hasNote ? "Edit note" : "Note", systemImage: "square.and.pencil", id: "highlight-note", run: onNote)
                action("Ask", systemImage: "sparkles", id: "highlight-ask", run: onAsk)
                action("Copy", systemImage: "doc.on.doc", id: "highlight-copy", run: onCopy)
                if hasExisting {
                    action("Remove", systemImage: "trash", id: "highlight-remove", destructive: true, run: onRemove)
                }
            }
        }
    }

    private func swatch(_ p: Pigment, key: Int) -> some View {
        let on = pigment == p
        return Button { onPigment(p) } label: {
            Circle()
                .fill(Ink.fill(p))
                .frame(width: 28, height: 28)
                .overlay {
                    if on {
                        Image(systemName: "checkmark").font(.caption.bold()).foregroundStyle(.white)
                    }
                }
                .overlay(Circle().strokeBorder(Palette.ink.opacity(on ? 0.4 : 0), lineWidth: 1.5).padding(-4))
                .frame(maxWidth: .infinity, minHeight: 40)
                .contentShape(Rectangle())
        }
        .buttonStyle(PressStyle())
        .help("\(p.plainName.capitalized) · \(key)")
        .accessibilityLabel(on ? "Remove the \(p.plainName) highlight" : "Highlight in \(p.plainName)")
        .accessibilityIdentifier("pigment-\(p.rawValue)")
    }

    private func action(_ title: String, systemImage: String, id: String, destructive: Bool = false,
                        run: @escaping () -> Void) -> some View {
        Button(action: run) {
            VStack(spacing: 4) {
                Image(systemName: systemImage)
                    .font(.system(size: 17, weight: .medium))
                    .frame(height: 22)
                Text(title)
                    .font(.caption2.weight(.medium))
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
            .foregroundStyle(destructive ? Palette.incorrect : Palette.ink)
            .frame(maxWidth: .infinity, minHeight: 48)
            .contentShape(Rectangle())
        }
        .buttonStyle(PressStyle())
        .accessibilityIdentifier(id)
    }

    private var roles: some View {
        VStack(alignment: .leading, spacing: 10) {
            Picker("Kind of mark", selection: $group) {
                Text("Sentence").tag(SyntaxRole.Group.sentence)
                Text("Case").tag(SyntaxRole.Group.case)
                Text("Construction").tag(SyntaxRole.Group.construction)
            }
            .pickerStyle(.segmented)
            LazyVGrid(columns: [GridItem(.flexible(), spacing: 8), GridItem(.flexible(), spacing: 8)], spacing: 8) {
                ForEach(SyntaxRole.allCases.filter { $0.group == group }, id: \.self) { r in
                    chip(r)
                }
            }
            Button("Back", systemImage: "chevron.backward") { panel = .main }
                .font(.subheadline)
                .tint(Palette.rubric)
        }
        .onAppear { if let role { group = role.group } }
    }

    private func chip(_ r: SyntaxRole) -> some View {
        let on = role == r
        return Button { onRole(r) } label: {
            HStack(spacing: 8) {
                Text(r.short)
                    .font(.footnote.weight(.bold))
                    .foregroundStyle(Palette.rubric)
                    .frame(minWidth: 34, alignment: .leading)
                Text(r.label)
                    .font(.footnote)
                    .foregroundStyle(Palette.ink)
                    .lineLimit(1)
                    .minimumScaleFactor(0.75)
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 9)
            .background(on ? Palette.redTint : Palette.slip.opacity(0.7), in: .rect(cornerRadius: 10))
            .overlay(RoundedRectangle(cornerRadius: 10).strokeBorder(on ? Palette.rubric : Palette.rule,
                                                                     lineWidth: on ? 1 : 0.5))
            .contentShape(Rectangle())
        }
        .buttonStyle(PressStyle())
        .accessibilityLabel(r.label)
        .accessibilityHint(on ? "Takes the mark off" : r.hint)
        .accessibilityAddTraits(on ? .isSelected : [])
    }
}

/// In mark-up mode with nothing selected yet: what to do, and the way out.
private struct MarkupHint: View {
    let onDone: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "hand.tap").foregroundStyle(Palette.rubric)
            Text("Tap the first word, then the last.")
                .font(.subheadline)
                .foregroundStyle(Palette.ink2)
            Spacer(minLength: 4)
            Button("Done", action: onDone)
                .font(.subheadline.weight(.semibold))
                .tint(Palette.rubric)
                .accessibilityIdentifier("markup-done")
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 12)
        .lectioGlass(in: .capsule)
        .padding(.horizontal, 16)
        .padding(.bottom, 8)
        .frame(maxWidth: 520)
    }
}
