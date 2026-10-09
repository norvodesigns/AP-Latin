package com.norvodesigns.lectio.core

import kotlin.math.max

/**
 * Combining two devices' progress: a port of src/lib/mergeProgress.ts.
 *
 * The synced document is a student's whole history, so every field merges in
 * whatever way loses no history rather than "newer side wins". History
 * (attempts, reviews, highlights, study days) is unioned; singleton settings
 * (theme, study plan, a passage's note and bookmark) go to the cloud when
 * `cloudIsNewer`.
 *
 * It works on [JSONObject] rather than typed models so it reproduces the
 * web's merge exactly, including the order-dependent parts, and so records
 * carrying fields this build doesn't know about pass through intact. The
 * parity fixtures hold it to the TypeScript output.
 */
object ProgressMerge {
    /** Caps mirroring the ones the web store applies when recording each kind of history. */
    object Caps {
        const val quizAttempts = 3000
        const val translationAttempts = 500
        const val frqResponses = 300
        const val scansionAttempts = 1000
        const val studyDays = 800
        const val scansionDrafts = 300
        const val aiUsage = 90
        const val daily = 400
    }

    /** The fields of `SyncableData`, in the order the web's merge writes them. */
    val knownKeys = listOf(
        "theme", "glossaryEnabled", "showMacrons", "studyPlan", "passages", "vocab", "quizAttempts",
        "reviewQueue", "translationAttempts", "frqResponses", "examResults", "projectPassages", "studyDays",
        "aiUsage", "scansionAttempts", "scansionDrafts", "wordEncounters", "lessons", "learner", "daily",
    )

    fun merge(local: JSONObject, cloud: JSONObject, cloudIsNewer: Boolean): JSONObject {
        val out = JSONObject()
        fun pick(key: String): JSONValue? = if (cloudIsNewer) cloud[key] else local[key]

        out["theme"] = pick("theme")
        out["glossaryEnabled"] = pick("glossaryEnabled")
        out["showMacrons"] = pick("showMacrons")
        out["studyPlan"] = pick("studyPlan")
        out["passages"] = JSONValue.Obj(mergePassages(local.obj("passages"), cloud.obj("passages"), cloudIsNewer))
        out["vocab"] = JSONValue.Obj(mergeVocab(local.obj("vocab"), cloud.obj("vocab")))
        out["quizAttempts"] = JSONValue.Arr(mergeById(local.array("quizAttempts"), cloud.array("quizAttempts"), Caps.quizAttempts))
        out["reviewQueue"] = JSONValue.Arr(mergeSet(local.array("reviewQueue"), cloud.array("reviewQueue")))
        out["translationAttempts"] = JSONValue.Arr(mergeById(local.array("translationAttempts"), cloud.array("translationAttempts"), Caps.translationAttempts))
        out["frqResponses"] = JSONValue.Arr(mergeById(local.array("frqResponses"), cloud.array("frqResponses"), Caps.frqResponses))
        out["examResults"] = JSONValue.Arr(mergeById(local.array("examResults"), cloud.array("examResults")))
        out["projectPassages"] = JSONValue.Arr(mergeById(local.array("projectPassages"), cloud.array("projectPassages")))
        out["studyDays"] = JSONValue.Arr(mergeSet(local.array("studyDays"), cloud.array("studyDays"), Caps.studyDays, sortAsDates = true))
        out["aiUsage"] = JSONValue.Arr(mergeAiUsage(local.array("aiUsage"), cloud.array("aiUsage")))
        out["scansionAttempts"] = JSONValue.Arr(mergeById(local.array("scansionAttempts"), cloud.array("scansionAttempts"), Caps.scansionAttempts))
        out["scansionDrafts"] = JSONValue.Obj(mergeScansionDrafts(local.obj("scansionDrafts"), cloud.obj("scansionDrafts")))
        out["wordEncounters"] = JSONValue.Obj(mergeWordEncounters(local.obj("wordEncounters"), cloud.obj("wordEncounters")))
        // Added with the course; either side may predate it.
        out["lessons"] = JSONValue.Obj(mergeLessons(local.obj("lessons"), cloud.obj("lessons")))
        val localLearner = local["learner"]?.takeIf { it != JSONValue.Null }
        val cloudLearner = cloud["learner"]?.takeIf { it != JSONValue.Null }
        out["learner"] = if (cloudIsNewer) (cloudLearner ?: localLearner ?: JSONValue.Null) else (localLearner ?: cloudLearner ?: JSONValue.Null)
        // Added with the Sententia of the day; either side may predate it.
        out["daily"] = JSONValue.Obj(mergeDaily(local.obj("daily"), cloud.obj("daily")))

        // Fields this build doesn't know about, added to the web app after it
        // shipped. Carried through (newer side first) so an older build never
        // deletes a newer web feature's data by syncing.
        val known = knownKeys.toSet()
        for ((key, value) in (if (cloudIsNewer) cloud else local)) if (key !in known) out[key] = value
        for ((key, value) in (if (cloudIsNewer) local else cloud)) if (key !in known && key !in out) out[key] = value
        return out
    }

