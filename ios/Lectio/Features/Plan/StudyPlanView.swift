import LectioCore
import SwiftUI

/// A plan measured backwards from exam day — src/app/plan/StudyPlan.tsx.
/// Phase lengths follow the exam's own weighting: reading and comprehension
/// is the largest share, so most of the time goes on the syllabus itself.
struct StudyPlanView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.library) private var library

    struct Phase: Identifiable {
        let id: String
        let name: String
        let from: Int
        let to: Int
        let focus: String
        let targets: [String]
    }

    static func phases(daysLeft days: Int) -> [Phase] {
        let r = { (f: Double) in max(1, Int((Double(days) * f).rounded())) }
        return [
            Phase(id: "foundation", name: "Foundation", from: days, to: r(0.55),
                  focus: "Read the syllabus and build the vocabulary base.",
                  targets: ["Work through the required passages in the Reading Room, one or two a week.",
                            "Keep the vocabulary queue clear — the core list is the floor everything else stands on.",
                            "Start Grammar & Syntax on the constructions you keep stumbling over."]),
            Phase(id: "consolidation", name: "Consolidation", from: r(0.55), to: r(0.22),
                  focus: "Translate accurately and start writing to the rubric.",
                  targets: ["A literal translation drill twice a week; log the segments you miss.",
                            "Scansion until the fifth-foot dactyl is automatic.",
                            "One FRQ 3 short essay a week, self-scored against the official rows.",
                            "Sight reading once a week, timed."]),
            Phase(id: "exam-shape", name: "Exam shape", from: r(0.22), to: r(0.06),
                  focus: "Practise under the real timing.",
                  targets: ["A full practice exam every two or three weeks.",
                            "Course project passages: drill summary and interpretation-with-evidence.",
                            "Rework the questions in your review queue until it empties.",
                            "Target the weakest skill category, not the most comfortable."]),
            Phase(id: "taper", name: "Taper", from: r(0.06), to: 0,
                  focus: "Keep it warm; do not learn anything new.",
                  targets: ["Re-read the syllabus passages you know least well.",
                            "Vocabulary review only — no new cards.",
                            "One timed section, not a whole exam.",
                            "Sleep."]),
        ]
    }

    var body: some View {
        SectionStack {
            if let library {
                content(library)
            }
        }
    }

    private func content(_ library: ContentLibrary) -> some View {
        let days = Streaks.daysUntilExam(library.meta.examDate)
        let phases = Self.phases(daysLeft: days)
        let current = phases.first { days <= $0.from && days > $0.to } ?? phases[phases.count - 1]
        let plan = model.progress.studyPlan
        let required = library.requiredPassages
        let read = required.filter { model.progress.passage($0.id).lastOpened != nil }.count
        let inRotation = model.vocab.count
        let due = SpacedRepetition.due(model.vocab.values, on: StudyDates.today()).count
        let weeksLeft = max(1, Double(days) / 7)
        let passagesPerWeek = Double(required.count - read) / weeksLeft
        let wordsPerWeek = Double(library.coreVocabulary.count - inRotation) / weeksLeft
        let weekday = Calendar.current.component(.weekday, from: Date()) - 1
        let todayActive = plan.activeDays.contains(weekday)
        let studiedToday = model.progress.studyDays.contains(StudyDates.today())
        let hours = Int((Double(days) / 7 * Double(max(plan.activeDays.count, 1)) * Double(plan.minutesPerDay) / 60).rounded())
        let drillsTried = Set(model.progress.translationAttempts.map(\.drillId)).count

        return ScrollView {
            VStack(alignment: .leading, spacing: 30) {
                Text("\(days) days · \(examDateLabel(library.meta.examDate))").rubricLabel()

                // Today
                VStack(alignment: .leading, spacing: 10) {
                    Text(todayActive ? "Today" : "Today · a rest day in your schedule").quietLabel()
                    Text(studiedToday ? "Done for today" : todayActive ? "\(plan.minutesPerDay) minutes" : "Rest day")
                        .font(.system(.title, design: .serif).weight(.semibold))
                    if todayActive && !studiedToday {
                        if due > 0 { target("Clear \(min(due, 40)) vocabulary card\(due == 1 ? "" : "s") (\(min(15, Int(Double(plan.minutesPerDay) * 0.35))) min)") }
                        target(current.focus)
                        if read < required.count { target("Read or re-read one syllabus passage") }
                    }
                    HStack {
                        if due > 0 {
                            Button("Vocabulary (\(due))") { model.selectedTab = .vocab }.glassButton(prominent: true)
                        }
                        Button("Reading Room") { model.selectedTab = .read }.glassButton()
                    }
                    .padding(.top, 4)
                }
                .padding(.leading, 14)
                .overlay(alignment: .leading) { Rectangle().fill(Palette.redLine).frame(width: 2) }

                // Schedule
                VStack(alignment: .leading, spacing: 14) {
                    Text("Your schedule").rubricLabel()
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Minutes per study day — \(Text("\(plan.minutesPerDay)").foregroundStyle(Palette.rubric).bold())")
                        Slider(value: Binding(
                            get: { Double(plan.minutesPerDay) },
                            set: { v in model.update { $0.setStudyPlan(minutesPerDay: Int((v / 5).rounded()) * 5) } }
                        ), in: 10...120, step: 5)
                        .tint(Palette.rubric)
                    }
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Study days")
                        HStack(spacing: 6) {
                            ForEach(0..<7, id: \.self) { d in
                                let on = plan.activeDays.contains(d)
                                Button(Calendar.current.veryShortWeekdaySymbols[d]) {
                                    var days = Set(plan.activeDays)
                                    if on { days.remove(d) } else { days.insert(d) }
                                    model.update { $0.setStudyPlan(activeDays: days.sorted()) }
                                }
                                .buttonStyle(ChipStyle(on: on))
                                .accessibilityLabel(Calendar.current.weekdaySymbols[d])
                                .accessibilityAddTraits(on ? .isSelected : [])
                            }
                        }
                    }
                    Text("That is roughly \(Text("\(hours) hours").foregroundStyle(Palette.rubric).bold()) between now and the exam. To finish the required reading you need about \(Text(passagesPerWeek < 0.1 ? "no" : passagesPerWeek.formatted(.number.precision(.fractionLength(1)))).foregroundStyle(Palette.rubric).bold()) passages a week, and to get the whole core list into rotation about \(Text("\(max(0, Int(wordsPerWeek.rounded(.up))))").foregroundStyle(Palette.rubric).bold()) new words a week.")
                        .font(.prose(.callout))
                        .foregroundStyle(Palette.ink2)
                }

                // Phases
                VStack(alignment: .leading, spacing: 18) {
                    Text("Phases").rubricLabel()
                    ForEach(phases) { p in
                        VStack(alignment: .leading, spacing: 6) {
                            HStack(alignment: .firstTextBaseline) {
                                Text(p.name).font(.system(.title3, design: .serif).weight(.semibold))
                                if p.id == current.id {
                                    Text("you are here").font(.caption.weight(.semibold))
                                        .padding(.horizontal, 8).padding(.vertical, 3)
                                        .foregroundStyle(Palette.onRubric).background(Palette.rubric, in: .capsule)
                                }
                                Spacer()
                                Text("\(p.from)–\(p.to) days out").quietLabel()
                            }
                            Text(p.focus).font(.prose()).foregroundStyle(Palette.ink2)
                            ForEach(p.targets, id: \.self) { target($0) }
                        }
                        .opacity(p.id == current.id ? 1 : 0.75)
                        Hairline(color: Palette.hair)
                    }
                }

                // Where you are
                VStack(alignment: .leading, spacing: 14) {
                    Text("Where you are").rubricLabel()
                    meter("Required passages opened", read, required.count)
                    meter("Core vocabulary in rotation", inRotation, library.coreVocabulary.count)
                    meter("Translation drills attempted", drillsTried, library.translationDrills.count)
                    Text("\(model.progress.studyDays.count) days studied since you started. "
                         + (model.progress.quizAttempts.isEmpty
                            ? "Nothing logged yet — the plan gets more useful once there's data behind it."
                            : "\(model.progress.quizAttempts.count) questions answered, \(model.progress.translationAttempts.count) translations logged."))
                        .font(.prose(.callout)).foregroundStyle(Palette.ink2)
                }
            }
            .padding(20)
            .frame(maxWidth: 760, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
        .pageBackground()
        .navigationTitle("Study Plan")
    }

    private func target(_ text: String) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 8) {
            Text("·").foregroundStyle(Palette.rubric)
            Text(text).font(.prose(.callout)).foregroundStyle(Palette.ink)
        }
    }

    private func meter(_ label: String, _ value: Int, _ max: Int) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(label).font(.subheadline)
                Spacer()
                Text("\(value) / \(max)").font(.subheadline.monospacedDigit()).foregroundStyle(Palette.inkMuted)
            }
            ProgressView(value: Double(value), total: Double(Swift.max(max, 1))).tint(Palette.rubric)
        }
    }

    private func examDateLabel(_ iso: String) -> String {
        let parts = iso.split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3, let date = Calendar.current.date(from: DateComponents(year: parts[0], month: parts[1], day: parts[2])) else { return iso }
        return date.formatted(.dateTime.weekday(.wide).day().month(.wide).year())
    }
}
