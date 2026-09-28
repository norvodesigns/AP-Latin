import Foundation

/// Combining two devices' progress — a port of src/lib/mergeProgress.ts.
///
/// Read that file for the reasoning; in short, the synced document is a
/// student's whole history, so every field merges in whatever way loses no
/// history rather than "newer side wins". History (attempts, reviews,
/// highlights, study days) is unioned; singleton settings (theme, study plan,
/// a passage's note and bookmark) go to the cloud when `cloudIsNewer`.
///
/// It works on `JSONObject` rather than typed models so it reproduces the
/// web's merge exactly — including the order-dependent parts — and so records
/// carrying fields this build doesn't know about pass through intact. The
/// parity fixtures (scripts/export-merge-fixtures.ts) hold it to the
/// TypeScript output.
public enum ProgressMerge {
    /// Caps mirroring the ones the web store applies when recording each kind
    /// of history, so a merge never grows a list past what the store keeps.
    public enum Caps {
        public static let quizAttempts = 3000
        public static let translationAttempts = 500
        public static let frqResponses = 300
        public static let scansionAttempts = 1000
        public static let studyDays = 800
        public static let scansionDrafts = 300
        public static let aiUsage = 90
    }

    /// The fields of `SyncableData`, in the order the web's merge writes them.
    public static let knownKeys = [
        "theme", "glossaryEnabled", "showMacrons", "studyPlan", "passages", "vocab", "quizAttempts",
        "reviewQueue", "translationAttempts", "frqResponses", "examResults", "projectPassages", "studyDays",
        "aiUsage", "scansionAttempts", "scansionDrafts", "wordEncounters",
    ]

    public static func merge(local: JSONObject, cloud: JSONObject, cloudIsNewer: Bool) -> JSONObject {
        var out = JSONObject()
        let pick = { (key: String) -> JSONValue? in cloudIsNewer ? cloud[key] : local[key] }

        out["theme"] = pick("theme")
        out["glossaryEnabled"] = pick("glossaryEnabled")
        out["showMacrons"] = pick("showMacrons")
        out["studyPlan"] = pick("studyPlan")
        out["passages"] = .object(mergePassages(local.object("passages"), cloud.object("passages"), cloudIsNewer: cloudIsNewer))
        out["vocab"] = .object(mergeVocab(local.object("vocab"), cloud.object("vocab")))
        out["quizAttempts"] = .array(mergeById(local.array("quizAttempts"), cloud.array("quizAttempts"), cap: Caps.quizAttempts))
        out["reviewQueue"] = .array(mergeSet(local.array("reviewQueue"), cloud.array("reviewQueue")))
        out["translationAttempts"] = .array(mergeById(local.array("translationAttempts"), cloud.array("translationAttempts"), cap: Caps.translationAttempts))
        out["frqResponses"] = .array(mergeById(local.array("frqResponses"), cloud.array("frqResponses"), cap: Caps.frqResponses))
        out["examResults"] = .array(mergeById(local.array("examResults"), cloud.array("examResults")))
        out["projectPassages"] = .array(mergeById(local.array("projectPassages"), cloud.array("projectPassages")))
        out["studyDays"] = .array(mergeSet(local.array("studyDays"), cloud.array("studyDays"), cap: Caps.studyDays, sortAsDates: true))
        out["aiUsage"] = .array(mergeAiUsage(local.array("aiUsage"), cloud.array("aiUsage")))
        out["scansionAttempts"] = .array(mergeById(local.array("scansionAttempts"), cloud.array("scansionAttempts"), cap: Caps.scansionAttempts))
        out["scansionDrafts"] = .object(mergeScansionDrafts(local.object("scansionDrafts"), cloud.object("scansionDrafts")))
        out["wordEncounters"] = .object(mergeWordEncounters(local.object("wordEncounters"), cloud.object("wordEncounters")))

        // Fields this build doesn't know about — added to the web app after it
        // shipped. The web's own merge lists its fields explicitly, so it would
        // drop these; here they're carried through (newer side first) so an
        // older iOS build never deletes a newer web feature's data by syncing.
        let known = Set(knownKeys)
        for (key, value) in (cloudIsNewer ? cloud : local) where !known.contains(key) { out[key] = value }
        for (key, value) in (cloudIsNewer ? local : cloud) where !known.contains(key) && !out.contains(key) { out[key] = value }
        return out
    }

    /* -------------------------------------------------------------- */
    /* Arrays of records with their own id                             */
    /* -------------------------------------------------------------- */

