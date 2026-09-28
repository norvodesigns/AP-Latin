import LectioCore
import SwiftUI

/// One search over passages, vocabulary and grammar — the app's version of the
/// web's ⌘K palette.
struct SearchView: View {
    @Environment(\.library) private var library
    @State private var query = ""
    @State private var selectedEntry: VocabEntry?

    var body: some View {
        NavigationStack {
            List {
                if let library, !trimmed.isEmpty {
                    let passages = library.passages.filter { matches($0.citation) || matches($0.title) }.prefix(8)
                    if !passages.isEmpty {
                        Section {
                            ForEach(Array(passages)) { passage in
                                NavigationLink(value: passage) {
                                    VStack(alignment: .leading) {
                                        Text(passage.citation).font(.latin(18, relativeTo: .headline))
                                        Text(passage.title).font(.subheadline).foregroundStyle(Palette.inkMuted)
                                    }
                                }
                            }
                        } header: { Text("Passages").rubricLabel() }
                    }

                    let words = vocabResults(library)
                    if !words.isEmpty {
                        Section {
                            ForEach(words) { entry in
                                Button { selectedEntry = entry } label: {
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(entry.lemma).font(.latinItalic(18, relativeTo: .headline)).foregroundStyle(Palette.ink)
                                        Text(entry.definition).font(.subheadline).foregroundStyle(Palette.inkMuted).lineLimit(2)
                                    }
                                }
                            }
                        } header: { Text("Vocabulary").rubricLabel() }
                    }

                    let topics = library.grammarTopics.filter { matches($0.name) }.prefix(8)
                    if !topics.isEmpty {
                        Section {
                            ForEach(Array(topics)) { topic in
                                NavigationLink(topic.name, value: topic)
                            }
                        } header: { Text("Grammar").rubricLabel() }
                    }
                }
            }
            .listStyle(.plain)
            .readableColumn()
            .pageBackground()
            .overlay {
                if trimmed.isEmpty {
                    ContentUnavailableView("Search Lectio", systemImage: "magnifyingglass",
                                           description: Text("Passages, every word on the vocabulary lists, and grammar topics."))
                }
            }
            .navigationTitle("Search")
            .searchable(text: $query, prompt: "arma, Aeneid 4, ablative…")
            .navigationDestination(for: Passage.self) { PassageReaderView(passage: $0) }
            .navigationDestination(for: GrammarTopic.self) { GrammarTopicView(topic: $0) }
            .sheet(item: $selectedEntry) { WordSheet(entry: $0) }
        }
    }

    private var trimmed: String { query.trimmingCharacters(in: .whitespaces) }

    private func matches(_ text: String) -> Bool {
        text.range(of: trimmed, options: [.caseInsensitive, .diacriticInsensitive]) != nil
    }

    /// Headword matches first, then definitions; core list before supplementary.
    private func vocabResults(_ library: ContentLibrary) -> [VocabEntry] {
        let all = library.coreVocabulary + library.supplementaryVocabulary
        let byHead = all.filter { matches($0.headword) }
        let byDefinition = trimmed.count >= 3 ? all.filter { !matches($0.headword) && matches($0.definition) } : []
        return Array((byHead + byDefinition).prefix(20))
    }
}

/// A word from search: its entry, and a way to start learning it.
private struct WordSheet: View {
    @Environment(AppModel.self) private var model
    let entry: VocabEntry

    var body: some View {
        let card = model.vocab[entry.id]
        VStack(alignment: .leading, spacing: 10) {
            Text(entry.lemma).font(.latinItalic(28, relativeTo: .title)).foregroundStyle(Palette.ink)
            Text(entry.pos).quietLabel()
            Text(entry.definition).font(.prose(.title3)).foregroundStyle(Palette.ink2)
            Spacer(minLength: 12)
            if let card {
                let days = max(0, (StudyDates.dayNumber(card.due) ?? 0) - (StudyDates.dayNumber(StudyDates.today()) ?? 0))
                Label(days == 0 ? "In your deck, due today" : "In your deck, due in \(days) day\(days == 1 ? "" : "s")",
                      systemImage: "checkmark.circle")
                    .font(.subheadline)
                    .foregroundStyle(Palette.inkMuted)
            } else {
                Button {
                    model.update { $0.seedVocab([entry.id]) }
                } label: {
                    Label("Add to my vocabulary deck", systemImage: "plus").frame(maxWidth: .infinity)
                }
                .buttonStyle(.glassProminent)
            }
        }
        .padding(24)
        .frame(maxWidth: .infinity, alignment: .leading)
        .presentationDetents([.height(300), .medium])
        .sensoryFeedback(.success, trigger: card != nil)
    }
}
