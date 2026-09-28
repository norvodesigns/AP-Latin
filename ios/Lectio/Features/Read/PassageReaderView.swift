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

/// One passage, set as a manuscript page: line numbers in the margin, the
/// Latin as large as the screen allows, and every word tappable for its
/// gloss. The glass lives only in the toolbar and the glossary sheet.
struct PassageReaderView: View {
    @Environment(AppModel.self) private var model
    let passage: Passage

    @State private var selection: WordSelection?
    @State private var showSummary = false

    var body: some View {
        let state = model.progress.passage(passage.id)
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
                        flagged: state.flaggedLines.contains(line.n),
                        selected: selection?.lineN == line.n ? selection?.tokenIndex : nil,
                        glossaryEnabled: model.progress.glossaryEnabled,
                        onWord: select
                    )
                }
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 60)
            .frame(maxWidth: 760, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
        .pageBackground()
        .navigationTitle(passage.citation)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar { toolbar(state: state) }
        .sheet(item: $selection) { GlossarySheet(selection: $0) }
        .sheet(isPresented: $showSummary) { SummarySheet(passage: passage) }
        .onAppear { model.update { $0.markOpened(passage.id) } }
    }

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

    @ToolbarContentBuilder
    private func toolbar(state: PassageState) -> some ToolbarContent {
        ToolbarItemGroup(placement: .topBarTrailing) {
            Button(state.bookmarked ? "Remove bookmark" : "Bookmark",
                   systemImage: state.bookmarked ? "bookmark.fill" : "bookmark") {
                model.update { $0.toggleBookmark(passage.id) }
            }
            .sensoryFeedback(.selection, trigger: state.bookmarked)

            Menu("Reading options", systemImage: "textformat.size") {
                Toggle(isOn: Binding(
                    get: { model.progress.glossaryEnabled },
                    set: { _ in model.update { $0.toggleGlossary() } }
                )) {
                    Label("Glossary (off for a cold read)", systemImage: "character.book.closed")
                }
                Button("Summary and context", systemImage: "text.alignleft") { showSummary = true }
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

    private func select(_ selection: WordSelection) {
        self.selection = selection
        // Looking a word up is how vocabulary gets tracked, exactly as on the
        // web: an exact dictionary match seeds it into the review rotation.
        // Stem matches are guesses and are not trusted enough to seed.
        if let top = selection.token.glosses.first, top.isExact {
            model.update {
                $0.encounterWord(top.id, passageId: selection.passageId)
                $0.markStudied()
            }
        }
    }
}

/* ------------------------------------------------------------------ */
/* A line                                                              */
/* ------------------------------------------------------------------ */

private struct LineRow: View {
    @Environment(AppModel.self) private var model
    let passage: Passage
    let line: PassageLine
    let flagged: Bool
    let selected: Int?
    let glossaryEnabled: Bool
    let onWord: (WordSelection) -> Void

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 12) {
            // Verse is numbered every fifth line, as printed; prose sections always.
            Text(showNumber ? "\(line.n)" : "")
                .font(.caption.monospacedDigit())
                .foregroundStyle(flagged ? Palette.rubric : Palette.inkFaint)
                .frame(width: 30, alignment: .trailing)
                .accessibilityHidden(!showNumber)

            FlowLayout(lineSpacing: 2) {
                ForEach(chunks, id: \.lowerBound) { chunk in
                    ChunkView(chunk: chunk, tokens: line.tokens, selected: selected, glossaryEnabled: glossaryEnabled) { index in
                        onWord(WordSelection(passageId: passage.id, lineN: line.n, tokenIndex: index, token: line.tokens[index]))
                    }
                }
            }
            .font(.latin(passage.isPoetry ? 22 : 21, scale: model.latinScale))
            .foregroundStyle(Palette.ink)
        }
        .padding(.vertical, passage.isPoetry ? 3 : 8)
        .contextMenu {
            Button(flagged ? "Unflag line \(line.n)" : "Flag line \(line.n) as hard",
                   systemImage: flagged ? "flag.slash" : "flag") {
                model.update { $0.toggleFlaggedLine(passage.id, line: line.n) }
            }
        }
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

private struct ChunkView: View {
    let chunk: Range<Int>
    let tokens: [Token]
    let selected: Int?
    let glossaryEnabled: Bool
    let onTap: (Int) -> Void

    var body: some View {
        HStack(spacing: 0) {
            ForEach(chunk, id: \.self) { i in
                let token = tokens[i]
                if token.isWord, glossaryEnabled {
                    Button { onTap(i) } label: {
                        Text(token.text)
                            .padding(.horizontal, 1)
                            .background(selected == i ? Palette.redTint : .clear, in: .rect(cornerRadius: 4))
                    }
                    .buttonStyle(WordButtonStyle())
                } else {
                    Text(token.text)
                }
            }
        }
    }
}

/// A word gives slightly under the finger, like the web's pressed state.
private struct WordButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .foregroundStyle(configuration.isPressed ? Palette.rubric : Palette.ink)
            .scaleEffect(configuration.isPressed ? 0.96 : 1)
            .animation(.spring(duration: 0.2), value: configuration.isPressed)
    }
}

/* ------------------------------------------------------------------ */
/* Summary                                                              */
/* ------------------------------------------------------------------ */

private struct SummarySheet: View {
    let passage: Passage

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    Text("Summary").rubricLabel()
                    Text(passage.summary).font(.prose())
                    Text("Context").rubricLabel()
                    Text(passage.context).font(.prose())
                    if !passage.themes.isEmpty {
                        Text("Themes").rubricLabel()
                        Text(passage.themes.joined(separator: " · ")).font(.prose(.callout)).foregroundStyle(Palette.ink2)
                    }
                }
                .foregroundStyle(Palette.ink)
                .padding(20)
            }
            .navigationTitle(passage.citation)
            .navigationBarTitleDisplayMode(.inline)
        }
        .presentationDetents([.medium, .large])
    }
}
