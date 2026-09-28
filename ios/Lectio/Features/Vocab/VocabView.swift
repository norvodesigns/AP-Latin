import LectioCore
import SwiftUI

/// Spaced repetition over the required vocabulary. Words enter the rotation
/// by being looked up while reading, or a unit at a time from here.
struct VocabView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.library) private var library
    @State private var reviewing = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 28) {
                    summary
                    reviewButton
                    Hairline()
                    units
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 12)
                .frame(maxWidth: 720, alignment: .leading)
                .frame(maxWidth: .infinity)
            }
            .pageBackground()
            .navigationTitle("Vocabulary")
            .fullScreenCover(isPresented: $reviewing) { FlashcardSessionView() }
        }
    }

    private var dueCount: Int {
        SpacedRepetition.due(model.vocab.values, on: StudyDates.today()).count
    }

    private var summary: some View {
        let vocab = model.vocab
        let learned = vocab.values.filter { $0.repetitions >= 2 }.count
        return HStack(alignment: .top, spacing: 32) {
            Figure(value: "\(dueCount)", caption: "due today", tint: Palette.rubric)
            Figure(value: "\(vocab.count)", caption: "in rotation")
            Figure(value: "\(learned)", caption: "learned")
        }
    }

    private var reviewButton: some View {
        Button {
            reviewing = true
        } label: {
            Label(dueCount > 0 ? "Review \(dueCount) card\(dueCount == 1 ? "" : "s")" : "Nothing due",
                  systemImage: "rectangle.on.rectangle.angled")
                .font(.headline)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 6)
        }
        .buttonStyle(.glassProminent)
        .disabled(dueCount == 0)
    }

    /// The CED introduces each word in a unit's readings; adding a unit puts
    /// every one of its words into rotation, due today.
    @ViewBuilder
    private var units: some View {
        if let library {
            VStack(alignment: .leading, spacing: 4) {
                Text("Add words by unit").rubricLabel().padding(.bottom, 8)
                let unitIds = library.meta.unitTitles.keys.sorted()
                ForEach(unitIds, id: \.self) { unit in
                    let ids = library.coreVocabulary.filter { $0.units.contains(unit) }.map(\.id)
                    let added = ids.filter { model.vocab[$0] != nil }.count
                    HStack(alignment: .firstTextBaseline) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Unit \(unit)").font(.headline).foregroundStyle(Palette.ink)
                            Text(library.meta.unitTitles[unit] ?? "")
                                .font(.prose(.subheadline))
                                .foregroundStyle(Palette.inkMuted)
                            Text("\(added) of \(ids.count) words in rotation").quietLabel()
                        }
                        Spacer()
                        if added < ids.count {
                            Button("Add") { model.update { $0.seedVocab(ids) } }
                                .buttonStyle(.glass)
                        } else {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundStyle(Palette.correct)
                                .accessibilityLabel("All added")
                        }
                    }
                    .padding(.vertical, 10)
                    Hairline(color: Palette.hair)
                }
            }
        }
    }
}
