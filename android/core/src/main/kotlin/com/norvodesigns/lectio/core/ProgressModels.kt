package com.norvodesigns.lectio.core

import kotlinx.serialization.Serializable

// Typed views of records inside the progress document: mirrors of the record
// shapes in src/store/useStore.ts. Screens decode these from the document;
// edits are written back with `JSONObject.overlaid` so any field this build
// doesn't know about survives.

object HighlightColor {
    const val GILT = "gilt"
    const val VERDIGRIS = "verdigris"
    const val WOAD = "woad"
    const val RUBRIC = "rubric"
    val all = listOf(GILT, VERDIGRIS, WOAD, RUBRIC)
}

@Serializable
data class Annotation(
    val id: String,
    val lineN: Int,
    /** Inclusive token indices into the line's exported `tokens`. */
    val startTok: Int,
    val endTok: Int,
    val text: String,
    /** One of [HighlightColor], or null for a note with no colour. */
    val color: String? = null,
    val note: String = "",
    val createdAt: String = "",
) {
    /** `color` is written as an explicit null, as the web does, rather than omitted. */
    fun toJson(): JSONValue = JSONValue.Obj(
        JSONObject(
            "id" to JSONValue.Str(id),
            "lineN" to JSONValue.Num(lineN.toDouble()),
            "startTok" to JSONValue.Num(startTok.toDouble()),
            "endTok" to JSONValue.Num(endTok.toDouble()),
            "text" to JSONValue.Str(text),
            "color" to (color?.let { JSONValue.Str(it) } ?: JSONValue.Null),
            "note" to JSONValue.Str(note),
            "createdAt" to JSONValue.Str(createdAt),
        ),
    )
}

@Serializable
data class PassageState(
    val notes: String = "",
    val bookmarked: Boolean = false,
    val flaggedLines: List<Int> = emptyList(),
    val lastOpened: String? = null,
    val coldReads: Int = 0,
    val annotations: List<Annotation> = emptyList(),
) {
    fun toJson(): JSONObject = JSONObject(
        "notes" to JSONValue.Str(notes),
        "bookmarked" to JSONValue.Bool(bookmarked),
        "flaggedLines" to JSONValue.Arr(flaggedLines.map { JSONValue.Num(it.toDouble()) }),
        "coldReads" to JSONValue.Num(coldReads.toDouble()),
        "annotations" to JSONValue.Arr(annotations.map { it.toJson() }),
    ).also { o -> lastOpened?.let { o["lastOpened"] = JSONValue.Str(it) } }
}

@Serializable
data class QuizAttempt(
    val id: String,
    val questionId: String,
    val correct: Boolean,
    val chosenId: String,
    val at: String,
    val type: String,
    val skillCategory: String,
    val unit: String,
    val passageId: String? = null,
    val seconds: Double? = null,
)

@Serializable
data class StudyPlanSettings(
    val minutesPerDay: Int,
    /** 0 = Sunday. */
    val activeDays: List<Int>,
    val startedAt: String,
)

@Serializable
data class WordEncounter(
    val count: Int,
    val lastSeen: String,
    val passageIds: List<String>,
)

@Serializable
data class TranslationAttempt(
    val id: String,
    val drillId: String,
    val at: String,
    /** Segment id -> "correct" | "partial" | "incorrect". */
    val segmentResults: Map<String, String>,
    val text: String,
    val score: Double,
    val maxScore: Int,
    val missedTags: List<String>,
    /** "self" or "ai". */
    val gradedBy: String,
)

@Serializable
data class FrqResponse(
    val id: String,
    val promptId: String,
    val at: String,
    /** Subquestion id -> the typed answer. */
    val answers: Map<String, String>,
    /** Rubric row id -> points awarded. */
    val selfScore: Map<String, Double>,
    val secondsSpent: Double,
    val submitted: Boolean,
)

@Serializable
data class Tally(val correct: Int, val total: Int)

@Serializable
data class ExamResult(
    val id: String,
    val at: String,
    val mcqCorrect: Int,
    val mcqTotal: Int,
    val frqPoints: Double,
    val frqMax: Double,
    val bySkill: Map<String, Tally>,
    val byType: Map<String, Tally>,
    val mcqSeconds: Double,
    val frqSeconds: Double,
)

@Serializable
data class ProjectPassage(
    val id: String,
    val title: String,
    val author: String,
    val citation: String,
    /** "prose" or "poetry". */
    val genre: String,
    val latin: String,
    val notes: String,
    val checkpoint1: String,
    val checkpoint2: String,
)

@Serializable
data class ScansionDraft(
    /** One per syllable, elided ones included: "long", "short" or null. */
    val marks: List<String?>,
    /** Metrical indices after which the student placed a foot boundary. */
    val divisions: List<Int>,
    val checked: Boolean? = null,
    /** Syllable indices the student claims elide. */
    val elisions: List<Int>? = null,
) {
    /** Unmarked syllables are written as explicit nulls, as the web writes them. */
    fun toJson(): JSONValue {
        val o = JSONObject(
            "marks" to JSONValue.Arr(marks.map { m -> m?.let { JSONValue.Str(it) } ?: JSONValue.Null }),
            "divisions" to JSONValue.Arr(divisions.map { JSONValue.Num(it.toDouble()) }),
        )
        checked?.let { o["checked"] = JSONValue.Bool(it) }
        elisions?.let { e -> o["elisions"] = JSONValue.Arr(e.map { JSONValue.Num(it.toDouble()) }) }
        return JSONValue.Obj(o)
    }
}

@Serializable
data class ScansionAttempt(
    val id: String,
    val lineId: String,
    val at: String,
    val correct: Int,
    val total: Int,
)

/** One finished lesson of the course (web: `LessonProgress`). */
@Serializable
data class LessonProgress(
    val completedAt: String,
    val lastAt: String,
    /** Best score, 0-1. */
    val best: Double,
    val attempts: Int,
)

/** One day's Sententia (web: `DailyResult`), keyed by local date. */
@Serializable
data class DailyResult(
    /** Which line it was. */
    val id: String,
    /** Best score that day, 0-1. */
    val score: Double,
    /** When it was first done. */
    val at: String,
)

/** The first-run answers (web: `LearnerProfile`). */
@Serializable
data class LearnerProfile(
    /** "new", "some", "ap" or "teacher". */
    val track: String,
    val startLessonId: String? = null,
    val onboardedAt: String,
    /** Vocabulary units (e.g. "verba-2") the level check found probably known. */
    val knownVocabUnits: List<String>? = null,
) {
    /** `startLessonId` is written as null, not left out, as the web writes it. */
    fun toJson(): JSONValue {
        val o = JSONObject(
            "track" to JSONValue.Str(track),
            "startLessonId" to (startLessonId?.let { JSONValue.Str(it) } ?: JSONValue.Null),
            "onboardedAt" to JSONValue.Str(onboardedAt),
        )
        knownVocabUnits?.let { k -> o["knownVocabUnits"] = JSONValue.Arr(k.map { JSONValue.Str(it) }) }
        return JSONValue.Obj(o)
    }

    companion object {
        val tracks = listOf("new", "some", "ap", "teacher")
    }
}
