import LectioCore
import SwiftUI

/// This release's news, for the sheet below. For the next release, raise
/// `release` and rewrite `items`; everyone who saw this one sees that one
/// once. The website announces the same release in src/components/SplashScreen.tsx.
enum WhatsNew {
    static let release = "1.2"

    struct Item: Identifiable {
        let symbol: String
        let pigment: Pigment
        let title: String
        let detail: String
        var id: String { title }
    }

    static let items: [Item] = [
        Item(
            symbol: "highlighter", pigment: .gilt,
            title: "Mark up a passage",
            detail: "Touch and hold a word, or turn on Mark up, then tap the last word of the phrase, even on the next line. Eight colours, drawn as pills."
        ),
        Item(
            symbol: "underline", pigment: .minium,
            title: "Mark the sentence",
            detail: "Label the subject, verb, objects and cases with a coloured underline, and bracket a clause."
        ),
        Item(
            symbol: "note.text", pigment: .verdigris,
            title: "Notes in one place",
            detail: "Write a note on any word or phrase. Tap a highlight to change it or take it off. The Notes sheet lists everything on the page."
        ),
        Item(
            symbol: "translate", pigment: .woad,
            title: "English, line by line",
            detail: "A literal, AP-style translation under each Latin line, or side by side on iPad. It's in the toolbar."
        ),
        Item(
            symbol: "printer", pigment: .madder,
            title: "Print a study sheet",
            detail: "Your colours, marks and notes, laid out for revision, with or without the English. Or save it as a PDF."
        ),
        Item(
            symbol: "hand.tap", pigment: .azurite,
            title: "Definitions stay put",
            detail: "Tap another word while a definition is open and the sheet simply changes to the new word."
        ),
        Item(
            symbol: "books.vertical", pigment: .murex,
            title: "More to read",
            detail: "The Course Project passages in the Reading Room, and Level V of the course: how to read hard poetry, syncope included, then every required Aeneid passage, closely."
        ),
    ]
}

/// Once per release, over Today: what's new, and a button to get on with it.
/// Swiping it away counts as seen too (`markWhatsNewSeen` runs on dismiss).
struct WhatsNewSheet: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ScrollView {
            VStack(spacing: 28) {
                VStack(spacing: 6) {
                    Text("Lectio").font(.wordmark(56)).foregroundStyle(Palette.rubric)
                    Text("What's new in \(WhatsNew.release)").rubricLabel()
                }
                .padding(.top, 36)
                .accessibilityElement(children: .combine)
                .accessibilityAddTraits(.isHeader)

                VStack(alignment: .leading, spacing: 22) {
                    ForEach(WhatsNew.items) { item in
                        Row(item: item)
                    }
                }
            }
            .padding(.horizontal, 28)
            .padding(.bottom, 24)
            .frame(maxWidth: 520)
            .frame(maxWidth: .infinity)
        }
        .scrollBounceBehavior(.basedOnSize)
        .safeAreaInset(edge: .bottom, spacing: 0) {
            Button {
                dismiss()
            } label: {
                Text("Continue")
                    .font(.headline).frame(maxWidth: .infinity).padding(.vertical, 8)
            }
            .glassButton(prominent: true)
            .tint(Palette.rubric)
            .padding(.horizontal, 24)
            .padding(.vertical, 12)
            .frame(maxWidth: 480)
            .frame(maxWidth: .infinity)
        }
        .ambientBackground()
    }

    private struct Row: View {
        let item: WhatsNew.Item

        var body: some View {
            HStack(alignment: .top, spacing: 16) {
                // Each in one of the eight highlighter pigments, drawn as the
                // Reader draws a highlight behind a word.
                Image(systemName: item.symbol)
                    .font(.title3.weight(.medium))
                    .foregroundStyle(Ink.fill(item.pigment))
                    .frame(width: 44, height: 44)
                    .background(Ink.wash(item.pigment), in: .circle)
                    .accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 4) {
                    Text(item.title)
                        .font(.system(.headline, design: .serif))
                        .foregroundStyle(Palette.ink)
                    Text(item.detail)
                        .font(.prose(.subheadline))
                        .foregroundStyle(Palette.inkMuted)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer(minLength: 0)
            }
            .accessibilityElement(children: .combine)
        }
    }
}
