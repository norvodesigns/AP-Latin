package com.norvodesigns.lectio.core

import java.text.Normalizer

/**
 * Checking an answer to a lesson exercise: a port of the web's
 * `src/lib/lessonCheck.ts`, held to it by `Fixtures/lessonCheck.json`, so an
 * answer is right or wrong the same way on both.
 */
object LessonCheck {
    /**
     * Latin as typed, folded for comparison: ligatures spelled out, no
     * macrons or other accents, lower case, u for v and i for j, no
     * punctuation, single spaces.
     */
    fun foldLatin(s: String): String {
        val spelled = StringBuilder()
        for (ch in s) {
            when (ch) {
                'æ', 'Æ' -> spelled.append("ae")
                'œ', 'Œ' -> spelled.append("oe")
                else -> spelled.append(ch)
            }
        }
        val stripped = StringBuilder()
        for (c in Normalizer.normalize(spelled, Normalizer.Form.NFD)) {
            if (c.code !in 0x300..0x36F) stripped.append(c)
        }
        val out = StringBuilder()
        for (ch in stripped.toString().lowercase()) {
            when (ch) {
                'v' -> out.append('u')
                'j' -> out.append('i')
                in 'a'..'z' -> out.append(ch)
                else -> out.append(' ')
            }
        }
        return collapse(out.toString())
    }

    private val articles = setOf("a", "an", "the")

    /** English as typed, folded for comparison: lower case, contractions opened out, no punctuation, no articles. */
    fun foldEnglish(s: String): String {
        val lowered = s.lowercase().replace("’", "'").replace("‘", "'")
        // Words, keeping apostrophes, so contractions can be opened out whole.
        val words = ArrayList<String>()
        val current = StringBuilder()
        for (ch in lowered) {
            if (isAsciiAlnum(ch) || ch == '\'') {
                current.append(ch)
            } else {
                if (current.isNotEmpty()) words.add(current.toString())
                current.setLength(0)
            }
        }
        if (current.isNotEmpty()) words.add(current.toString())

        val opened = words.map { word ->
            when {
                word == "can't" -> "cannot"
                word == "won't" -> "will not"
                word.endsWith("n't") -> word.dropLast(3) + " not"
                word.endsWith("'re") -> word.dropLast(3) + " are"
                word.endsWith("'m") -> word.dropLast(2) + " am"
                else -> word
            }
        }
        // Anything left that isn't a letter or digit (a possessive's apostrophe) splits the word, as on the web.
        val joined = opened.joinToString(" ").map { if (isAsciiAlnum(it)) it else ' ' }.joinToString("")
        return joined.split(' ').filter { it.isNotEmpty() && it !in articles }.joinToString(" ")
    }

    fun checkTyped(answer: String, accepted: List<String>): Boolean {
        val a = foldLatin(answer)
        return a.isNotEmpty() && accepted.any { foldLatin(it) == a }
    }

    fun checkTranslation(answer: String, accepted: List<String>): Boolean {
        val a = foldEnglish(answer)
        return a.isNotEmpty() && accepted.any { foldEnglish(it) == a }
    }

    /** The tiles placed, in order, against a build step. */
    fun checkBuild(placed: List<String>, step: BuildStep): Boolean {
        val isLatin = step.isLatin
        val got = placed.map { if (isLatin) foldLatin(it) else foldTile(it) }
        val want = step.answer.map { if (isLatin) foldLatin(it) else foldTile(it) }
        if (got.size != want.size) return false
        if (step.anyOrder == true) return got.sorted() == want.sorted()
        return got == want
    }

    /** Exercises right the first time out of all of them, to two places; 1 for a lesson with no exercises. */
    fun score(right: Int, of: Int): Double {
        if (of <= 0) return 1.0
        return (right.toDouble() / of * 100).roundHalfAwayFromZero() / 100
    }

    private fun Double.roundHalfAwayFromZero(): Double = if (this >= 0) Math.floor(this + 0.5) else -Math.floor(-this + 0.5)

    /** An English tile: lower case, letters, digits and apostrophes only. */
    fun foldTile(s: String): String = s.lowercase().filter { isAsciiAlnum(it) || it == '\'' }

    private fun isAsciiAlnum(ch: Char): Boolean = ch in 'a'..'z' || ch in '0'..'9'

    private fun collapse(s: String): String = s.split(' ').filter { it.isNotEmpty() }.joinToString(" ")
}
