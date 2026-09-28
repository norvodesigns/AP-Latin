import Foundation
@testable import LectioCore

/// Test files locate the repo's generated data relative to themselves, so the
/// suite runs the same from Xcode, `swift test`, or CI without bundling.
enum Paths {
    static let testsDir = URL(fileURLWithPath: #filePath).deletingLastPathComponent()
    static let fixtures = testsDir.appendingPathComponent("Fixtures")
    /// ios/Content — written by `npm run export:content`.
    static let content = testsDir
        .deletingLastPathComponent()  // Tests
        .deletingLastPathComponent()  // LectioCore
        .deletingLastPathComponent()  // ios
        .appendingPathComponent("Content")

    static func fixture(_ name: String) throws -> JSONValue {
        try JSONValue.parse(Data(contentsOf: fixtures.appendingPathComponent(name)))
    }
}

/// A UTC Gregorian calendar — the fixtures were generated with TZ=UTC.
let utc: Calendar = {
    var c = Calendar(identifier: .gregorian)
    c.timeZone = TimeZone(identifier: "UTC")!
    return c
}()

func parseISO(_ s: String) -> Date {
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return f.date(from: s)!
}

/// Describes the first difference between two JSON values, or nil when they
/// match — for failure messages more useful than two 400 KB dumps.
func firstDifference(_ a: JSONValue, _ b: JSONValue, path: String = "$") -> String? {
    switch (a, b) {
    case (.object(let x), .object(let y)):
        for key in Set(x.keys).union(y.keys).sorted() {
            guard let xv = x[key] else { return "\(path).\(key): missing on the left" }
            guard let yv = y[key] else { return "\(path).\(key): missing on the right" }
            if let d = firstDifference(xv, yv, path: "\(path).\(key)") { return d }
        }
        return nil
    case (.array(let x), .array(let y)):
        guard x.count == y.count else { return "\(path): \(x.count) items vs \(y.count)" }
        for (i, (xv, yv)) in zip(x, y).enumerated() {
            if let d = firstDifference(xv, yv, path: "\(path)[\(i)]") { return d }
        }
        return nil
    default:
        return a == b ? nil : "\(path): \(a.serialized()) vs \(b.serialized())"
    }
}
