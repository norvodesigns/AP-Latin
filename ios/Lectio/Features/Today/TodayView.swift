import LectioCore
import SwiftUI

/// The dashboard: how long until the exam, the streak, what's due, and where
/// to pick up. On iPhone it's also the way into the sections that aren't in
/// the tab bar.
struct TodayView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.library) private var library

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 28) {
                    header
                    figures
                    Hairline()
                    nextUp
                    Hairline()
                    everything
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 40)
                .frame(maxWidth: 720, alignment: .leading)
                .frame(maxWidth: .infinity)
            }
            .pageBackground()
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Settings", systemImage: "gearshape") { model.selectedTab = .settings }
                }
            }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Lectio")
                .font(.wordmark(64))
                .foregroundStyle(Palette.rubric)
                .accessibilityAddTraits(.isHeader)
            Text("AP Latin · Vergil and Pliny")
                .font(.prose(.subheadline))
                .foregroundStyle(Palette.inkMuted)
        }
        .padding(.top, 8)
    }

    private var figures: some View {
        let progress = model.progress
        let examDate = library?.meta.examDate ?? "2027-05-14"
        let days = Streaks.daysUntilExam(examDate)
        let due = SpacedRepetition.due(model.vocab.values, on: StudyDates.today()).count
        return VStack(alignment: .leading, spacing: 18) {
            Figure(value: "\(days)", caption: days == 1 ? "day until the exam" : "days until the exam", tint: Palette.rubric)
            HStack(alignment: .top, spacing: 32) {
                Figure(value: "\(Streaks.current(progress.studyDays))", caption: "day streak")
                Figure(value: "\(Streaks.longest(progress.studyDays))", caption: "longest")
                Figure(value: "\(due)", caption: due == 1 ? "card due" : "cards due")
            }
        }
    }

    @ViewBuilder
    private var nextUp: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Next up").rubricLabel()
            if let passage = lastOpenedPassage {
                NavigationLink(value: passage) {
                    NextUpRow(title: "Continue reading", detail: passage.citation, systemImage: "book.closed")
                }
            }
            let due = SpacedRepetition.due(model.vocab.values, on: StudyDates.today()).count
            Button {
                model.selectedTab = .vocab
            } label: {
                NextUpRow(title: due > 0 ? "Review \(due) vocabulary card\(due == 1 ? "" : "s")" : "Vocabulary",
                          detail: due > 0 ? "Spaced repetition, due today" : "Nothing due — add words from a unit",
                          systemImage: "rectangle.on.rectangle.angled")
            }
            Button {
                model.selectedTab = .read
            } label: {
                NextUpRow(title: "Reading Room", detail: "Every syllabus passage, tap any word", systemImage: "books.vertical")
            }
        }
        .buttonStyle(.plain)
        .navigationDestination(for: Passage.self) { PassageReaderView(passage: $0) }
    }

    private var lastOpenedPassage: Passage? {
        guard let library else { return nil }
        let opened = model.progress.raw["passages"]?.objectValue?.compactMap { id, state -> (String, String)? in
            guard let at = state["lastOpened"]?.stringValue else { return nil }
            return (id, at)
        } ?? []
        return opened.max { $0.1 < $1.1 }.flatMap { library.passage($0.0) }
    }

    /// Every section, as the website's sidebar lists them — how an iPhone
    /// reaches the ones that aren't in the tab bar.
    private var everything: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Everything").rubricLabel().padding(.bottom, 8)
            ForEach(Self.sections) { section in
                Button {
                    model.selectedTab = section.tab
                } label: {
                    HStack {
                        Label(section.title, systemImage: section.systemImage)
                            .foregroundStyle(Palette.ink)
                        Spacer()
                        Image(systemName: "chevron.right").font(.footnote).foregroundStyle(Palette.inkFaint)
                    }
                    .padding(.vertical, 10)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                Hairline(color: Palette.hair)
            }
        }
    }

    private struct SectionLink: Identifiable {
        let title: String
        let systemImage: String
        let tab: AppTab
        var id: String { title }
    }

    private static let sections = [
        SectionLink(title: "Grammar & Syntax", systemImage: "text.book.closed", tab: .grammar),
        SectionLink(title: "Translate", systemImage: "character.book.closed", tab: .translate),
        SectionLink(title: "Sight Reading", systemImage: "eye", tab: .sight),
        SectionLink(title: "Scansion Lab", systemImage: "waveform.path", tab: .scansion),
        SectionLink(title: "Literary Devices", systemImage: "wand.and.stars", tab: .devices),
        SectionLink(title: "Context & Culture", systemImage: "building.columns", tab: .context),
        SectionLink(title: "FRQ Workshop", systemImage: "pencil.and.list.clipboard", tab: .frq),
        SectionLink(title: "Practice Exam", systemImage: "timer", tab: .exam),
        SectionLink(title: "Study Plan", systemImage: "calendar", tab: .plan),
    ]
}

private struct NextUpRow: View {
    let title: String
    let detail: String
    let systemImage: String

    var body: some View {
        HStack(spacing: 14) {
            Image(systemName: systemImage)
                .font(.title3)
                .foregroundStyle(Palette.rubric)
                .frame(width: 44, height: 44)
                .background(Palette.redTint, in: .circle)
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.headline).foregroundStyle(Palette.ink)
                Text(detail).font(.subheadline).foregroundStyle(Palette.inkMuted)
            }
            Spacer(minLength: 0)
            Image(systemName: "chevron.right").font(.footnote).foregroundStyle(Palette.inkFaint)
        }
        .contentShape(Rectangle())
    }
}
