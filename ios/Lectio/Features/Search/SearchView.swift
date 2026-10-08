import LectioCore
import SwiftUI
import TipKit
import UIKit

/// Browse and search in one place. Empty, it's the whole menu as one list
/// (every section of the website, in its groups), the way Apple's Health app
/// lists its categories; typing turns it into a search over sections,
/// passages, vocabulary and grammar, the app's version of the web's ⌘K palette.
struct SearchView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.library) private var library
    @Environment(\.horizontalSizeClass) private var sizeClass
    @State private var query = ""
    @State private var selectedEntry: VocabEntry?

    var body: some View {
        NavigationStack {
            Group {
                if trimmed.isEmpty {
                    browse
                } else {
                    results
                }
            }
            .navigationTitle(trimmed.isEmpty ? "Browse" : "Search")
            .searchable(text: $query, prompt: "Sections, arma, Aeneid 4, ablative…")
            .navigationDestination(for: Passage.self) { PassageReaderView(passage: $0) }
            .navigationDestination(for: GrammarTopic.self) { GrammarTopicView(topic: $0) }
            // A section outside the tab bar opens on this stack, so Back
            // returns to the list rather than to Today.
            .navigationDestination(for: AppTab.self) { PushedSection(tab: $0) }
            .sheet(item: $selectedEntry) { WordSheet(entry: $0) }
        }
    }

    private var trimmed: String { query.trimmingCharacters(in: .whitespaces) }

    /// Whether this screen has a phone's tab bar to switch, or opens the
    /// section on its own stack. A full-width iPad has every section in its
    /// sidebar, so there a row just selects it.
    private func pushes(_ entry: SectionEntry) -> Bool {
        guard case .tab(let tab) = entry.action else { return false }
        let compact = sizeClass == .compact || UIDevice.current.userInterfaceIdiom == .phone
        return compact && !model.phoneTabs.contains(tab)
    }

    private func visible(_ entry: SectionEntry) -> Bool {
        if case .daily = entry.action { return model.todaysSententia != nil }
        return true
    }

    /* ---------------------------------------------------------------- */
    /* Browse                                                            */
    /* ---------------------------------------------------------------- */

    private var browse: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 10) {
                TipView(BrowseTip()).lectioTipStyle().padding(.bottom, 4)
                ForEach(SectionGroup.allCases) { group in
                    Text(group.title)
                        .rubricLabel()
                        .padding(.top, group == .study ? 4 : 18)
                        .padding(.leading, 4)
                        .accessibilityAddTraits(.isHeader)
                    ForEach(SectionEntry.entries(in: group).filter { visible($0) }) { entry in
                        SectionLink(entry: entry, pushes: pushes(entry)) {
                            SectionCard(entry: entry)
                        }
                    }
                }
            }
            .padding(.horizontal, 20)
            .padding(.top, 8)
            .padding(.bottom, 32)
            .frame(maxWidth: 720, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
        .ambientBackground()
    }

    /* ---------------------------------------------------------------- */
    /* Results                                                           */
    /* ---------------------------------------------------------------- */

    private var results: some View {
        let sections = SectionEntry.all.filter { visible($0) && (matches($0.title) || matches($0.blurb)) }
        let passages: [Passage] = library.map { lib in
            Array(lib.passages.filter { matches($0.citation) || matches($0.title) }.prefix(8))
        } ?? []
        let words: [VocabEntry] = library.map { lib in vocabResults(lib) } ?? []
        let topics: [GrammarTopic] = library.map { lib in
            Array(lib.grammarTopics.filter { matches($0.name) }.prefix(8))
        } ?? []
        return Group {
            if sections.isEmpty && passages.isEmpty && words.isEmpty && topics.isEmpty {
                ContentUnavailableView.search(text: trimmed)
            } else {
                List {
                    if !sections.isEmpty {
                        Section {
                            ForEach(sections) { entry in
                                SectionLink(entry: entry, pushes: pushes(entry)) {
                                    Label {
                                        VStack(alignment: .leading, spacing: 2) {
                                            Text(entry.title).foregroundStyle(Palette.ink)
                                            Text(entry.blurb).font(.footnote).foregroundStyle(Palette.inkMuted)
                                        }
                                    } icon: {
                                        Image(systemName: entry.systemImage).foregroundStyle(entry.group.tint)
                                    }
                                }
                            }
                        } header: { Text("Sections").rubricLabel() }
                    }

                    if !passages.isEmpty {
                        Section {
                            ForEach(passages) { passage in
                                NavigationLink(value: passage) {
                                    VStack(alignment: .leading) {
                                        Text(passage.citation).font(.latin(18, relativeTo: .headline))
                                        Text(passage.title).font(.subheadline).foregroundStyle(Palette.inkMuted)
                                    }
                                }
                            }
                        } header: { Text("Passages").rubricLabel() }
                    }

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

                    if !topics.isEmpty {
                        Section {
                            ForEach(topics) { topic in
                                NavigationLink(topic.name, value: topic)
                            }
                        } header: { Text("Grammar").rubricLabel() }
                    }
                }
                .listStyle(.plain)
                .readableColumn()
            }
        }
        .pageBackground()
    }

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

