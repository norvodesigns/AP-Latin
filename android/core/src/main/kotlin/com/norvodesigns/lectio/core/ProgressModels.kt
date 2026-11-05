package com.norvodesigns.lectio.core

import kotlinx.serialization.Serializable

// Typed views of records inside the progress document: mirrors of the record
// shapes in src/store/useStore.ts. Screens decode these from the document;
// edits are written back with `JSONObject.overlaid` so any field this build
// doesn't know about survives.

/** The four original highlighter colours: the only values `Annotation.color` ever holds,
 *  because the 1.0 and 1.1 iPhone apps decode it as a closed set of four. */
object HighlightColor {
    const val GILT = "gilt"
    const val VERDIGRIS = "verdigris"
    const val WOAD = "woad"
    const val RUBRIC = "rubric"
    val all = listOf(GILT, VERDIGRIS, WOAD, RUBRIC)
}

/** Every pigment the highlighter offers since 1.2, in the toolbar's order. A newer one is
 *  stored in `Annotation.pigment`, with `color` set to the nearest original (the web's
 *  `LEGACY_COLOR`). */
object Pigment {
    const val MINIUM = "minium"
    const val MADDER = "madder"
    const val MUREX = "murex"
    const val AZURITE = "azurite"
    val all = listOf(HighlightColor.GILT, MINIUM, HighlightColor.RUBRIC, MADDER, MUREX, HighlightColor.WOAD, AZURITE, HighlightColor.VERDIGRIS)
    val legacy = mapOf(
        HighlightColor.GILT to HighlightColor.GILT, MINIUM to HighlightColor.GILT,
        HighlightColor.RUBRIC to HighlightColor.RUBRIC, MADDER to HighlightColor.RUBRIC, MUREX to HighlightColor.RUBRIC,
        HighlightColor.WOAD to HighlightColor.WOAD, AZURITE to HighlightColor.WOAD,
        HighlightColor.VERDIGRIS to HighlightColor.VERDIGRIS,
    )
    val plainName = mapOf(
        HighlightColor.GILT to "gold", MINIUM to "orange", HighlightColor.RUBRIC to "red", MADDER to "pink",
        MUREX to "purple", HighlightColor.WOAD to "blue", AZURITE to "sky blue", HighlightColor.VERDIGRIS to "green",
    )
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
    /** Since 1.2: the last change, so the later edit wins a merge. */
    val updatedAt: String? = null,
    /** Since 1.2: the pigment chosen when it is one of the newer four ([Pigment]). */
    val pigment: String? = null,
    /** Since 1.2: shared by the per-line pieces of one selection. */
    val group: String? = null,
) {
    /** The pigment the highlight shows, or null for a note with no colour. */
    val shownPigment: String? get() = color?.let { pigment ?: it }
    val hasNote: Boolean get() = note.trim().isNotEmpty()

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
        ).also { o ->
            updatedAt?.let { o["updatedAt"] = JSONValue.Str(it) }
            pigment?.let { o["pigment"] = JSONValue.Str(it) }
            group?.let { o["group"] = JSONValue.Str(it) }
        },
    )
}

/** The parts of a sentence a reader can mark: the web's `SYNTAX_ROLES`, in the picker's order. */
object SyntaxRoles {
    data class Role(val id: String, val short: String, val label: String, val group: String, val hint: String)

