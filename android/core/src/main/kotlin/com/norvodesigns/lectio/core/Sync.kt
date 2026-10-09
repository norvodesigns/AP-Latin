package com.norvodesigns.lectio.core

import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.Serializable
import java.net.URI
import java.net.URLDecoder
import java.net.URLEncoder
import java.time.Instant
import java.time.OffsetDateTime

/* ------------------------------------------------------------------ */
/* Transport                                                            */
/* ------------------------------------------------------------------ */

data class HttpRequest(val method: String, val url: String, val headers: Map<String, String> = emptyMap(), val body: String? = null)

class HttpResponse(val status: Int, val body: ByteArray)

/** The one thing the sync layer needs from the platform: send a request, get the response. */
fun interface HttpTransport {
    suspend fun execute(request: HttpRequest): HttpResponse
}

/* ------------------------------------------------------------------ */
/* Supabase                                                             */
/* ------------------------------------------------------------------ */

/** A signed-in Supabase session. */
@Serializable
data class AuthSession(
    val accessToken: String,
    val refreshToken: String,
    /** When [accessToken] stops being accepted, in epoch milliseconds. */
    val expiresAtMillis: Long,
    val userId: String,
    val email: String? = null,
    /** `user_metadata` from signup: carries `display_name` and `role` for backfilling a missing profile. */
    val displayName: String? = null,
    val role: String? = null,
) {
    val expiresAt: Instant get() = Instant.ofEpochMilli(expiresAtMillis)
}

data class Profile(val id: String, val role: String, val displayName: String) {
    val isTeacher: Boolean get() = role == "teacher"
}

class SupabaseError(val status: Int, val code: String?, override val message: String) : Exception(message) {
    /** The session is no longer usable (expired refresh token, deleted user). */
    val isAuthFailure: Boolean get() = status == 401 || code == "invalid_grant" || code == "refresh_token_not_found"
}

/** The signed-in student's cloud copy of their progress. */
data class CloudProgress(
    val data: JSONObject,
    /** As the server returned it (e.g. "2026-09-28T05:15:29.123+00:00"). */
    val updatedAt: String,
)

/**
 * The handful of Supabase endpoints the app uses (auth/GoTrue and the
 * database REST API/PostgREST) spoken directly over HTTPS.
 *
 * Written by hand rather than pulling in the full SDK: the app needs a dozen
 * calls, and every body goes through [JSONValue] so the progress document
 * keeps its key order on the way to and from the `user_progress` row.
 */
class SupabaseAPI(val baseUrl: String, val anonKey: String, private val transport: HttpTransport) {
    sealed interface SignUpResult {
        data class SignedIn(val session: AuthSession) : SignUpResult

        /** Email confirmation is on: the account exists but can't sign in until the link in the confirmation email is followed. */
        data object ConfirmationRequired : SignUpResult
    }

    /* Auth */

    suspend fun signUp(email: String, password: String, displayName: String, role: String, redirectTo: String?): SignUpResult {
        val query = redirectTo?.let { listOf("redirect_to" to it) } ?: emptyList()
        val body = jobj(
            "email" to email, "password" to password,
            "data" to jobj("display_name" to displayName, "role" to role),
        )
        val response = send("auth/v1/signup", query = query, body = body)
        return if (response["access_token"] != null) SignUpResult.SignedIn(sessionFrom(response)) else SignUpResult.ConfirmationRequired
    }

    suspend fun signIn(email: String, password: String): AuthSession {
        val response = send("auth/v1/token", query = listOf("grant_type" to "password"), body = jobj("email" to email, "password" to password))
        return sessionFrom(response)
    }

    suspend fun refresh(refreshToken: String): AuthSession {
        val response = send("auth/v1/token", query = listOf("grant_type" to "refresh_token"), body = jobj("refresh_token" to refreshToken))
        return sessionFrom(response)
    }

    suspend fun signOut(accessToken: String) {
        send("auth/v1/logout", body = jobj(), accessToken = accessToken)
    }

    /* Database */

