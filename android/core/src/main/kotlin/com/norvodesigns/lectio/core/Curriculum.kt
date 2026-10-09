package com.norvodesigns.lectio.core

import kotlinx.serialization.DeserializationStrategy
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonContentPolymorphicSerializer
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

/**
 * The course: Latin from the first day to the AP syllabus (the web's
 * `src/data/curriculum`, exported as `curriculum.json`).
 *
 *     Level -> Unit -> Lesson -> Steps
 *
 * Text markup, as on the web: `*word*` is italic, `**word**` bold, and in a
 * table cell or an example `puell|ae` marks the ending after the bar.
 */
@Serializable
data class CurriculumLevel(
    val id: String,
    /** "vocabulary" for Verba, the AP list by letter; absent for grammar. */
    val track: String? = null,
    val numeral: String,
    val title: String,
    val subtitle: String,
    val blurb: String,
    val units: List<CurriculumUnit>,
) {
    /** Verba, the AP list by letter: a track of its own beside the grammar. */
    val isVocabulary: Boolean get() = track == "vocabulary"
}

@Serializable
data class CurriculumUnit(
    val id: String,
    val n: Int,
    val title: String,
    val blurb: String,
    val lessons: List<Lesson>,
)

@Serializable
data class Lesson(
    val id: String,
    val title: String,
    val summary: String,
    val minutes: Int,
    val objectives: List<String>,
    val words: List<LessonWord>,
    val steps: List<LessonStep>,
    /** A unit test: passed, it counts its whole unit as done ([Path]). */
    val test: Boolean? = null,
) {
    val isTest: Boolean get() = test ?: false

    /** The AP-list words it teaches, which join the deck when it's finished. */
    val vocabIds: List<String> get() = words.mapNotNull { it.vocabId }
    val exerciseCount: Int get() = steps.count { it.isExercise }

    /**
     * The exercises a review can use. A reading lesson's questions mostly
     * point back at its passage, so only those carrying their own Latin come
     * along: translations, and choices that quote their line. The web's
     * `reviewExercises`.
     */
    val reviewExercises: List<LessonStep>
        get() {
            val reading = steps.any { it is ReadStep }
            return steps.filter { step ->
                if (!step.isExercise) return@filter false
                if (!reading || step !is ChoiceStep) return@filter true
                !step.latin.isNullOrEmpty()
            }
        }
}

@Serializable
data class LessonWord(
    val latin: String,
    val english: String,
    val vocabId: String? = null,
    val derivatives: List<String>? = null,
)

/* Steps */

@Serializable(with = LessonStepSerializer::class)
sealed interface LessonStep {
    val isExercise: Boolean get() = this is ChoiceStep || this is TypeStep || this is TranslateStep || this is BuildStep || this is MatchStep
}

object LessonStepSerializer : JsonContentPolymorphicSerializer<LessonStep>(LessonStep::class) {
    override fun selectDeserializer(element: JsonElement): DeserializationStrategy<LessonStep> =
        when (element.jsonObject["kind"]?.jsonPrimitive?.content) {
            "teach" -> TeachStep.serializer()
            "read" -> ReadStep.serializer()
            "choice" -> ChoiceStep.serializer()
            "type" -> TypeStep.serializer()
            "translate" -> TranslateStep.serializer()
            "build" -> BuildStep.serializer()
            "match" -> MatchStep.serializer()
            else -> UnknownStep.serializer()
        }
}

/** A kind this build doesn't know (content from a newer website). Skipped, never a decode failure. */
@Serializable
class UnknownStep : LessonStep {
    override fun equals(other: Any?) = other is UnknownStep
    override fun hashCode() = 0
}

@Serializable
data class TeachStep(
    val title: String,
    val body: List<String>,
    val table: ParadigmTable? = null,
    val examples: List<Example>? = null,
    val tip: String? = null,
) : LessonStep {
    @Serializable
    data class Example(val la: String, val en: String, val note: String? = null)
}

@Serializable
data class ParadigmTable(
    val caption: String? = null,
    val cols: List<String>,
    val rows: List<Row>,
) {
    @Serializable
    data class Row(val label: String, val cells: List<String>)
}

@Serializable
data class ReadStep(
    val title: String,
    val intro: String? = null,
    val lines: List<Line>,
    val gloss: List<ReadGloss>? = null,
) : LessonStep {
    @Serializable
    data class Line(val la: String, val en: String)
}

@Serializable
data class ReadGloss(val word: String, val meaning: String)

@Serializable
data class ChoiceStep(
    val prompt: String,
    val latin: String? = null,
    val options: List<String>,
    val answer: Int,
    val explain: String,
) : LessonStep

@Serializable
data class TypeStep(
    val prompt: String,
    val latin: String? = null,
    val answers: List<String>,
    val explain: String,
    val hint: String? = null,
) : LessonStep

@Serializable
data class TranslateStep(
    val latin: String,
    val answers: List<String>,
    val explain: String? = null,
) : LessonStep

@Serializable
data class BuildStep(
    val prompt: String = "",
    val source: String = "",
    /** "la" or "en". */
    val lang: String,
    val answer: List<String>,
    val extra: List<String> = emptyList(),
    val anyOrder: Boolean? = null,
    val explain: String? = null,
) : LessonStep {
    val isLatin: Boolean get() = lang == "la"
}

@Serializable
data class MatchStep(
    val prompt: String,
    /** [left, right] */
    val pairs: List<List<String>>,
) : LessonStep

/* Finding your way */

