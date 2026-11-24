package com.norvodesigns.lectio.core

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/** Imported texts: the tokenizer against the web's, and merges that keep a deletion. */
class ImportedTextTests {
    @Test
    fun tokenizerMatchesTheWebApp() {
        val cases = Paths.fixture("tokenize.json")["cases"]!!.arrayValue!!
        assertTrue(cases.size >= 5)
        for (c in cases) {
            val line = c["line"]!!.stringValue!!
            val expected = c["tokens"]!!.arrayValue!!.map { pair ->
                val p = pair.arrayValue!!
                p.first().stringValue!! to (p.last().intValue == 1)
            }
            assertEquals(expected, LatinTokenizer.tokenize(line), line)
        }
    }

    @Test
    fun aDeletedTextStaysDeleted() {
        val text = jobj("id" to "mine-a", "title" to "t", "lines" to jarr(jobj("n" to 1, "latin" to "arma")), "at" to "2026-11-24T10:00:00.000Z")
        val stub = jobj("id" to "mine-a", "title" to "", "lines" to jarr(), "deleted" to true, "at" to "2026-11-24T12:00:00.000Z")
        val withText = ProgressDocument.blankRaw(java.time.Instant.parse("2026-11-24T00:00:00Z")).also {
            it["importedTexts"] = JSONValue.Obj(JSONObject("mine-a" to text))
        }
        val withStub = ProgressDocument.blankRaw(java.time.Instant.parse("2026-11-24T00:00:00Z")).also {
            it["importedTexts"] = JSONValue.Obj(JSONObject("mine-a" to stub))
        }
        for (cloudIsNewer in listOf(true, false)) {
            assertEquals(stub, ProgressMerge.merge(withText, withStub, cloudIsNewer).obj("importedTexts")["mine-a"])
            assertEquals(stub, ProgressMerge.merge(withStub, withText, cloudIsNewer).obj("importedTexts")["mine-a"])
        }
    }
}