/// What a section's row does: switch to it (a tab, or an iPad's sidebar),
/// open the Sententia, or push the page onto this screen's stack.
private struct SectionLink<Row: View>: View {
    @Environment(AppModel.self) private var model
    let entry: SectionEntry
    let pushes: Bool
    @ViewBuilder var label: Row

    var body: some View {
        switch entry.action {
        case .daily:
            Button { model.openDaily() } label: { label }
                .buttonStyle(.plain)
        case .tab(let tab):
            if pushes {
                NavigationLink(value: tab) { label }
                    .buttonStyle(.plain)
            } else {
                Button { model.selectedTab = tab } label: { label }
                    .buttonStyle(.plain)
            }
        }
    }
}

/// One section as a glass card: a tinted symbol, its name, one line on what
/// it's for, and a note where there's something to say (cards due, lessons
/// done, the Sententia finished).
private struct SectionCard: View {
    @Environment(AppModel.self) private var model
    let entry: SectionEntry

    var body: some View {
        HStack(spacing: 14) {
            Image(systemName: entry.systemImage)
                .font(.title3.weight(.medium))
                .foregroundStyle(entry.group.tint)
                .frame(width: 46, height: 46)
                .background(entry.group.tint.opacity(0.15), in: .rect(cornerRadius: 13))
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 2) {
                Text(entry.title).font(.headline).foregroundStyle(Palette.ink)
                Text(entry.blurb)
                    .font(.subheadline)
                    .foregroundStyle(Palette.inkMuted)
                    .multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 8)
            if let note {
                Text(note)
                    .font(.footnote.weight(.semibold).monospacedDigit())
                    .foregroundStyle(Palette.rubric)
            }
            Image(systemName: "chevron.right")
                .font(.footnote.weight(.semibold))
                .foregroundStyle(Palette.inkFaint)
                .accessibilityHidden(true)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .lectioGlass(in: RoundedRectangle(cornerRadius: 22, style: .continuous))
        .contentShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(entry.title)
        .accessibilityValue(note ?? "")
        .accessibilityHint(entry.blurb)
        .accessibilityAddTraits(.isButton)
    }

    private var note: String? {
        switch entry.id {
        case "vocab":
            let due = SpacedRepetition.due(model.vocab.values, on: StudyDates.today()).count
            return due > 0 ? "\(due) due" : nil
        case "learn":
            let grammar = model.grammarProgress
            return grammar.done > 0 && grammar.total > 0 ? "\(grammar.done) of \(grammar.total)" : nil
        case "daily":
            return model.progress.daily[model.dailyDay] != nil ? "Done" : nil
        default:
            return nil
        }
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
                .glassButton(prominent: true)
            }
        }
        .padding(24)
        .frame(maxWidth: .infinity, alignment: .leading)
        .presentationDetents([.height(300), .medium])
        .sensoryFeedback(.success, trigger: card != nil)
    }
}
