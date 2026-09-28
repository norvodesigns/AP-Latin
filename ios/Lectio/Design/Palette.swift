import SwiftUI

/// "Rubrica" — the website's manuscript palette (src/app/globals.css), as
/// asset-catalog colors with a light and a dark appearance each.
///
/// The design rule carried over from the web: the *page* is parchment and ink
/// with hairline rules and red rubrication, and never boxes the Latin in.
/// On iOS the controls that float above the page — tab bar, toolbars, sheets,
/// the buttons you press — are Liquid Glass. Content is never glass.
enum Palette {
    static let parchment = Color("Parchment")
    /// A slip laid on the page — flashcards, glossary.
    static let slip = Color("Slip")
    static let sunk = Color("Sunk")

    static let ink = Color("Ink")
    static let ink2 = Color("Ink2")
    static let inkMuted = Color("InkMuted")
    static let inkFaint = Color("InkFaint")

    static let rule = Color("Rule")
    static let ruleStrong = Color("RuleStrong")
    static let hair = Color("Hair")

    /// Rubrication red — the one accent.
    static let rubric = Color("Rubric")
    /// Text on a rubric fill: the page colour, so it's light on the deep red
    /// of light mode and dark on the brighter red of dark mode.
    static let onRubric = Color("Parchment")
    static let redLine = Color("RedLine")
    /// A word marked under the reader's finger.
    static let redTint = Color("RedTint")
    static let gilt = Color("Gilt")

    static let correct = Color("Correct")
    static let correctWash = Color("CorrectWash")
    static let partial = Color("Partial")
    static let partialWash = Color("PartialWash")
    static let incorrect = Color("Incorrect")
    static let incorrectWash = Color("IncorrectWash")
}
