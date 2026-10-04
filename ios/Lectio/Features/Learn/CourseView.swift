import LectioCore
import SwiftUI

/// The course: two tracks side by side, the web's /learn.
///
/// - **Grammar**, Prīma to Quārta, taken in order from where the level check
///   (or the student) starts it.
/// - **Vocabulary**, Verba: every word on the AP list, by letter, in lessons
///   of about twelve. It adapts: lessons whose words are already known are
///   passed over, and each unit ends in a test that, passed, skips the unit.
///
/// At the top, "Your path": the next lesson of each track, and the level check.
/// A lesson opens over everything, full screen (see LessonView).
struct CourseView: View {
    var body: some View {
        SectionStack { CourseMap() }
    }
}

/// Which track the map shows.
enum CourseTrack: String, CaseIterable, Identifiable {
    case grammar, vocabulary
    var id: Self { self }
    var title: String { self == .grammar ? "Grammar" : "Vocabulary" }
}

private struct CourseMap: View {
    @Environment(AppModel.self) private var model
    @Environment(\.library) private var library
    @AppStorage("courseTrack") private var track: CourseTrack = .grammar
    /// `-courseTrackOnLaunch vocabulary` (CI screenshots) shows a track for
    /// this launch only, without changing the one remembered.
    @State private var forced = CourseTrack(rawValue: UserDefaults.standard.string(forKey: "courseTrackOnLaunch") ?? "")
    @State private var checking = false

    var body: some View {
        let done = model.courseDone
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Latin, from the first word")
                        .font(.system(.title, design: .serif))
                        .foregroundStyle(Palette.ink)
                    Text("Grammar in short lessons, in order, and the AP word list by letter beside it. The words you learn join your flashcards, and the path leads to the AP syllabus.")
                        .font(.prose(.body))
                        .foregroundStyle(Palette.inkMuted)
                }
                .padding(.top, 8)

                PathPanel(checking: $checking)

                if library?.course.grammarLessons.isEmpty == false {
                    GlassPanel(title: "Practise") { PracticeRows() }
                }

                Picker("Track", selection: Binding(get: { forced ?? track }, set: { forced = nil; track = $0 })) {
                    ForEach(CourseTrack.allCases) { Text($0.title).tag($0) }
                }
                .pickerStyle(.segmented)
                .padding(.top, 10)

                if let library {
                    switch forced ?? track {
                    case .grammar:
                        ForEach(library.course.grammarLevels) { level in
                            LevelHeader(level: level)
                            ForEach(level.units) { unit in
                                UnitPanel(unit: unit, label: "\(level.title) · Unit \(unit.n)", done: done, next: model.nextCourseLesson?.id)
                            }
                        }
                    case .vocabulary:
                        if let verba = library.course.vocabLevel {
                            VerbaHeader(level: verba)
                            ForEach(verba.units) { unit in
                                UnitPanel(unit: unit, label: "Unit \(unit.n)", done: done, next: model.nextVocabLesson?.id)
                            }
                        } else {
                            Text("The vocabulary track arrives with the next content update.")
                                .font(.prose(.callout))
                                .foregroundStyle(Palette.inkMuted)
                        }
                    }
                }
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 40)
            .frame(maxWidth: 760, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
        .ambientBackground()
        .navigationTitle("Course")
        .fullScreenCover(isPresented: $checking) {
            LevelCheckView()
                .environment(model)
                .environment(\.library, library)
        }
    }
}

/* ------------------------------------------------------------------ */
/* Your path                                                           */
/* ------------------------------------------------------------------ */

/// The next lesson of each track, and the level check.
private struct PathPanel: View {
    @Environment(AppModel.self) private var model
    @Binding var checking: Bool

    var body: some View {
        GlassPanel(title: "Your path") {
            VStack(spacing: 0) {
                PathRow(track: .grammar, place: model.nextCourseLesson,
                        empty: "You have finished every grammar lesson written so far.")
                Hairline(color: Palette.hair)
                PathRow(track: .vocabulary, place: model.nextVocabLesson,
                        empty: "You know every word on the AP list. Your flashcards keep them fresh.")
                if let shaky = model.shakyLesson {
                    Hairline(color: Palette.hair)
                    RetryRow(place: shaky, best: model.progress.lessons[shaky.lesson.id]?.best ?? 0)
                }
            }
            Button { checking = true } label: {
                Label(model.progress.learner == nil ? "Find my level" : "Check my level again", systemImage: "scope")
                    .font(.subheadline.weight(.semibold))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 2)
            }
            .glassButton()
        }
    }
}

private struct PathRow: View {
    @Environment(AppModel.self) private var model
    let track: CourseTrack
    let place: LessonPlace?
    let empty: String