    /** The signed-in user's `user_progress` row, or null when there isn't one yet. Row-level security scopes the select to the caller's own row. */
    suspend fun pullProgress(accessToken: String): CloudProgress? {
        val rows = send("rest/v1/user_progress", method = "GET", query = listOf("select" to "data,updated_at"), accessToken = accessToken)
        val row = rows.arrayValue?.firstOrNull() ?: return null
        val data = row["data"]?.objectValue ?: return null
        val updatedAt = row["updated_at"]?.stringValue ?: return null
        return CloudProgress(data, updatedAt)
    }

    /** Upserts the progress row. `user_id` is never sent: the column defaults to `auth.uid()`. */
    suspend fun pushProgress(data: JSONObject, updatedAt: String, accessToken: String) {
        send(
            "rest/v1/user_progress", query = listOf("on_conflict" to "user_id"),
            body = jobj("data" to JSONValue.Obj(data), "updated_at" to updatedAt),
            accessToken = accessToken, prefer = "resolution=merge-duplicates,return=minimal",
        )
    }

    suspend fun profile(userId: String, accessToken: String): Profile? {
        val rows = send(
            "rest/v1/profiles", method = "GET",
            query = listOf("id" to "eq.$userId", "select" to "id,role,display_name"), accessToken = accessToken,
        )
        val row = rows.arrayValue?.firstOrNull() ?: return null
        val id = row["id"]?.stringValue ?: return null
        val role = row["role"]?.stringValue ?: return null
        val name = row["display_name"]?.stringValue ?: return null
        return Profile(id, role, name)
    }

    /** Creates the profile row. A duplicate (someone got there first) is fine. */
    suspend fun insertProfile(profile: Profile, accessToken: String) {
        try {
            send(
                "rest/v1/profiles",
                body = jobj("id" to profile.id, "role" to profile.role, "display_name" to profile.displayName),
                accessToken = accessToken, prefer = "return=minimal",
            )
        } catch (e: SupabaseError) {
            if (e.code == "23505" || e.status == 409) return
            throw e
        }
    }

    /** Calls a database function. Every one the app uses returns nothing. */
    suspend fun rpc(name: String, params: JSONObject, accessToken: String) {
        send("rest/v1/rpc/$name", body = JSONValue.Obj(params), accessToken = accessToken, prefer = "return=minimal")
    }

    /** Calls a database function that returns rows. */
    suspend fun rpcRows(name: String, params: JSONObject, accessToken: String): List<JSONValue> =
        send("rest/v1/rpc/$name", body = JSONValue.Obj(params), accessToken = accessToken).arrayValue ?: emptyList()

    /** A plain PostgREST select, for the classroom screens. */
    suspend fun select(table: String, query: List<Pair<String, String>>, accessToken: String): List<JSONValue> =
        send("rest/v1/$table", method = "GET", query = query, accessToken = accessToken).arrayValue ?: emptyList()

    suspend fun delete(table: String, query: List<Pair<String, String>>, accessToken: String) {
        send("rest/v1/$table", method = "DELETE", query = query, accessToken = accessToken, prefer = "return=minimal")
    }

    /* Transport */

    internal suspend fun send(
        path: String, method: String = "POST", query: List<Pair<String, String>> = emptyList(), body: JSONValue? = null,
        accessToken: String? = null, prefer: String? = null,
    ): JSONValue {
        val url = StringBuilder(baseUrl.trimEnd('/')).append('/').append(path)
        if (query.isNotEmpty()) {
            url.append('?').append(query.joinToString("&") { (k, v) -> "${enc(k)}=${enc(v)}" })
        }
        val headers = linkedMapOf(
            "apikey" to anonKey,
            "Authorization" to "Bearer ${accessToken ?: anonKey}",
            "Accept" to "application/json",
        )
        if (prefer != null) headers["Prefer"] = prefer
        if (body != null) headers["Content-Type"] = "application/json"
        val response = transport.execute(HttpRequest(method, url.toString(), headers, body?.serialized()))
        val json = if (response.body.isEmpty()) JSONValue.Null else runCatching { JSONValue.parse(response.body.toString(Charsets.UTF_8)) }.getOrDefault(JSONValue.Null)
        if (response.status !in 200..299) throw error(response.status, json)
        return json
    }

