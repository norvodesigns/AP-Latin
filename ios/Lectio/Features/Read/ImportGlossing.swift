import CoreGraphics
import Foundation
import ImageIO
import LectioCore
import UIKit
import Vision

/// Bringing a text into the Reading Room, as the website does
/// (src/app/read/import): the page read off a photo, on the phone, then
/// glossed by the website's /api/ai/gloss-text route (Lectio's dictionary
/// first, then the AI for each word the dictionary has no exact entry for).
/// The app has no dictionary engine of its own, so glossing needs a
/// connection; reading the text afterwards does not.
enum ImportGlossing {
    /// The route's limits (IMPORT_LIMITS in src/lib/imports.ts).
    static let maxCharacters = 6_000
    static let maxTitle = 120
    static let maxAuthor = 80
    static let maxSource = 160

    /// What the route sends back.
    struct Reply: Sendable {
        var lines: [ImportedLine]
        var words: [String: ImportedWord]
        /// Words the AI glossed this time (0 when it was off or failed).
        var aiGlossed: Int
        /// Why the AI glossed nothing, or less than asked, written for the reader.
        var aiError: String?
        /// The glosses came from the server's cache, so no AI call was spent.
        var cached: Bool
    }

    /// POSTs to gloss-text. `fields` is the route's body: `text`, `layout`
    /// and `startAt` for a new text, or `lines` and `only` to gloss the rest.
    static func gloss(_ fields: JSONObject, client: AIClient) async throws -> Reply {
        let json = try await client.post("gloss-text", .object(fields))
        let lines: [ImportedLine] = (try? json["lines"]?.decode()) ?? []
        // Word by word, so one the app can't read costs only that word.
        var words: [String: ImportedWord] = [:]
        for (word, value) in json["words"]?.objectValue ?? JSONObject() {
            if let found: ImportedWord = try? value.decode() { words[word] = found }
        }
        let ai = json["ai"]
        return Reply(
            lines: lines,
            words: words,
            aiGlossed: ai?["glossed"]?.intValue ?? 0,
            aiError: ai?["error"]?.stringValue,
            cached: ai?["cached"]?.boolValue ?? false
        )
    }

    /// "Gloss the rest": asks again for the words of an imported text still
    /// without a gloss, and stores what comes back with the text. Returns a
    /// message for the reader when nothing (or not everything) was glossed.
    @MainActor
    static func glossRest(_ text: ImportedText, model: AppModel) async -> String? {
        let only = text.unglossedWords
        guard !only.isEmpty else { return nil }
        let fields = JSONObject([
            ("lines", .array(text.lines.map { line -> JSONValue in
                .object(JSONObject([("n", .number(Double(line.n))), ("latin", .string(line.latin))]))
            })),
            ("only", .array(only.map { JSONValue.string($0) })),
        ])
        do {
            let reply = try await gloss(fields, client: model.ai)
            var words = text.words
            for (w, found) in reply.words {
                var merged = words[w] ?? ImportedWord()
                if let g = found.g { merged.g = g }
                if let ai = found.ai { merged.ai = ai }
                words[w] = merged
            }
            model.update {
                if reply.aiGlossed > 0, !reply.cached { $0.recordAiCall(route: "gloss-text") }
                $0.updateImportedText(text.id, words: words)
            }
            if let error = reply.aiError { return error }
            return reply.aiGlossed == 0 ? "The AI had nothing to add for those words." : nil
        } catch let failure as AIClient.Failure {
            return failure.message
        } catch {
            return "Couldn't reach Lectio to gloss the rest. Check your connection and try again."
        }
    }

    /// A title from the first words, when the reader gives none (the web's
    /// `defaultTitle`).
    static func defaultTitle(_ lines: [ImportedLine]) -> String {
        let words = (lines.first?.latin ?? "").split(whereSeparator: \.isWhitespace).map(String.init)
        var head = words.prefix(5).joined(separator: " ")
        while let last = head.last, ",;:.?!".contains(last) { head.removeLast() }
        if words.count > 5 { return head + "…" }
        return head.isEmpty ? "Untitled text" : head
    }

    /// Short lines, most of them: verse (the web import's guess).
    static func looksLikeVerse(_ text: String) -> Bool {
        let lines = text.split(separator: "\n").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
        guard lines.count >= 3 else { return false }
        let short = lines.filter { $0.count <= 80 }.count
        return Double(short) / Double(lines.count) >= 0.85
    }

