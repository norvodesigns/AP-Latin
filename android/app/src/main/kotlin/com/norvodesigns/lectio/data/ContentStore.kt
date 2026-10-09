package com.norvodesigns.lectio.data

import android.content.Context
import android.content.res.AssetManager
import com.norvodesigns.lectio.core.ContentLibrary
import com.norvodesigns.lectio.core.ContentManifest
import com.norvodesigns.lectio.core.ContentSource
import com.norvodesigns.lectio.core.ContentUpdate
import com.norvodesigns.lectio.core.DirectorySource
import com.norvodesigns.lectio.core.LectioJson
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.Request
import java.io.File
import java.io.InputStream
import java.security.MessageDigest

/** Content files bundled in the app's assets, under [folder]. */
class AssetSource(private val assets: AssetManager, private val folder: String) : ContentSource {
    override fun open(name: String): InputStream? = runCatching { assets.open("$folder/$name") }.getOrNull()
}

/**
 * Where the course comes from: the copy bundled with this build, or a newer
 * one downloaded from the website (src/app/content/v1).
 *
 * The website serves exactly what `npm run export:content` wrote, with a
 * manifest of SHA-256 hashes. The app downloads only files whose hash
 * changed, checks every byte against the manifest, proves the result decodes,
 * and only then swaps it in. Anything short of that leaves the content the app
 * already had, so a bad deploy can't break the app.
 */
class ContentStore(private val context: Context) {
    class UpdateException(message: String) : Exception(message)

    val bundled: ContentSource = AssetSource(context.assets, "content")

    private val root = File(context.filesDir, "Content")
    val downloaded = File(root, "current")
    private val staging = File(root, "staging")

    /** Which bundled content a download was made against. After an app update ships newer content in the bundle, an older download is dropped. */
    private val baselineName = "baseline.txt"

    fun manifest(source: ContentSource): ContentManifest? =
        runCatching { LectioJson.decodeFromString(ContentManifest.serializer(), source.readText("manifest.json")) }.getOrNull()

    /** The newest content on hand: a download made against this build's bundle, else the bundle. */
    fun activeSource(): ContentSource {
        val baseline = runCatching { File(downloaded, baselineName).readText() }.getOrNull()
        if (baseline != null && baseline == manifest(bundled)?.contentHash && manifest(DirectorySource(downloaded)) != null) {
            return DirectorySource(downloaded)
        }
        discardDownload()
        return bundled
    }

    fun isDownloaded(source: ContentSource): Boolean = source is DirectorySource

    fun discardDownload() {
        downloaded.deleteRecursively()
    }

    /**
     * Downloads the website's content if it differs from [current] (which was
     * loaded from [currentSource]). Returns the new library, already saved as
     * the active content, or null when there was nothing to do.
     */
    suspend fun update(current: ContentManifest, currentSource: ContentSource): ContentLibrary? = withContext(Dispatchers.IO) {
        val bundledHash = manifest(bundled)?.contentHash ?: return@withContext null
        val base = AppConfig.web("content/v1")

        val manifestBytes = fetch("$base/manifest.json")
        val remote = LectioJson.decodeFromString(ContentManifest.serializer(), manifestBytes.toString(Charsets.UTF_8))
        if (!ContentUpdate.shouldUpdate(current, remote)) return@withContext null

        staging.deleteRecursively()
        staging.mkdirs()
        val changed = ContentUpdate.changedFiles(current, remote).toSet()
        for ((name, hash) in remote.files) {
            val target = File(staging, name)
            if (name in changed) {
                val data = fetch("$base/$name")
                if (sha256(data) != hash) throw UpdateException("Hash mismatch: $name")
                target.writeBytes(data)
            } else {
                val input = currentSource.open(name) ?: throw UpdateException("Missing $name")
                input.use { i -> target.outputStream().use { o -> i.copyTo(o) } }
            }
        }
        File(staging, "manifest.json").writeBytes(manifestBytes)
        File(staging, baselineName).writeText(bundledHash)

        // Everything decodes, or nothing changes.
        val library = ContentLibrary(DirectorySource(staging))
        downloaded.deleteRecursively()
        root.mkdirs()
        if (!staging.renameTo(downloaded)) throw UpdateException("Could not save the new content")
        library
    }

    private fun fetch(url: String): ByteArray {
        val request = Request.Builder().url(url).header("Cache-Control", "no-cache").build()
        Http.client.newCall(request).execute().use { response ->
            if (response.code != 200) throw UpdateException("Bad response ${response.code} for $url")
            return response.body.bytes()
        }
    }

    private fun sha256(data: ByteArray): String =
        MessageDigest.getInstance("SHA-256").digest(data).joinToString("") { "%02x".format(it) }
}
