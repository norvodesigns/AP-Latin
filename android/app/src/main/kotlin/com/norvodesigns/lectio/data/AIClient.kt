package com.norvodesigns.lectio.data

import com.norvodesigns.lectio.core.JSONValue
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.withContext
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.nio.ByteBuffer
import java.nio.CharBuffer
import java.nio.charset.CodingErrorAction

/**
 * Calls the website's own AI routes (the src/app/api/ai folder). The provider keys
 * never leave the web server; the app sends exactly what the website's client
 * sends and gets the same answers, rate limits and error messages.
 */
class AIClient(private val baseUrl: String = AppConfig.webBaseUrl) {
    /** A failure the route explained, e.g. a rate limit. [message] is written for the student and is always safe to show as-is. */
    class Failure(override val message: String, val retryAfterSeconds: Int? = null) : Exception(message)

    private fun route(name: String) = "$baseUrl/api/ai/$name"

    /** Whether any AI provider is configured on the server. Every AI surface checks this first so it can show its self-graded path immediately. */
    suspend fun isConfigured(): Boolean = withContext(Dispatchers.IO) {
        runCatching {
            val request = Request.Builder().url(route("status")).build()
            Http.client.newCall(request).execute().use { response ->
                JSONValue.parse(response.body.string())["configured"]?.boolValue ?: false
            }
        }.getOrDefault(false)
    }

    /** POSTs to a JSON route (grading, sight generation) and returns its JSON. */
    suspend fun post(name: String, body: JSONValue): JSONValue {
        try {
            return Http.client.newCall(request(name, body)).await().use { response ->
                val text = withContext(Dispatchers.IO) { response.body.string() }
                val json = runCatching { JSONValue.parse(text) }.getOrDefault(JSONValue.Null)
                if (response.code !in 200..299) throw failure(json, response.code)
                json
            }
        } catch (e: Failure) {
            throw e
        } catch (e: java.io.IOException) {
            throw Failure("Couldn't reach Lectio's server. The self-graded path still works.")
        }
    }

    /** POSTs to a streaming route ("ask") and yields the answer as it arrives. */
    fun stream(name: String, body: JSONValue): Flow<String> = flow {
        val call = Http.client.newCall(request(name, body))
        try {
            call.execute().use { response ->
                if (response.code !in 200..299) {
                    val json = runCatching { JSONValue.parse(response.body.string()) }.getOrDefault(JSONValue.Null)
                    throw failure(json, response.code)
                }
                val source = response.body.source()
                val decoder = Charsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPLACE).onUnmappableCharacter(CodingErrorAction.REPLACE)
                val bytes = ByteArray(4096)
                val inBuf = ByteBuffer.allocate(8192)
                val outBuf = CharBuffer.allocate(8192)
                var pending = StringBuilder()
                while (true) {
                    val n = source.read(bytes, 0, bytes.size)
                    if (n < 0) break
                    inBuf.put(bytes, 0, n)
                    inBuf.flip()
                    decoder.decode(inBuf, outBuf, false)
                    inBuf.compact()
                    outBuf.flip()
                    pending.append(outBuf)
                    outBuf.clear()
                    if (pending.length >= 24 || pending.contains('\n')) {
                        emit(pending.toString())
                        pending = StringBuilder()
                    }
                }
                inBuf.flip()
                decoder.decode(inBuf, outBuf, true)
                outBuf.flip()
                pending.append(outBuf)
                if (pending.isNotEmpty()) emit(pending.toString())
            }
        } catch (e: Failure) {
            throw e
        } catch (e: java.io.IOException) {
            throw Failure("The connection dropped. Try asking again.")
        } finally {
            call.cancel()
        }
    }.flowOn(Dispatchers.IO)

    private fun request(name: String, body: JSONValue): Request =
        Request.Builder().url(route(name)).post(body.serialized().toRequestBody(Http.json)).build()

    private fun failure(json: JSONValue, status: Int) = Failure(
        json["error"]?.stringValue ?: "The AI request failed ($status). The self-graded path still works.",
        json["retryAfterSeconds"]?.intValue,
    )
}
