package com.norvodesigns.lectio.core

import kotlinx.serialization.KSerializer
import kotlinx.serialization.serializer
import java.time.Instant
import java.time.ZoneId
import kotlin.math.max
import kotlin.math.min

inline fun <reified T> JSONValue?.decodeOrNull(): T? = this?.let { v -> runCatching { v.decode<T>() }.getOrNull() }

/**
 * A student's progress (the web's `SyncableData`) held as the same JSON
 * document the web app syncs through the `user_progress` table and writes to
 * its Settings export file.
 *
 * The raw document is the source of truth. Reads decode typed records from
 * it; each edit is a port of the matching web store action
 * (src/store/useStore.ts) and changes only what that action changes, so a
 * document round-trips through this app without losing a field.
 *
 * Edits mutate this instance. Call [copy] first when the old value is still
 * in use (the app's state holder replaces its document with a copy on each
 * change, so the UI sees a new value).
 */
class ProgressDocument(raw: JSONObject, now: Instant = Instant.now()) {
    var raw: JSONObject = raw.copy().also { filled ->
        for ((key, value) in blankRaw(now)) if (key !in filled) filled[key] = value
    }
        private set

    fun copy(): ProgressDocument = ProgressDocument(raw, Instant.EPOCH).also { }

    /* Reads */

    val theme: String get() = raw["theme"]?.stringValue?.takeIf { it == "dark" } ?: "light"
    val glossaryEnabled: Boolean get() = raw["glossaryEnabled"]?.boolValue ?: true
    val showMacrons: Boolean get() = raw["showMacrons"]?.boolValue ?: true

    val studyPlan: StudyPlanSettings
        get() = raw["studyPlan"].decodeOrNull<StudyPlanSettings>()
            ?: StudyPlanSettings(30, (0..6).toList(), StudyDates.today())

    val studyDays: List<String> get() = raw.array("studyDays").mapNotNull { it.stringValue }
    val reviewQueue: List<String> get() = raw.array("reviewQueue").mapNotNull { it.stringValue }

    /** Every vocabulary card in rotation, keyed by vocab id. */
    val vocab: Map<String, VocabCard>
        get() {
            val out = LinkedHashMap<String, VocabCard>()
            for ((id, value) in raw.obj("vocab")) VocabCard.fromJson(value)?.let { out[id] = it }
            return out
        }

    fun card(id: String): VocabCard? = raw.obj("vocab")[id]?.let { VocabCard.fromJson(it) }

    fun passage(id: String): PassageState = raw.obj("passages")[id].decodeOrNull<PassageState>() ?: PassageState()

    val quizAttempts: List<QuizAttempt> get() = raw.array("quizAttempts").mapNotNull { it.decodeOrNull<QuizAttempt>() }

    /** Course lessons finished, by lesson id. */
    val lessons: Map<String, LessonProgress>
        get() {
            val out = LinkedHashMap<String, LessonProgress>()
            for ((id, value) in raw.obj("lessons")) value.decodeOrNull<LessonProgress>()?.let { out[id] = it }
            return out
        }

    /** The Sententia of the day, by the student's local date. */
    val daily: Map<String, DailyResult>
        get() {
            val out = LinkedHashMap<String, DailyResult>()
            for ((day, value) in raw.obj("daily")) value.decodeOrNull<DailyResult>()?.let { out[day] = it }
            return out
        }

    /** The first-run answers, or null before they've been given. */
    val learner: LearnerProfile?
        get() {
            val value = raw["learner"] ?: return null
            if (value == JSONValue.Null) return null
            return value.decodeOrNull<LearnerProfile>()
        }

    val wordEncounters: Map<String, WordEncounter>
        get() {
            val out = LinkedHashMap<String, WordEncounter>()
            for ((id, value) in raw.obj("wordEncounters")) value.decodeOrNull<WordEncounter>()?.let { out[id] = it }
            return out
        }