    /// Union by `id`; on a collision the later `at` wins, else the first seen
    /// stays. Re-sorted by `at` when every record has one, then capped to the
    /// newest `cap`.
    static func mergeById(_ a: [JSONValue], _ b: [JSONValue], cap: Int? = nil) -> [JSONValue] {
        var byId = JSONObject()
        for item in a { byId[item["id"]?.stringValue ?? ""] = item }
        for item in b {
            let id = item["id"]?.stringValue ?? ""
            guard let existing = byId[id] else {
                byId[id] = item
                continue
            }
            if let at = item["at"]?.stringValue, let existingAt = existing["at"]?.stringValue, at > existingAt {
                byId[id] = item
            }
        }
        var merged = byId.map { $0.value }
        if merged.allSatisfy({ $0["at"]?.stringValue != nil }) {
            merged = stableSorted(merged) { $0["at"]!.stringValue! < $1["at"]!.stringValue! }
        }
        if let cap, merged.count > cap { merged = Array(merged.suffix(cap)) }
        return merged
    }

    /* -------------------------------------------------------------- */
    /* Sets of primitives                                              */
    /* -------------------------------------------------------------- */

    static func mergeSet(_ a: [JSONValue], _ b: [JSONValue], cap: Int? = nil, sortAsDates: Bool = false) -> [JSONValue] {
        var seen = Set<JSONValue>()
        var merged = (a + b).filter { seen.insert($0).inserted }
        if sortAsDates { merged = stableSorted(merged) { ($0.stringValue ?? "") < ($1.stringValue ?? "") } }
        if let cap, merged.count > cap { merged = Array(merged.suffix(cap)) }
        return merged
    }

    /* -------------------------------------------------------------- */
    /* Vocabulary                                                       */
    /* -------------------------------------------------------------- */

    /// Per card, the side with more reviews wins; a tie goes to the later review.
    static func mergeVocab(_ a: JSONObject, _ b: JSONObject) -> JSONObject {
        var out = a
        for (id, cardB) in b {
            guard let cardA = out[id] else {
                out[id] = cardB
                continue
            }
            let reviewsA = cardA["reviews"]?.doubleValue ?? 0
            let reviewsB = cardB["reviews"]?.doubleValue ?? 0
            let bIsRicher = reviewsB > reviewsA
                || (reviewsB == reviewsA && (cardB["lastReviewed"]?.stringValue ?? "") > (cardA["lastReviewed"]?.stringValue ?? ""))
            out[id] = bIsRicher ? cardB : cardA
        }
        return out
    }

    /* -------------------------------------------------------------- */
    /* Word encounters                                                 */
    /* -------------------------------------------------------------- */

    /// Max of counts (not sum, so re-merging is idempotent), later `lastSeen`,
    /// union of passage ids.
    static func mergeWordEncounters(_ a: JSONObject, _ b: JSONObject) -> JSONObject {
        var out = a
        for (id, encB) in b {
            guard let encA = out[id] else {
                out[id] = encB
                continue
            }
            let seenA = encA["lastSeen"]?.stringValue ?? ""
            let seenB = encB["lastSeen"]?.stringValue ?? ""
            out[id] = .object(JSONObject([
                ("count", .number(max(encA["count"]?.doubleValue ?? 0, encB["count"]?.doubleValue ?? 0))),
                ("lastSeen", .string(seenA > seenB ? seenA : seenB)),
                ("passageIds", .array(mergeSet(encA["passageIds"]?.arrayValue ?? [], encB["passageIds"]?.arrayValue ?? []))),
            ]))
        }
        return out
    }

    /* -------------------------------------------------------------- */
    /* AI usage                                                         */
    /* -------------------------------------------------------------- */

    static func mergeAiUsage(_ a: [JSONValue], _ b: [JSONValue]) -> [JSONValue] {
        var byDate = JSONObject()
        for day in a { byDate[day["date"]?.stringValue ?? ""] = day }
        for day in b {
            let date = day["date"]?.stringValue ?? ""
            guard let existing = byDate[date] else {
                byDate[date] = day
                continue
            }
            var byRoute = existing["byRoute"]?.objectValue ?? JSONObject()
            for (route, n) in day["byRoute"]?.objectValue ?? JSONObject() {
                byRoute[route] = .number(max(byRoute[route]?.doubleValue ?? 0, n.doubleValue ?? 0))
            }
            byDate[date] = .object(JSONObject([
                ("date", .string(date)),
                ("calls", .number(max(existing["calls"]?.doubleValue ?? 0, day["calls"]?.doubleValue ?? 0))),
                ("byRoute", .object(byRoute)),
            ]))
        }
        let sorted = stableSorted(byDate.map { $0.value }) { ($0["date"]?.stringValue ?? "") < ($1["date"]?.stringValue ?? "") }
        return Array(sorted.suffix(Caps.aiUsage))
    }

    /* -------------------------------------------------------------- */
    /* Scansion drafts                                                  */
    /* -------------------------------------------------------------- */

