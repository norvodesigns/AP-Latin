import Foundation
import LectioCore

/// Calls the website's own AI routes (src/app/api/ai/*). The provider keys
/// never leave the web server; the app sends exactly what the website's
/// client sends and gets the same answers, rate limits and error messages.
nonisolated struct AIClient: Sendable {
    let baseURL: URL

    init(baseURL: URL = AppConfig.webBaseURL) {
        self.baseURL = baseURL
    }

    /// A failure the route explained, e.g. a rate limit. `message` is written
    /// for the student and is always safe to show as-is.
    struct Failure: Error, Sendable {
        let message: String
        let retryAfterSeconds: Int?
    }

    /// Whether any AI provider is configured on the server, or nil when the
    /// server couldn't be asked. Every AI surface checks this first so it can
    /// show its self-graded path immediately instead of a button that fails.
    func isConfigured() async -> Bool? {
        var request = URLRequest(url: route("status"))
        request.timeoutInterval = 15
        guard let (data, response) = try? await URLSession.shared.data(for: request),
              (response as? HTTPURLResponse)?.statusCode == 200,
              let json = try? JSONValue.parse(data),
              let configured = json["configured"]?.boolValue
        else { return nil }
        return configured
    }

    /// POSTs to a JSON route (grading, sight generation) and returns its JSON.
    func post(_ name: String, _ body: JSONValue) async throws -> JSONValue {
        let (data, response) = try await URLSession.shared.data(for: request(name, body))
        let json = (try? JSONValue.parse(data)) ?? .null
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(status) else { throw Self.failure(from: json, status: status) }
        return json
    }

    /// POSTs to a streaming route ("ask") and yields the answer as it arrives.
    func stream(_ name: String, _ body: JSONValue) -> AsyncThrowingStream<String, any Error> {
        let request = request(name, body)
        return AsyncThrowingStream { continuation in
            let task = Task {
                do {
                    let (bytes, response) = try await URLSession.shared.bytes(for: request)
                    let status = (response as? HTTPURLResponse)?.statusCode ?? 0
                    guard (200..<300).contains(status) else {
                        var data = Data()
                        for try await byte in bytes { data.append(byte) }
                        throw Self.failure(from: (try? JSONValue.parse(data)) ?? .null, status: status)
                    }
                    var pending = ""
                    for try await character in bytes.characters {
                        pending.append(character)
                        if pending.count >= 24 || character == "\n" {
                            continuation.yield(pending)
                            pending = ""
                        }
                    }
                    if !pending.isEmpty { continuation.yield(pending) }
                    continuation.finish()
                } catch {
                    continuation.finish(throwing: error)
                }
            }
            continuation.onTermination = { _ in task.cancel() }
        }
    }

    private func route(_ name: String) -> URL {
        baseURL.appending(path: "api/ai/\(name)")
    }

    private func request(_ name: String, _ body: JSONValue) -> URLRequest {
        var request = URLRequest(url: route(name))
        request.httpMethod = "POST"
        request.timeoutInterval = 70
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = Data(body.serialized().utf8)
        return request
    }

    private static func failure(from json: JSONValue, status: Int) -> Failure {
        Failure(
            message: json["error"]?.stringValue ?? "The AI request failed (\(status)). The self-graded path still works.",
            retryAfterSeconds: json["retryAfterSeconds"]?.intValue
        )
    }
}
