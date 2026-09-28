import CryptoKit
import Foundation
import LectioCore

/// Where the course comes from: the copy bundled with this build, or a newer
/// one downloaded from the website (src/app/content/v1).
///
/// The website serves exactly what `npm run export:content` wrote, with a
/// manifest of SHA-256 hashes. The app downloads only files whose hash
/// changed, checks every byte against the manifest, proves the result decodes,
/// and only then swaps it in. Anything short of that leaves the content the
/// app already had, so a bad deploy can't break the app.
nonisolated enum ContentStore {
    enum UpdateError: Error {
        case badResponse(String)
        case hashMismatch(String)
    }

    static var bundled: URL? { Bundle.main.url(forResource: "Content", withExtension: nil) }

    private static var root: URL { URL.applicationSupportDirectory.appending(path: "Content", directoryHint: .isDirectory) }
    static var downloaded: URL { root.appending(path: "current", directoryHint: .isDirectory) }
    private static var staging: URL { root.appending(path: "staging", directoryHint: .isDirectory) }
    /// Which bundled content a download was made against. After an App Store
    /// update ships newer content in the bundle, an older download is dropped.
    private static let baselineName = "baseline.txt"

    private static let session: URLSession = {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.waitsForConnectivity = false
        return URLSession(configuration: config)
    }()

    /// The newest content on hand.
    static func activeDirectory() -> URL? {
        guard let bundled else { return nil }
        if let baseline = try? String(contentsOf: downloaded.appending(path: baselineName), encoding: .utf8),
           baseline == manifest(in: bundled)?.contentHash,
           manifest(in: downloaded) != nil {
            return downloaded
        }
        discardDownload()
        return bundled
    }

    static func discardDownload() {
        try? FileManager.default.removeItem(at: downloaded)
    }

    static func manifest(in directory: URL) -> ContentManifest? {
        guard let data = try? Data(contentsOf: directory.appending(path: "manifest.json")) else { return nil }
        return try? JSONDecoder().decode(ContentManifest.self, from: data)
    }

    /// Downloads the website's content if it differs from `current` (which
    /// was loaded from `currentDirectory`). Returns the new library, already
    /// saved as the active content, or nil when there was nothing to do.
    static func update(current: ContentManifest, currentDirectory: URL) async throws -> ContentLibrary? {
        guard let bundled, let bundledHash = manifest(in: bundled)?.contentHash else { return nil }
        let base = AppConfig.web("content/v1")

        let manifestData = try await fetch(base.appending(path: "manifest.json"))
        let remote = try JSONDecoder().decode(ContentManifest.self, from: manifestData)
        guard ContentUpdate.shouldUpdate(current: current, remote: remote) else { return nil }

        let fm = FileManager.default
        try? fm.removeItem(at: staging)
        try fm.createDirectory(at: staging, withIntermediateDirectories: true)
        var excluded = URLResourceValues()
        excluded.isExcludedFromBackup = true  // It can always be downloaded again.
        var rootURL = root
        try? rootURL.setResourceValues(excluded)

        let changed = Set(ContentUpdate.changedFiles(current: current, remote: remote))
        for (name, hash) in remote.files {
            let target = staging.appending(path: name)
            if changed.contains(name) {
                let data = try await fetch(base.appending(path: name))
                guard sha256(data) == hash else { throw UpdateError.hashMismatch(name) }
                try data.write(to: target)
            } else {
                try fm.copyItem(at: currentDirectory.appending(path: name), to: target)
            }
        }
        try manifestData.write(to: staging.appending(path: "manifest.json"))
        try bundledHash.write(to: staging.appending(path: baselineName), atomically: true, encoding: .utf8)

        // Everything decodes, or nothing changes.
        let library = try ContentLibrary(directory: staging)
        try? fm.removeItem(at: downloaded)
        try fm.moveItem(at: staging, to: downloaded)
        return library
    }

    private static func fetch(_ url: URL) async throws -> Data {
        var request = URLRequest(url: url)
        request.cachePolicy = .reloadRevalidatingCacheData
        let (data, response) = try await session.data(for: request)
        guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw UpdateError.badResponse(url.lastPathComponent) }
        return data
    }

    private static func sha256(_ data: Data) -> String {
        SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
    }
}
