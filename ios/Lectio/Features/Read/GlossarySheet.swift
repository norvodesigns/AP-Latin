import LectioCore
import SwiftUI

/// The gloss for a tapped word — a glass sheet over the page, short enough
/// that the line it came from stays in view.
struct GlossarySheet: View {
    @Environment(\.library) private var library
    let selection: WordSelection

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text(selection.token.text)
                    .font(.latin(34, relativeTo: .largeTitle))
                    .foregroundStyle(Palette.ink)

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
            }
            .padding(.horizontal, 24)
            .padding(.top, 28)
            .padding(.bottom, 16)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .presentationDetents([.height(300), .medium, .large])
        .presentationBackgroundInteraction(.enabled(upThrough: .height(300)))
    }

    private var entries: [(gloss: Gloss, entry: VocabEntry)] {
        selection.token.glosses.compactMap { gloss in library?.vocab(gloss.id).map { (gloss, $0) } }
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
