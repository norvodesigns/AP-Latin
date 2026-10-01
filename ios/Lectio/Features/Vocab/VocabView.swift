import LectioCore
import SwiftUI

/// How a card is asked — the web's three directions.
nonisolated enum VocabDirection: String, CaseIterable, Identifiable, Sendable {
    case laEn = "Latin → English", enLa = "English → Latin", context = "In context"
    var id: String { rawValue }
}

nonisolated struct VocabSession: Identifiable, Sendable {
    let id = UUID()
    let queue: [String]
    let direction: VocabDirection
}

/// Spaced repetition over the vocabulary — src/app/vocab/Vocabulary.tsx.
/// Words enter the rotation by being looked up while reading, a unit or a
/// passage at a time from here, or as a batch of new cards in a review.
struct VocabView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.library) private var library

    @State private var direction = VocabDirection.laEn
    @State private var unit: String?
    @State private var passageId: String?
    @State private var newBatch = 20
    @State private var session: VocabSession?
    @State private var speed = false
    @State private var search = ""

    var body: some View {
        NavigationStack {
            if let library {
                content(library)
                    .fullScreenCover(item: $session) { FlashcardSessionView(session: $0) }
                    .fullScreenCover(isPresented: $speed) { SpeedRoundView().environment(\.library, library) }
            }
        }
    }

    private func scoped(_ library: ContentLibrary) -> [VocabEntry] {
        var list = library.coreVocabulary
        if let unit { list = list.filter { $0.units.contains(unit) } }
        if let passageId, let p = library.passage(passageId) {
            let ids = Set(p.vocabIds)
            list = list.filter { ids.contains($0.id) }
        }
        return list
    }

    private func content(_ library: ContentLibrary) -> some View {
        let scope = scoped(library)
        let scopeIds = Set(scope.map(\.id))
        let due = SpacedRepetition.due(model.vocab.values, on: StudyDates.today()).filter { scopeIds.contains($0.id) }
        let untouched = scope.filter { model.vocab[$0.id] == nil }
        let fresh = newBatch == 0 ? [] : Array(untouched.prefix(newBatch == -1 ? untouched.count : newBatch))
        let forecast = Insights.forecast(model.vocab)

        return List {
            Section {
                FigureRow(spacing: 28) {
                    Figure(value: "\(due.count)", caption: "due in scope", tint: Palette.rubric)
                    Figure(value: "\(model.vocab.count)", caption: "in rotation")
                    Figure(value: "\(forecast.mature)", caption: "mature")
                }
                .listRowBackground(Color.clear)
            }

            Section {
                Picker("Direction", selection: $direction) {
                    ForEach(VocabDirection.allCases) { Text($0.rawValue).tag($0) }
                }
                Picker("Unit", selection: $unit) {
                    Text("All units").tag(String?.none)
                    ForEach(library.meta.unitTitles.keys.sorted(), id: \.self) { Text("Unit \($0)").tag(Optional($0)) }
                }
                Picker("Passage", selection: $passageId) {
                    Text("Any passage").tag(String?.none)
                    ForEach(library.passages.filter(\.required)) { Text($0.citation).tag(Optional($0.id)) }
                }
                Picker("New cards", selection: $newBatch) {
                    Text("None").tag(0)
                    Text("10").tag(10)
                    Text("20").tag(20)
                    Text("50").tag(50)
                    Text("All \(untouched.count)").tag(-1)
                }
            } header: {
                Text("Review").rubricLabel()
            } footer: {
                Text("New cards are words in this scope you haven't met yet; each review adds that many, due today.")
            }
            .tint(Palette.rubric)

            Section {
                Button {
                    if !fresh.isEmpty { model.update { $0.seedVocab(fresh.map(\.id)) } }
                    let queue = due.map(\.id) + fresh.map(\.id)
                    if !queue.isEmpty { session = VocabSession(queue: queue, direction: direction) }
                } label: {
                    Text(due.isEmpty && fresh.isEmpty ? "Nothing due in this scope" : "Review \(due.count) due" + (fresh.isEmpty ? "" : " + \(fresh.count) new"))
                        .font(.headline).frame(maxWidth: .infinity).padding(.vertical, 6)
                }
                .buttonStyle(.glassProminent)
                .disabled(due.isEmpty && fresh.isEmpty)
                .listRowBackground(Color.clear)
                Button { model.openDerivatives() } label: {
                    Label("Derivatives · 10 questions", systemImage: "arrow.triangle.branch")
                        .font(.subheadline.weight(.semibold)).frame(maxWidth: .infinity).padding(.vertical, 4)
                }
                .buttonStyle(.glass)
                .listRowBackground(Color.clear)
                Button { speed = true } label: {
                    Label("Speed round · \(SpeedRound.seconds) seconds", systemImage: "timer")
                        .font(.subheadline.weight(.semibold)).frame(maxWidth: .infinity).padding(.vertical, 4)
                }
                .buttonStyle(.glass)
                .listRowBackground(Color.clear)
            }

            Section {
                ForEach(browse(scope), id: \.id) { entry in
                    VocabRow(entry: entry, card: model.vocab[entry.id], derivatives: library.derivatives[entry.id] ?? [])
                }
            } header: {
                Text("Browse \(unit.map { "unit \($0)" } ?? "the core list")").rubricLabel()
            }
        }
        .scrollContentBackground(.hidden)
        .readableColumn()
        .pageBackground()
        .navigationTitle("Vocabulary")
        .searchable(text: $search, placement: .navigationBarDrawer(displayMode: .automatic), prompt: "Search words or meanings")
    }

    private func browse(_ scope: [VocabEntry]) -> [VocabEntry] {
        let q = search.trimmingCharacters(in: .whitespaces)
        guard !q.isEmpty else { return Array(scope.prefix(200)) }
        return scope.filter {
            $0.headword.range(of: q, options: [.caseInsensitive, .diacriticInsensitive]) != nil
                || $0.definition.range(of: q, options: .caseInsensitive) != nil
        }
    }
}

private struct VocabRow: View {
    let entry: VocabEntry
    let card: VocabCard?
    let derivatives: [String]

    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            VStack(alignment: .leading, spacing: 2) {
                Text(entry.lemma).font(.latinItalic(18, relativeTo: .body)).foregroundStyle(Palette.ink)
                Text(entry.definition).font(.footnote).foregroundStyle(Palette.inkMuted).lineLimit(2)
                if !derivatives.isEmpty {
                    Text("English: \(derivatives.joined(separator: ", "))").font(.caption).foregroundStyle(Palette.inkFaint)
                }
            }
            Spacer()
            if let card {
                VStack(alignment: .trailing, spacing: 2) {
                    Text(card.due <= StudyDates.today() ? "due" : "in \(card.interval)d").font(.caption.monospacedDigit())
                        .foregroundStyle(card.due <= StudyDates.today() ? Palette.rubric : Palette.inkMuted)
                    if card.lapses >= 2 { Text("slipping").quietLabel() }
                }
            } else {
                Text("new").font(.caption).foregroundStyle(Palette.inkFaint)
            }
        }
    }
}
