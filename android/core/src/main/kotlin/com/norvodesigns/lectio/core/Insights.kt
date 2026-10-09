package com.norvodesigns.lectio.core

import java.time.Instant
import kotlin.math.max
import kotlin.math.roundToInt

/**
 * The dashboard's read of a student's history: ports of `weakSpots` and
 * `vocabForecast` (src/lib/progress.ts) and the skill mastery in
 * src/components/Dashboard.tsx.
 */
object Insights {
    /** What each weak spot points the student at. */
    sealed interface Destination {
        data class Quiz(val type: String) : Destination
        data object Grammar : Destination
        data object Scansion : Destination
        data object Vocab : Destination
    }

    data class WeakSpot(
        val id: String,
        val label: String,
        /** Accuracy where there's a denominator; null for counts (missed tags, leeches). */
        val pct: Int?,
        val detail: String,
        val action: String,
        val destination: Destination,
        /** Lower is more urgent. */
        val urgency: Int,
    )

    private const val minSample = 6

    fun weakSpots(
        quizAttempts: List<QuizAttempt>,
        translationAttempts: List<TranslationAttempt>,
        scansionAttempts: List<ScansionAttempt>,
        vocab: Map<String, VocabCard>,
        typeLabels: Map<String, String>,
    ): List<WeakSpot> {
        val out = ArrayList<WeakSpot>()

        // Multiple choice, by question type.
        val total = LinkedHashMap<String, Int>()
        val right = HashMap<String, Int>()
        for (a in quizAttempts) {
            total[a.type] = (total[a.type] ?: 0) + 1
            if (a.correct) right[a.type] = (right[a.type] ?: 0) + 1
        }
        for ((type, t) in total) {
            if (t < minSample) continue
            val c = right[type] ?: 0
            val pct = jsRound(c.toDouble() / t * 100)
            if (pct >= 80) continue
            out.add(WeakSpot("type-$type", typeLabels[type] ?: type, pct, "$c of $t right", "Drill it", Destination.Quiz(type), pct))
        }

        // Translation, by the grammar tags of segments missed: a count, not a rate.
        val missed = LinkedHashMap<String, Int>()
        for (a in translationAttempts) for (tag in a.missedTags) missed[tag] = (missed[tag] ?: 0) + 1
        for ((tag, n) in missed) {
            if (n < 3) continue
            val words = tag.replace("-", " ")
            out.add(
                WeakSpot(
                    "tag-$tag", words.replaceFirstChar { it.uppercase() }, null,
                    "missed in $n translation segment${if (n == 1) "" else "s"}", "Read it up", Destination.Grammar, max(40, 76 - n * 2),
                ),
            )
        }

        // Scansion, over recent attempts only.
        val recent = scansionAttempts.takeLast(40)
        val scanned = recent.sumOf { it.total }
        val rightScans = recent.sumOf { it.correct }
        if (recent.size >= minSample && scanned > 0) {
            val pct = jsRound(rightScans.toDouble() / scanned * 100)
            if (pct < 80) {
                out.add(
                    WeakSpot(
                        "scansion", "Marking quantities", pct, "$pct% of syllables right across your last ${recent.size} lines",
                        "Scan a line", Destination.Scansion, pct,
                    ),
                )
            }
        }

        // Cards forgotten twice or more.
        val leeches = vocab.values.count { it.lapses >= 2 }
        if (leeches >= 3) {
            out.add(
                WeakSpot(
                    "leeches", "Words that keep slipping", null, "$leeches cards you have forgotten twice or more",
                    "Review them", Destination.Vocab, max(45, 70 - leeches),
                ),
            )
        }

        return out.sortedWith { a, b -> if (a.urgency != b.urgency) a.urgency.compareTo(b.urgency) else a.id.compareTo(b.id) }.take(5)
    }

    /** Swift's `.rounded()` (half away from zero) on a non-negative value. */
    private fun jsRound(d: Double): Int = d.roundToInt()

    data class Forecast(
        val dueNow: Int,
        /** Cards due today (overdue included), then on each of the next six days. */
        val week: List<Int>,
        val mature: Int,
        val learning: Int,
    )