    companion object {
        private fun enc(s: String): String = URLEncoder.encode(s, "UTF-8").replace("+", "%20")

        internal fun error(status: Int, body: JSONValue): SupabaseError {
            val code = body["error_code"]?.stringValue ?: body["code"]?.stringValue ?: body["error"]?.stringValue
            val message = body["msg"]?.stringValue
                ?: body["error_description"]?.stringValue
                ?: body["message"]?.stringValue
                ?: "The server answered $status."
            return SupabaseError(status, code, message)
        }

        internal fun sessionFrom(json: JSONValue, now: Instant = Instant.now()): AuthSession {
            val access = json["access_token"]?.stringValue
            val refresh = json["refresh_token"]?.stringValue
            val user = json["user"]
            val userId = user?.get("id")?.stringValue
            if (access == null || refresh == null || user == null || userId == null) {
                throw SupabaseError(0, "malformed", "The sign-in response was incomplete.")
            }
            val expiresAt = json["expires_at"]?.doubleValue?.let { (it * 1000).toLong() }
                ?: (now.toEpochMilli() + ((json["expires_in"]?.doubleValue ?: 3600.0) * 1000).toLong())
            val meta = user["user_metadata"]
            return AuthSession(
                access, refresh, expiresAt, userId, user["email"]?.stringValue,
                meta?.get("display_name")?.stringValue, meta?.get("role")?.stringValue,
            )
        }
    }
}

/* ------------------------------------------------------------------ */
/* Auth manager                                                         */
/* ------------------------------------------------------------------ */

/** Where the signed-in session is kept between launches. The app stores it encrypted; tests keep it in memory. */
interface SessionStorage {
    fun load(): AuthSession?
    fun save(session: AuthSession?)
}

class InMemorySessionStorage(private var session: AuthSession? = null) : SessionStorage {
    @Synchronized override fun load(): AuthSession? = session
    @Synchronized override fun save(session: AuthSession?) {
        this.session = session
    }
}

/** Owns the session: signs in and out, persists it, and hands out an access token that is refreshed before it expires. */
class AuthManager(val api: SupabaseAPI, private val storage: SessionStorage) {
    @Volatile
    var session: AuthSession? = storage.load()
        private set

    private val refreshLock = Mutex()

    val userId: String? get() = session?.userId

    /**
     * A currently valid access token, refreshing first when it's within a
     * minute of expiring. A refresh the server refuses (the account was
     * deleted, or signed out everywhere) ends the session here too.
     */
    suspend fun accessToken(now: Instant = Instant.now()): String {
        val current = session ?: throw SupabaseError(401, "signed_out", "Not signed in.")
        if (current.expiresAtMillis - now.toEpochMilli() > 60_000) return current.accessToken
        return refreshLock.withLock {
            val latest = session ?: throw SupabaseError(401, "signed_out", "Not signed in.")
            if (latest.expiresAtMillis - now.toEpochMilli() > 60_000) return@withLock latest.accessToken
            try {
                val fresh = api.refresh(latest.refreshToken)
                setSession(fresh)
                fresh.accessToken
            } catch (e: SupabaseError) {
                if (e.isAuthFailure || e.status == 400) setSession(null)
                throw e
            }
        }
    }

    suspend fun signIn(email: String, password: String): AuthSession {
        val s = api.signIn(normalize(email), password)
        setSession(s)
        return s
    }

    /** Signs in with the refresh token an email link carried ([AuthCallback]): one refresh turns it into a full session. */
    suspend fun signIn(refreshToken: String): AuthSession {
        val s = api.refresh(refreshToken)
        setSession(s)
        return s
    }

