package com.norvodesigns.lectio.core

import kotlinx.serialization.DeserializationStrategy
import kotlinx.serialization.builtins.ListSerializer
import kotlin.random.Random

/**
 * Everything the app teaches, decoded from the exported JSON bundle, with the
 * lookups the screens need built once up front.
 *
 * Immutable once loaded: load it once off the main thread at launch and hand
 * the same instance to every screen.
 */
class ContentLibrary(source: ContentSource) {
    val manifest: ContentManifest
    val meta: ContentMeta
    val passages: List<Passage>
    val coreVocabulary: List<VocabEntry>
    val supplementaryVocabulary: List<VocabEntry>
    val questions: List<Question>
    val questionSets: List<QuestionSet>
    val sightQuestions: List<Question>
    val grammarTopics: List<GrammarTopic>
    val deviceCards: List<DeviceCard>
    val contextCards: List<ContextCard>
    val frqPrompts: List<FrqPrompt>
    val frqRubrics: FrqRubrics

    /** FRQ 2 prompts made from every translation drill; the practice exam draws its translation from these. */
    val examTranslationPrompts: List<FrqPrompt>
    val sightPassages: List<SightPassage>
    val sightAuthors: List<String>
    val translationDrills: List<TranslationDrill>
    val scansionLines: List<ScansionLine>

    /** The course, from the first day to AP. */
    val course: Course

    /** Forms Forge's declension and conjugation tables. */
    val paradigms: List<Paradigm>

    /** The Sententia of the day lines. */
    val sententiae: List<Sententia>

    /** AP vocabulary id -> English derivatives, from the course's words. */
    val derivatives: Map<String, List<String>>

    /** Sentence builder's sentences and the forms for its decoys. Built on first use, not at load. */
    val sentences: SentenceBuilder by lazy { SentenceBuilder(course, paradigms) }

    private val passageIndex: Map<String, Int>
    private val vocabIndex: Map<String, VocabEntry>
    private val questionIndex: Map<String, Question>

    class LoadException(message: String, cause: Throwable? = null) : Exception(message, cause)

    init {
        fun <T> load(name: String, strategy: DeserializationStrategy<T>): T = try {
            LectioJson.decodeFromString(strategy, source.readText(name))
        } catch (e: Exception) {
            throw LoadException("Could not load $name: ${e.message}", e)
        }

        manifest = load("manifest.json", ContentManifest.serializer())
        if (manifest.schemaVersion > supportedSchemaVersion) {
            throw LoadException("Content schema ${manifest.schemaVersion} is newer than this app supports ($supportedSchemaVersion).")
        }
        meta = load("meta.json", ContentMeta.serializer())
        passages = load("passages.json", ListSerializer(Passage.serializer()))
        val vocab = load("vocabulary.json", VocabularyFile.serializer())
        coreVocabulary = vocab.core
        supplementaryVocabulary = vocab.supplementary
        val q = load("questions.json", QuestionsFile.serializer())
        questions = q.questions
        questionSets = q.sets
        grammarTopics = load("grammar.json", ListSerializer(GrammarTopic.serializer()))
        deviceCards = load("devices.json", ListSerializer(DeviceCard.serializer()))
        contextCards = load("context.json", ListSerializer(ContextCard.serializer()))
        val frq = load("frq.json", FrqFile.serializer())
        frqPrompts = frq.prompts
        frqRubrics = frq.rubrics
        examTranslationPrompts = frq.translation ?: emptyList()
        val sight = load("sight.json", SightFile.serializer())
        sightPassages = sight.passages
        sightQuestions = sight.questions
        sightAuthors = sight.authors
        translationDrills = load("translation.json", ListSerializer(TranslationDrill.serializer()))
        scansionLines = load("scansion.json", ListSerializer(ScansionLine.serializer()))
        course = if (source.exists("curriculum.json")) {
            val file = load("curriculum.json", CurriculumFile.serializer())
            Course(file.levels, file.placement ?: emptyList(), file.vocabPlacement ?: emptyList())
        } else {
            Course(emptyList())
        }
        paradigms = if (source.exists("forms.json")) load("forms.json", FormsFile.serializer()).paradigms else emptyList()
        sententiae = if (source.exists("daily.json")) load("daily.json", DailyFile.serializer()).sententiae else emptyList()
        derivatives = course.derivativesByVocab()

        val pIndex = HashMap<String, Int>()
        passages.forEachIndexed { i, p -> pIndex.putIfAbsent(p.id, i) }
        passageIndex = pIndex
        // Core entries win over a supplementary entry that happens to share an id.
        val vIndex = HashMap<String, VocabEntry>()
        for (e in supplementaryVocabulary + coreVocabulary) vIndex[e.id] = e
        vocabIndex = vIndex
        val qIndex = HashMap<String, Question>()
        for (qq in questions + sightQuestions) qIndex.putIfAbsent(qq.id, qq)
        questionIndex = qIndex
    }