    val translationAttempts: List<TranslationAttempt> get() = raw.array("translationAttempts").mapNotNull { it.decodeOrNull<TranslationAttempt>() }
    val frqResponses: List<FrqResponse> get() = raw.array("frqResponses").mapNotNull { it.decodeOrNull<FrqResponse>() }
    val examResults: List<ExamResult> get() = raw.array("examResults").mapNotNull { it.decodeOrNull<ExamResult>() }
    val projectPassages: List<ProjectPassage> get() = raw.array("projectPassages").mapNotNull { it.decodeOrNull<ProjectPassage>() }
    val scansionAttempts: List<ScansionAttempt> get() = raw.array("scansionAttempts").mapNotNull { it.decodeOrNull<ScansionAttempt>() }

    fun scansionDraft(lineId: String): ScansionDraft? = raw.obj("scansionDrafts")[lineId].decodeOrNull<ScansionDraft>()

    /* Edits: each a port of the web store action of the same name */

    fun setTheme(theme: String) {
        raw["theme"] = JSONValue.Str(theme)
    }

    fun toggleGlossary() {
        raw["glossaryEnabled"] = JSONValue.Bool(!glossaryEnabled)
    }

    fun toggleMacrons() {
        raw["showMacrons"] = JSONValue.Bool(!showMacrons)
    }

    fun setStudyPlan(minutesPerDay: Int? = null, activeDays: List<Int>? = null) {
        val plan = raw.obj("studyPlan").copy()
        if (minutesPerDay != null) plan["minutesPerDay"] = JSONValue.Num(minutesPerDay.toDouble())
        if (activeDays != null) plan["activeDays"] = JSONValue.Arr(activeDays.map { JSONValue.Num(it.toDouble()) })
        raw["studyPlan"] = JSONValue.Obj(plan)
    }

    /** Grades one card with SM-2, creating it first if it isn't in rotation yet. */
    fun reviewVocab(id: String, quality: Int, now: Instant = Instant.now(), zone: ZoneId = ZoneId.systemDefault()) {
        val card = card(id) ?: VocabCard.new(id, now)
        val next = SpacedRepetition.review(card, quality, now, zone)
        updateRecord("vocab", id, JSONValue.encoding(serializer<VocabCard>(), next).objectValue!!)
    }

    /** Adds any of [ids] not already in rotation as new cards. */
    fun seedVocab(ids: List<String>, now: Instant = Instant.now()) {
        val vocab = raw.obj("vocab").copy()
        for (id in ids) {
            if (id !in vocab) vocab[id] = JSONValue.encoding(serializer<VocabCard>(), VocabCard.new(id, now))
        }
        raw["vocab"] = JSONValue.Obj(vocab)
    }

    /** A word looked up while reading resolved to [vocabId]: seed it into rotation and record where it was seen. */
    fun encounterWord(vocabId: String, passageId: String, now: Instant = Instant.now()) {
        seedVocab(listOf(vocabId), now)
        val encounters = raw.obj("wordEncounters").copy()
        val current = encounters[vocabId].decodeOrNull<WordEncounter>()
        val passageIds = (current?.passageIds ?: emptyList()).toMutableList()
        if (passageId !in passageIds) passageIds.add(passageId)
        val next = WordEncounter((current?.count ?: 0) + 1, StudyDates.today(now), passageIds)
        overlayInto(encounters, vocabId, JSONValue.encoding(serializer<WordEncounter>(), next))
        raw["wordEncounters"] = JSONValue.Obj(encounters)
    }

    /** Records a multiple-choice answer and keeps the review queue in step: a miss queues the question, a correct answer clears it. */
    fun recordQuiz(
        questionId: String, correct: Boolean, chosenId: String, type: String, skillCategory: String, unit: String,
        passageId: String? = null, seconds: Double? = null, now: Instant = Instant.now(),
    ) {
        val attempt = QuizAttempt(uid(now), questionId, correct, chosenId, StudyDates.isoTimestamp(now), type, skillCategory, unit, passageId, seconds)
        val attempts = raw.array("quizAttempts") + JSONValue.encoding(serializer<QuizAttempt>(), attempt)
        raw["quizAttempts"] = JSONValue.Arr(attempts.takeLast(ProgressMerge.Caps.quizAttempts))

        val queue = raw.array("reviewQueue").toMutableList()
        if (correct) {
            queue.removeAll { it.stringValue == questionId }
        } else if (queue.none { it.stringValue == questionId }) {
            queue.add(JSONValue.Str(questionId))
        }
        raw["reviewQueue"] = JSONValue.Arr(queue)
    }