    static func wordCount(_ text: String) -> Int {
        text.split(whereSeparator: { !$0.isLetter }).count
    }
}

/* ------------------------------------------------------------------ */
/* Reading a page                                                      */
/* ------------------------------------------------------------------ */

/// The text on a photographed page, read on the phone with Vision, so the
/// photo never leaves it.
nonisolated enum PageReader {
    struct Page: Sendable {
        var text: String
        /// The number of the page's first line, when the margin numbers it.
        var firstLine: Int?
    }

    static func read(_ image: UIImage) async throws -> Page {
        guard let cg = image.cgImage else { return Page(text: "", firstLine: nil) }
        let orientation = CGImagePropertyOrientation(image.imageOrientation)
        // A CGImage never changes once made, so handing it to the reading
        // task is safe.
        let photo = Unchanging(value: cg)
        return try await Task.detached(priority: .userInitiated) {
            try read(photo.value, orientation: orientation)
        }.value
    }

    private struct Unchanging<T>: @unchecked Sendable { let value: T }

    static func read(_ image: CGImage, orientation: CGImagePropertyOrientation) throws -> Page {
        let request = VNRecognizeTextRequest()
        request.recognitionLevel = .accurate
        // Language correction "fixes" Latin into the nearest modern word.
        request.usesLanguageCorrection = false
        // There is no Latin model; Italian and Spanish read its letters and
        // accents best, and English is always there.
        if let supported = try? request.supportedRecognitionLanguages() {
            let wanted = ["la", "it-IT", "es-ES", "fr-FR", "en-US"].filter(supported.contains)
            if !wanted.isEmpty { request.recognitionLanguages = wanted }
        }
        try VNImageRequestHandler(cgImage: image, orientation: orientation).perform([request])
        let found = (request.results ?? []).compactMap { o -> (text: String, box: CGRect)? in
            guard let s = o.topCandidates(1).first?.string.trimmingCharacters(in: .whitespaces), !s.isEmpty else { return nil }
            return (s, o.boundingBox)
        }
        return assemble(found)
    }

    /// The page's lines in reading order, with the margin's line numbers
    /// taken off (and used for the first line's number), and a word broken
    /// across two lines of prose joined again.
    static func assemble(_ found: [(text: String, box: CGRect)]) -> Page {
        let isNumber = { (s: String) in s.allSatisfy(\.isNumber) && s.count <= 4 }
        // Top of the page first (Vision's origin is the bottom left).
        let text = found.filter { !isNumber($0.text) }.sorted { $0.box.midY > $1.box.midY }
        let numbers = found.filter { isNumber($0.text) }

        // A margin number sits on the line it numbers: the first line's number
        // is that number less the lines above it. The commonest answer wins.
        var votes: [Int: Int] = [:]
        for number in numbers {
            guard let n = Int(number.text), n > 0,
                  let k = text.indices.min(by: { abs(text[$0].box.midY - number.box.midY) < abs(text[$1].box.midY - number.box.midY) }),
                  abs(text[k].box.midY - number.box.midY) < max(text[k].box.height, number.box.height) * 0.6,
                  n - k > 0 else { continue }
            votes[n - k, default: 0] += 1
        }
        let firstLine = votes.max { ($0.value, -$0.key) < ($1.value, -$1.key) }?.key

        var lines: [String] = []
        for piece in text.map(\.text) {
            if let last = lines.last, last.hasSuffix("-"), let next = piece.first, next.isLowercase {
                lines[lines.count - 1] = String(last.dropLast()) + piece
            } else {
                lines.append(piece)
            }
        }
        return Page(text: lines.joined(separator: "\n"), firstLine: firstLine)
    }
}

private extension CGImagePropertyOrientation {
    init(_ o: UIImage.Orientation) {
        switch o {
        case .up: self = .up
        case .down: self = .down
        case .left: self = .left
        case .right: self = .right
        case .upMirrored: self = .upMirrored
        case .downMirrored: self = .downMirrored
        case .leftMirrored: self = .leftMirrored
        case .rightMirrored: self = .rightMirrored
        @unknown default: self = .up
        }
    }
}
