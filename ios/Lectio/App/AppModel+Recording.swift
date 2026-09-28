import Foundation
import LectioCore

/// Graded work: the local record first, then the teacher's roster when
/// signed in — the web store's `recordQuiz` / `recordTranslation`, which
/// call `bumpActivityStats` the same way.
extension AppModel {
    func recordQuiz(_ question: Question, chosenId: String, seconds: Double) {
        let correct = chosenId == question.answerId
        update {
            $0.recordQuiz(questionId: question.id, correct: correct, chosenId: chosenId, type: question.type,
                          skillCategory: question.skillCategory, unit: question.unit,
                          passageId: question.passageId, seconds: seconds)
        }
        // Multiple choice is always machine-graded.
        reportActivity(source: "auto", correct: correct ? 1 : 0, total: 1)
    }
}

extension AppModel {
    func recordTranslation(drill: TranslationDrill, results: [String: String], text: String, score: Double,
                           missedTags: [String], gradedBy: String) {
        update {
            $0.recordTranslation(drillId: drill.id, segmentResults: results, text: text, score: score,
                                 maxScore: drill.segments.count, missedTags: missedTags, gradedBy: gradedBy)
            $0.markStudied()
        }
        reportActivity(source: gradedBy == "ai" ? "auto" : "self", correct: score, total: Double(drill.segments.count))
    }
}