    val all = listOf(
        Role("subject", "S", "Subject", "sentence", "Who or what does the action; nominative"),
        Role("verb", "V", "Verb", "sentence", "The main verb of the clause"),
        Role("object", "DO", "Direct object", "sentence", "Receives the action; accusative"),
        Role("indirect", "IO", "Indirect object", "sentence", "To or for whom; dative"),
        Role("nominative", "nom", "Nominative", "case", "Subject, or predicate after sum"),
        Role("genitive", "gen", "Genitive", "case", "of; possession, part of a whole"),
        Role("dative", "dat", "Dative", "case", "to, for; also with compounds and special verbs"),
        Role("accusative", "acc", "Accusative", "case", "Object, extent, place to which, subject of an infinitive"),
        Role("ablative", "abl", "Ablative", "case", "by, with, from, in, on; means, manner, place where"),
        Role("vocative", "voc", "Vocative", "case", "Someone addressed directly"),
        Role("participle", "ptc", "Participle", "construction", "A verbal adjective; find the noun it agrees with"),
        Role("infinitive", "inf", "Infinitive", "construction", "Complementary, or indirect statement"),
        Role("ablAbs", "abl abs", "Ablative absolute", "construction", "Noun and participle in the ablative, apart from the sentence"),
        Role("prep", "prep", "Prepositional phrase", "construction", "A preposition and its object"),
        Role("clause", "[ ]", "Subordinate clause", "construction", "cum, ut, quī, sī, dum… to its verb"),
    )
    val byId = all.associateBy { it.id }
}

/** A sentence-part mark on a run of tokens: the web's `SyntaxMark`. */
@Serializable
data class SyntaxMark(
    val id: String,
    val lineN: Int,
    val startTok: Int,
    val endTok: Int,
    val text: String,
    /** One of [SyntaxRoles], kept raw so a role a later version adds round-trips. */
    val role: String,
    val createdAt: String = "",
    val updatedAt: String? = null,
    val group: String? = null,
) {
    fun toJson(): JSONValue = JSONValue.Obj(
        JSONObject(
            "id" to JSONValue.Str(id),
            "lineN" to JSONValue.Num(lineN.toDouble()),
            "startTok" to JSONValue.Num(startTok.toDouble()),
            "endTok" to JSONValue.Num(endTok.toDouble()),
            "text" to JSONValue.Str(text),
            "role" to JSONValue.Str(role),
            "createdAt" to JSONValue.Str(createdAt),
        ).also { o ->
            updatedAt?.let { o["updatedAt"] = JSONValue.Str(it) }
            group?.let { o["group"] = JSONValue.Str(it) }
        },
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
    /** Since 1.2. Null (and so never written) on a passage that has had none. The `removed`
     *  records stay in the raw document, in order: see `ProgressDocument.recordRemoved`. */
    val marks: List<SyntaxMark>? = null,
) {
    /** How many things of the reader's own the passage carries: each highlight or note, each
     *  sentence mark (a phrase marked across lines counts once), and the notes on the passage
     *  as a whole. A cold read hides them all and says how many it is keeping. The web's
     *  `markupCount` in src/lib/annotations.ts, and `PassageState.markupCount` in LectioCore. */
    val markupCount: Int get() {
        val highlights = annotations.filter { it.color != null || it.hasNote }.map { it.group ?: it.id }.toSet()
        val marked = (marks ?: emptyList()).map { it.group ?: it.id }.toSet()
        return highlights.size + marked.size + if (notes.isBlank()) 0 else 1
    }

    fun toJson(): JSONObject = JSONObject(
        "notes" to JSONValue.Str(notes),
        "bookmarked" to JSONValue.Bool(bookmarked),
        "flaggedLines" to JSONValue.Arr(flaggedLines.map { JSONValue.Num(it.toDouble()) }),
        "coldReads" to JSONValue.Num(coldReads.toDouble()),
        "annotations" to JSONValue.Arr(annotations.map { it.toJson() }),
    ).also { o ->
        lastOpened?.let { o["lastOpened"] = JSONValue.Str(it) }
        marks?.let { m -> o["marks"] = JSONValue.Arr(m.map { it.toJson() }) }
    }
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

/**
 * A Course Project passage from the Reading Room as a project passage to keep checkpoint drafts on: a fixed
 * id ("set-" and the passage's own) so the drafts find it again, and the Latin with College Board's line
 * numbers, which an essay cites. The same as the website's and the iPhone's.
 */
fun projectPassageFromSet(p: Passage): ProjectPassage = ProjectPassage(
    "set-${p.id}", p.title, p.authorLabel, p.citation, p.genre,
    p.lines.joinToString("\n") { "${it.n}  ${it.latin}" }, "", "", "",
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
