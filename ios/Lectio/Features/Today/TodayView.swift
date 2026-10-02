import LectioCore
import SwiftUI

/// The dashboard, as a stack of Liquid Glass panels, each one thing: how long
/// until the exam and how today's going, where to pick up, the Sententia, a
/// way into every other section, then the vocabulary, reading, week, skills,
/// weak spots and laurels. Every section of the app is also in Browse (the
/// Search tab), so nothing here is the only way to anywhere.
struct TodayView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.library) private var library
    @Environment(\.dynamicTypeSize) private var typeSize

    var body: some View {
        @Bindable var model = model
        NavigationStack(path: $model.todayPath) {
            ScrollViewReader { proxy in
                ScrollView {
                    VStack(alignment: .leading, spacing: 14) {
                        header
                        if model.courseFirstOnToday, let next = model.nextCourseLesson {
                            GlassPanel {
                                ContinueCard(place: next, first: model.courseDone.isEmpty, framed: false)
                            }
                        }
                        hero
                        PickUpPanel()
                        if let line = model.todaysSententia {
                            GlassPanel { SententiaCard(line: line) }
                        }
                        JumpPanel().id("jump")
                        panels.id("panels")
                        Color.clear.frame(height: 1).id("end")
                    }
                    .padding(.horizontal, 20)
                    .padding(.bottom, 40)
                    .frame(maxWidth: 960, alignment: .leading)
                    .frame(maxWidth: .infinity)
                }
                .ambientBackground()
                .toolbar {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button("Settings", systemImage: "gearshape") { model.selectedTab = .settings }
                    }
                }
                .navigationDestination(for: AppTab.self) { PushedSection(tab: $0) }
                .navigationDestination(for: Passage.self) { PassageReaderView(passage: $0) }
                .task { await scrollForScreenshot(proxy) }
            }
        }
    }

    /// CI screenshots the lower panels with `-todayScroll jump|panels|end`;
    /// without the argument this does nothing.
    private func scrollForScreenshot(_ proxy: ScrollViewProxy) async {
        guard let id = UserDefaults.standard.string(forKey: "todayScroll") else { return }
        try? await Task.sleep(for: .seconds(2))
        proxy.scrollTo(id, anchor: id == "end" ? .bottom : .top)
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
        .padding(.bottom, 4)
    }

    /* ---------------------------------------------------------------- */
    /* Today: the countdown (or the course), the goal, the numbers        */
    /* ---------------------------------------------------------------- */

    private var hero: some View {
        let progress = model.progress
        let examDate = library?.meta.examDate ?? "2027-05-14"
        let days = Streaks.daysUntilExam(examDate)
        let due = SpacedRepetition.due(model.vocab.values, on: StudyDates.today()).count
        // The ring moves under the figure at accessibility text sizes, where
        // the two side by side would squeeze both.
        let layout = typeSize.isAccessibilitySize
            ? AnyLayout(VStackLayout(alignment: .leading, spacing: 16))
            : AnyLayout(HStackLayout(alignment: .center, spacing: 16))
        return GlassPanel(title: "Today", trailing: Date.now.formatted(.dateTime.weekday(.wide).month(.abbreviated).day())) {
            layout {
                VStack(alignment: .leading, spacing: 4) {
                    if model.courseFirstOnToday {
                        courseFigure
                    } else {
                        examFigure(days: days, examDate: examDate)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                GoalRing(seconds: model.studySecondsToday, goalMinutes: progress.studyPlan.minutesPerDay)
            }
            Hairline(color: Palette.hair)
            FigureRow(spacing: 28) {
                Figure(value: "\(Streaks.current(progress.studyDays))", caption: "day streak")
                Figure(value: "\(Streaks.longest(progress.studyDays))", caption: "longest")
                Figure(value: "\(due)", caption: due == 1 ? "card due" : "cards due")
            }
        }
    }

    @ViewBuilder
    private func examFigure(days: Int, examDate: String) -> some View {
        Figure(value: "\(days)", caption: days == 1 ? "day until the exam" : "days until the exam", tint: Palette.rubric)
        if days > 0, let when = Self.examText(examDate) {
            let weeks = days / 7
            Text(weeks >= 1 ? "\(when) · \(weeks) week\(weeks == 1 ? "" : "s") to go" : when)
                .font(.prose(.footnote))
                .foregroundStyle(Palette.inkMuted)
        }
    }

    private static func examText(_ iso: String) -> String? {
        let parser = DateFormatter()
        parser.locale = Locale(identifier: "en_US_POSIX")
        parser.dateFormat = "yyyy-MM-dd"
        return parser.date(from: iso)?.formatted(.dateTime.day().month(.wide).year())
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

    /* ---------------------------------------------------------------- */
    /* The smaller panels, in a grid where there's room for two columns   */
    /* ---------------------------------------------------------------- */

    @ViewBuilder
    private var panels: some View {
        let quiz = model.progress.quizAttempts
        let recap = Recap.of(model.progress)
        let spots = Insights.weakSpots(quizAttempts: quiz, translationAttempts: model.progress.translationAttempts,
                                       scansionAttempts: model.progress.scansionAttempts, vocab: model.vocab,
                                       typeLabels: library?.meta.questionTypeLabels ?? [:])
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 320), spacing: 14, alignment: .top)], spacing: 14) {
            VocabularyPanel()
            ReadingPanel()
            if !(recap.week.isQuiet && recap.before.isQuiet) {
                WeekPanel(recap: recap)
            }
            // Empty AP meters say nothing to someone early in the course.
            if !(model.courseFirstOnToday && quiz.isEmpty) {
                MasteryPanel(quiz: quiz)
            }
            if !spots.isEmpty {
                WeakSpotsPanel(spots: spots)
            }
            GlassPanel { LaurelsTodayRow() }
        }
    }
}

