package com.norvodesigns.lectio

import com.norvodesigns.lectio.core.Question

/**
 * Graded work: the local record first, then the teacher's roster when signed
 * in. The web store's `recordQuiz` calls `bumpActivityStats` the same way.
 */
fun AppModel.recordQuiz(question: Question, chosenId: String, seconds: Double) {
    val correct = chosenId == question.answerId
    update {
        it.recordQuiz(question.id, correct, chosenId, question.type, question.skillCategory, question.unit, question.passageId, seconds)
    }
    // Multiple choice is always machine-graded.
    reportActivity("auto", if (correct) 1.0 else 0.0, 1.0)
}

fun AppModel.recordTranslation(
    drill: com.norvodesigns.lectio.core.TranslationDrill, results: Map<String, String>, text: String, score: Double, missedTags: List<String>, gradedBy: String,
) {
    update {
        it.recordTranslation(drill.id, results, text, score, drill.segments.size, missedTags, gradedBy)
        it.markStudied()
    }
    reportActivity(if (gradedBy == "ai") "auto" else "self", score, drill.segments.size.toDouble())
}