    fun forecast(vocab: Map<String, VocabCard>, today: Instant = Instant.now()): Forecast {
        val todayIso = StudyDates.isoDay(today)
        val todayNumber = StudyDates.dayNumber(todayIso) ?: 0
        val week = MutableList(7) { 0 }
        var dueNow = 0
        var mature = 0
        for (c in vocab.values) {
            if (c.due <= todayIso) {
                dueNow++
            } else {
                StudyDates.dayNumber(c.due)?.let { d ->
                    val days = d - todayNumber
                    if (days in 1..6) week[days]++
                }
            }
            if (c.interval >= 21) mature++
        }
        week[0] = dueNow
        return Forecast(dueNow, week, mature, vocab.size - mature)
    }

    /** The exam's weighting of the three skill categories, in percent. */
    val skillWeights: Map<String, Int> = mapOf("1" to 70, "2" to 11, "3" to 19)

    /** Multiple-choice accuracy per skill category. */
    fun mastery(attempts: List<QuizAttempt>): Map<String, Tally> {
        val total = mutableMapOf("1" to 0, "2" to 0, "3" to 0)
        val right = mutableMapOf("1" to 0, "2" to 0, "3" to 0)
        for (a in attempts) {
            if (a.skillCategory !in total) continue
            total[a.skillCategory] = total.getValue(a.skillCategory) + 1
            if (a.correct) right[a.skillCategory] = right.getValue(a.skillCategory) + 1
        }
        return total.mapValues { Tally(right.getValue(it.key), it.value) }
    }
}

/** Laurels: the web's `src/lib/laurels.ts`. Achievements across the whole app, worked out from the progress that already syncs, so every device agrees and nothing new is stored. */
data class Laurel(
    val id: String,
    val latin: String,
    val title: String,
    val detail: String,
    val target: Int,
    /** How far along, capped at the target. */
    val have: Int,
    val earned: Boolean,
)

object Laurels {
    data class Spec(val id: String, val latin: String, val title: String, val detail: String, val target: Int)

    val specs: List<Spec> = listOf(
        // The course
        Spec("first-lesson", "Prīmus gradus", "The first step", "Finish a lesson of the course.", 1),
        Spec("unit", "Pēnsum perfectum", "A whole unit", "Finish every lesson of a unit.", 1),
        Spec("prima", "Prīma perfecta", "Level I, done", "Finish every lesson of Prīma.", 1),
        Spec("secunda", "Secunda perfecta", "Level II, done", "Finish every lesson of Secunda.", 1),
        Spec("tertia", "Tertia perfecta", "Level III, done", "Finish every lesson of Tertia.", 1),
        Spec("quarta", "Quārta perfecta", "Level IV, done", "Finish every lesson of Quārta: the whole AP syllabus, read with a guide.", 1),
        Spec("verba", "Omnia verba", "The whole AP list", "Finish every unit of Verba, the AP word list by letter.", 1),
        Spec("lessons-50", "Quīnquāgintā lēctiōnēs", "Fifty lessons", "Finish fifty lessons of the course.", 50),
        // Habit
        Spec("streak-7", "Septem diēs", "A week unbroken", "Study seven days in a row.", 7),
        Spec("streak-30", "Trīgintā diēs", "A month unbroken", "Study thirty days in a row.", 30),
        Spec("streak-100", "Centum diēs", "A hundred days unbroken", "Study a hundred days in a row.", 100),
        Spec("days-50", "Assiduus", "Fifty days of study", "Study on fifty different days.", 50),
        // Vocabulary
        Spec("deck-100", "Centum verba", "A hundred words", "Have a hundred words in your flashcards.", 100),
        Spec("deck-500", "Quīngenta verba", "Five hundred words", "Have five hundred words in your flashcards.", 500),
        Spec("mature-100", "Memoria tenāx", "A hundred words held fast", "Get a hundred cards to an interval of three weeks or more.", 100),
        // Reading
        Spec("reader", "Lēctor", "Five passages opened", "Open five passages in the Reading Room.", 5),
        Spec("annotations", "Adnotātiōnēs", "Twenty-five marks", "Make twenty-five highlights and notes while reading.", 25),
        Spec("cold-read", "Sine auxiliō", "A cold read", "Read a passage with the glossary turned off.", 1),
        // Quiz and exam
        Spec("quiz-100", "Centum respōnsa", "A hundred questions", "Answer a hundred questions in the Quiz Engine.", 100),
        Spec("quiz-1000", "Mīlle respōnsa", "A thousand questions", "Answer a thousand questions in the Quiz Engine.", 1000),
        Spec("exam", "Probātiō", "A practice exam", "Finish a full practice exam.", 1),
        Spec("exam-80", "Summa cum laude", "Eighty percent", "Score 80% or more on a practice exam’s multiple choice.", 80),
        // Writing
        Spec("translations-10", "Interpres", "Ten translations", "Finish ten translation drills.", 10),
        Spec("frq-5", "Scrīptor", "Five free responses", "Submit five free responses in the FRQ Workshop.", 5),
        // Scansion
        Spec("scansion-first", "Prīmus versus", "A first line scanned", "Scan a line in the Scansion Lab.", 1),
        Spec("scansion-50", "Metricus", "Fifty lines, perfectly", "Scan fifty different lines without a mistake.", 50),
        // Sententia
        Spec("sententia-7", "Sententiōsus", "A week of sententiae", "Do the Sententia of the day seven days in a row.", 7),
        Spec("sententia-30", "Trīgintā sententiae", "Thirty sententiae", "Do the Sententia of the day thirty times.", 30),
    )