/* -------------------------------------------------------------------- */
/* Shared pieces                                                          */
/* -------------------------------------------------------------------- */

fileprivate extension AppModel {
    /// Passages the student has opened, each with when it was last opened.
    var openedPassages: [(String, String)] {
        progress.raw["passages"]?.objectValue?.compactMap { id, state -> (String, String)? in
            guard let at = state["lastOpened"]?.stringValue else { return nil }
            return (id, at)
        } ?? []
    }

    var lastOpenedPassage: Passage? {
        openedPassages.max { $0.1 < $1.1 }.flatMap { content?.passage($0.0) }
    }
}

/// Today's study time against the daily goal, as a ring.
private struct GoalRing: View {
    let seconds: Double
    let goalMinutes: Int

    var body: some View {
        let fraction = goalMinutes > 0 ? min(1, seconds / Double(goalMinutes * 60)) : 0
        let met = fraction >= 1
        ZStack {
            Circle().stroke(Palette.ruleStrong.opacity(0.45), lineWidth: 9)
            Circle()
                .trim(from: 0, to: max(0.004, fraction))
                .stroke(met ? Palette.correct : Palette.rubric, style: StrokeStyle(lineWidth: 9, lineCap: .round))
                .rotationEffect(.degrees(-90))
                .animation(.easeOut(duration: 0.6), value: fraction)
            VStack(spacing: 0) {
                Text("\(Int(seconds / 60))")
                    .font(.system(.title, design: .serif).weight(.medium))
                    .monospacedDigit()
                    .foregroundStyle(Palette.ink)
                Text("of \(goalMinutes) min").font(.caption2).foregroundStyle(Palette.inkMuted)
            }
        }
        .frame(width: 96, height: 96)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Today's goal")
        .accessibilityValue("\(Int(seconds / 60)) of \(goalMinutes) minutes studied")
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

/// The week of vocabulary ahead: cards due today, then each of the next six days.
private struct ForecastBars: View {
    let week: [Int]

    var body: some View {
        let peak = max(1, week.max() ?? 1)
        HStack(alignment: .bottom, spacing: 8) {
            ForEach(Array(week.enumerated()), id: \.offset) { i, n in
                VStack(spacing: 4) {
                    Text("\(n)").font(.caption2.monospacedDigit()).foregroundStyle(Palette.inkMuted)
                    RoundedRectangle(cornerRadius: 3)
                        .fill(i == 0 ? Palette.rubric : Palette.ruleStrong)
                        .frame(height: max(3, 52 * CGFloat(n) / CGFloat(peak)))
                    Text(i == 0 ? "Today" : Calendar.current.shortWeekdaySymbols[(Calendar.current.component(.weekday, from: Date()) - 1 + i) % 7])
                        .font(.caption2)
                        .foregroundStyle(Palette.inkFaint)
                }
                .frame(maxWidth: .infinity)
                .accessibilityElement(children: .combine)
            }
        }
    }
}

/* -------------------------------------------------------------------- */
/* Panels                                                                 */
/* -------------------------------------------------------------------- */

/// Where to pick up: the next lesson, the passage last opened, the cards due.
private struct PickUpPanel: View {
    @Environment(AppModel.self) private var model

    private struct Item: Identifiable {
        enum Action {
            case lesson(String)
            case passage(Passage)
            case tab(AppTab)
        }
        let id: String
        let title: String
        let detail: String
        let systemImage: String
        let action: Action
    }

    private var items: [Item] {
        var out: [Item] = []
        // The course leads Today itself for a student who chose it.
        if let lesson = model.nextCourseLesson, !model.courseFirstOnToday, model.courseInTabBar || !model.courseDone.isEmpty {
            out.append(Item(id: "course",
                            title: model.courseDone.isEmpty ? "Start the course" : "Continue the course",
                            detail: "\(lesson.level.title) \(lesson.unit.n).\(lesson.number) · \(RichText.plain(lesson.lesson.title))",
                            systemImage: "graduationcap", action: .lesson(lesson.id)))
        }
        if let passage = model.lastOpenedPassage {
            out.append(Item(id: "read", title: "Continue reading", detail: passage.citation,
                            systemImage: "book.closed", action: .passage(passage)))
        } else {
            out.append(Item(id: "read", title: "Reading Room", detail: "Every syllabus passage, tap any word",
                            systemImage: "books.vertical", action: .tab(.read)))
        }
        let due = SpacedRepetition.due(model.vocab.values, on: StudyDates.today()).count
        out.append(Item(id: "vocab",
                        title: due > 0 ? "Review \(due) vocabulary card\(due == 1 ? "" : "s")" : "Vocabulary",
                        detail: due > 0 ? "Spaced repetition, due today" : "Nothing due — add words from a unit",
                        systemImage: "rectangle.on.rectangle.angled", action: .tab(.vocab)))
        // The quiz has the tab bar's second place unless the course took it.
        if model.courseInTabBar {
            out.append(Item(id: "quiz", title: "Quiz Engine", detail: "AP-style multiple choice, every question explained",
                            systemImage: "checklist", action: .tab(.quiz)))
        }
        return out
    }

    var body: some View {
        let rows = items
        GlassPanel(title: "Pick up") {
            VStack(spacing: 0) {
                ForEach(Array(rows.enumerated()), id: \.element.id) { index, item in
                    if index > 0 { Hairline(color: Palette.hair) }
                    link(item).padding(.vertical, 10)
                }
            }
        }
    }

    @ViewBuilder
    private func link(_ item: Item) -> some View {
        let row = NextUpRow(title: item.title, detail: item.detail, systemImage: item.systemImage)
        switch item.action {
        case .lesson(let id):
            Button { model.openLesson(id) } label: { row }.buttonStyle(.plain)
        case .passage(let passage):
            NavigationLink(value: passage) { row }.buttonStyle(.plain)
        case .tab(let tab):
            Button { model.selectedTab = tab } label: { row }.buttonStyle(.plain)
        }
    }
}

/// A way into the sections that aren't in the tab bar, as a grid of icons;
/// Browse (the last tile) lists them all.
private struct JumpPanel: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dynamicTypeSize) private var typeSize

