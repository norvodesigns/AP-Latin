import Foundation
import LectioCore

/// Sample progress for screenshots, applied only when the app is launched
/// with `-seedDemo YES` (the CI screenshot job does this) and only on a
/// device with no progress of its own.
extension AppModel {
    func seedDemoIfRequested() {
        guard UserDefaults.standard.bool(forKey: "seedDemo"), let library = content else { return }
        // The same point in the day on every launch, so every screenshot agrees.
        studySecondsToday = 18 * 60
        studyGoalDate = StudyDates.today()
        guard progress.vocab.isEmpty else { return }
        let now = Date()
        let calendar = Calendar.current
        update { doc in
            // A deck part-way through unit 4, some of it due.
            let words = library.coreVocabulary.filter { $0.units.contains("4") }.prefix(60)
            doc.seedVocab(words.map(\.id), now: now)
            for (i, w) in words.enumerated() where i % 3 != 0 {
                let then = calendar.date(byAdding: .day, value: -(i % 9), to: now) ?? now
                doc.reviewVocab(w.id, quality: i % 7 == 0 ? 0 : 4, now: then, calendar: calendar)
            }
            // A few weeks of study, and graded work across all three skills.
            for d in 0..<12 where d % 5 != 4 {
                doc.markStudied(now: calendar.date(byAdding: .day, value: -d, to: now) ?? now)
            }
            for (i, q) in library.questions.prefix(40).enumerated() {
                let chosen = i % 4 == 0 ? (q.options.first { $0.id != q.answerId }?.id ?? q.answerId) : q.answerId
                doc.recordQuiz(questionId: q.id, correct: chosen == q.answerId, chosenId: chosen, type: q.type,
                               skillCategory: q.skillCategory, unit: q.unit, passageId: q.passageId, now: now)
            }
            // Two lessons into the course.
            for (id, score) in [("prima-1-1", 0.92), ("prima-1-2", 0.85)] {
                if let lesson = library.course.place(id)?.lesson {
                    doc.completeLesson(id, score: score, vocabIds: lesson.vocabIds, now: now)
                }
            }
            // The Sententia done the last three days, not yet today.
            for d in 1...3 {
                let then = calendar.date(byAdding: .day, value: -d, to: now) ?? now
                let day = Daily.localDay(then, calendar: calendar)
                if let line = Daily.sententia(for: day, in: library.sententiae) {
                    doc.completeDaily(day: day, id: line.id, score: 1, now: then)
                }
            }
            if let aeneid = library.passage("aen-1-1-33") {
                doc.markOpened(aeneid.id, now: now)
                doc.toggleBookmark(aeneid.id)
                if let line = aeneid.lines.first {
                    doc.setHighlight(passageId: aeneid.id, lineN: line.n, startTok: 0, endTok: 2,
                                     text: line.tokens.prefix(3).map(\.text).joined(), color: .gilt, now: now)
                }
            }
        }
    }
}