    /* Arrays of records with their own id */

    /**
     * Union by `id`; on a collision the later `at` wins, else the first seen
     * stays. Re-sorted by `at` when every record has one, then capped to the
     * newest [cap].
     */
    internal fun mergeById(a: List<JSONValue>, b: List<JSONValue>, cap: Int? = null): List<JSONValue> {
        val byId = JSONObject()
        for (item in a) byId[item["id"]?.stringValue ?: ""] = item
        for (item in b) {
            val id = item["id"]?.stringValue ?: ""
            val existing = byId[id]
            if (existing == null) {
                byId[id] = item
                continue
            }
            val at = item["at"]?.stringValue
            val existingAt = existing["at"]?.stringValue
            if (at != null && existingAt != null && at > existingAt) byId[id] = item
        }
        var merged = byId.map { it.second }
        if (merged.all { it["at"]?.stringValue != null }) {
            merged = merged.sortedBy { it["at"]!!.stringValue!! } // sortedBy is stable
        }
        if (cap != null && merged.size > cap) merged = merged.takeLast(cap)
        return merged
    }

    /* Sets of primitives */

    internal fun mergeSet(a: List<JSONValue>, b: List<JSONValue>, cap: Int? = null, sortAsDates: Boolean = false): List<JSONValue> {
        val seen = HashSet<JSONValue>()
        var merged = (a + b).filter { seen.add(it) }
        if (sortAsDates) merged = merged.sortedBy { it.stringValue ?: "" }
        if (cap != null && merged.size > cap) merged = merged.takeLast(cap)
        return merged
    }

    /* Vocabulary */

    /** Per card, the side with more reviews wins; a tie goes to the later review. */
    internal fun mergeVocab(a: JSONObject, b: JSONObject): JSONObject {
        val out = a.copy()
        for ((id, cardB) in b) {
            val cardA = out[id]
            if (cardA == null) {
                out[id] = cardB
                continue
            }
            val reviewsA = cardA["reviews"]?.doubleValue ?: 0.0
            val reviewsB = cardB["reviews"]?.doubleValue ?: 0.0
            val bIsRicher = reviewsB > reviewsA ||
                (reviewsB == reviewsA && (cardB["lastReviewed"]?.stringValue ?: "") > (cardA["lastReviewed"]?.stringValue ?: ""))
            out[id] = if (bIsRicher) cardB else cardA
        }
        return out
    }

    /* Word encounters */

    /** Max of counts (not sum, so re-merging is idempotent), later `lastSeen`, union of passage ids. */
    internal fun mergeWordEncounters(a: JSONObject, b: JSONObject): JSONObject {
        val out = a.copy()
        for ((id, encB) in b) {
            val encA = out[id]
            if (encA == null) {
                out[id] = encB
                continue
            }
            val seenA = encA["lastSeen"]?.stringValue ?: ""
            val seenB = encB["lastSeen"]?.stringValue ?: ""
            out[id] = JSONValue.Obj(
                JSONObject(
                    "count" to JSONValue.Num(max(encA["count"]?.doubleValue ?: 0.0, encB["count"]?.doubleValue ?: 0.0)),
                    "lastSeen" to JSONValue.Str(if (seenA > seenB) seenA else seenB),
                    "passageIds" to JSONValue.Arr(mergeSet(encA["passageIds"]?.arrayValue ?: emptyList(), encB["passageIds"]?.arrayValue ?: emptyList())),
                ),
            )
        }
        return out
    }

