import Foundation

public struct JSONParseError: Error, CustomStringConvertible, Sendable {
    public let message: String
    public let offset: Int
    public var description: String { "JSON parse error at byte \(offset): \(message)" }
}

/* ------------------------------------------------------------------ */
/* Parsing                                                             */
/* ------------------------------------------------------------------ */

public extension JSONValue {
    static func parse(_ text: String) throws -> JSONValue {
        try parse(Data(text.utf8))
    }

    /// Parses JSON keeping every object's key order — which Foundation's own
    /// `JSONSerialization` and `JSONDecoder` do not promise.
    static func parse(_ data: Data) throws -> JSONValue {
        try data.withUnsafeBytes { raw in
            var parser = Parser(bytes: raw.bindMemory(to: UInt8.self))
            parser.skipWhitespace()
            let value = try parser.parseValue(depth: 0)
            parser.skipWhitespace()
            guard parser.atEnd else { throw parser.error("trailing characters") }
            return value
        }
    }
}

private struct Parser {
    let bytes: UnsafeBufferPointer<UInt8>
    var i = 0

    init(bytes: UnsafeBufferPointer<UInt8>) { self.bytes = bytes }

    var atEnd: Bool { i >= bytes.count }

    func error(_ message: String) -> JSONParseError { JSONParseError(message: message, offset: i) }

    mutating func skipWhitespace() {
        while i < bytes.count, [0x20, 0x09, 0x0A, 0x0D].contains(bytes[i]) { i += 1 }
    }

    mutating func expect(_ literal: StaticString) throws {
        let lit = UnsafeBufferPointer(start: literal.utf8Start, count: literal.utf8CodeUnitCount)
        guard i + lit.count <= bytes.count, zip(bytes[i..<i + lit.count], lit).allSatisfy({ $0 == $1 }) else {
            throw error("expected \(literal)")
        }
        i += lit.count
    }

    mutating func parseValue(depth: Int) throws -> JSONValue {
        guard depth < 512 else { throw error("nesting too deep") }
        guard i < bytes.count else { throw error("unexpected end of input") }
        switch bytes[i] {
        case UInt8(ascii: "{"): return .object(try parseObject(depth: depth))
        case UInt8(ascii: "["): return .array(try parseArray(depth: depth))
        case UInt8(ascii: "\""): return .string(try parseString())
        case UInt8(ascii: "t"): try expect("true"); return .bool(true)
        case UInt8(ascii: "f"): try expect("false"); return .bool(false)
        case UInt8(ascii: "n"): try expect("null"); return .null
        default: return .number(try parseNumber())
        }
    }

    mutating func parseObject(depth: Int) throws -> JSONObject {
        i += 1
        var object = JSONObject()
        skipWhitespace()
        if i < bytes.count, bytes[i] == UInt8(ascii: "}") { i += 1; return object }
        while true {
            skipWhitespace()
            guard i < bytes.count, bytes[i] == UInt8(ascii: "\"") else { throw error("expected object key") }
            let key = try parseString()
            skipWhitespace()
            guard i < bytes.count, bytes[i] == UInt8(ascii: ":") else { throw error("expected ':'") }
            i += 1
            skipWhitespace()
            // A repeated key keeps its first position and takes the last
            // value, exactly as JSON.parse does.
            object[key] = try parseValue(depth: depth + 1)
            skipWhitespace()
            guard i < bytes.count else { throw error("unterminated object") }
            if bytes[i] == UInt8(ascii: ",") { i += 1; continue }
            if bytes[i] == UInt8(ascii: "}") { i += 1; return object }
            throw error("expected ',' or '}'")
        }
    }

    mutating func parseArray(depth: Int) throws -> [JSONValue] {
        i += 1
        var array: [JSONValue] = []
        skipWhitespace()
        if i < bytes.count, bytes[i] == UInt8(ascii: "]") { i += 1; return array }
        while true {
            skipWhitespace()
            array.append(try parseValue(depth: depth + 1))
            skipWhitespace()
            guard i < bytes.count else { throw error("unterminated array") }
            if bytes[i] == UInt8(ascii: ",") { i += 1; continue }
            if bytes[i] == UInt8(ascii: "]") { i += 1; return array }
            throw error("expected ',' or ']'")
        }
    }

