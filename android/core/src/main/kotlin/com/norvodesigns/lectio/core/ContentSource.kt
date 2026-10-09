package com.norvodesigns.lectio.core

import java.io.File
import java.io.InputStream

/** Where content files are read from: the app's assets, a downloaded folder, or a directory on disk in tests. */
interface ContentSource {
    fun open(name: String): InputStream?

    fun exists(name: String): Boolean = open(name)?.use { true } ?: false

    fun readText(name: String): String =
        (open(name) ?: throw java.io.FileNotFoundException(name)).use { it.readBytes().toString(Charsets.UTF_8) }
}

class DirectorySource(private val dir: File) : ContentSource {
    override fun open(name: String): InputStream? = File(dir, name).takeIf { it.isFile }?.inputStream()
    override fun exists(name: String): Boolean = File(dir, name).isFile
}
