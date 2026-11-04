import LectioCore
import SwiftUI

/// Every passage, grouped by CED unit. Required readings first within each
/// unit, then the Course Project's (in College Board's order), then the
/// supplementary ones, marked as on the web.
struct ReadIndexView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.library) private var library
    @State private var showSupplementary = true

    var body: some View {
        @Bindable var model = model
        NavigationStack(path: $model.readPath) {
            List {
                if let library {
                    ForEach(library.passagesByUnit) { group in
                        let order = Dictionary(uniqueKeysWithValues: library.passages.enumerated().map { ($1.id, $0) })
                        let rank = { (p: Passage) in p.required ? 0 : p.project != nil ? 1 : 2 }
                        let passages = group.passages
                            .filter { showSupplementary || $0.required || $0.project != nil }
                            .sorted {
                                (rank($0), rank($0) == 1 ? order[$0.id] ?? 0 : 0, $0.citation)
                                    < (rank($1), rank($1) == 1 ? order[$1.id] ?? 0 : 0, $1.citation)
                            }
                        if !passages.isEmpty {
                            Section {
                                ForEach(passages) { passage in
                                    NavigationLink(value: passage) { PassageRow(passage: passage) }
                                        .listRowBackground(Color.clear)
                                }
                            } header: {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("Unit \(group.unit)").rubricLabel()
                                    Text(group.title).font(.prose(.subheadline)).foregroundStyle(Palette.ink2).textCase(nil)
                                }
                            }
                        }
                    }
                }
            }
            .listStyle(.plain)
            .readableColumn()
            .pageBackground()
            .navigationTitle("Reading Room")
            .navigationDestination(for: Passage.self) { PassageReaderView(passage: $0) }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Menu("Filter", systemImage: "line.3.horizontal.decrease") {
                        Toggle("Show supplementary passages", isOn: $showSupplementary)
                    }
                }
            }
        }
    }
}

private struct PassageRow: View {
    @Environment(AppModel.self) private var model
    let passage: Passage

    var body: some View {
        let state = model.progress.passage(passage.id)
        HStack(alignment: .firstTextBaseline, spacing: 12) {
            VStack(alignment: .leading, spacing: 3) {
                Text(passage.project != nil ? "\(passage.authorLabel), \(passage.citation)" : passage.citation)
                    .font(.latin(19, relativeTo: .headline))
                    .foregroundStyle(Palette.ink)
                Text(passage.title)
                    .font(.prose(.subheadline))
                    .foregroundStyle(Palette.inkMuted)
                    .lineLimit(2)
                if let year = passage.project {
                    Text("Course Project · \(year)").rubricLabel()
                } else if !passage.required {
                    Text("Supplementary").quietLabel()
                }
            }
            Spacer(minLength: 0)
            if state.bookmarked {
                Image(systemName: "bookmark.fill").foregroundStyle(Palette.rubric).accessibilityLabel("Bookmarked")
            }
        }
        .padding(.vertical, 4)
    }
}
