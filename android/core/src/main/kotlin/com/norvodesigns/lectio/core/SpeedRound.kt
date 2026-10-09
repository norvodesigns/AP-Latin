package com.norvodesigns.lectio.core

import kotlin.random.Random

/**
 * Speed round: the web's `src/lib/speed.ts`. A minute of matching Latin words
 * to their meanings, five pairs to a board. A wrong pair costs two seconds.
 * The short glosses are the web's exactly (parity-tested).
 */
object SpeedRound {
    const val seconds = 60
    const val boardSize = 5
    const val missPenalty = 2

    data class Word(val id: String, val latin: String, val english: String)

    private val brackets = Regex("\\[[^\\]]*\\]|\\([^)]*\\)")
    private val spaces = Regex("\\s+")

    /**
     * A definition cut down to fit a tile: the first group of senses (before
     * any semicolon), without notes in brackets, at most two senses, and one
     * if two would be long.
     */
    fun shortGloss(definition: String): String {
        val first = definition.substringBefore(";").replace(brackets, "")
        val senses = first.split(",").map { it.replace(spaces, " ").trim() }.filter { it.isNotEmpty() }
        val one = senses.firstOrNull() ?: return definition.trim()
        val two = senses.take(2).joinToString(", ")
        // UTF-16 length, as JavaScript counts it.
        return if (two.length <= 26 || senses.size == 1) two else one
    }

    /** The words a round can use: no proper names, none whose meaning just repeats the Latin, and no two with the same short gloss. */
    fun words(entries: List<VocabEntry>): List<Word> {
        val seen = HashSet<String>()
        val out = ArrayList<Word>()
        for (e in entries) {
            val c = e.headword.firstOrNull()
            if (c != null && c in 'A'..'Z') continue
            val english = shortGloss(e.definition)
            val key = english.lowercase()
            if (english.isEmpty() || key in seen || key.contains(e.headword.lowercase())) continue
            seen.add(key)
            out.add(Word(e.id, e.headword, english))
        }
        return out
    }

    /** A board: [size] words from the pool, and their meanings in another order. */
    fun deal(pool: List<Word>, size: Int = boardSize, rng: Random = Random.Default): Pair<List<Word>, List<Word>> {
        val bag = pool.toMutableList()
        val left = ArrayList<Word>()
        val latin = HashSet<String>()
        while (left.size < size && bag.isNotEmpty()) {
            val w = bag.removeAt(rng.nextInt(bag.size))
            if (!latin.add(w.latin)) continue
            left.add(w)
        }
        var right = left.shuffled(rng)
        // Never leave every meaning beside its own word.
        if (right.size > 1 && right == left) right = right.drop(1) + right.first()
        return left to right
    }
}