    var body: some View {
        if let place {
            Button { model.openLesson(place.lesson.id) } label: {
                HStack(spacing: 14) {
                    Image(systemName: icon(place))
                        .font(.title3)
                        .foregroundStyle(tint)
                        .frame(width: 44, height: 44)
                        .background(tint.opacity(0.14), in: .circle)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(track.title).quietLabel()
                        Text(rich: place.lesson.title)
                            .font(.system(.headline, design: .serif))
                            .foregroundStyle(Palette.ink)
                        Text(detail(place))
                            .font(.subheadline)
                            .foregroundStyle(Palette.inkMuted)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    Spacer(minLength: 8)
                    Image(systemName: "play.circle.fill")
                        .font(.title2)
                        .foregroundStyle(Palette.rubric)
                        .accessibilityHidden(true)
                }
                .padding(.vertical, 10)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityHint("Opens the lesson")
        } else {
            VStack(alignment: .leading, spacing: 3) {
                Text(track.title).quietLabel()
                Text(empty).font(.prose(.callout)).foregroundStyle(Palette.inkMuted)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.vertical, 10)
        }
    }

    private var tint: Color { track == .grammar ? Palette.rubric : Palette.woad }

    private func icon(_ place: LessonPlace) -> String {
        if place.lesson.isTest { return "checkmark.seal" }
        return track == .grammar ? "text.book.closed" : "character.book.closed"
    }

    private func detail(_ place: LessonPlace) -> String {
        if place.lesson.isTest {
            return "The level check thinks you know these. Pass the test to skip the unit · \(place.lesson.minutes) min"
        }
        if place.level.isVocabulary {
            return "Verba · \(place.unit.title) · \(place.lesson.words.count) words · \(place.lesson.minutes) min"
        }
        return "\(place.level.title) · Unit \(place.unit.n) · Lesson \(place.number) · \(place.lesson.minutes) min"
    }
}

/// A lesson that went badly, offered again: a second try usually goes much
/// better, and it's where the grammar or the words haven't settled yet.
private struct RetryRow: View {
    @Environment(AppModel.self) private var model
    let place: LessonPlace
    let best: Double

    var body: some View {
        Button { model.openLesson(place.lesson.id) } label: {
            HStack(spacing: 14) {
                Image(systemName: "arrow.counterclockwise")
                    .font(.title3)
                    .foregroundStyle(Palette.gilt)
                    .frame(width: 44, height: 44)
                    .background(Palette.gilt.opacity(0.14), in: .circle)
                VStack(alignment: .leading, spacing: 2) {
                    Text("Worth another go").quietLabel()
                    Text(rich: place.lesson.title)
                        .font(.system(.headline, design: .serif))
                        .foregroundStyle(Palette.ink)
                    Text("Best \(Int((best * 100).rounded()))% · a second try usually goes much better")
                        .font(.subheadline)
                        .foregroundStyle(Palette.inkMuted)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer(minLength: 8)
                Image(systemName: "play.circle.fill")
                    .font(.title2)
                    .foregroundStyle(Palette.gilt)
                    .accessibilityHidden(true)
            }
            .padding(.vertical, 10)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityHint("Opens the lesson again")
    }
}

/// The next lesson, large, with its button. Leads Today for a student in the course.
struct ContinueCard: View {
    @Environment(AppModel.self) private var model
    let place: LessonPlace
    let first: Bool
    /// False where the card already sits in a panel of its own (Today).
    var framed = true

    var body: some View {
        if framed {
            content
                .padding(20)
                .background(Palette.slip, in: .rect(cornerRadius: 20))
                .overlay(RoundedRectangle(cornerRadius: 20).strokeBorder(Palette.rule, lineWidth: 0.5))
        } else {
            content
        }
    }

    private var content: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(first ? "Start here" : "Continue").rubricLabel()
            Text("\(place.level.title) · Unit \(place.unit.n) · Lesson \(place.number)").quietLabel()
            Text(rich: place.lesson.title)
                .font(.system(.title2, design: .serif))
                .foregroundStyle(Palette.ink)
            Text(rich: place.lesson.summary)
                .font(.prose(.callout))
                .foregroundStyle(Palette.ink2)
            Button {
                model.openLesson(place.lesson.id)
            } label: {
                Label(first ? "Begin · \(place.lesson.minutes) min" : "Continue · \(place.lesson.minutes) min", systemImage: "play.fill")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 6)
            }
            .glassButton(prominent: true)
            .padding(.top, 6)
        }
    }
}

