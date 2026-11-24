package com.norvodesigns.lectio.core

/**
 * The web's `tokenize()` (src/lib/tokenize.ts): runs of letters, and runs of
 * everything else between them. A text the reader imports into the Reading
 * Room (kept under `importedTexts` in the progress document) has its
 * highlights and marks anchored to these token indices on every platform, so
 * this must split exactly as the TypeScript does: the same letter ranges, by
 * UTF-16 code unit, which a Kotlin string already is.
 */
object LatinTokenizer {
    fun isLetter(c: Char): Boolean = when (c.code) {
        in 0x41..0x5A, in 0x61..0x7A, in 0xC0..0xFF, in 0x100..0x17F -> true
        else -> false
    }

    /** Each token's text, and whether it is a word. */
    fun tokenize(line: String): List<Pair<String, Boolean>> {
        val out = mutableListOf<Pair<String, Boolean>>()
        val current = StringBuilder()
        var currentIsWord = false
        for (c in line) {
            val word = isLetter(c)
            if (current.isNotEmpty() && word != currentIsWord) {
                out += current.toString() to currentIsWord
                current.clear()
            }
            currentIsWord = word
            current.append(c)
        }
        if (current.isNotEmpty()) out += current.toString() to currentIsWord
        return out
    }

    /** An imported text's id: `mine-` and a random id. */
    const val IMPORTED_PREFIX = "mine-"
    fun isImported(id: String): Boolean = id.startsWith(IMPORTED_PREFIX)
}