    fun removeFromReviewQueue(questionId: String) {
        raw["reviewQueue"] = JSONValue.Arr(raw.array("reviewQueue").filter { it.stringValue != questionId })
    }

    fun toggleBookmark(passageId: String) {
        val p = passage(passageId)
        updatePassage(passageId, p.copy(bookmarked = !p.bookmarked))
    }

    fun toggleFlaggedLine(passageId: String, line: Int) {
        val p = passage(passageId)
        val flags = p.flaggedLines.toMutableList()
        if (!flags.remove(line)) flags.add(line)
        flags.sort()
        updatePassage(passageId, p.copy(flaggedLines = flags))
    }

    fun markOpened(passageId: String, now: Instant = Instant.now()) {
        updatePassage(passageId, passage(passageId).copy(lastOpened = StudyDates.isoTimestamp(now)))
    }

    fun incrementColdReads(passageId: String) {
        val p = passage(passageId)
        updatePassage(passageId, p.copy(coldReads = p.coldReads + 1))
    }

    fun setPassageNotes(passageId: String, notes: String) {
        updatePassage(passageId, passage(passageId).copy(notes = notes))
    }

    /* Highlights and notes: ports of setHighlight / setAnnotationNote / removeAnnotation */

    /**
     * Creates or recolors the highlight spanning exactly this token range on
     * one line, and returns it. A colorless highlight with no note is dropped
     * (unless it's brand new: the note flow creates one just to have an id to
     * attach the note to). Marks drawn wholly inside a new colored one are
     * absorbed by it, unless they carry a note: a note is the reader's own
     * writing and is never discarded as a side effect.
     */
    fun setHighlight(
        passageId: String, lineN: Int, startTok: Int, endTok: Int, text: String, color: String?, now: Instant = Instant.now(),
    ): Annotation {
        val p = passage(passageId)
        val existing = p.annotations.firstOrNull { it.lineN == lineN && it.startTok == startTok && it.endTok == endTok }
        val base = existing ?: Annotation(uid(now), lineN, startTok, endTok, text, color, "", StudyDates.isoTimestamp(now))
        val next = base.copy(color = color, text = text)
        val drop = existing != null && next.color == null && next.note.trim().isEmpty()

        fun subsumed(a: Annotation) = a.id != next.id && a.lineN == lineN && a.startTok >= startTok && a.endTok <= endTok && a.note.trim().isEmpty()
        val kept = p.annotations.filter { !(next.color != null && subsumed(it)) }
        val annotations = when {
            drop -> kept.filter { it.id != next.id }
            existing != null -> kept.map { if (it.id == next.id) next else it }
            else -> kept + next
        }
        updatePassage(passageId, p.copy(annotations = annotations))
        return next
    }

    fun setAnnotationNote(passageId: String, annotationId: String, note: String) {
        val p = passage(passageId)
        val annotations = p.annotations
            .map { if (it.id == annotationId) it.copy(note = note) else it }
            // A colorless annotation with no note carries nothing worth keeping.
            .filter { it.color != null || it.note.trim().isNotEmpty() }
        updatePassage(passageId, p.copy(annotations = annotations))
    }

    fun removeAnnotation(passageId: String, annotationId: String) {
        val p = passage(passageId)
        updatePassage(passageId, p.copy(annotations = p.annotations.filter { it.id != annotationId }))
    }

    /** Counts an AI call against today's usage meter: the web's `recordAiCall`. */
    fun recordAiCall(route: String, now: Instant = Instant.now()) {
        val today = StudyDates.today(now)
        val days = raw.array("aiUsage").toMutableList()
        val i = days.indexOfFirst { it["date"]?.stringValue == today }
        val day = if (i >= 0) days[i].objectValue else null
        if (i >= 0 && day != null) {
            val d = day.copy()
            d["calls"] = JSONValue.Num((d["calls"]?.doubleValue ?: 0.0) + 1)
            val byRoute = (d["byRoute"]?.objectValue ?: JSONObject()).copy()
            byRoute[route] = JSONValue.Num((byRoute[route]?.doubleValue ?: 0.0) + 1)
            d["byRoute"] = JSONValue.Obj(byRoute)
            days[i] = JSONValue.Obj(d)
        } else {
            days.add(jobj("date" to today, "calls" to 1, "byRoute" to JSONValue.Obj(JSONObject(route to JSONValue.Num(1.0)))))
        }
        raw["aiUsage"] = JSONValue.Arr(days.takeLast(ProgressMerge.Caps.aiUsage))
    }

