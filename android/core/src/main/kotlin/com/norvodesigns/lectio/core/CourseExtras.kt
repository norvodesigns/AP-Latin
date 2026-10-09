package com.norvodesigns.lectio.core

import kotlinx.serialization.Serializable
import java.text.Normalizer
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import kotlin.math.max
import kotlin.math.min
import kotlin.random.Random

/* ------------------------------------------------------------------ */
/* Course review: the web's src/lib/review.ts                            */
/* ------------------------------------------------------------------ */

object CourseIds {
    /** Review lessons have ids starting with this, and a random suffix, so a second review is a new lesson to the player. */
    const val reviewPrefix = "review"
    const val reviewLength = 10
    const val derivativesPrefix = "roots-"
    const val derivativesLength = 10

    fun isReview(id: String): Boolean = id == reviewPrefix || id.startsWith("$reviewPrefix-")
    fun isDerivatives(id: String): Boolean = id.startsWith(derivativesPrefix)
}

/** How much a finished lesson needs review: weak scores and old dates weigh more. */
fun Course.reviewWeight(p: LessonProgress, now: Instant): Double {
    val last = StudyDates.parseTimestamp(p.lastAt) ?: now
    val days = max(0.0, (now.toEpochMilli() - last.toEpochMilli()) / 1000.0 / 86_400.0)
    return (1.2 - min(1.0, max(0.0, p.best))) * (1 + min(days, 30.0) / 10)
}

/** Lessons a review can draw on: finished, with exercises it can use. Unit tests borrow their lessons' questions, which count once, with their lessons. */
fun Course.reviewable(done: Map<String, LessonProgress>): List<LessonPlace> =
    lessons.filter { place -> done[place.lesson.id] != null && !place.lesson.isTest && place.lesson.reviewExercises.isNotEmpty() }

private class ReviewSource(val exercises: List<LessonStep>, val weight: Double) {
    val used = HashSet<Int>()
    val open: Boolean get() = used.size < exercises.size
}

fun Course.review(
    done: Map<String, LessonProgress>,
    length: Int = CourseIds.reviewLength,
    now: Instant = Instant.now(),
    rng: Random = Random.Default,
): LessonPlace? {
    val pool = reviewable(done).map { place -> ReviewSource(place.lesson.reviewExercises, reviewWeight(done.getValue(place.lesson.id), now)) }
    val available = pool.sumOf { it.exercises.size }
    if (available <= 0) return null

    val steps = ArrayList<LessonStep>()
    val target = min(length, available)
    while (steps.size < target) {
        val open = pool.indices.filter { pool[it].open }
        val total = open.sumOf { pool[it].weight }
        var r = rng.nextDouble(0.0, max(total, Double.MIN_VALUE))
        var chosen = open.last()
        for (idx in open) {
            r -= pool[idx].weight
            if (r < 0) { chosen = idx; break }
        }
        val fresh = pool[chosen].exercises.indices.filter { it !in pool[chosen].used }
        val pick = fresh.random(rng)
        pool[chosen].used.add(pick)
        steps.add(pool[chosen].exercises[pick])
    }

    val lesson = Lesson(
        id = "${CourseIds.reviewPrefix}-${rng.nextLong(0, 4_294_967_296L)}",
        title = "Review",
        summary = "Exercises from lessons you have finished, weighted toward the ones you found hardest.",
        minutes = max(3, Math.round(target * 0.6).toInt()),
        objectives = listOf("Bring back what is fading before it is gone", "Find out which lessons are worth doing again"),
        words = emptyList(),
        steps = steps,
    )
    return syntheticPlace(lesson, CourseIds.reviewPrefix, "Review")
}

internal fun syntheticPlace(lesson: Lesson, id: String, title: String): LessonPlace {
    val unit = CurriculumUnit(id = id, n = 0, title = title, blurb = "", lessons = listOf(lesson))
    val level = CurriculumLevel(id = id, numeral = "", title = title, subtitle = "", blurb = "", units = listOf(unit))
    return LessonPlace(lesson, unit, level, -1)
}

