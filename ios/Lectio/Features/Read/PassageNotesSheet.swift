import LectioCore
import SwiftUI

/// The Reader's side rail on the web — summary, context, themes, vocabulary
/// coverage, your notes and flagged lines — as one sheet.
struct PassageNotesSheet: View {
    @Environment(AppModel.self) private var model
    let passage: Passage
    /// Jumps the reader to a line (and closes the sheet).
    let onJump: (Int) -> Void

    @State private var showEnglish = false

    var body: some View {
        let state = model.progress.passage(passage.id)
        let noted = state.annotations.filter { !$0.note.trimmingCharacters(in: .whitespaces).isEmpty }
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 26) {
                    section("Summary") {
                        if showEnglish {
                            Text(passage.summary).font(.prose()).foregroundStyle(Palette.ink)
                        } else {
                            Button("Reveal the English summary") { withAnimation { showEnglish = true } }
                                .glassButton()
                        }
                    }
                    section("Context") {
                        Text(passage.context).font(.prose()).foregroundStyle(Palette.ink2)
                    }
                    if !passage.themes.isEmpty {
                        section("Themes") {
                            FlowLayout(lineSpacing: 8) {
                                ForEach(passage.themes, id: \.self) { theme in
                                    Text(theme)
                                        .font(.subheadline)
                                        .padding(.horizontal, 10)
                                        .padding(.vertical, 5)
                                        .background(Palette.redTint, in: .capsule)
                                        .padding(.trailing, 6)
                                }
                            }
                        }
                    }
                    if !passage.vocabIds.isEmpty { coverage }
                    if !noted.isEmpty {
                        section("Your notes") {
                            ForEach(noted) { a in
                                VStack(alignment: .leading, spacing: 4) {
                                    Button { onJump(a.lineN) } label: {
                                        HStack(alignment: .firstTextBaseline) {
                                            Text("“\(a.text)”").font(.latinItalic(18)).foregroundStyle(Palette.ink)
                                            Text("· line \(a.lineN)").quietLabel()
                                        }
                                    }
                                    .buttonStyle(.plain)
                                    Text(a.note).font(.prose(.callout)).foregroundStyle(Palette.ink2)
                                    Button("Remove", role: .destructive) {
                                        model.update { $0.removeAnnotation(passageId: passage.id, annotationId: a.id) }
                                    }
                                    .font(.footnote)
                                }
                                Hairline(color: Palette.hair)
                            }
                        }
                    }
                    if !state.flaggedLines.isEmpty {
                        section("Flagged as hard") {
                            FlowLayout(lineSpacing: 8) {
                                ForEach(state.flaggedLines, id: \.self) { n in
                                    Button("Line \(n)") { onJump(n) }
                                        .glassButton()
                                        .padding(.trailing, 6)
                                }
                            }
                        }
                    }
                }
                .padding(20)
            }
            .background(Palette.parchment.ignoresSafeArea())
            .navigationTitle(passage.citation)
            .navigationBarTitleDisplayMode(.inline)
        }
        .presentationDetents([.medium, .large])
    }

    private var coverage: some View {
        let inRotation = passage.vocabIds.filter { model.vocab[$0] != nil }.count
        let total = passage.vocabIds.count
        let pct = total > 0 ? Int((Double(inRotation) / Double(total) * 100).rounded()) : 0
        return section("Vocabulary coverage") {
            HStack(alignment: .firstTextBaseline) {
                ProgressView(value: Double(inRotation), total: Double(max(total, 1))).tint(Palette.rubric)
                Text("\(pct)%").font(.latin(20)).monospacedDigit()
            }
            Text("\(inRotation) of \(total) words in your deck. Tapping a word while reading adds it automatically.")
                .font(.footnote)
                .foregroundStyle(Palette.inkMuted)
            if inRotation < total {
                Button("Add all to deck") { model.update { $0.seedVocab(passage.vocabIds) } }
                    .glassButton()
            }
        }
    }

    private func section<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title).rubricLabel()
            content()
        }
    }
}