    private static let ids = ["translate", "sight", "scansion", "forge", "grammar", "devices",
                              "context", "frq", "exam", "plan", "classroom"]

    private struct Target: Identifiable {
        let entry: SectionEntry
        let tab: AppTab
        var id: String { entry.id }
    }

    var body: some View {
        let targets: [Target] = Self.ids.compactMap { id in
            guard let entry = SectionEntry.entry(id), case .tab(let tab) = entry.action else { return nil }
            return Target(entry: entry, tab: tab)
        }
        let columns = Array(repeating: GridItem(.flexible(), spacing: 6, alignment: .top), count: typeSize.isAccessibilitySize ? 2 : 4)
        GlassPanel(title: "Jump to") {
            LazyVGrid(columns: columns, spacing: 16) {
                ForEach(targets) { target in
                    Tile(title: target.entry.short, systemImage: target.entry.systemImage, tint: target.entry.group.tint) {
                        model.selectedTab = target.tab
                    }
                }
                Tile(title: "Browse", systemImage: "square.grid.2x2", tint: Palette.ink2) {
                    model.selectedTab = .search
                }
            }
        }
    }

    private struct Tile: View {
        let title: String
        let systemImage: String
        let tint: Color
        let action: () -> Void

        var body: some View {
            Button(action: action) {
                VStack(spacing: 6) {
                    Image(systemName: systemImage)
                        .font(.title3.weight(.medium))
                        .foregroundStyle(tint)
                        .frame(width: 50, height: 50)
                        .background(tint.opacity(0.15), in: .circle)
                    Text(title)
                        .font(.caption)
                        .foregroundStyle(Palette.ink2)
                        .lineLimit(1)
                        .minimumScaleFactor(0.8)
                }
                .frame(maxWidth: .infinity)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel(title)
        }
    }
}

/// The deck: what's due, what's still being learned, and the week ahead.
private struct VocabularyPanel: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        let forecast = Insights.forecast(model.vocab)
        GlassPanel(title: "Vocabulary", trailing: model.vocab.isEmpty ? nil : "\(model.vocab.count) in your deck") {
            if model.vocab.isEmpty {
                Text("Your deck fills as you finish lessons and open passages, and you can add words any time from the vocabulary lists.")
                    .font(.prose(.callout))
                    .foregroundStyle(Palette.ink2)
            } else {
                FigureRow(spacing: 24) {
                    Figure(value: "\(forecast.dueNow)", caption: "due now", tint: forecast.dueNow > 0 ? Palette.rubric : Palette.ink)
                    Figure(value: "\(forecast.learning)", caption: "learning")
                    Figure(value: "\(forecast.mature)", caption: "mature")
                }
                ForecastBars(week: forecast.week)
            }
            Button {
                model.selectedTab = .vocab
            } label: {
                Label(forecast.dueNow > 0 ? "Review \(forecast.dueNow) due" : "Open vocabulary", systemImage: "rectangle.on.rectangle.angled")
                    .frame(maxWidth: .infinity)
            }
            .glassButton(prominent: forecast.dueNow > 0)
        }
    }
}

