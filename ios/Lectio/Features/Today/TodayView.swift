import LectioCore
import SwiftUI

/// The dashboard: how long until the exam, the streak, what's due, and where
/// to pick up. On iPhone it's also the way into the sections that aren't in
/// the tab bar.
struct TodayView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.library) private var library

    var body: some View {
        @Bindable var model = model
        NavigationStack(path: $model.todayPath) {
            ScrollView {
                VStack(alignment: .leading, spacing: 28) {
                    header
                    figures
                    if model.courseFirstOnToday, let next = model.nextCourseLesson {
                        ContinueCard(place: next, first: model.courseDone.isEmpty)
                    }
                    if let line = model.todaysSententia {
                        SententiaCard(line: line)
                    }
                    Hairline()
                    nextUp
                    Hairline()
                    TodayInsights()
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
            .navigationDestination(for: AppTab.self) { PushedSection(tab: $0) }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Lectio")
                .font(.wordmark(64))
                .foregroundStyle(Palette.rubric)
                .accessibilityAddTraits(.isHeader)
            Text(model.courseFirstOnToday ? "Latin, from the first word" : "AP Latin · Vergil and Pliny")
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
            if model.courseFirstOnToday {
                courseFigure
            } else {
                Figure(value: "\(days)", caption: days == 1 ? "day until the exam" : "days until the exam", tint: Palette.rubric)
            }
            GoalMeter(seconds: model.studySecondsToday, goalMinutes: progress.studyPlan.minutesPerDay)
            HStack(alignment: .top, spacing: 32) {
                Figure(value: "\(Streaks.current(progress.studyDays))", caption: "day streak")
                Figure(value: "\(Streaks.longest(progress.studyDays))", caption: "longest")
                Figure(value: "\(due)", caption: due == 1 ? "card due" : "cards due")
            }
        }
    }

    /// For a student in the course: lessons finished, and the unit in hand.
    private var courseFigure: some View {
        let done = model.courseDone
        let total = library?.course.lessons.count ?? 0
        let next = model.nextCourseLesson
        return VStack(alignment: .leading, spacing: 8) {
            Figure(value: "\(done.count)", caption: "of \(total) lessons finished", tint: Palette.rubric)
            if let next {
                let pct = Course.unitProgress(next.unit, done: done)
                ProgressView(value: pct)
                    .tint(Palette.rubric)
                    .accessibilityLabel("Unit \(next.unit.n)")
                    .accessibilityValue("\(Int((pct * 100).rounded())) percent")
                Text("\(next.level.title) · Unit \(next.unit.n) of \(next.level.units.count) · \(RichText.plain(next.unit.title))")
                    .quietLabel()
            }
        }
    }

    @ViewBuilder
    private var nextUp: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Next up").rubricLabel()
            if let lesson = model.nextCourseLesson, !model.courseFirstOnToday, model.courseInTabBar || !model.courseDone.isEmpty {
                Button {
                    model.openLesson(lesson.id)
                } label: {
                    NextUpRow(title: model.courseDone.isEmpty ? "Start the course" : "Continue the course",
                              detail: "\(lesson.level.title) \(lesson.unit.n).\(lesson.number) · \(RichText.plain(lesson.lesson.title))",
                              systemImage: "graduationcap")
                }
            }
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
        SectionLink(title: "Course", systemImage: "graduationcap", tab: .learn),
        SectionLink(title: "Quiz Engine", systemImage: "checklist", tab: .quiz),
        SectionLink(title: "Grammar & Syntax", systemImage: "text.book.closed", tab: .grammar),
        SectionLink(title: "Translate", systemImage: "character.book.closed", tab: .translate),
        SectionLink(title: "Sight Reading", systemImage: "eye", tab: .sight),
        SectionLink(title: "Scansion Lab", systemImage: "waveform.path", tab: .scansion),
        SectionLink(title: "Forms Forge", systemImage: "hammer", tab: .forge),
        SectionLink(title: "Literary Devices", systemImage: "wand.and.stars", tab: .devices),
        SectionLink(title: "Context & Culture", systemImage: "building.columns", tab: .context),
        SectionLink(title: "FRQ Workshop", systemImage: "pencil.and.list.clipboard", tab: .frq),
        SectionLink(title: "Practice Exam", systemImage: "timer", tab: .exam),
        SectionLink(title: "Study Plan", systemImage: "calendar", tab: .plan),
        SectionLink(title: "Classroom", systemImage: "person.3", tab: .classroom),
    ]
}

/// Today's study time against the daily goal, as a ruled track.
private struct GoalMeter: View {
    let seconds: Double
    let goalMinutes: Int

    var body: some View {
        let fraction = goalMinutes > 0 ? min(1, seconds / Double(goalMinutes * 60)) : 0
        VStack(alignment: .leading, spacing: 6) {
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(Palette.hair)
                    Capsule().fill(fraction >= 1 ? Palette.correct : Palette.rubric)
                        .frame(width: max(6, geo.size.width * fraction))
                }
            }
            .frame(height: 6)
            Text("\(Int(seconds / 60)) of \(goalMinutes) minutes today").quietLabel()
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(Int(seconds / 60)) of \(goalMinutes) minutes studied today")
    }
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

/// Where the student stands: accuracy by skill (weighted as the exam weights
/// it), the weakest spots, and the week of vocabulary ahead — the web
/// dashboard's mastery, weak-spot and forecast panels.
private struct TodayInsights: View {
    @Environment(AppModel.self) private var model
    @Environment(\.library) private var library

    private static let skillLabels = ["1": "Read & comprehend", "2": "Style & context", "3": "Analyze"]