    mutating func parseNumber() throws -> Double {
        let start = i
        while i < bytes.count, "+-0123456789.eE".utf8.contains(bytes[i]) { i += 1 }
        guard i > start, let s = String(bytes: bytes[start..<i], encoding: .ascii), let n = Double(s) else {
            i = start
            throw error("invalid value")
        }
        return n
    }

    mutating func parseString() throws -> String {
        i += 1
        var out = [UInt8]()
        while true {
            guard i < bytes.count else { throw error("unterminated string") }
            let b = bytes[i]
            if b == UInt8(ascii: "\"") { i += 1; break }
            if b != UInt8(ascii: "\\") { out.append(b); i += 1; continue }
            i += 1
            guard i < bytes.count else { throw error("unterminated escape") }
            let e = bytes[i]
            i += 1
            switch e {
            case UInt8(ascii: "\""): out.append(0x22)
            case UInt8(ascii: "\\"): out.append(0x5C)
            case UInt8(ascii: "/"): out.append(0x2F)
            case UInt8(ascii: "b"): out.append(0x08)
            case UInt8(ascii: "f"): out.append(0x0C)
            case UInt8(ascii: "n"): out.append(0x0A)
            case UInt8(ascii: "r"): out.append(0x0D)
            case UInt8(ascii: "t"): out.append(0x09)
            case UInt8(ascii: "u"):
                var scalar = try parseHex4()
                if (0xD800...0xDBFF).contains(scalar),
                   i + 1 < bytes.count, bytes[i] == UInt8(ascii: "\\"), bytes[i + 1] == UInt8(ascii: "u")
                {
                    i += 2
                    let low = try parseHex4()
                    if (0xDC00...0xDFFF).contains(low) {
                        scalar = 0x10000 + ((scalar - 0xD800) << 10) + (low - 0xDC00)
                    } else {
                        out.append(contentsOf: Array("\u{FFFD}".utf8))
                        scalar = low
                    }
                }
                let u = Unicode.Scalar(scalar) ?? "\u{FFFD}"
                out.append(contentsOf: Array(String(u).utf8))
            default:
                throw error("invalid escape")
            }
        }
        return String(decoding: out, as: UTF8.self)
    }

    mutating func parseHex4() throws -> UInt32 {
        guard i + 4 <= bytes.count, let s = String(bytes: bytes[i..<i + 4], encoding: .ascii), let v = UInt32(s, radix: 16) else {
            throw error("invalid \\u escape")
        }
        i += 4
        return v
    }
}

/* ------------------------------------------------------------------ */
/* Serializing                                                         */
/* ------------------------------------------------------------------ */

public extension JSONValue {
    /// Compact JSON in the same shape `JSON.stringify` produces: object keys
    /// in their stored order, whole numbers without a decimal point, and
    /// non-ASCII text written as-is rather than escaped.
    func serialized() -> String {
        var out = ""
        out.reserveCapacity(256)
        write(to: &out)
        return out
    }

    private func write(to out: inout String) {
        switch self {
        case .null: out += "null"
        case .bool(let b): out += b ? "true" : "false"
        case .number(let n): out += JSONValue.format(n)
        case .string(let s): JSONValue.writeString(s, to: &out)
        case .array(let a):
            out += "["
            for (idx, v) in a.enumerated() {
                if idx > 0 { out += "," }
                v.write(to: &out)
            }
            out += "]"
        case .object(let o):
            out += "{"
            var first = true
            for (k, v) in o {
                if !first { out += "," }
                first = false
                JSONValue.writeString(k, to: &out)
                out += ":"
                v.write(to: &out)
            }
            out += "}"
        }
    }

    static func format(_ n: Double) -> String {
        guard n.isFinite else { return "null" }  // JSON.stringify(NaN) === "null"
        if n == n.rounded(), abs(n) < 1e15 { return String(Int64(n)) }
        return "\(n)"
    }

    private static func writeString(_ s: String, to out: inout String) {
        out += "\""
        for u in s.unicodeScalars {
            switch u {
            case "\"": out += "\\\""
            case "\\": out += "\\\\"
            case "\n": out += "\\n"
            case "\r": out += "\\r"
            case "\t": out += "\\t"
            case "\u{08}": out += "\\b"
            case "\u{0C}": out += "\\f"
            default:
                if u.value < 0x20 {
                    out += String(format: "\\u%04x", u.value)
                } else {
                    out.unicodeScalars.append(u)
                }
            }
        }
        out += "\""
    }
}