    /* Graded work: ports of recordTranslation, saveFrq, recordExam, upsertProjectPassage, recordScansion, saveScansionDraft */

    fun recordTranslation(
        drillId: String, segmentResults: Map<String, String>, text: String, score: Double, maxScore: Int,
        missedTags: List<String>, gradedBy: String, now: Instant = Instant.now(),
    ) {
        val attempt = TranslationAttempt(uid(now), drillId, StudyDates.isoTimestamp(now), segmentResults, text, score, maxScore, missedTags, gradedBy)
        append("translationAttempts", JSONValue.encoding(serializer<TranslationAttempt>(), attempt), ProgressMerge.Caps.translationAttempts)
    }

    /** Saves an FRQ response, replacing the one with the same id if it exists, and returns its id. */
    fun saveFrq(
        id: String?, promptId: String, answers: Map<String, String>, selfScore: Map<String, Double>, secondsSpent: Double,
        submitted: Boolean, now: Instant = Instant.now(),
    ): String {
        val rid = id ?: uid(now)
        val record = FrqResponse(rid, promptId, StudyDates.isoTimestamp(now), answers, selfScore, secondsSpent, submitted)
        val value = JSONValue.encoding(serializer<FrqResponse>(), record)
        val list = raw.array("frqResponses").toMutableList()
        val i = list.indexOfFirst { it["id"]?.stringValue == rid }
        if (i >= 0) list[i] = value else list.add(value)
        raw["frqResponses"] = JSONValue.Arr(list.takeLast(ProgressMerge.Caps.frqResponses))
        return rid
    }

    fun recordExam(
        mcqCorrect: Int, mcqTotal: Int, frqPoints: Double, frqMax: Double, bySkill: Map<String, Tally>, byType: Map<String, Tally>,
        mcqSeconds: Double, frqSeconds: Double, now: Instant = Instant.now(),
    ) {
        val result = ExamResult(uid(now), StudyDates.isoTimestamp(now), mcqCorrect, mcqTotal, frqPoints, frqMax, bySkill, byType, mcqSeconds, frqSeconds)
        append("examResults", JSONValue.encoding(serializer<ExamResult>(), result), null)
    }

    fun upsertProjectPassage(passage: ProjectPassage) {
        val value = JSONValue.encoding(serializer<ProjectPassage>(), passage)
        val list = raw.array("projectPassages").toMutableList()
        val i = list.indexOfFirst { it["id"]?.stringValue == passage.id }
        if (i >= 0) {
            list[i] = JSONValue.Obj((list[i].objectValue ?: JSONObject()).overlaid(value.objectValue ?: JSONObject()))
        } else {
            list.add(value)
        }
        raw["projectPassages"] = JSONValue.Arr(list)
    }

    fun removeProjectPassage(id: String) {
        raw["projectPassages"] = JSONValue.Arr(raw.array("projectPassages").filter { it["id"]?.stringValue != id })
    }

    fun recordScansion(lineId: String, correct: Int, total: Int, now: Instant = Instant.now()) {
        val attempt = ScansionAttempt(uid(now), lineId, StudyDates.isoTimestamp(now), correct, total)
        append("scansionAttempts", JSONValue.encoding(serializer<ScansionAttempt>(), attempt), ProgressMerge.Caps.scansionAttempts)
    }

    /** Keeps a line's in-progress marks, bounded to the 300 most recently added lines, evicting in insertion order as the web store does. */
    fun saveScansionDraft(lineId: String, draft: ScansionDraft) {
        val drafts = raw.obj("scansionDrafts").copy()
        drafts[lineId] = draft.toJson()
        if (drafts.size > ProgressMerge.Caps.scansionDrafts) drafts.removeFirst(drafts.size - ProgressMerge.Caps.scansionDrafts)
        raw["scansionDrafts"] = JSONValue.Obj(drafts)
    }