/// How much of the syllabus has been opened, and where to carry on.
private struct ReadingPanel: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        let opened = model.openedPassages.count
        let total = model.content?.passages.count ?? 0
        GlassPanel(title: "Reading Room", trailing: total > 0 ? "\(opened) of \(total) opened" : nil) {
            ProgressView(value: Double(min(opened, max(1, total))), total: Double(max(1, total)))
                .tint(Palette.rubric)
                .accessibilityLabel("Passages opened")
                .accessibilityValue("\(opened) of \(total)")
            if let last = model.lastOpenedPassage {
                NavigationLink(value: last) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Continue reading").quietLabel()
                        Text(last.citation).font(.latin(20, relativeTo: .title3)).foregroundStyle(Palette.ink)
                        Text(last.title).font(.subheadline).foregroundStyle(Palette.inkMuted)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            } else {
                Text("Every syllabus passage, with a gloss on every word.")
                    .font(.prose(.callout))
                    .foregroundStyle(Palette.ink2)
            }
            Button {
                model.selectedTab = .read
            } label: {
                Label("Open the Reading Room", systemImage: "book.closed").frame(maxWidth: .infinity)
            }
            .glassButton()
        }
    }
}

/// The last seven days beside the seven before (LectioCore `Recap`, the web's
/// src/lib/recap.ts), as a grid of numbers.
private struct WeekPanel: View {
    let recap: Recap

    private struct Tile: Identifiable {
        let n: Int
        let prev: Int
        let one: String
        let many: String
        var note: String? = nil
        var id: String { many }
    }

