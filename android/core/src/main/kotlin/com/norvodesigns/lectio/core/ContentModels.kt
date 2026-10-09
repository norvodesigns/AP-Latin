package com.norvodesigns.lectio.core

import kotlinx.serialization.Serializable

// Serializable mirrors of src/data/types.ts, decoded from the JSON that
// scripts/export-content.ts writes to ios/Content.
//
// Taxonomies (author, unit, question type, grammar category...) are kept as
// plain strings rather than enums on purpose: the curriculum will keep growing
// on the web side, and an enum would make a build that predates a new category
// fail to decode the whole file instead of just not special-casing the new value.

/* Passages */

/** A glossary candidate for one word, resolved at export time by the web app's own lookup. */
@Serializable
data class Gloss(
    /** Vocabulary entry id (core or supplementary). */
    val id: String,
    /** "e" for an exact dictionary match, "s" for a stem-based guess. */
    val m: String,
) {
    val isExact: Boolean get() = m == "e"
}

/**
 * One token of a line exactly as `tokenize()` splits it: a word, or the
 * punctuation and spaces between words. Annotation anchors index into this
 * array, so it must never be re-split here.
 */
@Serializable
data class Token(
    val t: String,
    val w: Int? = null,
    val g: List<Gloss>? = null,
) {
    val text: String get() = t
    val isWord: Boolean get() = w == 1
    val glosses: List<Gloss> get() = g ?: emptyList()
}

@Serializable
data class PassageLine(
    val n: Int,
    val latin: String,
    val tokens: List<Token>,
)

@Serializable
data class Passage(
    val id: String,
    val author: String,
    val genre: String,
    val work: String,
    val book: Int,
    val letter: Int? = null,
    val salutation: String? = null,
    val citation: String,
    val title: String,
    /** On the official 2025 CED required reading list. */
    val required: Boolean,
    val cedReading: String? = null,
    val unit: String,
    val macronized: Boolean,
    val wordCount: Int,
    val themes: List<String>,
    val summary: String,
    val context: String,
    val lines: List<PassageLine>,
    /** Core vocabulary ids this passage introduces. */
    val vocabIds: List<String>,
) {
    val isPoetry: Boolean get() = genre == "poetry"
}

/* Vocabulary */

@Serializable
data class VocabEntry(
    val id: String,
    /** Full dictionary entry with principal parts, e.g. "fero, ferre, tuli, latum". */
    val lemma: String,
    val headword: String,
    val pos: String,
    val definition: String,
    val readings: List<String> = emptyList(),
    val units: List<String> = emptyList(),
    val supplementary: Boolean? = null,
) {
    val isSupplementary: Boolean get() = supplementary ?: false
}

@Serializable
internal data class VocabularyFile(val core: List<VocabEntry>, val supplementary: List<VocabEntry>)

/* Questions */

@Serializable
data class QuestionOption(val id: String, val text: String)

@Serializable
data class GlossNote(val word: String, val meaning: String)

@Serializable
data class Stimulus(
    val latin: String,
    val citation: String,
    val genre: String,
    val gloss: List<GlossNote>? = null,
)

@Serializable
data class Question(
    val id: String,
    val type: String,
    val skill: String,
    val skillCategory: String,
    val passageId: String? = null,
    val lineRange: List<Int>? = null,
    val stimulus: Stimulus? = null,
    val prompt: String,
    val options: List<QuestionOption>,
    val answerId: String,
    val explanation: String,
    val unit: String,
    val difficulty: Int,
)

@Serializable
data class QuestionSet(
    val id: String,
    val title: String,
    val stimulusType: String,
    val length: String,
    val passageId: String? = null,
    val questionIds: List<String>,
)

@Serializable
internal data class QuestionsFile(val questions: List<Question>, val sets: List<QuestionSet>)

/* Grammar, devices, culture */

@Serializable
data class GrammarExample(
    val latin: String,
    val citation: String,
    val passageId: String? = null,
    val analysis: String,
)

@Serializable
data class GrammarChart(
    val title: String,
    val cols: List<String>,
    val rows: List<Row>,
    val note: String? = null,
) {
    @Serializable
    data class Row(val label: String, val cells: List<String>)
}

@Serializable
data class GrammarTopic(
    val id: String,
    val name: String,
    val category: String,
    /** "foundational", "ap" (the default) or "advanced". */
    val level: String? = null,
    val summary: String,
    val recognition: List<String>,
    val translation: List<String>,
    val examples: List<GrammarExample>,
    val charts: List<GrammarChart>? = null,
) {
    val courseLevel: String get() = level ?: "ap"
}

