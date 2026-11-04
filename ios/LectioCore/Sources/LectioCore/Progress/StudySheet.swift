import Foundation

/// A passage with the reader's marks on it, as a printable HTML page: the
/// iPhone and iPad version of the web Reader's study sheet. Highlights in
/// their pigments, sentence-part marks as labelled underlines, subordinate
/// clauses in brackets, and notes numbered in the text. Without the English,
/// each note is printed beside the line it is on; with the English beside
/// the Latin, the notes start on a page of their own after the text.
///
/// Plain HTML and inline CSS, so `UIMarkupTextPrintFormatter` can paginate it
/// and the same page can be shared as a file.
public enum StudySheet {
    public enum Kind: Sendable {
        /// Colours, marks and numbered notes.
        case study
        /// The Latin alone, double-spaced, for writing on.
        case clean
    }

    public static func html(passage: Passage, state: PassageState, kind: Kind = .study, withEnglish: Bool = false,
                            date: Date = Date()) -> String {
        let marked = kind == .study
        let annotations = marked ? state.annotations : []
        let marks = marked ? state.allMarks : []
        let notes = annotations
            .filter(\.hasNote)
            .sorted { ($0.lineN, $0.startTok) < ($1.lineN, $1.startTok) }
        var numbers: [String: Int] = [:]
        for (i, a) in notes.enumerated() { numbers[a.id] = i + 1 }

        var body = ""
        body += "<header><p class=\"cite\">\(esc(passage.authorLabel)), \(esc(passage.citation))</p>"
        body += "<h1>\(esc(passage.title))</h1></header>"
        if let salutation = passage.salutation { body += "<p class=\"salutation\">\(esc(salutation))</p>" }

        // Without the English, the notes go in a column beside their lines;
        // with it, the English takes that column and the notes follow the
        // text on a new page.
        let english = withEnglish && passage.lines.contains { $0.english != nil }
        let besideLines = marked && !english && !notes.isEmpty
        // A table rather than flex rows: the print formatter's renderer is
        // most dependable with tables, and a row never splits across pages.
        let layout = english ? " with-english" : besideLines ? " with-notes" : ""
        body += "<table class=\"text \(passage.citesByLine ? "verse" : "prose")\(layout)\">"
        for line in passage.lines {
            let lineAnns = annotations.filter { $0.lineN == line.n }
            let lineMarks = marks.filter { $0.lineN == line.n }
            let labelled = lineMarks.contains { $0.roleValue != .clause }
            let flagged = marked && state.flaggedLines.contains(line.n)
            body += "<tr class=\"row\(labelled ? " labelled" : "")\">"
            body += "<td class=\"n\(flagged ? " flagged" : "")\">\(line.n)</td><td class=\"line\">"
            body += "<p class=\"latin\">\(lineHTML(line, annotations: lineAnns, marks: lineMarks, numbers: numbers))</p></td>"
            if english {
                body += "<td class=\"english\">\(esc(line.english ?? ""))</td>"
            } else if besideLines {
                body += "<td class=\"line-notes\">"
                for a in notes where a.lineN == line.n {
                    let text = groupOf(a, in: state.annotations).map(\.text).joined(separator: " ")
                    body += "<p><b>\(numbers[a.id] ?? 0)</b><i>\(esc(text))</i> — \(esc(a.note))</p>"
                }
                body += "</td>"
            }
            body += "</tr>"
        }
        body += "</table>"

        if marked {
            let passageNotes = !state.notes.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            let used = SyntaxRole.allCases.filter { role in marks.contains { $0.roleValue == role } }
            let hasBack = passageNotes || (!notes.isEmpty && !besideLines) || !state.flaggedLines.isEmpty || !used.isEmpty
            if hasBack { body += english ? "<section class=\"back new-page\">" : "<section class=\"back\">" }
            if passageNotes {
                body += "<h2>Notes on the passage</h2><p class=\"prose-note\">\(esc(state.notes))</p>"
            }
            if !notes.isEmpty && !besideLines {
                body += "<h2>Notes</h2><ol class=\"notes\">"
                for a in notes {
                    let text = groupOf(a, in: state.annotations).map(\.text).joined(separator: " ")
                    body += "<li><b>\(numbers[a.id] ?? 0)</b><span><i>\(esc(text))</i> "
                    body += "<span class=\"faint\">(\(passage.lineWord) \(a.lineN))</span> — \(esc(a.note))</span></li>"
                }
                body += "</ol>"
            }
            if !state.flaggedLines.isEmpty {
                let lines = state.flaggedLines.sorted().map(String.init).joined(separator: ", ")
                let word = passage.lineWord + (state.flaggedLines.count > 1 ? "s" : "")
                body += "<p class=\"small\"><b>Flagged as hard:</b> \(word) \(lines)</p>"
            }
            if !used.isEmpty {
                let key = used.map { r in
                    let sample = r == .clause
                        ? "<span class=\"br\">[ ]</span>"
                        : "<span class=\"mk \(markClass(r))\">\(esc(r.short))</span>"
                    return "\(sample) \(esc(r.label.lowercased()))"
                }.joined(separator: " · ")
                body += "<p class=\"small\"><b>Key:</b> \(key)</p>"
            }
            if hasBack { body += "</section>" }
        }

        let stamp = DateFormatter.localizedString(from: date, dateStyle: .medium, timeStyle: .none)
        let source = passage.project.map { "College Board's \($0) Course Project passages (the Latin is public domain)" }
            ?? "The Latin Library (public domain)"
        body += "<footer>Latin text: \(esc(source)). \(marked ? "Study sheet" : "Handout") printed from Lectio, \(esc(stamp)).</footer>"

        return """
        <!doctype html><html><head><meta charset="utf-8"><title>\(esc(passage.citation))</title>
        <style>\(css(kind: kind))</style></head><body>\(body)</body></html>
        """
    }