    /** Longest run of consecutive YYYY-MM-DD days in a list. */
    internal fun longestRun(days: List<String>): Int {
        val sorted = days.mapNotNull { StudyDates.dayNumber(it) }.toSet().sorted()
        var best = 0
        var run = 0
        sorted.forEachIndexed { i, d ->
            run = if (i > 0 && d == sorted[i - 1] + 1) run + 1 else 1
            best = max(best, run)
        }
        return best
    }

    /**
     * Every laurel, and how far along the student is. Reads the document's raw
     * JSON for counts rather than decoding every record, since Today works
     * this out on each redraw and a keen student has thousands of quiz answers.
     */
    fun all(doc: ProgressDocument, course: Course): List<Laurel> {
        val done = doc.lessons
        fun isDone(id: String) = done[id] != null
        // Unit tests aside: a unit is done when its lessons are.
        val units = course.levels.flatMap { it.units }.map { u -> u.lessons.filter { !it.isTest }.map { it.id } }
        val unitsDone = units.count { it.isNotEmpty() && it.all(::isDone) }
        fun levelDone(id: String): Int {
            val us = course.levels.firstOrNull { it.id == id }?.units ?: emptyList()
            return if (us.isNotEmpty() && us.all { u -> u.lessons.filter { !it.isTest }.all { isDone(it.id) } }) 1 else 0
        }
        val intervals = doc.raw.obj("vocab").map { it.second["interval"]?.doubleValue ?: 0.0 }
        val passages = doc.raw.obj("passages").map { it.second }
        val exams = doc.examResults
        val bestExam = exams.maxOfOrNull { if (it.mcqTotal > 0) Math.floor(it.mcqCorrect.toDouble() / it.mcqTotal * 100).toInt() else 0 } ?: 0
        val scans = doc.raw.array("scansionAttempts")
        // A line is mastered once any attempt at it scored every syllable.
        val mastered = scans.mapNotNull { a ->
            val total = a["total"]?.doubleValue ?: 0.0
            if (total > 0 && a["correct"]?.doubleValue == total) a["lineId"]?.stringValue else null
        }.toSet().size
        val daily = doc.daily.keys.toList()
        val studyDays = doc.studyDays
        val longest = Streaks.longest(studyDays)
        val quizzes = doc.raw.array("quizAttempts").size

        val have = mapOf(
            "first-lesson" to done.size,
            "unit" to unitsDone,
            "prima" to levelDone("prima"),
            "secunda" to levelDone("secunda"),
            "tertia" to levelDone("tertia"),
            "quarta" to levelDone("quarta"),
            "verba" to levelDone("verba"),
            "lessons-50" to done.size,
            "streak-7" to longest,
            "streak-30" to longest,
            "streak-100" to longest,
            "days-50" to studyDays.toSet().size,
            "deck-100" to intervals.size,
            "deck-500" to intervals.size,
            "mature-100" to intervals.count { it >= 21 },
            "reader" to passages.count { (it["lastOpened"]?.stringValue ?: "").isNotEmpty() },
            "annotations" to passages.sumOf { it["annotations"]?.arrayValue?.size ?: 0 },
            "cold-read" to passages.sumOf { (it["coldReads"]?.doubleValue ?: 0.0).toInt() },
            "quiz-100" to quizzes,
            "quiz-1000" to quizzes,
            "exam" to exams.size,
            "exam-80" to bestExam,
            "translations-10" to doc.raw.array("translationAttempts").size,
            "frq-5" to doc.raw.array("frqResponses").count { it["submitted"]?.boolValue == true },
            "scansion-first" to scans.size,
            "scansion-50" to mastered,
            "sententia-7" to longestRun(daily),
            "sententia-30" to daily.size,
        )
        return specs.map { s ->
            val n = have[s.id] ?: 0
            Laurel(s.id, s.latin, s.title, s.detail, s.target, minOf(n, s.target), n >= s.target)
        }
    }

