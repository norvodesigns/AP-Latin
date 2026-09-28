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