    var body: some View {
        let quiz = model.progress.quizAttempts
        let mastery = Insights.mastery(quiz)
        let scored = mastery.filter { $0.value.total > 0 }
        let weakest = scored.min { pct($0.value) < pct($1.value) }?.key
        let spots = Insights.weakSpots(quizAttempts: quiz, translationAttempts: model.progress.translationAttempts,
                                       scansionAttempts: model.progress.scansionAttempts, vocab: model.vocab,
                                       typeLabels: library?.meta.questionTypeLabels ?? [:])
        let forecast = Insights.forecast(model.vocab)

        VStack(alignment: .leading, spacing: 26) {
            // Empty AP meters say nothing to someone early in the course.
            if !(model.courseFirstOnToday && quiz.isEmpty) {
            VStack(alignment: .leading, spacing: 12) {
                Text("Mastery by skill").rubricLabel()
                ForEach(["1", "2", "3"], id: \.self) { k in
                    let t = mastery[k] ?? Tally(correct: 0, total: 0)
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text(Self.skillLabels[k] ?? k).font(.subheadline)
                            Text("\(Insights.skillWeights[k] ?? 0)% of the exam").quietLabel()
                            Spacer()
                            Text(t.total > 0 ? "\(Int(pct(t)))%" : "—").font(.subheadline.monospacedDigit())
                        }
                        ProgressView(value: t.total > 0 ? pct(t) : 0, total: 100)
                            .tint(k == weakest ? Palette.rubric : Palette.ink2)
                    }
                }
                Text(quiz.isEmpty
                     ? "Nothing graded yet. These fill in as you work the Quiz Engine."
                     : "Your accuracy on \(quiz.count) graded question\(quiz.count == 1 ? "" : "s"). A thin bar on the first skill costs the most.")
                    .font(.footnote).foregroundStyle(Palette.inkMuted)
            }
            }

            if !spots.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Weak spots").rubricLabel().padding(.bottom, 8)
                    ForEach(spots) { spot in
                        Button { open(spot.destination) } label: {
                            HStack(alignment: .firstTextBaseline) {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(spot.label).foregroundStyle(Palette.ink)
                                    Text(spot.detail).font(.footnote).foregroundStyle(Palette.inkMuted)
                                }
                                Spacer()
                                if let p = spot.pct { Text("\(p)%").font(.headline.monospacedDigit()).foregroundStyle(Palette.rubric) }
                                Text(spot.action).font(.footnote.weight(.semibold)).foregroundStyle(Palette.rubric)
                            }
                            .padding(.vertical, 8)
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        Hairline(color: Palette.hair)
                    }
                }
            }

            if !model.vocab.isEmpty {
                VStack(alignment: .leading, spacing: 10) {
                    Text("Vocabulary this week").rubricLabel()
                    let peak = max(1, forecast.week.max() ?? 1)
                    HStack(alignment: .bottom, spacing: 8) {
                        ForEach(Array(forecast.week.enumerated()), id: \.offset) { i, n in
                            VStack(spacing: 4) {
                                Text("\(n)").font(.caption2.monospacedDigit()).foregroundStyle(Palette.inkMuted)
                                RoundedRectangle(cornerRadius: 3)
                                    .fill(i == 0 ? Palette.rubric : Palette.ruleStrong)
                                    .frame(height: max(3, 60 * CGFloat(n) / CGFloat(peak)))
                                Text(i == 0 ? "Today" : Calendar.current.shortWeekdaySymbols[(Calendar.current.component(.weekday, from: Date()) - 1 + i) % 7])
                                    .font(.caption2).foregroundStyle(Palette.inkFaint)
                            }
                            .frame(maxWidth: .infinity)
                            .accessibilityElement(children: .combine)
                        }
                    }
                    Text("\(forecast.mature) mature, \(forecast.learning) still learning.").font(.footnote).foregroundStyle(Palette.inkMuted)
                }
            }
        }
    }

    private func pct(_ t: Tally) -> Double { t.total > 0 ? Double(t.correct) / Double(t.total) * 100 : 0 }

    private func open(_ destination: Insights.Destination) {
        switch destination {
        case .quiz(let type):
            model.quizPresetType = type
            model.selectedTab = .quiz
        case .grammar: model.selectedTab = .grammar
        case .scansion: model.selectedTab = .scansion
        case .vocab: model.selectedTab = .vocab
        }
    }
}

/// The Sententia of the day: the line, and three minutes of questions on
/// it; once done, what it says and where it comes from. The website's
/// dashboard has the same card.
private struct SententiaCard: View {
    @Environment(AppModel.self) private var model
    let line: Sententia

    var body: some View {
        let done = model.progress.daily[model.dailyDay] != nil
        let streak = model.dailyStreak
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .firstTextBaseline) {
                Text("Sententia · the line for today").rubricLabel()
                Spacer(minLength: 8)
                if streak > 0 {
                    Text("\(streak) day\(streak == 1 ? "" : "s") running").quietLabel()
                }
            }
            Text(line.latin)
                .font(.latinItalic(22, relativeTo: .title3))
                .foregroundStyle(Palette.ink)
                .fixedSize(horizontal: false, vertical: true)
            if done {
                Text("“\(line.english)” \(Text("— \(RichText.plain(line.source))").foregroundStyle(Palette.inkMuted))")
                    .font(.prose(.callout))
                    .foregroundStyle(Palette.ink2)
            } else {
                Text(rich: line.source)
                    .font(.prose(.callout))
                    .foregroundStyle(Palette.inkMuted)
            }
            Button {
                model.openDaily()
            } label: {
                Label(done ? "Look again" : "Three questions · 3 min", systemImage: done ? "checkmark" : "text.quote")
                    .font(.subheadline.weight(.semibold))
                    .padding(.vertical, 2)
            }
            .buttonStyle(.glass)
            .padding(.top, 4)
        }
        .accessibilityElement(children: .contain)
    }
}
