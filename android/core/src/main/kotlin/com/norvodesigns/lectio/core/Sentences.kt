package com.norvodesigns.lectio.core

import kotlin.random.Random

/**
 * Sentence builder: the web's `src/lib/sentences.ts`. Sentences from the
 * course's translate exercises, built from tiles. Where Forms Forge knows
 * other forms of at least two of a sentence's words, the student builds the
 * Latin from its English, in any order, with those forms as decoys; otherwise
 * the English from the Latin, with near misses (sailor for sailors) as decoys.
 */
class SentenceBuilder(course: Course, paradigms: List<Paradigm>) {
    internal data class Source(val lessonId: String, val latin: String, val english: String)

    internal val sources: List<Source> = course.lessons.flatMap { place ->
        place.lesson.steps.mapNotNull { step ->
            val t = step as? TranslateStep ?: return@mapNotNull null
            val english = t.answers.firstOrNull() ?: return@mapNotNull null
            Source(place.lesson.id, t.latin, english)
        }
    }

    /** Each form (folded) -> the other one-word forms of its tables. */
    private val otherFormsIndex: Map<String, List<String>>

    /** Every English word the course's translations use. */
    private val englishWords: Set<String>

    init {
        val index = HashMap<String, MutableList<String>>()
        for (p in paradigms) {
            val forms = p.rows.flatMap { r -> r.cells.flatMap { Forge.cellForms(it) } }.filter { !it.contains(' ') }
            for (f in forms) {
                val key = LessonCheck.foldLatin(f)
                val list = index.getOrPut(key) { mutableListOf() }
                for (g in forms) if (LessonCheck.foldLatin(g) != key && g !in list) list.add(g)
            }
        }
        otherFormsIndex = index
        englishWords = sources.flatMap { words(it.english).map { w -> w.lowercase() } }.toSet()
    }

    /** Other forms Forms Forge knows for a word, capitalised like it. */
    fun otherForms(word: String): List<String> {
        val forms = otherFormsIndex[LessonCheck.foldLatin(word)] ?: emptyList()
        val cap = word.firstOrNull()?.let { it.toString() != it.toString().lowercase() } ?: false
        return forms.map { if (cap) it.replaceFirstChar { c -> c.uppercase() } else it }
    }

    /** An English word one ending away (sailors / sailor, sees / see, city / cities), and only one the course's own English uses. */
    fun nearMiss(word: String): String? {
        val w = word.lowercase()
        if (w != word || w.length < 3 || w in plain || !letters.matches(w)) return null
        val m: String? = when {
            reIes.containsMatchIn(w) -> w.dropLast(3) + "y"
            reEs.containsMatchIn(w) -> w.dropLast(2)
            reSs.containsMatchIn(w) -> null
            w.endsWith("s") -> w.dropLast(1)
            reY.containsMatchIn(w) -> w.dropLast(1) + "ies"
            reCh.containsMatchIn(w) -> w + "es"
            else -> w + "s"
        }
        return m?.takeIf { it in englishWords }
    }

    internal fun latinTestable(s: Source): Boolean = words(s.latin).count { otherForms(it).isNotEmpty() } >= 2

    /** One sentence as a build step: the Latin if its endings can be tested, else the English. */
    internal fun step(s: Source, rng: Random): BuildStep {
        val latin = words(s.latin)
        val english = words(s.english)
        val taken = latin.map { LessonCheck.foldLatin(it) }.toMutableSet()
        val decoys = ArrayList<String>()
        for (w in latin.shuffled(rng)) {
            val options = otherForms(w).filter { LessonCheck.foldLatin(it) !in taken }
            val d = options.randomOrNull(rng) ?: continue
            taken.add(LessonCheck.foldLatin(d))
            decoys.add(d)
            if (decoys.size == 3) break
        }
        if (decoys.size >= 2) {
            return BuildStep(
                prompt = "Build the Latin, in any order.", source = s.english, lang = "la", answer = latin, extra = decoys,
                anyOrder = true, explain = "*${s.latin}* Any order is good Latin, so long as the endings are right.",
            )
        }
        val have = english.map { LessonCheck.foldTile(it) }.toMutableSet()
        val extra = ArrayList<String>()
        // Near misses first (sailor for sailors), then a word from elsewhere.
        for (w in english.shuffled(rng)) {
            val m = nearMiss(w) ?: continue
            if (LessonCheck.foldTile(m) in have) continue
            have.add(LessonCheck.foldTile(m))
            extra.add(m)
            if (extra.size == 2) break
        }
        val pool = sources.filter { it != s }.flatMap { words(it.english) }
            .filter { LessonCheck.foldTile(it) !in plain }
            .shuffled(rng)
        for (w in pool) {
            val k = LessonCheck.foldTile(w)
            if (k.isEmpty() || k in have) continue
            have.add(k)
            extra.add(w.lowercase())
            if (extra.size == 3) break
        }
        return BuildStep(
            prompt = "Build the English.", source = s.latin, lang = "en", answer = english, extra = extra,
            anyOrder = null, explain = "*${s.latin}* ${s.english}",
        )
    }

    /** A round of sentences from finished lessons; with too few, the first lessons of the course fill it up. Half builds Latin where it can. */
    fun lesson(done: Map<String, LessonProgress>, length: Int = SentenceBuilder.length, rng: Random = Random.Default): LessonPlace {
        val short = sources.filter { words(it.latin).size <= 8 }
        val known = short.filter { done[it.lessonId] != null }
        val pool = if (known.size >= length) known else known + short.filter { done[it.lessonId] == null }.take(30)
        val mixed = pool.shuffled(rng)
        val latin = mixed.filter { latinTestable(it) }.take(length / 2)
        val chosen = (latin + mixed.filter { it !in latin }).take(length).shuffled(rng)
        val steps = chosen.map { step(it, rng) }
        val lesson = Lesson(
            id = "$prefix${rng.nextLong(0, 4_294_967_296L)}",
            title = "Sentence builder",
            summary = "Eight sentences from the course, built from tiles: the Latin from its English, or the English from its Latin.",
            minutes = 5,
            objectives = listOf("Put endings to work: the right form of each word", "Read a Latin sentence as a whole"),
            words = emptyList(),
            steps = steps,
        )
        return syntheticPlace(lesson, "sentences", "Sentence builder")
    }

    companion object {
        const val prefix = "sentences-"
        const val length = 8

        fun isSentences(id: String): Boolean = id.startsWith(prefix)

        private val punctuation = ".,;:!?“”\"‘’()—–".toSet()
        private val letters = Regex("[a-z]+")
        private val reIes = Regex("[^aeiou]ies$")
        private val reEs = Regex("(ches|shes|xes|oes)$")
        private val reSs = Regex("(ss|us|is|os)$")
        private val reY = Regex("[^aeiou]y$")
        private val reCh = Regex("(ch|sh|x|o)$")

        /** A sentence's words, without punctuation. */
        fun words(text: String): List<String> =
            text.split(Regex("\\s+")).map { w -> w.filter { it !in punctuation } }.filter { it.isNotEmpty() }

        val plain: Set<String> = setOf(
            "the", "a", "an", "is", "are", "was", "were", "am", "be", "been", "do", "does", "did", "have", "has", "had", "will", "would",
            "can", "could", "and", "or", "of", "to", "in", "on", "at", "by", "with", "from", "not", "but", "i", "you", "we", "he", "she",
            "it", "they", "me", "us", "him", "them", "his", "her", "its", "our", "your", "their", "this", "that", "these", "those",
        )
    }
}