    /* Sententia of the day */

    /** Per day: best score, earlier first time, the first side's line id; then the newest days. */
    internal fun mergeDaily(a: JSONObject, b: JSONObject): JSONObject {
        val out = a.copy()
        for ((day, rb) in b) {
            val ra = out[day]
            if (ra == null) {
                out[day] = rb
                continue
            }
            val atA = ra["at"]?.stringValue ?: ""
            val atB = rb["at"]?.stringValue ?: ""
            out[day] = JSONValue.Obj(
                JSONObject(
                    "id" to (ra["id"] ?: JSONValue.Str("")),
                    "score" to JSONValue.Num(max(ra["score"]?.doubleValue ?: 0.0, rb["score"]?.doubleValue ?: 0.0)),
                    "at" to JSONValue.Str(if (atA < atB) atA else atB),
                ),
            )
        }
        if (out.size <= Caps.daily) return out
        val keep = out.keys.sorted().takeLast(Caps.daily).toSet()
        val capped = JSONObject()
        for ((day, value) in out) if (day in keep) capped[day] = value
        return capped
    }

    /* Course lessons */

    /** Per lesson: earliest first completion, latest last one, best score, most attempts. */
    internal fun mergeLessons(a: JSONObject, b: JSONObject): JSONObject {
        val out = a.copy()
        for ((id, lb) in b) {
            val la = out[id]
            if (la == null) {
                out[id] = lb
                continue
            }
            val firstA = la["completedAt"]?.stringValue ?: ""
            val firstB = lb["completedAt"]?.stringValue ?: ""
            val lastA = la["lastAt"]?.stringValue ?: ""
            val lastB = lb["lastAt"]?.stringValue ?: ""
            out[id] = JSONValue.Obj(
                JSONObject(
                    "completedAt" to JSONValue.Str(if (firstA < firstB) firstA else firstB),
                    "lastAt" to JSONValue.Str(if (lastA > lastB) lastA else lastB),
                    "best" to JSONValue.Num(max(la["best"]?.doubleValue ?: 0.0, lb["best"]?.doubleValue ?: 0.0)),
                    "attempts" to JSONValue.Num(max(la["attempts"]?.doubleValue ?: 0.0, lb["attempts"]?.doubleValue ?: 0.0)),
                ),
            )
        }
        return out
    }

    /* AI usage */

    internal fun mergeAiUsage(a: List<JSONValue>, b: List<JSONValue>): List<JSONValue> {
        val byDate = JSONObject()
        for (day in a) byDate[day["date"]?.stringValue ?: ""] = day
        for (day in b) {
            val date = day["date"]?.stringValue ?: ""
            val existing = byDate[date]
            if (existing == null) {
                byDate[date] = day
                continue
            }
            val byRoute = (existing["byRoute"]?.objectValue ?: JSONObject()).copy()
            for ((route, n) in day["byRoute"]?.objectValue ?: JSONObject()) {
                byRoute[route] = JSONValue.Num(max(byRoute[route]?.doubleValue ?: 0.0, n.doubleValue ?: 0.0))
            }
            byDate[date] = JSONValue.Obj(
                JSONObject(
                    "date" to JSONValue.Str(date),
                    "calls" to JSONValue.Num(max(existing["calls"]?.doubleValue ?: 0.0, day["calls"]?.doubleValue ?: 0.0)),
                    "byRoute" to JSONValue.Obj(byRoute),
                ),
            )
        }
        val sorted = byDate.map { it.second }.sortedBy { it["date"]?.stringValue ?: "" }
        return sorted.takeLast(Caps.aiUsage)
    }