/** A lesson with where it sits in the course. */
data class LessonPlace(
    val lesson: Lesson,
    val unit: CurriculumUnit,
    val level: CurriculumLevel,
    /** 0-based position in the whole course. */
    val index: Int,
) {
    val id: String get() = lesson.id

    /** 1-based position within its unit. */
    val number: Int get() = unit.lessons.indexOfFirst { it.id == lesson.id }.coerceAtLeast(0) + 1
}

class Course(
    /** Every level, both tracks: the grammar levels in order, then Verba. */
    val levels: List<CurriculumLevel>,
    /** The placement check, in course order. */
    val placement: List<PlacementQuestion> = emptyList(),
    /** The level check's vocabulary questions: two from each Verba unit. */
    val vocabPlacement: List<PlacementQuestion> = emptyList(),
) {
    /** Every lesson of both tracks. */
    val lessons: List<LessonPlace>

    /** The grammar lessons, in order. */
    val grammarLessons: List<LessonPlace>

    /** The vocabulary lessons (Verba), in order, unit tests included. */
    val vocabLessons: List<LessonPlace>

    private val index: Map<String, Int>

    init {
        val places = ArrayList<LessonPlace>()
        for (level in levels) for (unit in level.units) for (lesson in unit.lessons) {
            places.add(LessonPlace(lesson, unit, level, places.size))
        }
        lessons = places
        grammarLessons = places.filter { !it.level.isVocabulary }
        vocabLessons = places.filter { it.level.isVocabulary }
        val map = HashMap<String, Int>()
        for (p in places) map.putIfAbsent(p.lesson.id, p.index)
        index = map
    }

    fun place(id: String): LessonPlace? = index[id]?.let { lessons[it] }

    /** The grammar levels, in order. */
    val grammarLevels: List<CurriculumLevel> get() = levels.filter { !it.isVocabulary }

    /** Verba, the AP list by letter, when the content has it. */
    val vocabLevel: CurriculumLevel? get() = levels.firstOrNull { it.isVocabulary }

    /** Every grammar unit's id, in course order. */
    val unitIds: List<String> get() = grammarLevels.flatMap { l -> l.units.map { it.id } }

    /** The first lesson of a unit, by unit id. */
    fun firstLesson(unitId: String): LessonPlace? = lessons.firstOrNull { it.unit.id == unitId }

    /**
     * The first grammar lesson not yet finished, from the student's starting
     * point if they chose one; null when every grammar lesson written so far
     * is done. Same as the web's `nextLesson`. The vocabulary track has its
     * own ([nextWords]).
     */
    fun next(done: Set<String>, startingAt: String? = null): LessonPlace? {
        // A unit test is never "next": it's there for whoever wants to skip.
        fun open(p: LessonPlace) = p.lesson.id !in done && !p.lesson.isTest
        val from = startingAt?.let { id -> grammarLessons.indexOfFirst { it.lesson.id == id }.takeIf { it >= 0 } } ?: 0
        return grammarLessons.drop(from).firstOrNull(::open) ?: grammarLessons.firstOrNull(::open)
    }

    /** The lesson after this one in its own track, unit tests aside. */
    fun after(id: String): LessonPlace? {
        val place = place(id) ?: return null
        val track = if (place.level.isVocabulary) vocabLessons else grammarLessons
        val i = track.indexOfFirst { it.lesson.id == id }
        if (i < 0) return null
        return track.drop(i + 1).firstOrNull { !it.lesson.isTest }
    }

    /** A unit's lessons as [Path] reads them. */
    fun pathLessons(unitId: String): List<PathLesson> =
        lessons.filter { it.unit.id == unitId }.map { PathLesson(it.lesson.id, unitId, it.lesson.vocabIds, it.lesson.isTest) }

    /** The vocabulary track as [Path] reads it. */
    val vocabPath: List<PathLesson>
        get() = vocabLessons.map { PathLesson(it.lesson.id, it.unit.id, it.lesson.vocabIds, it.lesson.isTest) }

    /** The vocabulary lesson to do next (the web's `nextWords`). */
    fun nextWords(done: Set<String>, vocab: Map<String, VocabCard>, knownUnits: List<String> = emptyList()): LessonPlace? {
        val doneMap = done.associateWith { true }
        return Path.nextWords(vocabPath, doneMap, vocab.mapValues { it.value.interval }, knownUnits)?.let { place(it.id) }
    }

    companion object {
        /** Share of a unit's lessons done. A unit test is a way past the lessons, not one of them. */
        fun unitProgress(unit: CurriculumUnit, done: Set<String>): Double {
            val lessons = unit.lessons.filter { !it.isTest }
            if (lessons.isEmpty()) return 0.0
            return lessons.count { it.id in done }.toDouble() / lessons.size
        }
    }
}

@Serializable
internal data class CurriculumFile(
    val levels: List<CurriculumLevel>,
    val placement: List<PlacementQuestion>? = null,
    val vocabPlacement: List<PlacementQuestion>? = null,
)

/** A lesson as the vocabulary path reads it (the web's `PathLesson`). */
@Serializable
data class PathLesson(
    val id: String,
    val unitId: String,
    /** The AP-list words it teaches. */
    val vocabIds: List<String>,
    /** A unit test. */
    val test: Boolean,
)

/** A placement-check question (web: `src/data/curriculum/placement.ts`). */
@Serializable
data class PlacementQuestion(
    /** The unit it checks, e.g. "prima-3". */
    val unit: String,
    val step: ChoiceStep,
)
