package com.norvodesigns.lectio.data

import com.norvodesigns.lectio.core.HttpRequest
import com.norvodesigns.lectio.core.HttpResponse
import com.norvodesigns.lectio.core.HttpTransport
import kotlinx.coroutines.suspendCancellableCoroutine
import okhttp3.Call
import okhttp3.Callback
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import java.io.IOException
import java.util.concurrent.TimeUnit
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

object Http {
    val client: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .connectTimeout(20, TimeUnit.SECONDS)
            .readTimeout(70, TimeUnit.SECONDS)
            .callTimeout(90, TimeUnit.SECONDS)
            .build()
    }

    val json = "application/json".toMediaType()
}

/** Suspends until the response headers arrive, and cancels the call if the coroutine is cancelled. */
suspend fun Call.await(): Response = suspendCancellableCoroutine { cont ->
    cont.invokeOnCancellation { runCatching { cancel() } }
    enqueue(object : Callback {
        override fun onFailure(call: Call, e: IOException) {
            if (!cont.isCancelled) cont.resumeWithException(e)
        }

        override fun onResponse(call: Call, response: Response) {
            cont.resume(response)
        }
    })
}

/** [HttpTransport] over OkHttp, for the Supabase calls. */
class OkHttpTransport(private val client: OkHttpClient = Http.client) : HttpTransport {
    override suspend fun execute(request: HttpRequest): HttpResponse {
        val builder = okhttp3.Request.Builder().url(request.url)
        request.headers.forEach { (k, v) -> builder.header(k, v) }
        val body = request.body?.toRequestBody(Http.json)
        builder.method(request.method, body ?: if (request.method == "POST" || request.method == "PUT") ByteArray(0).toRequestBody(null) else null)
        client.newCall(builder.build()).await().use { response ->
            return HttpResponse(response.code, response.body.bytes())
        }
    }
}
