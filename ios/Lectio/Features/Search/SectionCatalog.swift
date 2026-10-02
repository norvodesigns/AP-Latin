import SwiftUI

/// How the website's menu groups its sections (src/lib/nav.ts), plus the
/// app's own "You". One pigment each, so a group is recognisable at a glance.
enum SectionGroup: CaseIterable, Identifiable {
    case study, drill, reference, exam, you

    var id: Self { self }

    var title: String {
        switch self {
        case .study: "Study"
        case .drill: "Drill"
        case .reference: "Reference"
        case .exam: "Exam"
        case .you: "You"
        }
    }

    var tint: Color {
        switch self {
        case .study: Palette.rubric
        case .drill: Palette.woad
        case .reference: Palette.verdigris
        case .exam: Palette.gilt
        case .you: Palette.inkMuted
        }
    }
}

/// One entry of the app's whole menu: the same sections, in the same groups
/// and order, with the same one-line descriptions, as the website's menu.
/// Browse lists them all; Today's "Jump to" panel picks some.
struct SectionEntry: Identifiable {
    enum Action {
        case tab(AppTab)
        /// The Sententia of the day opens as a lesson, not a page.
        case daily
    }

    let id: String
    let title: String
    /// For a small tile.
    let short: String
    let blurb: String
    let systemImage: String
    let group: SectionGroup
    let action: Action

    static let all: [SectionEntry] = [
        SectionEntry(id: "today", title: "Today", short: "Today", blurb: "Countdown, progress, what to study next",
                     systemImage: "sun.horizon", group: .study, action: .tab(.today)),
        SectionEntry(id: "learn", title: "Course", short: "Course", blurb: "Latin from the first word: short lessons, in order, up to AP",
                     systemImage: "graduationcap", group: .study, action: .tab(.learn)),
        SectionEntry(id: "daily", title: "Sententia of the day", short: "Sententia", blurb: "One famous line of Latin a day, and three quick questions on it",
                     systemImage: "text.quote", group: .study, action: .daily),
        SectionEntry(id: "read", title: "Reading Room", short: "Read", blurb: "Every syllabus passage with glossary and notes",
                     systemImage: "book.closed", group: .study, action: .tab(.read)),
        SectionEntry(id: "laurels", title: "Laurels", short: "Laurels", blurb: "Achievements across everything you do here",
                     systemImage: "laurel.leading", group: .study, action: .tab(.laurels)),
        SectionEntry(id: "plan", title: "Study Plan", short: "Plan", blurb: "A schedule built from your exam date",
                     systemImage: "calendar", group: .study, action: .tab(.plan)),

        SectionEntry(id: "translate", title: "Translate", short: "Translate", blurb: "Literal translation drills with AP scoring segments",
                     systemImage: "character.book.closed", group: .drill, action: .tab(.translate)),
        SectionEntry(id: "sight", title: "Sight Reading", short: "Sight", blurb: "Timed unseen prose and poetry",
                     systemImage: "eye", group: .drill, action: .tab(.sight)),
        SectionEntry(id: "quiz", title: "Quiz Engine", short: "Quiz", blurb: "Configurable AP-style multiple choice",
                     systemImage: "checklist", group: .drill, action: .tab(.quiz)),
        SectionEntry(id: "forge", title: "Forms Forge", short: "Forge", blurb: "Every ending, drilled: fill the chart, make the form, name the form",
                     systemImage: "hammer", group: .drill, action: .tab(.forge)),
        SectionEntry(id: "vocab", title: "Vocabulary", short: "Vocab", blurb: "Spaced repetition over every word the passages use",
                     systemImage: "rectangle.on.rectangle.angled", group: .drill, action: .tab(.vocab)),
        SectionEntry(id: "scansion", title: "Scansion Lab", short: "Scansion", blurb: "Mark quantities, elisions and caesurae",
                     systemImage: "waveform.path", group: .drill, action: .tab(.scansion)),

        SectionEntry(id: "grammar", title: "Grammar & Syntax", short: "Grammar", blurb: "The constructions AP actually tests",
                     systemImage: "text.book.closed", group: .reference, action: .tab(.grammar)),
        SectionEntry(id: "devices", title: "Literary Devices", short: "Devices", blurb: "Style reference and spot-the-device drill",
                     systemImage: "wand.and.stars", group: .reference, action: .tab(.devices)),
        SectionEntry(id: "context", title: "Context & Culture", short: "Context", blurb: "Vergil, Augustan Rome, Pliny’s world",
                     systemImage: "building.columns", group: .reference, action: .tab(.context)),

        SectionEntry(id: "frq", title: "FRQ Workshop", short: "FRQ", blurb: "All five free-response types, timed",
                     systemImage: "pencil.and.list.clipboard", group: .exam, action: .tab(.frq)),
        SectionEntry(id: "exam", title: "Practice Exam", short: "Exam", blurb: "Full 52 MCQ + 5 FRQ, section timers",
                     systemImage: "timer", group: .exam, action: .tab(.exam)),

        SectionEntry(id: "classroom", title: "Classroom", short: "Classroom", blurb: "Join a class, see what your teacher has assigned",
                     systemImage: "person.3", group: .you, action: .tab(.classroom)),
        SectionEntry(id: "settings", title: "Settings", short: "Settings", blurb: "Appearance, backup, sign in, reminders, AI usage",
                     systemImage: "gearshape", group: .you, action: .tab(.settings)),
    ]

    static func entries(in group: SectionGroup) -> [SectionEntry] {
        all.filter { $0.group == group }
    }

    static func entry(_ id: String) -> SectionEntry? {
        all.first { $0.id == id }
    }
}