/// Ways to practise what the course has taught, side by side: Review (ten
/// exercises from finished lessons, weighted toward the hardest;
/// Course.review), once there is something to review, and the sentence
/// builder (SentenceBuilder). The web's course page has the same two.
private struct PracticeRows: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(model.canReview
                 ? "Review mixes ten exercises from lessons you’ve finished, more from the ones you found hard. The sentence builder has you rebuild eight sentences from tiles."
                 : "The sentence builder has you rebuild eight sentences from the course, from tiles. Review joins it once you’ve finished a lesson or two.")
                .font(.prose(.callout))
                .foregroundStyle(Palette.ink2)
                .fixedSize(horizontal: false, vertical: true)
            FigureRow(spacing: 10) {
                if model.canReview {
                    button("Review · 6 min", "arrow.triangle.2.circlepath") { model.openReview() }
                }
                button("Build · 5 min", "square.stack.3d.up") { model.openSentences() }
            }
        }
    }

    private func button(_ title: String, _ systemImage: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Label(title, systemImage: systemImage)
                .font(.subheadline.weight(.semibold))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 2)
        }
        .glassButton()
    }
}

/* ------------------------------------------------------------------ */
/* The map                                                             */
/* ------------------------------------------------------------------ */

private struct LevelHeader: View {
    let level: CurriculumLevel

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 12) {
            Text(level.numeral)
                .font(.system(size: 40, weight: .regular, design: .serif))
                .foregroundStyle(Palette.rubric)
            VStack(alignment: .leading, spacing: 4) {
                Text("\(level.title) · \(Text(level.subtitle).foregroundStyle(Palette.inkMuted))")
                    .font(.system(.title2, design: .serif))
                    .foregroundStyle(Palette.ink)
                Text(level.blurb)
                    .font(.prose(.callout))
                    .foregroundStyle(Palette.ink2)
            }
        }
        .padding(.top, 14)
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(.isHeader)
    }
}

/// Verba's heading: what it is, and how much of the list is known.
private struct VerbaHeader: View {
    @Environment(AppModel.self) private var model
    let level: CurriculumLevel

    var body: some View {
        let words = model.wordsKnown
        let inDeck = model.vocab.count
        VStack(alignment: .leading, spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text("\(level.title) · \(Text(level.subtitle).foregroundStyle(Palette.inkMuted))")
                    .font(.system(.title2, design: .serif))
                    .foregroundStyle(Palette.ink)
                Text(level.blurb)
                    .font(.prose(.callout))
                    .foregroundStyle(Palette.ink2)
            }
            .accessibilityAddTraits(.isHeader)
            FigureRow(spacing: 26) {
                Figure(value: "\(words.known)", caption: "words known", tint: Palette.woad)
                Figure(value: "\(inDeck)", caption: "in your deck")
                Figure(value: "\(words.total)", caption: "on the list")
            }
        }
        .padding(.top, 14)
    }
}

/// A unit as a glass panel: its title, progress and, opened, its lessons.
/// The unit holding the next lesson starts open. A vocabulary unit shows its
/// test, the quickest way past words already known, even when closed.
private struct UnitPanel: View {
    @Environment(AppModel.self) private var model
    let unit: CurriculumUnit
    let label: String
    let done: Set<String>
    let next: String?
    @State private var expanded: Bool

    init(unit: CurriculumUnit, label: String, done: Set<String>, next: String?) {
        self.unit = unit
        self.label = label
        self.done = done
        self.next = next
        _expanded = State(initialValue: unit.lessons.contains { $0.id == next })
    }