    var body: some View {
        let w = recap.week, b = recap.before
        let tiles = [
            Tile(n: w.days, prev: b.days, one: "day of study", many: "days of study"),
            Tile(n: w.lessons, prev: b.lessons, one: "lesson finished", many: "lessons finished"),
            Tile(n: w.quiz, prev: b.quiz, one: "quiz question", many: "quiz questions",
                 note: w.quiz > 0 ? "\(Int((Double(w.quizRight) / Double(w.quiz) * 100).rounded()))% right" : nil),
            Tile(n: w.cards, prev: b.cards, one: "flashcard reviewed", many: "flashcards reviewed"),
            Tile(n: w.sententiae, prev: b.sententiae, one: "sententia", many: "sententiae"),
            Tile(n: w.scansion, prev: b.scansion, one: "line scanned", many: "lines scanned"),
            Tile(n: w.translations, prev: b.translations, one: "translation", many: "translations"),
        ].filter { $0.n > 0 || $0.prev > 0 }
        GlassPanel(title: "This week", trailing: w.isQuiet ? "nothing yet" : "vs the week before") {
            LazyVGrid(columns: [GridItem(.flexible(), alignment: .topLeading), GridItem(.flexible(), alignment: .topLeading)], spacing: 16) {
                ForEach(tiles) { t in
                    VStack(alignment: .leading, spacing: 2) {
                        Text("\(t.n)")
                            .font(.system(.title2, design: .serif).weight(.medium))
                            .monospacedDigit()
                            .foregroundStyle(Palette.ink)
                        Text(t.n == 1 ? t.one : t.many)
                            .font(.caption)
                            .foregroundStyle(Palette.ink2)
                        Text([t.note, delta(t.n - t.prev)].compactMap { $0 }.joined(separator: " · "))
                            .font(.caption2.monospacedDigit())
                            .foregroundStyle(Palette.inkMuted)
                    }
                    .accessibilityElement(children: .ignore)
                    .accessibilityLabel(spoken(t))
                }
            }
        }
    }

    private func delta(_ d: Int) -> String {
        d == 0 ? "same" : d > 0 ? "+\(d)" : "−\(-d)"
    }

    private func spoken(_ t: Tile) -> String {
        let d = t.n - t.prev
        let change = d == 0 ? "the same as the week before" : "\(abs(d)) \(d > 0 ? "more" : "fewer") than the week before"
        return "\(t.n) \(t.n == 1 ? t.one : t.many)\(t.note.map { ", \($0)" } ?? ""), \(change)"
    }
}

/// Accuracy by skill, weighted as the exam weights it.
private struct MasteryPanel: View {
    let quiz: [QuizAttempt]

    private static let skillLabels = ["1": "Read & comprehend", "2": "Style & context", "3": "Analyze"]

    var body: some View {
        let mastery = Insights.mastery(quiz)
        let scored = mastery.filter { $0.value.total > 0 }
        let weakest = scored.min { pct($0.value) < pct($1.value) }?.key
        GlassPanel(title: "Mastery by skill", trailing: quiz.isEmpty ? nil : "\(quiz.count) graded") {
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
                 : "A thin bar on the first skill costs the most.")
                .font(.footnote)
                .foregroundStyle(Palette.inkMuted)
        }
    }

    private func pct(_ t: Tally) -> Double { t.total > 0 ? Double(t.correct) / Double(t.total) * 100 : 0 }
}

/// What the history says to work on, each with its way in.
private struct WeakSpotsPanel: View {
    @Environment(AppModel.self) private var model
    let spots: [Insights.WeakSpot]

    var body: some View {
        GlassPanel(title: "Weak spots") {
            VStack(spacing: 0) {
                ForEach(Array(spots.enumerated()), id: \.element.id) { index, spot in
                    if index > 0 { Hairline(color: Palette.hair) }
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
                        .padding(.vertical, 9)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

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
            LabelRow {
                Text("Sententia · the line for today").rubricLabel()
            } trailing: {
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
            .glassButton()
            .padding(.top, 4)
        }
        .accessibilityElement(children: .contain)
    }
}