    /* Scansion drafts */

    /**
     * Per line, the draft with more progress wins (a checked line beats any
     * unchecked one). Capped by dropping the earliest-inserted lines.
     */
    internal fun mergeScansionDrafts(a: JSONObject, b: JSONObject): JSONObject {
        fun progress(d: JSONValue): Int {
            val marks = d["marks"]?.arrayValue?.count { it.isTruthy } ?: 0
            return marks + (if (d["checked"]?.isTruthy == true) 1000 else 0)
        }
        val out = a.copy()
        for ((lineId, draftB) in b) {
            val draftA = out[lineId]
            out[lineId] = if (draftA == null || progress(draftB) > progress(draftA)) draftB else draftA
        }
        if (out.size > Caps.scansionDrafts) out.removeFirst(out.size - Caps.scansionDrafts)
        return out
    }

    /* Passages */

    internal fun mergePassages(a: JSONObject, b: JSONObject, cloudIsNewer: Boolean): JSONObject {
        val out = a.copy()
        for ((id, pb) in b) {
            val pa = out[id]
            if (pa == null) {
                out[id] = pb
                continue
            }
            val merged = JSONObject()
            merged["notes"] = if (cloudIsNewer) pb["notes"] else pa["notes"]
            merged["bookmarked"] = if (cloudIsNewer) pb["bookmarked"] else pa["bookmarked"]
            val flags = mergeSet(pa["flaggedLines"]?.arrayValue ?: emptyList(), pb["flaggedLines"]?.arrayValue ?: emptyList())
            merged["flaggedLines"] = JSONValue.Arr(flags.sortedBy { it.doubleValue ?: 0.0 })
            merged["coldReads"] = JSONValue.Num(max(pa["coldReads"]?.doubleValue ?: 0.0, pb["coldReads"]?.doubleValue ?: 0.0))
            merged["lastOpened"] = laterOf(pa["lastOpened"]?.stringValue, pb["lastOpened"]?.stringValue)?.let { JSONValue.Str(it) }
            merged["annotations"] = JSONValue.Arr(mergeAnnotations(pa["annotations"]?.arrayValue ?: emptyList(), pb["annotations"]?.arrayValue ?: emptyList()))
            out[id] = JSONValue.Obj(merged)
        }
        return out
    }

    internal fun laterOf(a: String?, b: String?): String? {
        if (a == null) return b
        if (b == null) return a
        return if (a > b) a else b
    }

    /**
     * Annotations on the exact same span are one highlight even when made
     * independently on two devices: keep the one with a note, else the newer.
     */
    internal fun mergeAnnotations(a: List<JSONValue>, b: List<JSONValue>): List<JSONValue> {
        fun spanKey(x: JSONValue): String =
            "${JSONValue.format(x["lineN"]?.doubleValue ?: 0.0)}:${JSONValue.format(x["startTok"]?.doubleValue ?: 0.0)}:${JSONValue.format(x["endTok"]?.doubleValue ?: 0.0)}"
        fun hasNote(x: JSONValue): Boolean = (x["note"]?.stringValue ?: "").trim().isNotEmpty()
        val bySpan = JSONObject()
        for (ann in a + b) {
            val key = spanKey(ann)
            val existing = bySpan[key]
            if (existing == null) {
                bySpan[key] = ann
                continue
            }
            val winner = if (hasNote(ann) != hasNote(existing)) {
                if (hasNote(ann)) ann else existing
            } else {
                if ((ann["createdAt"]?.stringValue ?: "") > (existing["createdAt"]?.stringValue ?: "")) ann else existing
            }
            bySpan[key] = winner
        }
        return bySpan.map { it.second }.sortedWith { x, y ->
            val lx = x["lineN"]?.doubleValue ?: 0.0
            val ly = y["lineN"]?.doubleValue ?: 0.0
            if (lx != ly) lx.compareTo(ly) else (x["startTok"]?.doubleValue ?: 0.0).compareTo(y["startTok"]?.doubleValue ?: 0.0)
        }
    }
}
