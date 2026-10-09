package com.norvodesigns.lectio.core

import java.io.File
import java.time.Instant
import java.time.ZoneId
import java.time.ZoneOffset

/** Test files locate the repo's generated data relative to the module, so the suite runs the same from Gradle or CI. */
object Paths {
    val repo: File = generateSequence(File("").absoluteFile) { it.parentFile }.first { File(it, "ios/Content/manifest.json").isFile }
    val fixtures = File(repo, "ios/LectioCore/Tests/LectioCoreTests/Fixtures")
    val content = File(repo, "ios/Content")
    val scansion = File(repo, "public/scansion")

    fun fixture(name: String): JSONValue = JSONValue.parse(File(fixtures, name).readText())

    val library: ContentLibrary by lazy { ContentLibrary(DirectorySource(content)) }
}

val utc: ZoneId = ZoneOffset.UTC

fun parseISO(s: String): Instant = Instant.parse(s)

/** Describes the first difference between two JSON values, or null when they match. */
fun firstDifference(a: JSONValue, b: JSONValue, path: String = "$"): String? {
    if (a is JSONValue.Obj && b is JSONValue.Obj) {
        for (key in (a.value.keys + b.value.keys).toSortedSet()) {
            val xv = a.value[key] ?: return "$path.$key: missing on the left"
            val yv = b.value[key] ?: return "$path.$key: missing on the right"
            firstDifference(xv, yv, "$path.$key")?.let { return it }
        }
        return null
    }
    if (a is JSONValue.Arr && b is JSONValue.Arr) {
        if (a.items.size != b.items.size) return "$path: ${a.items.size} items vs ${b.items.size}"
        for ((i, pair) in a.items.zip(b.items).withIndex()) {
            firstDifference(pair.first, pair.second, "$path[$i]")?.let { return it }
        }
        return null
    }
    return if (a == b) null else "$path: ${a.serialized()} vs ${b.serialized()}"
}
