import LectioCore
import SwiftUI

/// The grammar reference, ordered as a course runs: foundational paradigms,
/// then the syntax AP tests, then the rest.
struct GrammarView: View {
    @Environment(\.library) private var library
    @State private var studying = false

    private struct Level: Identifiable {
        let id: String
        let title: String
    }

    private static let levels = [
        Level(id: "foundational", title: "Foundations"),
        Level(id: "ap", title: "Tested on the AP exam"),
        Level(id: "advanced", title: "Beyond the exam"),
    ]

    var body: some View {
        NavigationStack {
            List {
                if let library {
                    ForEach(Self.levels) { level in
                        let topics = library.grammarTopics.filter { $0.courseLevel == level.id }
                        if !topics.isEmpty {
                            Section {
                                ForEach(topics) { topic in
                                    NavigationLink(value: topic) {
                                        VStack(alignment: .leading, spacing: 3) {
                                            Text(topic.name).font(.headline).foregroundStyle(Palette.ink)
                                            Text(topic.summary)
                                                .font(.prose(.subheadline))
                                                .foregroundStyle(Palette.inkMuted)
                                                .lineLimit(2)
                                        }
                                        .padding(.vertical, 3)
                                    }
                                    .listRowBackground(Color.clear)
                                }
                            } header: {
                                Text(level.title).rubricLabel()
                            }
                        }
                    }
                }
            }
            .listStyle(.plain)
            .pageBackground()
            .navigationTitle("Grammar & Syntax")
            .navigationDestination(for: GrammarTopic.self) { GrammarTopicView(topic: $0) }
            .navigationDestination(for: Passage.self) { PassageReaderView(passage: $0) }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Study", systemImage: "rectangle.on.rectangle.angled") { studying = true }
                }
            }
            .sheet(isPresented: $studying) {
                NavigationStack {
                    ScrollView {
                        if let library {
                            StudyDeck(items: library.grammarTopics, noun: "topic") { t in
                                Text(t.name).font(.system(.title, design: .serif)).multilineTextAlignment(.center)
                            } back: { t in
                                VStack(alignment: .leading, spacing: 12) {
                                    Text(t.summary).font(.prose(.title3))
                                    ForEach(t.recognition, id: \.self) { Text("· \($0)").font(.prose(.callout)).foregroundStyle(Palette.ink2) }
                                }
                            }
                            .padding(20)
                        }
                    }
                    .background(Palette.parchment.ignoresSafeArea())
                    .navigationTitle("Study grammar")
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Done") { studying = false } } }
                }
            }
        }
    }
}

struct GrammarTopicView: View {
    let topic: GrammarTopic

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                Text(topic.summary).font(.prose(.title3)).foregroundStyle(Palette.ink)

                if let charts = topic.charts, !charts.isEmpty {
                    ForEach(Array(charts.enumerated()), id: \.offset) { _, chart in
                        ParadigmChart(chart: chart)
                    }
                }

                BulletSection(title: "How to recognize it", items: topic.recognition)
                BulletSection(title: "How to translate it", items: topic.translation)

                if !topic.examples.isEmpty {
                    VStack(alignment: .leading, spacing: 16) {
                        Text("From the readings").rubricLabel()
                        ForEach(Array(topic.examples.enumerated()), id: \.offset) { _, example in
                            VStack(alignment: .leading, spacing: 6) {
                                Text(example.latin).font(.latin(21)).foregroundStyle(Palette.ink)
                                Text(example.citation).quietLabel()
                                Text(example.analysis).font(.prose(.callout)).foregroundStyle(Palette.ink2)
                            }
                            Hairline(color: Palette.hair)
                        }
                    }
                }
            }
            .padding(20)
            .frame(maxWidth: 760, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
        .pageBackground()
        .navigationTitle(topic.name)
    }
}

private struct BulletSection: View {
    let title: String
    let items: [String]

    var body: some View {
        if !items.isEmpty {
            VStack(alignment: .leading, spacing: 10) {
                Text(title).rubricLabel()
                ForEach(items, id: \.self) { item in
                    HStack(alignment: .firstTextBaseline, spacing: 10) {
                        Text("·").foregroundStyle(Palette.rubric)
                        Text(item).font(.prose()).foregroundStyle(Palette.ink)
                    }
                }
            }
        }
    }
}

/// A declension or conjugation as an actual chart, ruled like a manuscript table.
private struct ParadigmChart: View {
    let chart: GrammarChart

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(chart.title).font(.latinItalic(20)).foregroundStyle(Palette.ink)
            ScrollView(.horizontal, showsIndicators: false) {
                Grid(alignment: .leading, horizontalSpacing: 18, verticalSpacing: 8) {
                    GridRow {
                        Text("")
                        ForEach(chart.cols, id: \.self) { Text($0).quietLabel() }
                    }
                    Divider().gridCellUnsizedAxes(.horizontal)
                    ForEach(Array(chart.rows.enumerated()), id: \.offset) { _, row in
                        GridRow {
                            Text(row.label).font(.caption).foregroundStyle(Palette.inkMuted)
                            ForEach(Array(row.cells.enumerated()), id: \.offset) { _, cell in
                                Text(cell.isEmpty ? "—" : cell)
                                    .font(.latin(19))
                                    .foregroundStyle(cell.isEmpty ? Palette.inkFaint : Palette.ink)
                            }
                        }
                    }
                }
                .padding(.vertical, 4)
            }
            if let note = chart.note {
                Text(note).font(.prose(.footnote)).foregroundStyle(Palette.inkMuted)
            }
        }
    }
}