    /** The unearned laurel closest to done, by fraction of its target. */
    fun next(list: List<Laurel>): Laurel? {
        val open = list.filter { !it.earned && it.have > 0 }
        val first = open.firstOrNull() ?: return list.firstOrNull { !it.earned }
        return open.drop(1).fold(first) { a, b ->
            if (b.have.toDouble() / b.target > a.have.toDouble() / a.target) b else a
        }
    }
}

/**
 * The week in review: the web's `src/lib/recap.ts`. What a student did in the
 * last seven days beside the seven before, counted from progress that already
 * syncs. Days follow the store's convention (the UTC date).
 */
data class RecapCounts(
    /** Days with any study. */
    val days: Int = 0,
    /** Course lessons finished for the first time. */
    val lessons: Int = 0,
    /** Quiz questions answered, and how many right. */
    val quiz: Int = 0,
    val quizRight: Int = 0,
    /** Flashcards last reviewed in the window. */
    val cards: Int = 0,
    val sententiae: Int = 0,
    val scansion: Int = 0,
    val translations: Int = 0,
) {
    /** Nothing at all happened. */
    val isQuiet: Boolean get() = listOf(days, lessons, quiz, quizRight, cards, sententiae, scansion, translations).all { it == 0 }
}

data class Recap(
    /** First and last day of the week, inclusive. */
    val from: String,
    val to: String,
    val week: RecapCounts,
    /** The seven days before. */
    val before: RecapCounts,
) {
    companion object {
        fun of(doc: ProgressDocument, today: String = StudyDates.today()): Recap {
            val from = Daily.shift(today, -6)
            return Recap(
                from, today,
                counts(doc, from, today),
                counts(doc, Daily.shift(today, -13), Daily.shift(today, -7)),
            )
        }

        /** Reads the raw JSON rather than decoding every record, like [Laurels]. */
        internal fun counts(doc: ProgressDocument, from: String, to: String): RecapCounts {
            fun inside(at: String?): Boolean {
                if (at == null || at.length < 10) return false
                val day = at.take(10)
                return day >= from && day <= to
            }
            val quiz = doc.raw.array("quizAttempts").filter { inside(it["at"]?.stringValue) }
            return RecapCounts(
                days = doc.studyDays.filter { inside(it) }.toSet().size,
                lessons = doc.lessons.values.count { inside(it.completedAt) },
                quiz = quiz.size,
                quizRight = quiz.count { it["correct"]?.boolValue == true },
                cards = doc.raw.obj("vocab").count { inside(it.second["lastReviewed"]?.stringValue) },
                sententiae = doc.daily.keys.count { inside(it) },
                scansion = doc.raw.array("scansionAttempts").count { inside(it["at"]?.stringValue) },
                translations = doc.raw.array("translationAttempts").count { inside(it["at"]?.stringValue) },
            )
        }
    }
}