@Serializable
data class DeviceCard(
    val id: String,
    val name: String,
    val definition: String,
    val effect: String,
    val examples: List<GrammarExample>,
)

@Serializable
data class ContextCard(
    val id: String,
    val topic: String,
    val title: String,
    val body: String,
    val keyFacts: List<String>,
    val required: Boolean? = null,
) {
    val isRequired: Boolean get() = required ?: true
}

/* Translation, FRQ, sight, scansion */

@Serializable
data class TranslationSegment(
    val id: String,
    val latin: String,
    val literal: String,
    val requirement: String,
    val pitfalls: List<String>,
    val tags: List<String>,
)

@Serializable
data class TranslationDrill(
    val id: String,
    val passageId: String,
    val citation: String,
    val lineRange: List<Int>,
    val latin: String,
    val segments: List<TranslationSegment>,
    val modelTranslation: String,
    val notes: String? = null,
)

@Serializable
data class RubricRow(
    val id: String,
    val label: String,
    val maxPoints: Int,
    val criteria: String,
    val decisionRules: List<String>,
)

@Serializable
data class FrqSubquestion(
    val id: String,
    val label: String,
    val prompt: String,
    val points: Int,
)

@Serializable
data class FrqPrompt(
    val id: String,
    val type: String,
    val title: String,
    val passageId: String? = null,
    val latin: String? = null,
    val citation: String? = null,
    /** The lines (sections, for prose) of the passage the prompt is set on. */
    val lineRange: List<Int>? = null,
    val minutes: Int,
    val subquestions: List<FrqSubquestion>,
    val rubric: List<RubricRow>,
    val sampleResponse: String,
    val scoringNotes: String,
) {
    /** The lines of [passage] the prompt is set on: all of them if it names none. */
    fun lines(passage: Passage): List<PassageLine> {
        val range = lineRange
        if (range == null || range.size != 2) return passage.lines
        return passage.lines.filter { it.n >= range[0] && it.n <= range[1] }
    }
}

@Serializable
data class FrqRubrics(
    val shortEssay: List<RubricRow>,
    val projectEssay: List<RubricRow>,
    val shortAnswer: List<RubricRow>,
    val checkpoint1: List<RubricRow>,
    val checkpoint2: List<RubricRow>,
)

@Serializable
internal data class FrqFile(
    val prompts: List<FrqPrompt>,
    val rubrics: FrqRubrics,
    /** FRQ 2 prompts made from the translation drills, for the practice exam. */
    val translation: List<FrqPrompt>? = null,
)

@Serializable
data class SightPassage(
    val id: String,
    val author: String,
    val work: String,
    val citation: String,
    val genre: String,
    val latin: String,
    val gloss: List<GlossNote>,
    val summary: String,
    val questionIds: List<String>,
    val machineSelected: Boolean? = null,
    val source: String,
)

@Serializable
internal data class SightFile(
    val passages: List<SightPassage>,
    val questions: List<Question>,
    val authors: List<String>,
)

@Serializable
data class ScannedSyllable(
    val text: String,
    val quantity: String,
    val elides: Boolean? = null,
    val startsWord: Boolean? = null,
    val anceps: Boolean? = null,
    val reason: String? = null,
) {
    val isElided: Boolean get() = elides ?: false
    val isAnceps: Boolean get() = anceps ?: false
}

@Serializable
data class Caesura(val afterSyllable: Int, val type: String)

@Serializable
data class ScansionLine(
    val id: String,
    val passageId: String,
    val citation: String,
    val latin: String,
    val feet: List<String>,
    val syllables: List<ScannedSyllable>,
    val caesurae: List<Caesura>,
    val notes: String,
)

/* Meta and manifest */

@Serializable
data class ContentMeta(
    /** Plain local date of the exam, "YYYY-MM-DD". */
    val examDate: String,
    val storeVersion: Int,
    val unitTitles: Map<String, String>,
    val questionTypeLabels: Map<String, String>,
    val skillLabels: Map<String, String>,
    val contextTopicLabels: Map<String, String>,
    val frqTypeLabels: Map<String, String>,
)

@Serializable
data class ContentManifest(
    val schemaVersion: Int,
    val contentHash: String,
    /** Every earlier `contentHash`, newest first: what this content replaces. */
    val supersedes: List<String> = emptyList(),
    val files: Map<String, String>,
)