    var body: some View {
        let progress = Course.unitProgress(unit, done: done)
        let test = unit.lessons.first(where: \.isTest)
        let lessons = unit.lessons.filter { !$0.isTest }
        GlassPanel {
            Button {
                withAnimation(.snappy(duration: 0.3)) { expanded.toggle() }
            } label: {
                HStack(alignment: .center, spacing: 12) {
                    VStack(alignment: .leading, spacing: 3) {
                        Text(label).rubricLabel()
                        Text(rich: unit.title)
                            .font(.system(.title3, design: .serif))
                            .foregroundStyle(Palette.ink)
                            .multilineTextAlignment(.leading)
                    }
                    Spacer(minLength: 8)
                    Text("\(Int((progress * 100).rounded()))%")
                        .font(.subheadline.monospacedDigit())
                        .foregroundStyle(progress >= 1 ? Palette.correct : Palette.inkMuted)
                    Image(systemName: "chevron.down")
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(Palette.inkFaint)
                        .rotationEffect(.degrees(expanded ? 0 : -90))
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityValue("\(Int((progress * 100).rounded())) percent done")
            .accessibilityHint(expanded ? "Hides the lessons" : "Shows the lessons")

            ProgressView(value: progress)
                .tint(progress >= 1 ? Palette.correct : Palette.rubric)
                .accessibilityHidden(true)

            if test != nil {
                // A vocabulary unit: how many of its words are in the deck,
                // and how many are held fast.
                let ids = unit.lessons.flatMap(\.vocabIds)
                let inDeck = ids.filter { model.vocab[$0] != nil }.count
                let known = ids.filter { (model.vocab[$0]?.interval ?? 0) >= Path.knownInterval }.count
                Text("\(ids.count) words · \(inDeck) in your deck · \(known) known")
                    .font(.caption.monospacedDigit())
                    .foregroundStyle(Palette.inkMuted)
            }
            if let test { TestRow(test: test, unit: unit) }

            if expanded {
                Text(rich: unit.blurb)
                    .font(.prose(.subheadline))
                    .foregroundStyle(Palette.inkMuted)
                VStack(spacing: 0) {
                    ForEach(Array(lessons.enumerated()), id: \.element.id) { i, lesson in
                        if i > 0 { Hairline(color: Palette.hair) }
                        LessonRow(number: i + 1, lesson: lesson, record: model.progress.lessons[lesson.id],
                                  known: Path.lessonKnown(lesson.vocabIds, intervals: model.vocab.mapValues(\.interval)),
                                  isNext: lesson.id == next) {
                            model.openLesson(lesson.id)
                        }
                    }
                }
            }
        }
    }
}

/// A vocabulary unit's test: what it does, how the last try went, and the
/// button. Prominent when the level check thinks the unit is known.
private struct TestRow: View {
    @Environment(AppModel.self) private var model
    let test: Lesson
    let unit: CurriculumUnit

    var body: some View {
        let record = model.progress.lessons[test.id]
        let suggested = model.knownVocabUnits.contains(unit.id) && record == nil
        let passed = (record?.best ?? 0) >= Path.testPass
        HStack(alignment: .center, spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text(passed ? "Unit test passed" : suggested ? "You probably know these" : "Know these already?")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(passed ? Palette.correct : Palette.ink)
                Text(record.map { "Best \(Int(($0.best * 100).rounded()))% · \(Int((Path.testPass * 100).rounded()))% passes" }
                     ?? "\(test.exerciseCount) words from the whole unit. Pass to skip it.")
                    .font(.footnote)
                    .foregroundStyle(Palette.inkMuted)
            }
            Spacer(minLength: 8)
            Button { model.openLesson(test.id) } label: {
                Label(record == nil ? "Take the test" : "Again", systemImage: "checkmark.seal")
                    .font(.subheadline.weight(.semibold))
            }
            .glassButton(prominent: suggested)
        }
    }
}

private struct LessonRow: View {
    let number: Int
    let lesson: Lesson
    let record: LessonProgress?
    /// Every word it teaches is already well known.
    let known: Bool
    let isNext: Bool
    let open: () -> Void

    var body: some View {
        let testedOut = record?.attempts == 0
        Button(action: open) {
            HStack(alignment: .firstTextBaseline, spacing: 14) {
                Group {
                    if record != nil {
                        Image(systemName: "checkmark").foregroundStyle(Palette.correct)
                    } else if known {
                        Image(systemName: "checkmark").foregroundStyle(Palette.inkFaint)
                    } else {
                        Text("\(number)").foregroundStyle(isNext ? Palette.rubric : Palette.inkFaint)
                    }
                }
                .font(.system(.body, design: .serif).monospacedDigit())
                .frame(width: 22)
                VStack(alignment: .leading, spacing: 3) {
                    Text(rich: lesson.title)
                        .font(.system(.headline, design: .serif).weight(isNext ? .semibold : .regular))
                        .foregroundStyle(isNext ? Palette.rubric : Palette.ink)
                    Text(rich: lesson.summary)
                        .font(.prose(.subheadline))
                        .foregroundStyle(Palette.inkMuted)
                        .multilineTextAlignment(.leading)
                }
                Spacer(minLength: 8)
                Text(status(testedOut: testedOut))
                    .font(.caption.monospacedDigit())
                    .foregroundStyle(record != nil ? Palette.correct : Palette.inkFaint)
            }
            .padding(.vertical, 11)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityElement(children: .combine)
        .accessibilityValue(isNext ? "Next" : "")
        .accessibilityHint(record != nil ? "Finished. Opens the lesson again." : "Opens the lesson.")
    }

    private func status(testedOut: Bool) -> String {
        if testedOut { return "tested out" }
        if let record { return "\(Int((record.best * 100).rounded()))%" }
        if known { return "known" }
        return "\(lesson.minutes) min"
    }
}
