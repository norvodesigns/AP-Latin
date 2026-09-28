import Foundation

/// A JSON value whose objects remember their key order.
///
/// The student's progress is synced as one JSON document shared with the web
/// app, and two things about it rule out decoding it straight into Swift
/// structs and dictionaries:
///
/// - **Key order carries meaning.** The web store caps `scansionDrafts` by
///   dropping the *earliest-inserted* keys (JavaScript objects iterate in
///   insertion order). A Swift `Dictionary` has no order, so a port built on
///   one would evict different drafts than the web does.
/// - **Fields this app doesn't know about must survive.** When the web app
///   grows a new field, an older iOS build that decoded into fixed structs
///   and re-encoded would silently delete it on its next push.
///
/// So the sync layer works on `JSONValue` directly, and typed models are
/// decoded from it only where the UI needs them.
public enum JSONValue: Sendable, Hashable {
    case null
    case bool(Bool)
    case number(Double)
    case string(String)
    case array([JSONValue])
    case object(JSONObject)
}

/// A JSON object that iterates in insertion order, like a JavaScript object
/// with string keys: assigning to an existing key keeps its position, a new
/// key goes to the end, and removing a key closes the gap.
public struct JSONObject: Sendable, Hashable, Sequence {
    public private(set) var keys: [String] = []
    private var storage: [String: JSONValue] = [:]

    public init() {}

    public init(_ pairs: [(String, JSONValue)]) {
        for (k, v) in pairs { self[k] = v }
    }

    public var count: Int { keys.count }
    public var isEmpty: Bool { keys.isEmpty }

    public subscript(key: String) -> JSONValue? {
        get { storage[key] }
        set {
            if let newValue {
                if storage.updateValue(newValue, forKey: key) == nil { keys.append(key) }
            } else if storage.removeValue(forKey: key) != nil {
                keys.removeAll { $0 == key }
            }
        }
    }

    public func contains(_ key: String) -> Bool { storage[key] != nil }

    /// Drops the first `n` keys in iteration order.
    public mutating func removeFirst(_ n: Int) {
        guard n > 0 else { return }
        for key in keys.prefix(n) { storage.removeValue(forKey: key) }
        keys.removeFirst(Swift.min(n, keys.count))
    }

    public func makeIterator() -> AnyIterator<(key: String, value: JSONValue)> {
        var i = 0
        return AnyIterator {
            guard i < keys.count else { return nil }
            defer { i += 1 }
            let k = keys[i]
            return (k, storage[k]!)
        }
    }

    /// Structural equality, blind to key order — two objects holding the
    /// same keys and values are equal however they were built.
    public static func == (lhs: JSONObject, rhs: JSONObject) -> Bool {
        lhs.storage == rhs.storage
    }

    public func hash(into hasher: inout Hasher) {
        hasher.combine(storage)
    }
}

/* ------------------------------------------------------------------ */
/* Accessors                                                           */
/* ------------------------------------------------------------------ */

public extension JSONValue {
    var stringValue: String? { if case .string(let s) = self { s } else { nil } }
    var doubleValue: Double? { if case .number(let n) = self { n } else { nil } }
    var intValue: Int? { doubleValue.map { Int($0) } }
    var boolValue: Bool? { if case .bool(let b) = self { b } else { nil } }
    var arrayValue: [JSONValue]? { if case .array(let a) = self { a } else { nil } }
    var objectValue: JSONObject? { if case .object(let o) = self { o } else { nil } }

    /// JavaScript truthiness, for ports of `filter(Boolean)` and friends.
    var isTruthy: Bool {
        switch self {
        case .null: false
        case .bool(let b): b
        case .number(let n): n != 0 && !n.isNaN
        case .string(let s): !s.isEmpty
        case .array, .object: true
        }
    }

    subscript(key: String) -> JSONValue? { objectValue?[key] }
}

extension JSONValue: ExpressibleByStringLiteral, ExpressibleByIntegerLiteral, ExpressibleByFloatLiteral,
    ExpressibleByBooleanLiteral, ExpressibleByArrayLiteral, ExpressibleByDictionaryLiteral, ExpressibleByNilLiteral
{
    public init(stringLiteral value: String) { self = .string(value) }
    public init(integerLiteral value: Int) { self = .number(Double(value)) }
    public init(floatLiteral value: Double) { self = .number(value) }
    public init(booleanLiteral value: Bool) { self = .bool(value) }
    public init(arrayLiteral elements: JSONValue...) { self = .array(elements) }
    public init(dictionaryLiteral elements: (String, JSONValue)...) { self = .object(JSONObject(elements)) }
    public init(nilLiteral: ()) { self = .null }
}

/* ------------------------------------------------------------------ */
/* Bridging to Codable                                                 */
/* ------------------------------------------------------------------ */

public extension JSONValue {
    /// Decodes a typed model from this value.
    func decode<T: Decodable>(_ type: T.Type = T.self) throws -> T {
        try JSONDecoder().decode(T.self, from: Data(serialized().utf8))
    }

    /// Encodes a typed model into a value. Keys come out sorted, which is
    /// fine: nothing reads meaning into the order of a single record's own
    /// fields, only into the order of a collection's keys.
    init<T: Encodable>(encoding value: T) throws {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys, .withoutEscapingSlashes]
        self = try JSONValue.parse(encoder.encode(value))
    }
}

public extension JSONObject {
    /// This object with every field of `other` written over it — how a typed
    /// edit is applied to a stored record without dropping fields the typed
    /// model doesn't know about.
    func overlaid(with other: JSONObject) -> JSONObject {
        var out = self
        for (k, v) in other { out[k] = v }
        return out
    }
}
