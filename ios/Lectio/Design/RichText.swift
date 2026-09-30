import SwiftUI

/// The course's markup (src/data/curriculum/types.ts), as an AttributedString:
/// `*word*` italic, `**word**` bold, and with `endings`, `puell|ae` sets the
/// ending after the bar in rubric red. The bar never shows.
enum RichText {
    static func attributed(_ text: String, endings: Bool = false) -> AttributedString {
        var out = AttributedString()
        var rest = Substring(text)
        while !rest.isEmpty {
            if rest.hasPrefix("**"), let end = rest.dropFirst(2).range(of: "**") {
                var bold = run(rest[rest.index(rest.startIndex, offsetBy: 2)..<end.lowerBound], endings: endings)
                bold.inlinePresentationIntent = .stronglyEmphasized
                out += bold
                rest = rest[end.upperBound...]
            } else if rest.hasPrefix("*"), let end = rest.dropFirst().firstIndex(of: "*") {
                var italic = run(rest[rest.index(after: rest.startIndex)..<end], endings: endings)
                italic.inlinePresentationIntent = .emphasized
                out += italic
                rest = rest[rest.index(after: end)...]
            } else {
                let next = rest.dropFirst().firstIndex(of: "*") ?? rest.endIndex
                out += run(rest[rest.startIndex..<next], endings: endings)
                rest = rest[next...]
            }
        }
        return out
    }

    /// Plain text, with endings marked when asked.
    private static func run(_ text: Substring, endings: Bool) -> AttributedString {
        guard text.contains("|") else { return AttributedString(String(text)) }
        guard endings else { return AttributedString(text.replacingOccurrences(of: "|", with: "")) }
        var out = AttributedString()
        var rest = text
        while let bar = rest.firstIndex(of: "|") {
            out += AttributedString(String(rest[rest.startIndex..<bar]))
            let afterBar = rest.index(after: bar)
            let end = rest[afterBar...].firstIndex { !$0.isLetter } ?? rest.endIndex
            var ending = AttributedString(String(rest[afterBar..<end]))
            ending.foregroundColor = Palette.rubric
            out += ending
            rest = rest[end...]
        }
        out += AttributedString(String(rest))
        return out
    }

    /// The text with its markup removed, for accessibility labels.
    static func plain(_ text: String) -> String {
        text.replacingOccurrences(of: "**", with: "").replacingOccurrences(of: "*", with: "").replacingOccurrences(of: "|", with: "")
    }
}

extension Text {
    /// Text in the course's markup.
    init(rich: String, endings: Bool = false) {
        self.init(RichText.attributed(rich, endings: endings))
    }
}