    private fun append(key: String, value: JSONValue, cap: Int?) {
        val list = raw.array(key) + value
        raw[key] = JSONValue.Arr(if (cap != null) list.takeLast(cap) else list)
    }

    /**
     * A lesson finished: its score (0-1) and the AP-list words it taught,
     * which join the deck. Counts as a study day. Same as the web's `completeLesson`.
     */
    fun completeLesson(lessonId: String, score: Double, vocabIds: List<String>, now: Instant = Instant.now()) {
        val stamp = StudyDates.isoTimestamp(now)
        val prev = lessons[lessonId]
        val progress = LessonProgress(
            completedAt = prev?.completedAt ?: stamp,
            lastAt = stamp,
            best = max(prev?.best ?: 0.0, min(1.0, max(0.0, score))),
            attempts = (prev?.attempts ?: 0) + 1,
        )
        val all = raw.obj("lessons").copy()
        all[lessonId] = JSONValue.encoding(serializer<LessonProgress>(), progress)
        raw["lessons"] = JSONValue.Obj(all)
        seedVocab(vocabIds, now)
        markStudied(now)
    }

    /** The day's Sententia done: a second go the same day keeps the better score. Counts as a study day. */
    fun completeDaily(day: String, id: String, score: Double, now: Instant = Instant.now()) {
        val best = min(1.0, max(0.0, score))
        val all = raw.obj("daily").copy()
        val prev = all[day].decodeOrNull<DailyResult>()
        all[day] = if (prev != null) {
            JSONValue.encoding(serializer<DailyResult>(), DailyResult(prev.id, max(prev.score, best), prev.at))
        } else {
            JSONValue.encoding(serializer<DailyResult>(), DailyResult(id, best, StudyDates.isoTimestamp(now)))
        }
        if (all.size > ProgressMerge.Caps.daily) {
            val keep = all.keys.sorted().takeLast(ProgressMerge.Caps.daily).toSet()
            for (key in all.keys) if (key !in keep) all.remove(key)
        }
        raw["daily"] = JSONValue.Obj(all)
        markStudied(now)
    }

    /**
     * A passed unit test (the web's `passUnitTest`): the unit's other lessons
     * count as done, with no attempts of their own, and its words not yet in
     * the deck join it as known, due over the next three weeks.
     */
    fun passUnitTest(unitLessons: List<PathLesson>, score: Double, now: Instant = Instant.now()) {
        val stamp = StudyDates.isoTimestamp(now)
        val today = StudyDates.today(now)
        val vocab = raw.obj("vocab").copy()
        val out = Path.testOut(unitLessons, done = lessons.keys, inDeck = vocab.keys.toSet())
        val best = min(1.0, max(0.0, score))
        val all = raw.obj("lessons").copy()
        for (id in out.lessonIds) {
            all[id] = JSONValue.encoding(serializer<LessonProgress>(), LessonProgress(stamp, stamp, best, 0))
        }
        raw["lessons"] = JSONValue.Obj(all)
        out.vocabIds.forEachIndexed { i, id ->
            vocab[id] = JSONValue.encoding(serializer<VocabCard>(), Path.knownCard(id, i, today))
        }
        raw["vocab"] = JSONValue.Obj(vocab)
    }

    fun setLearner(profile: LearnerProfile?) {
        raw["learner"] = profile?.toJson() ?: JSONValue.Null
    }

    /** Adds today to the streak calendar. */
    fun markStudied(now: Instant = Instant.now()) {
        val today = StudyDates.today(now)
        if (today in studyDays) return
        raw["studyDays"] = JSONValue.Arr((raw.array("studyDays") + JSONValue.Str(today)).takeLast(ProgressMerge.Caps.studyDays))
    }

    /* Export / import: the Settings backup file, same format as web */