    /// Per line, the draft with more progress wins (a checked line beats any
    /// unchecked one). Capped by dropping the earliest-inserted lines.
    static func mergeScansionDrafts(_ a: JSONObject, _ b: JSONObject) -> JSONObject {
        func progress(_ d: JSONValue) -> Int {
            let marks = d["marks"]?.arrayValue?.filter(\.isTruthy).count ?? 0
            return marks + ((d["checked"]?.isTruthy ?? false) ? 1000 : 0)
        }
        var out = a
        for (lineId, draftB) in b {
            let draftA = out[lineId]
            out[lineId] = draftA == nil || progress(draftB) > progress(draftA!) ? draftB : draftA
        }
        if out.count > Caps.scansionDrafts { out.removeFirst(out.count - Caps.scansionDrafts) }
        return out
    }

    /* -------------------------------------------------------------- */
    /* Passages                                                         */
    /* -------------------------------------------------------------- */

    static func mergePassages(_ a: JSONObject, _ b: JSONObject, cloudIsNewer: Bool) -> JSONObject {
        var out = a
        for (id, pb) in b {
            guard let pa = out[id] else {
                out[id] = pb
                continue
            }
            var merged = JSONObject()
            merged["notes"] = cloudIsNewer ? pb["notes"] : pa["notes"]
            merged["bookmarked"] = cloudIsNewer ? pb["bookmarked"] : pa["bookmarked"]
            let flags = mergeSet(pa["flaggedLines"]?.arrayValue ?? [], pb["flaggedLines"]?.arrayValue ?? [])
            merged["flaggedLines"] = .array(stableSorted(flags) { ($0.doubleValue ?? 0) < ($1.doubleValue ?? 0) })
            merged["coldReads"] = .number(max(pa["coldReads"]?.doubleValue ?? 0, pb["coldReads"]?.doubleValue ?? 0))
            merged["lastOpened"] = laterOf(pa["lastOpened"]?.stringValue, pb["lastOpened"]?.stringValue).map(JSONValue.string)
            merged["annotations"] = .array(mergeAnnotations(pa["annotations"]?.arrayValue ?? [], pb["annotations"]?.arrayValue ?? []))
            out[id] = .object(merged)
        }
        return out
    }

    static func laterOf(_ a: String?, _ b: String?) -> String? {
        guard let a else { return b }
        guard let b else { return a }
        return a > b ? a : b
    }

    /// Annotations on the exact same span are one highlight even when made
    /// independently on two devices: keep the one with a note, else the newer.
    static func mergeAnnotations(_ a: [JSONValue], _ b: [JSONValue]) -> [JSONValue] {
        func spanKey(_ x: JSONValue) -> String {
            "\(JSONValue.format(x["lineN"]?.doubleValue ?? 0)):\(JSONValue.format(x["startTok"]?.doubleValue ?? 0)):\(JSONValue.format(x["endTok"]?.doubleValue ?? 0))"
        }
        func hasNote(_ x: JSONValue) -> Bool {
            !(x["note"]?.stringValue ?? "").trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        }
        var bySpan = JSONObject()
        for ann in a + b {
            let key = spanKey(ann)
            guard let existing = bySpan[key] else {
                bySpan[key] = ann
                continue
            }
            let winner: JSONValue
            if hasNote(ann) != hasNote(existing) {
                winner = hasNote(ann) ? ann : existing
            } else {
                winner = (ann["createdAt"]?.stringValue ?? "") > (existing["createdAt"]?.stringValue ?? "") ? ann : existing
            }
            bySpan[key] = winner
        }
        return stableSorted(bySpan.map { $0.value }) { x, y in
            let lx = x["lineN"]?.doubleValue ?? 0, ly = y["lineN"]?.doubleValue ?? 0
            if lx != ly { return lx < ly }
            return (x["startTok"]?.doubleValue ?? 0) < (y["startTok"]?.doubleValue ?? 0)
        }
    }

    /* -------------------------------------------------------------- */
    /* Helpers                                                          */
    /* -------------------------------------------------------------- */

    /// A sort that keeps equal elements in their original order, as
    /// JavaScript's `Array.prototype.sort` guarantees and Swift's `sort`
    /// does not promise.
    static func stableSorted<T>(_ items: [T], by less: (T, T) -> Bool) -> [T] {
        items.enumerated()
            .sorted { l, r in less(l.element, r.element) || (!less(r.element, l.element) && l.offset < r.offset) }
            .map(\.element)
    }
}

extension JSONObject {
    func object(_ key: String) -> JSONObject { self[key]?.objectValue ?? JSONObject() }
    func array(_ key: String) -> [JSONValue] { self[key]?.arrayValue ?? [] }
}