    /* -------------------------------------------------------------- */

    /// One line of Latin with its marks, the same rules as the web's
    /// `AnnotatedLine`: the newest highlight covering a word shows, the
    /// innermost underline decides a word's style, a mark's label sits under
    /// its first word, and a note's number follows its last word.
    static func lineHTML(_ line: PassageLine, annotations: [Annotation], marks: [SyntaxMark],
                         numbers: [String: Int]) -> String {
        let underlines = marks.filter { $0.roleValue != .clause }
        let clauses = marks.filter { $0.roleValue == .clause }
        func winner(_ i: Int) -> Annotation? {
            annotations.last { $0.color != nil && i >= $0.startTok && i <= $0.endTok }
        }
        func underline(_ i: Int) -> SyntaxMark? {
            underlines.filter { i >= $0.startTok && i <= $0.endTok }
                .min { ($0.endTok - $0.startTok) < ($1.endTok - $1.startTok) }
        }

        var out = ""
        var openRun: String?
        for (i, token) in line.tokens.enumerated() {
            let runId = winner(i)?.id
            if runId != openRun {
                if openRun != nil { out += "</span>" }
                if let runId, let a = annotations.first(where: { $0.id == runId }), let p = a.shownPigment {
                    out += "<span class=\"hl\" style=\"background:\(wash(p))\">"
                }
                openRun = runId
            }
            var piece = ""
            let opens = clauses.filter { $0.startTok == i }.count
            let closes = clauses.filter { $0.endTok == i }.count
            if opens > 0 { piece += "<span class=\"br\">\(String(repeating: "[", count: opens))</span>" }
            piece += esc(token.text)
            if closes > 0 { piece += "<span class=\"br\">\(String(repeating: "]", count: closes))</span>" }
            let labels = underlines.filter { $0.startTok == i }.compactMap { $0.roleValue?.short }
            if !labels.isEmpty { piece += "<span class=\"lbl\">\(esc(labels.joined(separator: " · ")))</span>" }
            if let mk = underline(i), let role = mk.roleValue {
                piece = "<span class=\"mk \(markClass(role))\(labels.isEmpty ? "" : " has-lbl")\">\(piece)</span>"
            } else if !labels.isEmpty {
                piece = "<span class=\"has-lbl\">\(piece)</span>"
            }
            out += piece
            for a in annotations where a.hasNote && a.endTok == i {
                if let n = numbers[a.id] { out += "<sup>\(n)</sup>" }
            }
        }
        if openRun != nil { out += "</span>" }
        return out
    }

    static func markClass(_ role: SyntaxRole) -> String {
        switch role {
        case .subject: "mk-s"
        case .verb: "mk-v"
        case .object: "mk-o"
        case .indirect: "mk-io"
        default: role.group == .case ? "mk-case" : "mk-con"
        }
    }

    /// The pigments' washes on white paper (the light theme's).
    static func wash(_ p: Pigment) -> String {
        switch p {
        case .gilt: "#e3d3a6"
        case .minium: "#ecc6a6"
        case .rubric: "#e6c2b9"
        case .madder: "#ecc6cf"
        case .murex: "#d6c4df"
        case .woad: "#bccbdb"
        case .azurite: "#b5dbe8"
        case .verdigris: "#bcd6c9"
        }
    }

    static func esc(_ s: String) -> String {
        s.replacingOccurrences(of: "&", with: "&amp;")
            .replacingOccurrences(of: "<", with: "&lt;")
            .replacingOccurrences(of: ">", with: "&gt;")
            .replacingOccurrences(of: "\"", with: "&quot;")
            .replacingOccurrences(of: "\n", with: "<br>")
    }