    suspend fun signUp(email: String, password: String, displayName: String, role: String, redirectTo: String?): SupabaseAPI.SignUpResult {
        val result = api.signUp(normalize(email), password, displayName, role, redirectTo)
        if (result is SupabaseAPI.SignUpResult.SignedIn) setSession(result.session)
        return result
    }

    /** Signs out on the server (best effort) and forgets the session locally either way: being signed out must never depend on the network. */
    suspend fun signOut() {
        session?.accessToken?.let { runCatching { api.signOut(it) } }
        setSession(null)
    }

    /** Forgets the session without telling the server, after the account itself has been deleted. */
    fun forget() = setSession(null)

    private fun setSession(s: AuthSession?) {
        session = s
        storage.save(s)
    }

    companion object {
        fun normalize(email: String): String = email.trim().lowercase()

        /** The web signup form's validation, so both reject the same input. */
        fun validate(email: String, password: String): String? {
            val e = normalize(email)
            val parts = e.split("@")
            if (e.isEmpty() || e.contains(" ") || parts.size != 2 || parts[0].isEmpty() || !parts[1].contains(".") ||
                parts[1].startsWith(".") || parts[1].endsWith(".")
            ) {
                return "Enter a valid email address."
            }
            if (password.length < 8) return "Your password must be at least 8 characters."
            if (password.length > 200) return "That password is too long."
            return null
        }
    }
}

/* ------------------------------------------------------------------ */
/* Cloud sync                                                           */
/* ------------------------------------------------------------------ */

/**
 * What this device's local progress currently represents: the web store's
 * `lastSyncedUserId` / `lastSyncedAt`, with the same meaning.
 */
@Serializable
data class SyncBookkeeping(
    /** Whose cloud progress the local document belongs to. Null means it has never been tied to any account, so it's safe to adopt into one. */
    val lastSyncedUserId: String? = null,
    /** The cloud row's `updated_at` as of the last successful pull or push. */
    val lastSyncedAt: String? = null,
)

/**
 * The decisions cross-device sync makes: a port of `reconcile` and
 * `pullAndMerge` in src/hooks/useCloudSync.ts, kept free of networking so the
 * three sign-in cases can be tested directly.
 */
object CloudSync {
    class Reconciliation(
        /** What the local document becomes. */
        val local: ProgressDocument,
        /** What to upload, if anything. */
        val push: ProgressDocument?,
        /** `lastSyncedAt` to record when there's nothing to push, or the push fails. */
        val fallbackSyncedAt: String?,
    )

    /** Runs once per sign-in or account switch. */
    fun reconcile(userId: String, local: ProgressDocument, bookkeeping: SyncBookkeeping, cloud: CloudProgress?, now: Instant = Instant.now()): Reconciliation {
        val previous = bookkeeping.lastSyncedUserId
        if (previous != null && previous != userId) {
            // A different account just took over this device. Its local data
            // belongs to whoever was signed in before and must never be merged
            // into (or pushed over) this account's progress.
            if (cloud != null) return Reconciliation(ProgressDocument(cloud.data, now), null, cloud.updatedAt)
            val blank = ProgressDocument.blank(now)
            return Reconciliation(blank, blank, null)
        }

        // Continuing the same account, or adopting never-synced local data into an account for the first time.
        if (cloud == null) return Reconciliation(local, local, null)
        // With no prior sync there's no baseline for "newer", so the cloud (the
        // one copy that may already hold another device's work) wins singleton settings outright.
        val cloudIsNewer = bookkeeping.lastSyncedAt?.let { isLater(cloud.updatedAt, it) } ?: true
        val merged = ProgressDocument(ProgressMerge.merge(local.raw, cloud.data, cloudIsNewer), now)
        return Reconciliation(merged, merged, cloud.updatedAt)
    }

    /** Folds in a cloud row pulled mid-session (another device pushed), or returns null when there's nothing new to fold in. */
    fun mergePulled(userId: String, local: ProgressDocument, bookkeeping: SyncBookkeeping, cloud: CloudProgress, now: Instant = Instant.now()): ProgressDocument? {
        if (bookkeeping.lastSyncedUserId != userId) return null
        val last = bookkeeping.lastSyncedAt
        if (last != null && !isLater(cloud.updatedAt, last)) return null
        return ProgressDocument(ProgressMerge.merge(local.raw, cloud.data, cloudIsNewer = true), now)
    }