/* ------------------------------------------------------------------ */
/* Sententia of the day: the web's src/data/daily and src/lib/daily.ts  */
/* ------------------------------------------------------------------ */

@Serializable
data class Sententia(
    val id: String,
    val latin: String,
    val english: String,
    /** Who wrote or said it, and where (may hold *italic* markup). */
    val source: String,
    /** A few sentences of context, shown once the questions are done. */
    val note: String,
    val gloss: List<ReadGloss>,
    val steps: List<LessonStep>,
)

@Serializable
internal data class DailyFile(val sententiae: List<Sententia>)

object Daily {
    /** Daily lessons have ids `daily-YYYY-MM-DD`. */
    const val prefix = "daily-"

    /** Today's date on the student's own clock (the web's `localDay`). */
    fun localDay(date: Instant = Instant.now(), zone: ZoneId = ZoneId.systemDefault()): String =
        LocalDate.ofInstant(date, zone).let { "%04d-%02d-%02d".format(it.year, it.monthValue, it.dayOfMonth) }

    /** The date [n] days after (or before) [day]. */
    fun shift(day: String, by: Int): String {
        val d = StudyDates.dayNumber(day) ?: return day
        return StudyDates.isoDay(Instant.ofEpochSecond((d + by).toLong() * 86_400))
    }

    fun sententia(day: String, list: List<Sententia>): Sententia? {
        if (list.isEmpty()) return null
        val d = StudyDates.dayNumber(day) ?: return null
        val n = list.size
        return list[((d % n) + n) % n]
    }

    fun isDaily(id: String): Boolean = id.startsWith(prefix)

    /** The day a daily lesson belongs to, from its id. */
    fun day(ofLesson: String): String = ofLesson.drop(prefix.length)

    /** The line as a three-minute lesson: read it with its glosses, answer the questions, then see the translation and where it comes from. */
    fun lesson(s: Sententia, day: String): LessonPlace {
        val lesson = Lesson(
            id = prefix + day,
            title = "Sententia of the day",
            summary = "One famous line of Latin, the words you need for it, and three quick questions.",
            minutes = 3,
            objectives = listOf("Read a line of real Latin", "Notice one point of grammar in it", "Meet an English word that comes from it"),
            words = emptyList(),
            steps = listOf<LessonStep>(
                TeachStep(
                    title = "*${s.latin}*",
                    body = listOf("Read it aloud, then work out what it says. The words you may not know:"),
                    examples = s.gloss.map { TeachStep.Example(it.word, it.meaning, null) },
                ),
            ) + s.steps + listOf<LessonStep>(
                TeachStep(title = "*${s.latin}*", body = listOf("“${s.english}”", "— ${s.source}", s.note)),
            ),
        )
        return syntheticPlace(lesson, "daily", "Sententia")
    }

    /** Days in a row with the line done, counting today, or yesterday if today isn't done yet. */
    fun streak(daily: Map<String, DailyResult>, today: String): Int {
        var day = if (daily[today] != null) today else shift(today, -1)
        var n = 0
        while (daily[day] != null) {
            n++
            day = shift(day, -1)
        }
        return n
    }
}

/* ------------------------------------------------------------------ */
/* Derivatives: the web's src/lib/derivatives.ts                         */
/* ------------------------------------------------------------------ */

data class RootWord(
    /** The dictionary form's first word, e.g. "pugnō". */
    val head: String,
    val english: String,
    val derivatives: List<String>,
    val vocabId: String?,
    val lessonId: String,
)

/** Letters only, no macrons, lower case: for telling look-alike roots apart. */
internal fun foldRoot(s: String): String =
    Normalizer.normalize(s, Normalizer.Form.NFD).lowercase().filter { it in 'a'..'z' }

private val parenthetical = Regex("\\s*\\(.*\\)")