    fun passage(id: String): Passage? = passageIndex[id]?.let { passages[it] }
    fun vocab(id: String): VocabEntry? = vocabIndex[id]
    fun question(id: String): Question? = questionIndex[id]

    val requiredPassages: List<Passage> get() = passages.filter { it.required }

    /**
     * Section II of a practice exam, as on the web (`examPrompts` in
     * src/data/frq.ts): one prompt of each type in exam order, the
     * translation from the drills and the rest from the bank.
     */
    fun examPrompts(rng: Random = Random.Default): List<FrqPrompt> =
        listOf("short-answer", "translation", "short-essay", "project-prose", "project-poetry").mapNotNull { type ->
            val pool = if (type == "translation" && examTranslationPrompts.isNotEmpty()) examTranslationPrompts else frqPrompts.filter { it.type == type }
            pool.randomOrNull(rng)
        }

    /** Passages grouped by CED unit, in unit order. */
    val passagesByUnit: List<UnitGroup>
        get() = passages.groupBy { it.unit }.toSortedMap(::naturalCompare).map { (unit, list) ->
            UnitGroup(unit, meta.unitTitles[unit] ?: "Unit $unit", list)
        }

    companion object {
        /**
         * The newest bundle layout this build understands. A bundle with a
         * higher `schemaVersion` (e.g. downloaded content from a newer web
         * deploy) is refused rather than half-decoded.
         */
        const val supportedSchemaVersion = 1

        /** Just the Sententia of the day lines, for a background task (the daily reminder) that has no use for the rest. */
        fun loadSententiae(source: ContentSource): List<Sententia> =
            if (source.exists("daily.json")) LectioJson.decodeFromString(DailyFile.serializer(), source.readText("daily.json")).sententiae else emptyList()
    }
}

data class UnitGroup(val unit: String, val title: String, val passages: List<Passage>) {
    val id: String get() = unit
}

/** Like Foundation's localizedStandardCompare for the unit keys: digit runs compare as numbers. */
internal fun naturalCompare(a: String, b: String): Int {
    var i = 0
    var j = 0
    while (i < a.length && j < b.length) {
        if (a[i].isDigit() && b[j].isDigit()) {
            var ie = i
            while (ie < a.length && a[ie].isDigit()) ie++
            var je = j
            while (je < b.length && b[je].isDigit()) je++
            val na = a.substring(i, ie).toBigInteger()
            val nb = b.substring(j, je).toBigInteger()
            val c = na.compareTo(nb)
            if (c != 0) return c
            i = ie
            j = je
        } else {
            val c = a[i].lowercaseChar().compareTo(b[j].lowercaseChar())
            if (c != 0) return c
            i++
            j++
        }
    }
    return (a.length - i).compareTo(b.length - j)
}

/**
 * Deciding whether, and what, to download when the website serves newer
 * content than the app has (src/app/content/v1). The fetching and hashing live
 * in the app; this is the part worth testing.
 */
object ContentUpdate {
    /**
     * Whether the website's content should replace what the app has: it's
     * newer (its history includes what the app has, so an app build that's
     * ahead of the website never goes backwards), this build can read it, and
     * it lists only plain file names.
     */
    fun shouldUpdate(current: ContentManifest, remote: ContentManifest): Boolean =
        remote.contentHash != current.contentHash &&
            current.contentHash in remote.supersedes &&
            remote.schemaVersion <= ContentLibrary.supportedSchemaVersion &&
            remote.files.isNotEmpty() &&
            remote.files.keys.all(::isSafeFileName) &&
            remote.files.values.all(::isSHA256)

    /** The files to download: those that are new or whose hash changed. Everything else is copied from the content already on the device. */
    fun changedFiles(current: ContentManifest, remote: ContentManifest): List<String> =
        remote.files.filter { current.files[it.key] != it.value }.keys.sorted()

    /** A manifest names files like "passages.json", never a path, so a bad manifest can't write outside the content folder. */
    fun isSafeFileName(name: String): Boolean {
        if (!name.endsWith(".json") || name.length <= 5 || name.length > 64 || name == "manifest.json") return false
        return name.all { it in 'a'..'z' || it in '0'..'9' || it == '-' || it == '_' || it == '.' } &&
            !name.startsWith(".") && !name.contains("..")
    }

    internal fun isSHA256(hex: String): Boolean = hex.length == 64 && hex.all { it in '0'..'9' || it in 'a'..'f' }
}
