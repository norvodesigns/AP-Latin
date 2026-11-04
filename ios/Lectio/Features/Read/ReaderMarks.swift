import LectioCore
import SwiftUI
import UIKit

/*
 * What the Reader, the gloss sheet and the notes sheet share: how the
 * pigments and sentence marks are drawn, the note editor, and printing a
 * study sheet.
 */

/* ------------------------------------------------------------------ */
/* Pigments and marks                                                  */
/* ------------------------------------------------------------------ */

enum Ink {
    /// A pigment's swatch: the colour at full strength.
    static func fill(_ p: Pigment) -> Color {
        switch p {
        case .gilt: Palette.gilt
        case .rubric: Palette.rubric
        default: Color("Fill" + p.rawValue.capitalized)
        }
    }

    /// A pigment's wash, the highlight behind the words.
    static func wash(_ p: Pigment) -> Color {
        Color("Wash" + p.rawValue.capitalized)
    }

    /// A sentence mark's underline colour, as on the web: blue for the
    /// subject, red for the verb, green for objects, gold for a case, grey
    /// for a construction.
    static func mark(_ role: SyntaxRole) -> Color {
        switch role {
        case .subject: Color("MarkSubject")
        case .verb: Palette.rubric
        case .object, .indirect: Color("MarkObject")
        default: role.group == .case ? Color("MarkCase") : Color("MarkConstruction")
        }
    }

    /// Solid, double (the verb), dashed (the direct object) or dotted.
    static func dash(_ role: SyntaxRole) -> [CGFloat] {
        switch role {
        case .object: [5, 3]
        case .indirect: [0.1, 3.5]
        default: role.group == .construction ? [0.1, 3.5] : []
        }
    }
}

/// A sentence mark's underline: one rule, or two for the verb.
nonisolated struct MarkRule: Shape {
    var double = false

    func path(in rect: CGRect) -> Path {
        var p = Path()
        p.move(to: CGPoint(x: rect.minX, y: rect.minY + 0.75))
        p.addLine(to: CGPoint(x: rect.maxX, y: rect.minY + 0.75))
        if double {
            p.move(to: CGPoint(x: rect.minX, y: rect.maxY - 0.75))
            p.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY - 0.75))
        }
        return p
    }
}

/// A short sample of a mark's underline, for the key.
struct MarkSample: View {
    let role: SyntaxRole

    var body: some View {
        MarkRule(double: role == .verb)
            .stroke(Ink.mark(role), style: StrokeStyle(lineWidth: 1.5, lineCap: .round, dash: Ink.dash(role)))
            .frame(width: 22, height: role == .verb ? 4.5 : 1.5)
            .accessibilityHidden(true)
    }
}

extension Passage {
    /// "line 4", "lines 4–6", or "section 3" in prose.
    func linesLabel(_ pieces: [RangePiece]) -> String {
        guard let first = pieces.first, let last = pieces.last else { return "" }
        let word = isPoetry ? "line" : "section"
        return first.lineN == last.lineN ? "\(word) \(first.lineN)" : "\(word)s \(first.lineN)–\(last.lineN)"
    }
}

/* ------------------------------------------------------------------ */
/* Notes                                                               */
/* ------------------------------------------------------------------ */

/// A note being written on some words. The note lives on the selection's
/// last piece, so its mark sits after the whole phrase, as on the web.
nonisolated struct NoteTarget: Identifiable, Sendable {
    let pieces: [RangePiece]
    /// The highlight already holding a note on these words, if any.
    let notedId: String?
    /// Whatever is stored on exactly the last piece, which a new note joins.
    let lastId: String?
    let group: String?
    let note: String
    let lines: String

    var id: String { pieces.map { "\($0.lineN):\($0.startTok)-\($0.endTok)" }.joined(separator: ",") }
    var text: String { piecesText(pieces) }

    static func on(_ pieces: [RangePiece], in state: PassageState, lines: String) -> NoteTarget {
        let anns = matchPieces(pieces, in: state.annotations)
        let noted = anns.reversed().compactMap { $0 }.first { $0.hasNote }
        let last = anns.last.flatMap { $0 }
        return NoteTarget(pieces: pieces, notedId: noted?.id, lastId: last?.id,
                          group: anns.compactMap { $0?.group }.first, note: noted?.note ?? "", lines: lines)
    }
}

struct NoteEditor: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    let target: NoteTarget
    let passageId: String
    @State private var draft = ""
    @FocusState private var focused: Bool

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 14) {
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Text("“\(target.text)”")
                        .font(.latinItalic(19))
                        .foregroundStyle(Palette.ink2)
                        .lineLimit(2)
                    Text(target.lines).quietLabel()
                }
                TextEditor(text: $draft)
                    .focused($focused)
                    .font(.prose())
                    .scrollContentBackground(.hidden)
                    .padding(10)
                    .background(Palette.slip, in: .rect(cornerRadius: 12))
                    .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(Palette.rule, lineWidth: 0.5))
                    .accessibilityIdentifier("note-editor")
                if target.notedId != nil {
                    Button("Delete note", systemImage: "trash", role: .destructive) {
                        draft = ""
                        save()
                    }
                    .font(.subheadline)
                }
            }
            .padding(20)
            .background(Palette.parchment.ignoresSafeArea())
            .navigationTitle(target.notedId == nil ? "New note" : "Note")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save", action: save).accessibilityIdentifier("note-save")
                }
            }
        }
        .presentationDetents([.medium, .large])
        .onAppear {
            draft = target.note
            focused = true
        }
    }

    /// The web's `commitNote`: edit the note that's there, or hang a new one
    /// on the last piece, giving it a colourless highlight if it has none.
    private func save() {
        let note = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        model.update { doc in
            if let id = target.notedId {
                doc.setAnnotationNote(passageId: passageId, annotationId: id, note: note)
                return
            }
            guard !note.isEmpty, let last = target.pieces.last else { return }
            let id = target.lastId ?? doc.setHighlight(
                passageId: passageId, lineN: last.lineN, startTok: last.startTok, endTok: last.endTok,
                // A note on a phrase with no colour lives on its last line
                // alone, so it carries the whole phrase as its text.
                text: target.pieces.count > 1 ? target.text : last.text,
                color: nil, group: target.group
            ).id
            doc.setAnnotationNote(passageId: passageId, annotationId: id, note: note)
            doc.markStudied()
        }
        dismiss()
    }
}

/* ------------------------------------------------------------------ */
/* Printing                                                            */
/* ------------------------------------------------------------------ */

enum StudySheetPrinter {
    /// Opens the system print sheet on a passage's study sheet, or a clean
    /// handout. The sheet's own share button saves it as a PDF.
    static func present(passage: Passage, state: PassageState, kind: StudySheet.Kind, withEnglish: Bool) {
        let html = StudySheet.html(passage: passage, state: state, kind: kind, withEnglish: withEnglish)
        let info = UIPrintInfo(dictionary: nil)
        info.outputType = .general
        info.jobName = "\(passage.citation) – \(kind == .study ? "study sheet" : "handout")"
        let formatter = UIMarkupTextPrintFormatter(markupText: html)
        formatter.perPageContentInsets = UIEdgeInsets(top: 44, left: 50, bottom: 44, right: 50)
        let controller = UIPrintInteractionController.shared
        controller.printInfo = info
        controller.printFormatter = formatter
        _ = controller.present(animated: true, completionHandler: nil)
    }
}