    /**
     * Whether timestamp [a] is strictly later than [b]. Parsed rather than
     * compared as strings: the server writes "+00:00" and sometimes
     * microseconds, the client writes "Z" and milliseconds.
     */
    fun isLater(a: String, than: String): Boolean {
        val da = parseTimestamp(a)
        val db = parseTimestamp(than)
        if (da == null || db == null) return a > than
        // Millisecond precision on both sides: the push writes milliseconds, and the same row must never read as newer than itself.
        return da.toEpochMilli() > db.toEpochMilli()
    }

    fun parseTimestamp(s: String): Instant? {
        // Normalise to "yyyy-MM-ddTHH:mm:ss.mmm<zone>": milliseconds exactly, zone defaulting to UTC.
        val text = s.replace(' ', 'T')
        if (text.length < 19) return null
        val head = text.substring(0, 19)
        var rest = text.substring(19)
        var ms = "000"
        if (rest.startsWith(".")) {
            val digits = rest.drop(1).takeWhile { it.isDigit() }
            ms = (digits + "000").take(3)
            rest = rest.drop(1 + digits.length)
        }
        val zone = rest.ifEmpty { "Z" }
        return runCatching { OffsetDateTime.parse("$head.$ms$zone").toInstant() }.getOrNull()
    }
}

/* ------------------------------------------------------------------ */
/* Auth links                                                           */
/* ------------------------------------------------------------------ */

/**
 * What a sign-up confirmation link hands back when it opens the app. With
 * Supabase's own link, lectio://auth-callback carries the new session in the
 * fragment (`#access_token=...&refresh_token=...&type=signup`), or
 * `#error=...&error_description=...` when the link has expired or was already
 * used. Lectio's email points at the website instead, which confirms the
 * address and offers lectio://auth-callback?confirmed=1; its password reset
 * page offers lectio://auth-callback?reset=1 once the new password is saved.
 */
sealed interface AuthCallback {
    /** The link worked; the refresh token gets a full session (and the user). */
    data class Session(val refreshToken: String) : AuthCallback

    /** The website confirmed the address; the student signs in here. */
    data object Confirmed : AuthCallback

    /** The website saved a new password; the student signs in with it here. */
    data object PasswordReset : AuthCallback

    /** The link didn't work, and Supabase said why. */
    data class Failed(val message: String) : AuthCallback

    companion object {
        /** Null for any URL that isn't a lectio://auth-callback link. */
        fun parse(url: String): AuthCallback? {
            val uri = runCatching { URI(url) }.getOrNull() ?: return null
            if (uri.scheme != "lectio" || uri.host != "auth-callback") return null
            val params = HashMap<String, String>()
            for (encoded in listOfNotNull(uri.rawQuery, uri.rawFragment)) {
                for (pair in encoded.split("&")) {
                    if (pair.isEmpty()) continue
                    val eq = pair.indexOf('=')
                    val name = runCatching { URLDecoder.decode(if (eq < 0) pair else pair.substring(0, eq), "UTF-8") }.getOrNull() ?: continue
                    // A form encoding: "+" is a space (Supabase writes its error descriptions that way); tokens never contain one.
                    val value = if (eq < 0) "" else runCatching { URLDecoder.decode(pair.substring(eq + 1), "UTF-8") }.getOrNull() ?: continue
                    params[name] = value
                }
            }
            val token = params["refresh_token"]
            return when {
                !token.isNullOrEmpty() -> Session(token)
                params["confirmed"] == "1" -> Confirmed
                params["reset"] == "1" -> PasswordReset
                else -> {
                    val message = params["error_description"] ?: params["error"]
                    if (!message.isNullOrEmpty()) Failed(message) else Failed("The link didn’t include a sign-in")
                }
            }
        }
    }
}
