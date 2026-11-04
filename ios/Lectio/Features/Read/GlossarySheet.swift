import LectioCore
import SwiftUI

/// The gloss for a tapped word: a sheet over the page, short enough that the
/// line it came from stays in view. Tapping another word changes what it
/// shows without closing it.
///
/// It is for reading the word. Anything the reader has put on the word is
/// listed under "On your page", with a way to take it off or edit the note,
/// but colouring, marking and writing notes all happen in mark-up, so the
/// two never do the same job.
struct GlossarySheet: View {
    @Environment(AppModel.self) private var model
    @Environment(\.library) private var library
    let passage: Passage
    let selection: WordSelection
    /// Opens the line tutor on this word's line.
    var onAsk: (() -> Void)? = nil
    /// Into mark-up mode with this word selected.
    var onMarkUp: (() -> Void)? = nil
    /// Selects a note's words and opens its editor.
    var onEditNote: ((Annotation) -> Void)? = nil

    var body: some View {
        let state = model.progress.passage(passage.id)
        let own = Self.own(state, selection)
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                HStack(alignment: .firstTextBaseline) {
                    Text(selection.token.text)
                        .font(.latin(34, relativeTo: .largeTitle))
                        .foregroundStyle(Palette.ink)
                    Spacer(minLength: 8)
                    if let onAsk {
                        Button(action: onAsk) {
                            Label("Ask", systemImage: "sparkles")
                                .font(.subheadline.weight(.semibold))
                        }
                        .glassButton()
                        .tint(Palette.rubric)
                        .accessibilityLabel("Ask about this line")
                        .accessibilityIdentifier("gloss-ask")
                    }
                }

                if entries.isEmpty {
                    Text("Not on the vocabulary lists. The exam would gloss a word like this in the margin.")
                        .font(.prose(.callout))
                        .foregroundStyle(Palette.inkMuted)
                } else {
                    ForEach(Array(entries.enumerated()), id: \.offset) { index, item in
                        if index > 0 { Hairline(color: Palette.hair) }
                        EntryView(entry: item.entry, exact: item.gloss.isExact)
                    }
                }

                if !own.anns.isEmpty || !own.marks.isEmpty {
                    Hairline(color: Palette.hair)
                    onYourPage(own, state: state)
                }

                Hairline(color: Palette.hair)
                HStack(alignment: .center, spacing: 12) {
                    if let onMarkUp {
                        Button(action: onMarkUp) {
                            Label("Mark up", systemImage: "highlighter")
                                .font(.subheadline.weight(.semibold))
                        }
                        .glassButton()
                        .tint(Palette.rubric)
                        .accessibilityIdentifier("gloss-markup")
                    }
                    Text("Colour a phrase, mark the parts of the sentence, or write a note.")
                        .font(.footnote)
                        .foregroundStyle(Palette.inkFaint)
                }
            }
            .padding(.horizontal, 24)
            .padding(.top, 28)
            .padding(.bottom, 16)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private var entries: [(gloss: Gloss, entry: VocabEntry)] {
        selection.token.glosses.compactMap { gloss in library?.vocab(gloss.id).map { (gloss, $0) } }
    }

    /// The highlights and notes (one per cross-line group) and the marks on
    /// the tapped word.
    private static func own(_ state: PassageState, _ sel: WordSelection) -> (anns: [Annotation], marks: [SyntaxMark]) {
        let here = TokenPoint(lineN: sel.lineN, tok: sel.tokenIndex)
        var seen = Set<String>()
        let anns = state.annotations.filter { covers($0, here) }.filter { seen.insert($0.group ?? $0.id).inserted }
        let marks = state.allMarks.filter { covers($0, here) }
        return (anns, marks)
    }

    private func onYourPage(_ own: (anns: [Annotation], marks: [SyntaxMark]), state: PassageState) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("On your page").rubricLabel()
            ForEach(own.anns) { a in
                let all = groupOf(a, in: state.annotations)
                let noted = all.first(where: \.hasNote)
                VStack(alignment: .leading, spacing: 8) {
                    if let p = a.shownPigment {
                        HStack(spacing: 10) {
                            Circle().fill(Ink.fill(p)).frame(width: 14, height: 14)
                            Text("Highlighted \(p.plainName)")
                                .font(.subheadline)
                                .foregroundStyle(Palette.ink)
                            Spacer(minLength: 8)
                            Button("Remove highlight") { uncolor(all) }
                                .font(.subheadline)
                                .accessibilityIdentifier("gloss-remove-highlight")
                        }
                    }
                    if let noted {
                        HStack(alignment: .firstTextBaseline, spacing: 10) {
                            Image(systemName: "text.bubble.fill")
                                .font(.footnote)
                                .foregroundStyle(Palette.rubric)
                            Text(noted.note)
                                .font(.prose(.callout))
                                .foregroundStyle(Palette.ink2)
                                .fixedSize(horizontal: false, vertical: true)
                            Spacer(minLength: 8)
                            if let onEditNote {
                                Button("Edit note") { onEditNote(a) }
                                    .font(.subheadline)
                            }
                        }
                    }
                }
            }
            ForEach(own.marks) { m in
                let all = groupOf(m, in: state.allMarks)
                HStack(alignment: .firstTextBaseline, spacing: 10) {
                    Text(m.roleValue?.short ?? m.role)
                        .font(.subheadline.weight(.bold))
                        .foregroundStyle(Palette.rubric)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(m.roleValue?.label ?? m.role)
                            .font(.subheadline)
                            .foregroundStyle(Palette.ink)
                        let words = all.map(\.text).joined(separator: " ")
                        if words != selection.token.text {
                            Text(words)
                                .font(.latinItalic(15))
                                .foregroundStyle(Palette.inkMuted)
                        }
                    }
                    Spacer(minLength: 8)
                    Button("Remove") { removeMarks(all) }
                        .font(.subheadline)
                }
            }
        }
        .tint(Palette.rubric)
    }

    /// Takes the colour off a highlight and the rest of its group; a note on
    /// it stays.
    private func uncolor(_ all: [Annotation]) {
        model.update { doc in
            for x in all {
                doc.setHighlight(passageId: passage.id, lineN: x.lineN, startTok: x.startTok, endTok: x.endTok,
                                 text: x.text, color: nil)
            }
        }
    }

    private func removeMarks(_ all: [SyntaxMark]) {
        model.update { doc in
            for x in all { doc.removeMark(passageId: passage.id, markId: x.id) }
        }
    }
}

private struct EntryView: View {
    let entry: VocabEntry
    let exact: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(entry.lemma)
                .font(.latinItalic(22, relativeTo: .title3))
                .foregroundStyle(Palette.ink)
            HStack(spacing: 10) {
                Text(entry.pos).quietLabel()
                if !exact {
                    // A stem match is the lookup's best guess, and says so.
                    Text("Stem guess").rubricLabel()
                }
                if entry.isSupplementary {
                    Text("Beyond the CED list").quietLabel()
                }
            }
            Text(entry.definition)
                .font(.prose())
                .foregroundStyle(Palette.ink2)
                .fixedSize(horizontal: false, vertical: true)
        }
        .accessibilityElement(children: .combine)
    }
}