/** Every course word with English derivatives, first appearance only. */
fun Course.rootWords(): List<RootWord> {
    val seen = HashSet<String>()
    val out = ArrayList<RootWord>()
    for (place in lessons) for (w in place.lesson.words) {
        val derivatives = w.derivatives
        if (derivatives.isNullOrEmpty()) continue
        val head = w.latin.substringBefore(",").replace(parenthetical, "").trim { it == ' ' || it == '\t' }
        if (!seen.add(foldRoot(head))) continue
        out.add(RootWord(head, w.english, derivatives, w.vocabId, place.lesson.id))
    }
    return out
}

/** AP vocabulary id -> its English derivatives, for the flashcards. */
fun Course.derivativesByVocab(): Map<String, List<String>> {
    val out = LinkedHashMap<String, List<String>>()
    for (w in rootWords()) w.vocabId?.let { out.putIfAbsent(it, w.derivatives) }
    return out
}

/** Two words too alike to set against each other (regō, rēx). */
internal fun alike(a: String, b: String): Boolean = foldRoot(a).take(3) == foldRoot(b).take(3)

/** Whether an English word could also be traced to this Latin word: it holds the root's stem or the start of one of its derivatives. */
internal fun traces(english: String, w: RootWord): Boolean {
    val e = foldRoot(english)
    return (listOf(w.head) + w.derivatives).any { x ->
        val stem = foldRoot(x).take(4)
        stem.length == 4 && e.contains(stem)
    }
}

/** A round of derivatives questions, from the words of finished lessons when there are enough of them, otherwise from the whole course. */
fun Course.derivativesLesson(
    done: Map<String, LessonProgress>,
    length: Int = CourseIds.derivativesLength,
    rng: Random = Random.Default,
): LessonPlace {
    val all = rootWords()
    val known = all.filter { done[it.lessonId] != null }
    val pool = if (known.size >= 8) known else all
    val words = pool.shuffled(rng).take(length)
    val steps = ArrayList<LessonStep>()
    words.forEachIndexed { i, w ->
        val derivative = w.derivatives.random(rng)
        val others = w.derivatives.filter { it != derivative }
        val capitalized = derivative.replaceFirstChar { it.uppercase() }
        val explain = "*$capitalized* comes from *${w.head}*, “${w.english}”." +
            (if (others.isEmpty()) "" else " So ${if (others.size == 1) "does" else "do"} ${others.joinToString(" and ")}.")
        val rest = all.filter { it != w && !alike(it.head, w.head) }.shuffled(rng)
        val wrong = ArrayList<String>()
        val prompt: String
        val right: String
        if (i % 2 == 0) {
            prompt = "Which English word comes from *${w.head}*, “${w.english}”?"
            right = derivative
            for (o in rest) {
                val d = o.derivatives.random(rng)
                if (alike(d, derivative) || alike(d, w.head) || traces(d, w) || wrong.any { alike(it, d) }) continue
                wrong.add(d)
                if (wrong.size == 3) break
            }
        } else {
            prompt = "*$capitalized* comes from which Latin word?"
            right = w.head
            for (o in rest) {
                if (alike(o.head, derivative) || traces(derivative, o) || wrong.any { alike(it, o.head) }) continue
                wrong.add(o.head)
                if (wrong.size == 3) break
            }
        }
        val at = rng.nextInt(0, wrong.size + 1)
        val options = wrong.toMutableList()
        options.add(at, right)
        steps.add(ChoiceStep(prompt = prompt, latin = null, options = options, answer = at, explain = explain))
    }
    val lesson = Lesson(
        id = "${CourseIds.derivativesPrefix}${rng.nextLong(0, 4_294_967_296L)}",
        title = "Derivatives",
        summary = "Ten questions on the English words that come from Latin ones.",
        minutes = 4,
        objectives = listOf("See the Latin inside English words", "Use English you know to remember Latin, and the other way round"),
        words = emptyList(),
        steps = steps,
    )
    return syntheticPlace(lesson, "roots", "Derivatives")
}
