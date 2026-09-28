import Foundation

/// Deciding whether, and what, to download when the website serves newer
/// content than the app has (src/app/content/v1). The fetching and hashing
/// live in the app; this is the part worth testing.
public enum ContentUpdate {
    /// Whether the website's content should replace what the app has: it's
    /// newer (its history includes what the app has, so an app build that's
    /// ahead of the website never goes backwards), this build can read it,
    /// and it lists only plain file names.
    public static func shouldUpdate(current: ContentManifest, remote: ContentManifest) -> Bool {
        remote.contentHash != current.contentHash
            && remote.supersedes.contains(current.contentHash)
            && remote.schemaVersion <= ContentLibrary.supportedSchemaVersion
            && !remote.files.isEmpty
            && remote.files.keys.allSatisfy(isSafeFileName)
            && remote.files.values.allSatisfy(isSHA256)
    }

    /// The files to download: those that are new or whose hash changed.
    /// Everything else is copied from the content already on the device.
    public static func changedFiles(current: ContentManifest, remote: ContentManifest) -> [String] {
        remote.files.filter { current.files[$0.key] != $0.value }.keys.sorted()
    }

    /// A manifest names files like "passages.json" — never a path, so a bad
    /// manifest can't write outside the content folder.
    public static func isSafeFileName(_ name: String) -> Bool {
        guard name.hasSuffix(".json"), name.count > 5, name.count <= 64, name != "manifest.json" else { return false }
        return name.unicodeScalars.allSatisfy { ("a"..."z").contains($0) || ("0"..."9").contains($0) || $0 == "-" || $0 == "_" || $0 == "." }
            && !name.hasPrefix(".")
            && !name.contains("..")
    }

    static func isSHA256(_ hex: String) -> Bool {
        hex.count == 64 && hex.unicodeScalars.allSatisfy { ("0"..."9").contains($0) || ("a"..."f").contains($0) }
    }
}