    /** The JSON the web's Settings export writes, so a backup moves between the website and this app in either direction. */
    fun exportJson(now: Instant = Instant.now(), storeVersion: Int = 1): String =
        JSONValue.Obj(
            JSONObject(
                "app" to JSONValue.Str("ap-latin"),
                "version" to JSONValue.Num(storeVersion.toDouble()),
                "exportedAt" to JSONValue.Str(StudyDates.isoTimestamp(now)),
                "data" to JSONValue.Obj(raw),
            ),
        ).serialized()

    class ImportException(val reason: Reason) : Exception(reason.name) {
        enum class Reason { NotAnExport, Unreadable }
    }

    /* Helpers */

    private fun updatePassage(passageId: String, p: PassageState) {
        val records = raw.obj("passages").copy()
        val existing = records[passageId]
        records[passageId] = JSONValue.Obj((existing?.objectValue ?: JSONObject()).overlaid(p.toJson()))
        raw["passages"] = JSONValue.Obj(records)
    }

    /** Writes a typed record into a keyed collection, keeping any fields of the stored record the typed model doesn't know about. */
    private fun updateRecord(collection: String, key: String, value: JSONObject) {
        val records = raw.obj(collection).copy()
        records[key] = JSONValue.Obj((records[key]?.objectValue ?: JSONObject()).overlaid(value))
        raw[collection] = JSONValue.Obj(records)
    }

    private fun overlayInto(target: JSONObject, key: String, value: JSONValue) {
        val encoded = value.objectValue ?: return
        target[key] = JSONValue.Obj((target[key]?.objectValue ?: JSONObject()).overlaid(encoded))
    }

    companion object {
        /** What a brand-new student's progress looks like: `blankSyncableData()`. */
        fun blank(now: Instant = Instant.now(), prefersDark: Boolean = false): ProgressDocument {
            val raw = blankRaw(now)
            raw["theme"] = JSONValue.Str(if (prefersDark) "dark" else "light")
            return ProgressDocument(raw, now)
        }

        internal fun blankRaw(now: Instant): JSONObject = JSONObject(
            "theme" to JSONValue.Str("light"),
            "glossaryEnabled" to JSONValue.Bool(true),
            "showMacrons" to JSONValue.Bool(true),
            "passages" to JSONValue.Obj(JSONObject()),
            "vocab" to JSONValue.Obj(JSONObject()),
            "quizAttempts" to JSONValue.Arr(emptyList()),
            "reviewQueue" to JSONValue.Arr(emptyList()),
            "translationAttempts" to JSONValue.Arr(emptyList()),
            "frqResponses" to JSONValue.Arr(emptyList()),
            "examResults" to JSONValue.Arr(emptyList()),
            "projectPassages" to JSONValue.Arr(emptyList()),
            "studyPlan" to jobj("minutesPerDay" to 30, "activeDays" to jarr(0, 1, 2, 3, 4, 5, 6), "startedAt" to StudyDates.today(now)),
            "studyDays" to JSONValue.Arr(emptyList()),
            "aiUsage" to JSONValue.Arr(emptyList()),
            "scansionAttempts" to JSONValue.Arr(emptyList()),
            "scansionDrafts" to JSONValue.Obj(JSONObject()),
            "wordEncounters" to JSONValue.Obj(JSONObject()),
            "lessons" to JSONValue.Obj(JSONObject()),
            "learner" to JSONValue.Null,
            "daily" to JSONValue.Obj(JSONObject()),
        )

        /** Reads a Settings export file. Like the web import, the file's fields replace this document's: it's a restore, not a merge. */
        fun importJson(text: String, now: Instant = Instant.now()): ProgressDocument {
            val parsed = runCatching { JSONValue.parse(text) }.getOrNull() ?: throw ImportException(ImportException.Reason.Unreadable)
            val data = parsed["data"]?.objectValue
            if (parsed["app"]?.stringValue != "ap-latin" || data == null) throw ImportException(ImportException.Reason.NotAnExport)
            return ProgressDocument(data, now)
        }

        private const val ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz"

        /** The web store's `uid()`: random base-36 plus the time in base 36. */
        fun uid(now: Instant): String {
            val random = (0 until 8).map { ALPHABET[kotlin.random.Random.nextInt(ALPHABET.length)] }.joinToString("")
            return random + now.toEpochMilli().toString(36)
        }
    }

    private fun uid(now: Instant) = Companion.uid(now)
}
