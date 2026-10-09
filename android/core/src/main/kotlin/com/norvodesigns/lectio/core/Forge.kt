package com.norvodesigns.lectio.core

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlin.random.Random

/**
 * A declension or conjugation table for Forms Forge: the web's
 * `src/data/forms`, exported as `forms.json`.
 *
 * Cells use the course's markup: `puell|ae` marks the ending, and a cell may
 * hold alternatives, `eī / iī`.
 */
@Serializable
data class Paradigm(
    val id: String,
    /** Kept as text so a kind added on the website never fails the decode. */
    @SerialName("kind") val kindName: String,
    val lemma: String,
    val gloss: String,
    val title: String,
    /** The course lesson that teaches this table. */
    val lesson: String? = null,
    val cols: List<String>,
    val rows: List<ParadigmTable.Row>,
    /** What each cell is, in words: `names[row][col]` = "genitive plural". */
    val names: List<List<String>>,
) {
    enum class Kind(val label: String) {
        Noun("Nouns"), Adjective("Adjectives"), Pronoun("Pronouns"), Verb("Verbs");

        val raw: String get() = name.lowercase()
    }

    val kind: Kind? get() = Kind.entries.firstOrNull { it.raw == kindName }

    /** "rēx" from "rēx, rēgis, m.". */
    val headword: String get() = lemma.split(",").firstOrNull()?.trim() ?: lemma

    /** As a course table, for the same chart view the lessons use. */
    val table: ParadigmTable get() = ParadigmTable(null, cols, rows)
    val cellCount: Int get() = rows.size * cols.size
}

@Serializable
internal data class FormsFile(val paradigms: List<Paradigm>)

/** Forms Forge's three kinds of question, made from the tables. The same rules as the web's `src/lib/forge.ts`. */
object Forge {
    enum class Mode(val label: String) { Make("Make the form"), Name("Name the form"), Chart("Fill the chart") }

    data class Cell(val row: Int, val col: Int)

    sealed interface ForgeQuestion {
        val paradigm: Paradigm

        /** Type the form: "the genitive plural of rēx". */
        data class Make(override val paradigm: Paradigm, val cell: Cell, val asked: String, val answers: List<String>) : ForgeQuestion

        /** Pick what the form is; [answer] indexes [options]. */
        data class Name(override val paradigm: Paradigm, val cell: Cell, val form: String, val options: List<String>, val answer: Int) : ForgeQuestion

        /** Fill the blanks in the table. */
        data class Chart(override val paradigm: Paradigm, val blanks: List<Cell>) : ForgeQuestion
    }

    /** The forms a cell accepts, without the ending marker. */
    fun cellForms(cell: String): List<String> =
        cell.split(" / ").map { it.replace("|", "").trim() }.filter { it.isNotEmpty() }

    /** The tables in play: some kinds, and optionally only lessons already done. */
    fun scope(all: List<Paradigm>, kinds: Set<Paradigm.Kind>, learned: Set<String>?): List<Paradigm> =
        all.filter { p ->
            val kind = p.kind ?: return@filter false
            if (kind !in kinds) return@filter false
            val lesson = p.lesson
            if (learned == null || lesson == null) return@filter true
            lesson in learned
        }

    internal fun cells(p: Paradigm): List<Cell> = p.rows.indices.flatMap { r -> p.rows[r].cells.indices.map { Cell(r, it) } }

    fun make(p: Paradigm, rng: Random = Random.Default): ForgeQuestion {
        val cell = cells(p).random(rng)
        return ForgeQuestion.Make(p, cell, p.names[cell.row][cell.col], cellForms(p.rows[cell.row].cells[cell.col]))
    }

    fun name(p: Paradigm, rng: Random = Random.Default): ForgeQuestion {
        val all = cells(p)
        val cell = all.random(rng)
        val shown = p.rows[cell.row].cells[cell.col].split(" / ")[0].trim()
        val plain = shown.replace("|", "")
        // Every name this exact form could have, so none is offered as wrong.
        val fits = all.filter { plain in cellForms(p.rows[it.row].cells[it.col]) }.map { p.names[it.row][it.col] }.toSet()
        val seen = HashSet<String>()
        val others = p.names.flatten().filter { it !in fits && seen.add(it) }
        val right = p.names[cell.row][cell.col]
        val options = (listOf(right) + others.shuffled(rng).take(3)).shuffled(rng)
        return ForgeQuestion.Name(p, cell, shown, options, options.indexOf(right).coerceAtLeast(0))
    }

    fun chart(p: Paradigm, blanks: Int = 5, rng: Random = Random.Default): ForgeQuestion {
        val chosen = cells(p).shuffled(rng).take(minOf(blanks, p.cellCount))
            .sortedWith(compareBy({ it.row }, { it.col }))
        return ForgeQuestion.Chart(p, chosen)
    }

    /** A round of questions, never the same table twice running when there's a choice. */
    fun round(scope: List<Paradigm>, mode: Mode, length: Int, rng: Random = Random.Default): List<ForgeQuestion> {
        if (scope.isEmpty()) return emptyList()
        val out = ArrayList<ForgeQuestion>()
        var last: String? = null
        repeat(length) {
            val pool = if (scope.size > 1) scope.filter { it.id != last } else scope
            val p = pool.random(rng)
            last = p.id
            out.add(
                when (mode) {
                    Mode.Make -> make(p, rng)
                    Mode.Name -> name(p, rng)
                    Mode.Chart -> chart(p, rng = rng)
                },
            )
        }
        return out
    }
}
