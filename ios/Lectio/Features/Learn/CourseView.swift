import LectioCore
import SwiftUI

/// The course map — the web's /learn. Levels, units and their lessons, with
/// where to pick up at the top. A lesson opens over everything, full screen
/// (see LessonView).
struct CourseView: View {
    var body: some View {
        SectionStack { CourseMap() }
    }
}

private struct CourseMap: View {
    @Environment(AppModel.self) private var model
    @Environment(\.library) private var library

    var body: some View {
        let done = model.courseDone
        ScrollView {
            VStack(alignment: .leading, spacing: 28) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Latin, from the first word")
                        .font(.system(.title, design: .serif))
                        .foregroundStyle(Palette.ink)
                    Text("Short lessons in order, each teaching a little and asking a lot. The words you learn join your flashcards, and the path leads to the AP syllabus.")
                        .font(.prose(.body))
                        .foregroundStyle(Palette.inkMuted)
                }
                .padding(.top, 8)

                if let next = model.nextCourseLesson {
                    ContinueCard(place: next, first: done.isEmpty)
                } else if let library, !library.course.lessons.isEmpty {
                    Text("You have finished every lesson written so far. New ones appear here as they're added.")
                        .font(.prose(.callout))
                        .foregroundStyle(Palette.inkMuted)
                }

                if let library {
                    ForEach(library.course.levels) { level in
                        LevelSection(level: level, done: done, next: model.nextCourseLesson?.id)
                    }
                }

                ComingLevels()
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 40)
            .frame(maxWidth: 720, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
        .pageBackground()
        .navigationTitle("Course")
    }
}

private struct ContinueCard: View {
    @Environment(AppModel.self) private var model
    let place: LessonPlace
    let first: Bool

    var body: some View {
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
            .buttonStyle(.glassProminent)
            .padding(.top, 6)
        }
        .padding(20)
        .background(Palette.slip, in: .rect(cornerRadius: 20))
        .overlay(RoundedRectangle(cornerRadius: 20).strokeBorder(Palette.rule, lineWidth: 0.5))
    }
}

private struct LevelSection: View {
    let level: CurriculumLevel
    let done: Set<String>
    let next: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
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
            ForEach(level.units) { unit in
                UnitBlock(unit: unit, done: done, next: next)
            }
        }
    }
}

private struct UnitBlock: View {
    @Environment(AppModel.self) private var model
    let unit: CurriculumUnit
    let done: Set<String>
    let next: String?

    var body: some View {
        let progress = Course.unitProgress(unit, done: done)
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .firstTextBaseline) {
                Text("Unit \(unit.n) · \(unit.title)").rubricLabel()
                Spacer()
                Text("\(Int((progress * 100).rounded()))%")
                    .font(.caption.monospacedDigit())
                    .foregroundStyle(progress >= 1 ? Palette.correct : Palette.inkMuted)
            }
            Text(rich: unit.blurb)
                .font(.prose(.subheadline))
                .foregroundStyle(Palette.inkMuted)
            ProgressView(value: progress)
                .tint(progress >= 1 ? Palette.correct : Palette.rubric)
                .accessibilityLabel("Unit \(unit.n), \(Int(progress * 100)) percent done")
            VStack(spacing: 0) {
                ForEach(Array(unit.lessons.enumerated()), id: \.element.id) { i, lesson in
                    Hairline(color: Palette.hair)
                    LessonRow(number: i + 1, lesson: lesson, best: model.progress.lessons[lesson.id]?.best, isNext: lesson.id == next) {
                        model.openLesson(lesson.id)
                    }
                }
            }
        }
    }
}

private struct LessonRow: View {
    let number: Int
    let lesson: Lesson
    let best: Double?
    let isNext: Bool
    let open: () -> Void

    var body: some View {
        Button(action: open) {
            HStack(alignment: .firstTextBaseline, spacing: 14) {
                Group {
                    if best != nil {
                        Image(systemName: "checkmark").foregroundStyle(Palette.correct)
                    } else {
                        Text("\(number)").foregroundStyle(isNext ? Palette.rubric : Palette.inkFaint)
                    }
                }
                .font(.system(.body, design: .serif).monospacedDigit())
                .frame(width: 22)
                VStack(alignment: .leading, spacing: 3) {
                    Text(rich: lesson.title)
                        .font(.system(.headline, design: .serif).weight(.regular))
                        .foregroundStyle(Palette.ink)
                    Text(rich: lesson.summary)
                        .font(.prose(.subheadline))
                        .foregroundStyle(Palette.inkMuted)
                        .multilineTextAlignment(.leading)
                }
                Spacer(minLength: 8)
                Text(best.map { "\(Int(($0 * 100).rounded()))%" } ?? "\(lesson.minutes) min")
                    .font(.caption.monospacedDigit())
                    .foregroundStyle(best != nil ? Palette.correct : Palette.inkFaint)
            }
            .padding(.vertical, 12)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityElement(children: .combine)
        .accessibilityHint(best != nil ? "Finished. Opens the lesson again." : "Opens the lesson.")
    }
}

/// The levels still being written, so the map shows where the course goes.
private struct ComingLevels: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Hairline()
            coming("II", "Secunda", "Intermediate", "The passive, participles and the ablative absolute, indirect statement, the subjunctive and its clauses.")
            coming("III", "Tertia", "Toward AP", "Adapted Caesar and Pliny, poetic word order, meter, and reading at sight: the bridge into Vergil.")
        }
        .opacity(0.75)
    }

    private func coming(_ numeral: String, _ title: String, _ subtitle: String, _ blurb: String) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 12) {
            Text(numeral).font(.system(size: 30, design: .serif)).foregroundStyle(Palette.inkFaint)
            VStack(alignment: .leading, spacing: 3) {
                Text("\(title) · \(subtitle)").font(.system(.headline, design: .serif)).foregroundStyle(Palette.ink)
                Text("In preparation. \(blurb)").font(.prose(.subheadline)).foregroundStyle(Palette.inkMuted)
            }
        }
    }
}