    static func css(kind: Kind) -> String {
        let leading = kind == .clean ? "2.6" : "2.2"
        return """
        @page { margin: 0.6in 0.7in; }
        body { font-family: 'Iowan Old Style', Palatino, Georgia, serif; color: #111; background: #fff; margin: 0; -webkit-print-color-adjust: exact; }
        header .cite { font: 600 8pt -apple-system, Helvetica, sans-serif; letter-spacing: 0.12em; text-transform: uppercase; color: #555; margin: 0 0 4pt; }
        h1 { font-weight: 500; font-size: 20pt; margin: 0 0 14pt; }
        h2 { font: 600 8pt -apple-system, Helvetica, sans-serif; letter-spacing: 0.12em; text-transform: uppercase; color: #555; margin: 18pt 0 6pt; }
        .salutation { font-style: italic; color: #444; margin: 0 0 10pt; }
        .text { border-left: 0.75pt solid #c9867c; border-collapse: separate; border-spacing: 0; width: 100%; }
        .row { break-inside: avoid; page-break-inside: avoid; }
        .row td { vertical-align: baseline; padding: 0; }
        .row.labelled .latin { padding-bottom: 12pt; }
        td.n { font: 8pt -apple-system, Helvetica, sans-serif; color: #777; width: 20pt; text-align: right; padding: 0 12pt 0 14pt; white-space: nowrap; }
        td.n.flagged { color: #8a6d24; font-weight: 700; }
        .latin { margin: 0; font-size: 13pt; line-height: \(leading); }
        .prose .latin { line-height: \(kind == .clean ? "2.6" : "2.0"); }
        .prose td.line { padding-bottom: 8pt; }
        td.english { width: 40%; padding: 0 0 0 14pt; font-size: 9.5pt; line-height: 1.4; color: #444; border-left: 0.5pt solid #ddd; }
        .with-english .latin { font-size: 11.5pt; line-height: 1.9; padding-bottom: 6pt; }
        .with-english .row.labelled .latin { padding-bottom: 14pt; }
        .with-notes .latin { font-size: 12pt; }
        td.line-notes { width: 31%; padding: 0 0 2pt 14pt; font: 8.5pt -apple-system, Helvetica, sans-serif; line-height: 1.4; color: #333; }
        td.line-notes p { margin: 0 0 3pt; }
        td.line-notes p:last-child { margin-bottom: 0; }
        td.line-notes b { color: #9d2f24; margin-right: 4pt; }
        td.line-notes i { font-family: 'Iowan Old Style', Palatino, Georgia, serif; font-size: 9.5pt; }
        .new-page { break-before: page; page-break-before: always; }
        .new-page h2:first-child { margin-top: 0; }
        .hl { border-radius: 1em; padding: 0.04em 0.28em; margin: 0 -0.28em; -webkit-box-decoration-break: clone; box-decoration-break: clone; }
        .mk { text-decoration-line: underline; text-underline-offset: 0.22em; text-decoration-thickness: 1.5pt; }
        .mk-s { text-decoration-color: #2f5478; }
        .mk-v { text-decoration-color: #9d2f24; text-decoration-style: double; }
        .mk-o { text-decoration-color: #2f6e57; text-decoration-style: dashed; }
        .mk-io { text-decoration-color: #2f6e57; text-decoration-style: dotted; }
        .mk-case { text-decoration-color: #8a6a1f; }
        .mk-con { text-decoration-color: #6d6455; text-decoration-style: dotted; }
        .has-lbl { position: relative; }
        .lbl { position: absolute; left: 0; top: 20.5pt; font: 600 6.5pt -apple-system, Helvetica, sans-serif; color: #555; white-space: nowrap; text-decoration: none; line-height: 1; }
        .br { color: #9d2f24; font-weight: 600; }
        sup { font: 600 7pt -apple-system, Helvetica, sans-serif; color: #9d2f24; margin-left: 1pt; }
        .notes { list-style: none; padding: 0; margin: 0; font: 9.5pt -apple-system, Helvetica, sans-serif; line-height: 1.45; }
        .notes li { display: flex; gap: 6pt; margin-bottom: 5pt; break-inside: avoid; }
        .notes li b { min-width: 14pt; color: #9d2f24; }
        .notes i { font-family: 'Iowan Old Style', Palatino, Georgia, serif; }
        .faint { color: #666; }
        .prose-note, .small { font: 9.5pt -apple-system, Helvetica, sans-serif; line-height: 1.5; margin: 0 0 8pt; }
        footer { margin-top: 20pt; font: 7.5pt -apple-system, Helvetica, sans-serif; color: #777; }
        """
    }
}
