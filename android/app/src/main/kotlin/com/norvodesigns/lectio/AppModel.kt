package com.norvodesigns.lectio

import android.app.Application
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.norvodesigns.lectio.core.AuthCallback
import com.norvodesigns.lectio.core.AuthManager
import com.norvodesigns.lectio.core.AuthSession
import com.norvodesigns.lectio.core.CloudSync
import com.norvodesigns.lectio.core.ContentLibrary
import com.norvodesigns.lectio.core.ContentSource
import com.norvodesigns.lectio.core.Course
import com.norvodesigns.lectio.core.CourseIds
import com.norvodesigns.lectio.core.Daily
import com.norvodesigns.lectio.core.JSONObject
import com.norvodesigns.lectio.core.JSONValue
import com.norvodesigns.lectio.core.LearnerProfile
import com.norvodesigns.lectio.core.Lesson
import com.norvodesigns.lectio.core.LessonPlace
import com.norvodesigns.lectio.core.Passage
import com.norvodesigns.lectio.core.Path
import com.norvodesigns.lectio.core.PathLesson
import com.norvodesigns.lectio.core.Profile
import com.norvodesigns.lectio.core.ProgressDocument
import com.norvodesigns.lectio.core.Sententia
import com.norvodesigns.lectio.core.SentenceBuilder
import com.norvodesigns.lectio.core.StudyDates
import com.norvodesigns.lectio.core.SupabaseAPI
import com.norvodesigns.lectio.core.SupabaseError
import com.norvodesigns.lectio.core.SyncBookkeeping
import com.norvodesigns.lectio.core.VocabCard
import com.norvodesigns.lectio.core.WidgetSnapshot
import com.norvodesigns.lectio.core.LectioJson
import com.norvodesigns.lectio.core.derivativesLesson
import com.norvodesigns.lectio.core.review
import com.norvodesigns.lectio.core.reviewable
import com.norvodesigns.lectio.data.AIClient
import com.norvodesigns.lectio.data.AppConfig
import com.norvodesigns.lectio.data.ContentStore
import com.norvodesigns.lectio.data.OkHttpTransport
import com.norvodesigns.lectio.data.Prefs
import com.norvodesigns.lectio.data.SecureSessionStorage
import com.norvodesigns.lectio.notifications.Reminders
import com.norvodesigns.lectio.ui.components.Rich
import com.norvodesigns.lectio.ui.theme.Appearance
import com.norvodesigns.lectio.widgets.WidgetBridge
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.async
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.time.Instant
import kotlin.math.roundToLong

sealed interface ContentState {
    data object Loading : ContentState
    data class Ready(val library: ContentLibrary) : ContentState
    data class Failed(val message: String) : ContentState
}

data class Account(val userId: String, val email: String?, val profile: Profile? = null) {
    val displayName: String get() = profile?.displayName ?: email ?: "Your account"
    val isTeacher: Boolean get() = profile?.isTeacher ?: false
}

sealed interface SyncStatus {
    data object Idle : SyncStatus
    data object Syncing : SyncStatus
    data class Synced(val at: Instant) : SyncStatus
    data class Offline(val message: String) : SyncStatus
}

/**
 * The app's single source of state: the content library, the student's
 * progress document, their account, and a few device-only preferences.
 *
 * Progress is written to the app's files after every edit (debounced), the
 * way the web app writes localStorage: local first, always, so nothing waits on
 * a network. When signed in, cloud sync keeps a copy in step with the
 * website's. This is the Android twin of the iOS `AppModel`.
 */
class AppModel(val app: Application) {
    val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    val prefs = Prefs(app)
    val contentStore = ContentStore(app)
    val ai = AIClient()

    private val progressFile = File(app.filesDir, "progress.json")

    /* ------------------------------------------------------------------ */
    /* State                                                                */
    /* ------------------------------------------------------------------ */

    var contentState: ContentState by mutableStateOf(ContentState.Loading)
        private set

    var progress: ProgressDocument by mutableStateOf(readProgress() ?: ProgressDocument.blank())
        private set

    /** The decoded vocabulary deck, kept in step with [progress] so screens that read it several times per render don't re-decode it. */
    var vocab: Map<String, VocabCard> by mutableStateOf(progress.vocab)
        private set

    /** Set by a dashboard "Drill it" link; the Quiz Engine narrows to it. */
    var quizPresetType: String? by mutableStateOf(null)

    /** The passage open in the Reading Room, so a link can open one. */
    var readPassageId: String? by mutableStateOf(null)

    /** The course lesson open over everything else, if any. */
    private var activeLessonState: LessonPlace? by mutableStateOf(null)
    var activeLesson: LessonPlace?
        get() = activeLessonState
        set(value) {
            val changed = (activeLessonState == null) != (value == null)
            activeLessonState = value
            if (changed) studySectionChanged()
        }

    /** The first-run screens, over everything. */
    var showOnboarding by mutableStateOf(false)

    /** What a sign-up confirmation link did when it opened the app, shown once as an alert. */
    var authNotice: String? by mutableStateOf(null)

    private var selectedTabState: AppTab by mutableStateOf(AppTab.Today)
    var selectedTab: AppTab
        get() = selectedTabState
        set(value) {
            if (selectedTabState != value) {
                selectedTabState = value
                studySectionChanged()
            }
        }

    /** The whole-app sheet the Settings "take the tour again" and tips reuse. */
    var showTour by mutableStateOf(false)

    /** Device-only: whether this device follows the system appearance. Kept out of the synced document on purpose. */
    private var appearanceState: Appearance by mutableStateOf(Appearance.from(prefs.string("appearance")))
    var appearance: Appearance
        get() = appearanceState
        set(value) {
            appearanceState = value
            prefs.put("appearance", value.name.lowercase())
        }

    /** Multiplier on the Latin type size, like the web's `--ls`. */
    private var latinScaleState: Double by mutableStateOf(prefs.double("latinScale", 1.0).takeIf { it > 0 } ?: 1.0)
    var latinScale: Double
        get() = latinScaleState
        set(value) {
            latinScaleState = value
            prefs.put("latinScale", value)
        }

    /* Account and sync */
    var account: Account? by mutableStateOf(null)
    var syncStatus: SyncStatus by mutableStateOf(SyncStatus.Idle)
    val auth = AuthManager(SupabaseAPI(AppConfig.supabaseUrl, AppConfig.supabaseAnonKey, OkHttpTransport()), SecureSessionStorage(app))
    private var bookkeeping: SyncBookkeeping = loadBookkeeping()
        set(value) {
            field = value
            prefs.put("syncBookkeeping", LectioJson.encodeToString(SyncBookkeeping.serializer(), value))
        }
    private var pushJob: Job? = null
    private var pullLoop: Job? = null

    /** Set while a sync write replaces [progress], so it isn't pushed straight back. */
    private var applyingSync = false

    /* AI: the website's routes. Null until checked. */
    var aiAvailable: Boolean? by mutableStateOf(null)

    /* Study time: device-local, like the web's `studySecondsToday`; today's live tally is never synced. */
    var studySecondsToday: Double by mutableStateOf(0.0)
    var goalJustReached by mutableStateOf(false)
    private var studyGoalDate: String = ""
    private var goalCelebratedDate: String? = null
    private var pendingStudySeconds = 0.0
    private var pendingStudySection: String? = null
    private var studyTicker: Job? = null
    var sceneActive = false
        private set

    private var contentDirectoryIsDownload = false
    private var contentSource: ContentSource? = null
    private var contentUpdate: Job? = null
    private var saveJob: Job? = null
    private var lastWidgetSnapshot: WidgetSnapshot? = null

    init {
        restoreStudyDay()
    }

    val content: ContentLibrary? get() = (contentState as? ContentState.Ready)?.library

    /* ------------------------------------------------------------------ */
    /* Content                                                              */
    /* ------------------------------------------------------------------ */

    /** Asks the server once whether AI is configured. */
    suspend fun checkAI() {
        if (aiAvailable != null) return
        aiAvailable = ai.isConfigured()
    }

    suspend fun loadContent() {
        if (contentState !is ContentState.Loading) return
        try {
            val (library, source) = withContext(Dispatchers.Default) {
                val active = contentStore.activeSource()
                try {
                    ContentLibrary(active) to active
                } catch (e: Exception) {
                    if (active === contentStore.bundled) throw e
                    // A download that no longer decodes: back to the bundle.
                    contentStore.discardDownload()
                    ContentLibrary(contentStore.bundled) to contentStore.bundled
                }
            }
            contentState = ContentState.Ready(library)
            contentSource = source
            contentDirectoryIsDownload = source !== contentStore.bundled
            // The sentence builder is built on first use; build it now, in the background, so opening it later doesn't wait.
            scope.launch(Dispatchers.Default) { library.sentences }
            // A saved session (the Keystore outlives nothing, but a restored phone may still hold one) means a returning student whose work is about to sync down.
            val hasSession = auth.session != null
            if (needsOnboarding && (!hasSession || prefs.bool("showOnboarding"))) showOnboarding = true
            refreshWidgets()
            checkForContentUpdate()
            pendingLink?.let {
                pendingLink = null
                handleLink(it)
            }
        } catch (e: Exception) {
            contentState = ContentState.Failed(e.message ?: e.toString())
        }
    }

    /** Picks up content the website has that this copy doesn't (a new lesson, a corrected gloss) at most every few hours. See [ContentStore]. */
    fun checkForContentUpdate() {
        val last = prefs.double("contentCheckedAt", 0.0)
        val library = content ?: return
        val source = contentSource ?: return
        if (contentUpdate != null || System.currentTimeMillis() / 1000.0 - last <= 6 * 3600) return
        contentUpdate = scope.launch {
            try {
                val updated = contentStore.update(library.manifest, source)
                prefs.put("contentCheckedAt", System.currentTimeMillis() / 1000.0)
                if (updated != null) {
                    contentState = ContentState.Ready(updated)
                    contentSource = com.norvodesigns.lectio.core.DirectorySource(contentStore.downloaded)
                    contentDirectoryIsDownload = true
                    refreshWidgets()
                }
            } catch (_: Exception) {
                // Offline or mid-deploy; the next foreground tries again.
            } finally {
                contentUpdate = null
            }
        }
    }

    /* ------------------------------------------------------------------ */
    /* Progress                                                             */
    /* ------------------------------------------------------------------ */

    private fun applyProgress(doc: ProgressDocument) {
        progress = doc
        vocab = doc.vocab
    }

    /** Applies an edit to the progress document, saves it, and (when signed in) schedules a push to the cloud. */
    fun update(edit: (ProgressDocument) -> Unit) {
        val next = progress.copy()
        edit(next)
        applyProgress(next)
        progressChanged()
    }

    /** Replaces the whole document: a restore from a backup file. */
    fun replaceProgress(document: ProgressDocument) {
        applyProgress(document)
        progressChanged()
    }

    fun progressChanged() {
        scheduleSave()
        refreshWidgets()
        if (!applyingSync) schedulePush()
    }

    /** Writes immediately: called when the app leaves the foreground. */
    fun saveNow() {
        saveJob?.cancel()
        write(progress)
    }

    private fun scheduleSave() {
        saveJob?.cancel()
        val snapshot = progress
        saveJob = scope.launch(Dispatchers.IO) {
            delay(500)
            write(snapshot)
        }
    }

    /* Scene lifecycle */

    fun sceneBecameActive() {
        sceneActive = true
        startStudyTicker()
        scope.launch { syncOnForeground() }
        checkForContentUpdate()
    }

    fun sceneResignedActive() {
        sceneActive = false
        stopStudyTicker()
        saveNow()
        flushStudyTime()
        pushNowIfPending()
        refreshWidgets()
        rescheduleReminder()
    }

    /* Persistence */

    private fun readProgress(): ProgressDocument? = runCatching {
        val obj = JSONValue.parse(progressFile.readText()).objectValue ?: return null
        ProgressDocument(obj)
    }.getOrNull()

    private fun write(document: ProgressDocument) {
        runCatching {
            val tmp = File(progressFile.parentFile, "progress.json.tmp")
            tmp.writeText(JSONValue.Obj(document.raw).serialized())
            if (!tmp.renameTo(progressFile)) {
                progressFile.writeText(JSONValue.Obj(document.raw).serialized())
                tmp.delete()
            }
        }
    }

    private fun loadBookkeeping(): SyncBookkeeping =
        prefs.string("syncBookkeeping")?.let { runCatching { LectioJson.decodeFromString(SyncBookkeeping.serializer(), it) }.getOrNull() } ?: SyncBookkeeping()

    /* ------------------------------------------------------------------ */
    /* Account and sync                                                     */
    /* ------------------------------------------------------------------ */

    val isSignedIn: Boolean get() = account != null

    /** Restores a saved session at launch. */
    suspend fun restoreSession() {
        val session = auth.session ?: return
        account = Account(session.userId, session.email)
        loadProfile(session)
        reconcile()
        startPullLoop()
    }

    suspend fun signIn(email: String, password: String) {
        val session = try {
            auth.signIn(email, password)
        } catch (e: SupabaseError) {
            // Deliberately vague, as on the web: which half was wrong is information about which emails have accounts.
            if (e.status == 400 || e.status == 401) throw SupabaseError(e.status, e.code, "That email and password do not match an account.")
            throw e
        }
        account = Account(session.userId, session.email)
        loadProfile(session)
        reconcile()
        startPullLoop()
    }

    enum class SignUpOutcome { SignedIn, CheckEmail }

    suspend fun signUp(email: String, password: String, displayName: String, role: String): SignUpOutcome {
        val result = auth.signUp(email, password, displayName, role, AppConfig.authCallbackUrl)
        val session = (result as? SupabaseAPI.SignUpResult.SignedIn)?.session ?: return SignUpOutcome.CheckEmail
        account = Account(session.userId, session.email)
        loadProfile(session)
        reconcile()
        startPullLoop()
        return SignUpOutcome.SignedIn
    }

    /**
     * A link back from an account email, opened on this device. A link carrying
     * a session signs the student in without typing the password; the
     * website's "confirmed" and "password changed" pages just say so and point
     * to Account. Anything else says why not.
     */
    suspend fun completeEmailLink(callback: AuthCallback) {
        when (callback) {
            is AuthCallback.Session -> {
                if (account != null) {
                    authNotice = "Your email is confirmed."
                    return
                }
                try {
                    val session = auth.signIn(callback.refreshToken)
                    account = Account(session.userId, session.email)
                    loadProfile(session)
                    reconcile()
                    startPullLoop()
                    authNotice = "Your email is confirmed and you’re signed in. Your progress now syncs with the website."
                } catch (_: Exception) {
                    selectedTab = AppTab.Settings
                    authNotice = "Your email is confirmed. Sign in with your email and password under Account."
                }
            }
            AuthCallback.Confirmed -> {
                if (account != null) {
                    authNotice = "Your email is confirmed."
                    return
                }
                selectedTab = AppTab.Settings
                authNotice = "Your email is confirmed. Sign in with your email and password under Account."
            }
            AuthCallback.PasswordReset -> {
                if (account != null) {
                    authNotice = "Your password is changed. You’re still signed in here."
                    return
                }
                selectedTab = AppTab.Settings
                authNotice = "Your password is changed. Sign in with the new one under Account."
            }
            is AuthCallback.Failed -> {
                if (account != null) return
                selectedTab = AppTab.Settings
                authNotice = "${callback.message}. If you’ve already confirmed your email, sign in with your password under Account."
            }
        }
    }

    /**
     * Signs out. This device's progress stays, as on the web, and stays marked
     * as the previous account's, so a different account signing in next
     * replaces it rather than merging someone else's history in.
     */
    suspend fun signOut() {
        pushNowIfPending()
        stopPullLoop()
        auth.signOut()
        account = null
        syncStatus = SyncStatus.Idle
    }

    /** Permanently deletes the account on the server (the `delete_own_account` function cascades through every table), then signs out here. */
    suspend fun deleteAccount() {
        val token = auth.accessToken()
        auth.api.rpc("delete_own_account", JSONObject(), token)
        stopPullLoop()
        pushJob?.cancel()
        auth.forget()
        account = null
        syncStatus = SyncStatus.Idle
        // The cloud copy is gone; this device's copy is no longer tied to it.
        bookkeeping = SyncBookkeeping()
    }

    /** Reads the profile, creating it from signup metadata if the row is missing: the same backfill the web's sign-in does. */
    private suspend fun loadProfile(session: AuthSession) {
        try {
            val token = auth.accessToken()
            val existing = auth.api.profile(session.userId, token)
            if (existing != null) {
                account = account?.copy(profile = existing)
                return
            }
            val role = if (session.role == "teacher") "teacher" else "student"
            val name = (session.displayName ?: session.email?.substringBefore("@") ?: "Student").take(60)
            val profile = Profile(session.userId, role, name)
            auth.api.insertProfile(profile, token)
            account = account?.copy(profile = profile)
        } catch (e: SupabaseError) {
            if (e.isAuthFailure) sessionExpired()
        } catch (_: Exception) {
        }
    }

    suspend fun reconcile() {
        val userId = account?.userId ?: return
        syncStatus = SyncStatus.Syncing
        try {
            val token = auth.accessToken()
            // A failed pull aborts: treating "couldn't reach the server" as "no cloud row" would push this device's copy over the real one.
            val cloud = auth.api.pullProgress(token)
            val plan = CloudSync.reconcile(userId, progress, bookkeeping, cloud)
            applySynced(plan.local)
            var syncedAt = plan.fallbackSyncedAt
            plan.push?.let { push -> upload(push, token)?.let { syncedAt = it } }
            bookkeeping = SyncBookkeeping(userId, syncedAt)
            syncStatus = SyncStatus.Synced(Instant.now())
        } catch (e: Exception) {
            handleSyncError(e)
        }
    }

    /** Debounced push after a local edit, only once reconcile has confirmed the local data belongs to this account. */
    fun schedulePush() {
        val userId = account?.userId ?: return
        if (bookkeeping.lastSyncedUserId != userId) return
        pushJob?.cancel()
        pushJob = scope.launch {
            delay(PUSH_DEBOUNCE_MS)
            pushNow()
        }
    }

    fun pushNowIfPending() {
        if (pushJob == null) return
        pushJob?.cancel()
        pushJob = scope.launch { pushNow() }
    }

    private suspend fun pushNow() {
        pushJob = null
        val userId = account?.userId ?: return
        if (bookkeeping.lastSyncedUserId != userId) return
        try {
            val token = auth.accessToken()
            syncStatus = SyncStatus.Syncing
            val pushedAt = upload(progress, token)
            if (pushedAt != null) {
                bookkeeping = bookkeeping.copy(lastSyncedAt = pushedAt)
                syncStatus = SyncStatus.Synced(Instant.now())
            } else {
                syncStatus = SyncStatus.Offline("Couldn't reach the server — your progress is saved on this device.")
            }
        } catch (e: Exception) {
            handleSyncError(e)
        }
    }

    /** Uploads and returns the `updated_at` written, or null on failure. */
    private suspend fun upload(document: ProgressDocument, token: String): String? {
        val updatedAt = StudyDates.isoTimestamp(Instant.now())
        return try {
            auth.api.pushProgress(document.raw, updatedAt, token)
            updatedAt
        } catch (_: Exception) {
            null
        }
    }

    suspend fun pull() {
        val userId = account?.userId ?: return
        if (bookkeeping.lastSyncedUserId != userId) return
        try {
            val token = auth.accessToken()
            val cloud = auth.api.pullProgress(token) ?: return
            val merged = CloudSync.mergePulled(userId, progress, bookkeeping, cloud)
            if (merged == null) {
                syncStatus = SyncStatus.Synced(Instant.now())
                return
            }
            applySynced(merged)
            bookkeeping = bookkeeping.copy(lastSyncedAt = cloud.updatedAt)
            syncStatus = SyncStatus.Synced(Instant.now())
            // Local held something the cloud didn't: send the union back.
            if (merged.raw != ProgressDocument(cloud.data).raw) schedulePush()
        } catch (e: Exception) {
            handleSyncError(e)
        }
    }

    suspend fun syncOnForeground() {
        when {
            account == null -> restoreSession()
            bookkeeping.lastSyncedUserId != account?.userId -> reconcile()
            else -> pull()
        }
    }

    private fun startPullLoop() {
        pullLoop?.cancel()
        pullLoop = scope.launch {
            while (true) {
                delay(PULL_INTERVAL_MS)
                if (sceneActive) pull()
            }
        }
    }

    private fun stopPullLoop() {
        pullLoop?.cancel()
        pullLoop = null
    }

    /** Replaces local progress with a sync result without echoing it back up. */
    private fun applySynced(document: ProgressDocument) {
        if (document.raw == progress.raw) return
        applyingSync = true
        applyProgress(document)
        progressChanged()
        applyingSync = false
    }

    private suspend fun handleSyncError(e: Exception) {
        if (e is SupabaseError && e.isAuthFailure) sessionExpired()
        else syncStatus = SyncStatus.Offline("Couldn't reach the server — your progress is saved on this device.")
    }

    /** The server no longer accepts this session (password changed, account deleted elsewhere). Sign out locally and say so. */
    private suspend fun sessionExpired() {
        stopPullLoop()
        auth.forget()
        account = null
        syncStatus = SyncStatus.Offline("You've been signed out. Sign in again to keep syncing.")
    }

    /** A graded result for the teacher's roster (`bump_activity_stats`). Best effort; never blocks or fails the local recording. */
    fun reportActivity(source: String, correct: Double, total: Double) {
        if (account == null || total <= 0) return
        scope.launch {
            val token = runCatching { auth.accessToken() }.getOrNull() ?: return@launch
            runCatching {
                auth.api.rpc(
                    "bump_activity_stats",
                    JSONObject(
                        "p_day" to JSONValue.Str(StudyDates.today()), "p_source" to JSONValue.Str(source),
                        "p_correct" to JSONValue.Num(correct), "p_total" to JSONValue.Num(total),
                    ),
                    token,
                )
            }
        }
    }

    /* ------------------------------------------------------------------ */
    /* The course                                                           */
    /* ------------------------------------------------------------------ */

    /** Lesson ids finished. */
    val courseDone: Set<String> get() = progress.lessons.keys

    /** The grammar lesson to do next, from the student's starting point. */
    val nextCourseLesson: LessonPlace? get() = content?.course?.next(courseDone, progress.learner?.startLessonId)

    /** Vocabulary units the level check found probably known. */
    val knownVocabUnits: List<String> get() = progress.learner?.knownVocabUnits ?: emptyList()

    /** The vocabulary lesson to do next (Verba, the AP list by letter), adapted to the words already known. */
    val nextVocabLesson: LessonPlace? get() = content?.course?.nextWords(courseDone, vocab, knownVocabUnits)

    /** The lesson most worth another go: the most recent one tried with a best under 60%. Unit tests aside: they're retaken from their unit. */
    val shakyLesson: LessonPlace?
        get() {
            val course = content?.course ?: return null
            val ids = course.lessons.filter { !it.lesson.isTest }.map { it.lesson.id }
            return Path.shakyLesson(ids, progress.lessons)?.let { course.place(it) }
        }

    /** Grammar lessons finished, and how many there are. */
    val grammarProgress: Pair<Int, Int>
        get() {
            val lessons = content?.course?.grammarLessons ?: emptyList()
            val done = courseDone
            return lessons.count { it.lesson.id in done } to lessons.size
        }

    /** The AP-list words that are well known (a mature card), out of the list. */
    val wordsKnown: Pair<Int, Int>
        get() = vocab.values.count { it.interval >= Path.knownInterval } to (content?.coreVocabulary?.size ?: 0)

    /** The level check's answers: the grammar start, and the vocabulary units probably known. A student who hasn't onboarded gets a profile. */
    fun applyLevelCheck(startLessonId: String?, knownVocabUnits: List<String>) {
        update { doc ->
            var profile = doc.learner ?: LearnerProfile("some", null, StudyDates.isoTimestamp(Instant.now()))
            if (startLessonId != null) profile = profile.copy(startLessonId = startLessonId)
            profile = profile.copy(knownVocabUnits = knownVocabUnits.ifEmpty { null })
            doc.setLearner(profile)
        }
    }

    private val hasApWork: Boolean
        get() = progress.quizAttempts.isNotEmpty() || !(progress.raw["passages"]?.objectValue?.isEmpty ?: true)

    /** Whether the phone's tab bar leads with the course rather than the Quiz Engine. A beginner gets the course; someone already doing AP work (or who said so) keeps the quiz. */
    val courseInTabBar: Boolean
        get() {
            progress.learner?.track?.let { return it == "new" || it == "some" }
            if (progress.lessons.isNotEmpty()) return true
            return !hasApWork
        }

    /** Whether Today leads with the course instead of the exam countdown: a student who chose the course, or who has only done lessons so far. */
    val courseFirstOnToday: Boolean
        get() {
            if (content?.course?.grammarLessons?.isEmpty() != false) return false
            progress.learner?.track?.let { return it == "new" || it == "some" }
            return progress.lessons.isNotEmpty() && !hasApWork
        }

    /** The phone tab bar, in order. Search is always last. */
    val phoneTabs: List<AppTab> get() = listOf(AppTab.Today, if (courseInTabBar) AppTab.Learn else AppTab.Quiz, AppTab.Read, AppTab.Vocab, AppTab.Search)

    /** Opens a lesson over whatever is on screen. */
    fun openLesson(id: String) {
        activeLesson = content?.course?.place(id) ?: return
    }

    val canReview: Boolean get() = content?.course?.reviewable(progress.lessons)?.isNotEmpty() == true

    /** A review: ten exercises from finished lessons, weighted toward the weak and the long-ago, opened like any lesson. */
    fun openReview() {
        val course = content?.course ?: return
        activeLesson = course.review(progress.lessons)
    }

    /** A round of derivatives questions, opened like any lesson. */
    fun openDerivatives() {
        val course = content?.course ?: return
        activeLesson = course.derivativesLesson(progress.lessons)
    }

    /** A round of the sentence builder, opened like any lesson. */
    fun openSentences() {
        val library = content ?: return
        activeLesson = library.sentences.lesson(progress.lessons)
    }

    /** Today's date on this device's clock: the Sententia's day. */
    val dailyDay: String get() = Daily.localDay()

    /** The Sententia of the day, or null for content that predates it. */
    val todaysSententia: Sententia? get() = content?.let { Daily.sententia(dailyDay, it.sententiae) }

    /** Days in a row with the Sententia done. */
    val dailyStreak: Int get() = Daily.streak(progress.daily, dailyDay)

    /** Opens today's Sententia over whatever is on screen. */
    fun openDaily() {
        val line = todaysSententia ?: return
        activeLesson = Daily.lesson(line, dailyDay)
    }

    /**
     * A lesson finished: its score, its words into the deck, the day counted. A
     * review counts the day but isn't a lesson, so it records nothing else; the
     * Sententia records its own day.
     */
    fun completeLesson(lesson: Lesson, score: Double) {
        if (CourseIds.isReview(lesson.id) || CourseIds.isDerivatives(lesson.id) || SentenceBuilder.isSentences(lesson.id)) {
            update { it.markStudied() }
            refreshWidgets()
            return
        }
        if (Daily.isDaily(lesson.id)) {
            val day = Daily.day(lesson.id)
            val id = content?.let { Daily.sententia(day, it.sententiae)?.id } ?: ""
            update { it.completeDaily(day, id, score) }
            refreshWidgets()
            return
        }
        // A unit test passed counts its whole unit as done, and puts the unit's words in the deck as known.
        val unitLessons: List<PathLesson>? = if (lesson.isTest && Path.testPassed(score)) {
            content?.course?.place(lesson.id)?.let { content?.course?.pathLessons(it.unit.id) }
        } else {
            null
        }
        update { doc ->
            doc.completeLesson(lesson.id, score, lesson.vocabIds)
            if (unitLessons != null) doc.passUnitTest(unitLessons, score)
        }
        refreshWidgets()
    }

    /* ------------------------------------------------------------------ */
    /* Study time: the web's useStudyTimeSync                                */
    /* ------------------------------------------------------------------ */

    /** The web's assignable section id for a tab, or null for chrome. */
    private fun studySection(tab: AppTab): String? = when (tab) {
        AppTab.Read -> "read"
        AppTab.Translate -> "translate"
        AppTab.Sight -> "sight"
        AppTab.Quiz -> "quiz"
        AppTab.Vocab -> "vocab"
        AppTab.Grammar -> "grammar"
        AppTab.Scansion -> "scansion"
        AppTab.Devices -> "devices"
        AppTab.Context -> "context"
        AppTab.Frq -> "frq"
        AppTab.Exam -> "exam"
        AppTab.Plan -> "plan"
        AppTab.Learn -> "learn"
        AppTab.Forge -> "forge"
        AppTab.Today, AppTab.Classroom, AppTab.Settings, AppTab.Search, AppTab.Laurels -> null
    }

    val dailyGoalSeconds: Double get() = progress.studyPlan.minutesPerDay * 60.0

    private fun restoreStudyDay() {
        studyGoalDate = prefs.string("studyGoalDate") ?: StudyDates.today()
        goalCelebratedDate = prefs.string("goalCelebratedDate")
        studySecondsToday = if (studyGoalDate == StudyDates.today()) prefs.double("studySecondsToday", 0.0) else 0.0
    }

    /** The section time is counting toward now: a lesson open over any tab counts as the course, the Sententia of the day as "daily". */
    private val currentStudySection: String?
        get() = activeLesson?.let { if (Daily.isDaily(it.id)) "daily" else "learn" } ?: studySection(selectedTab)

    private fun startStudyTicker() {
        studyTicker?.cancel()
        pendingStudySection = currentStudySection
        studyTicker = scope.launch {
            var sinceFlush = 0.0
            while (true) {
                delay(1000)
                if (!sceneActive) continue
                val section = currentStudySection ?: continue
                pendingStudySection = section
                pendingStudySeconds += 1
                addStudySeconds(1.0)
                sinceFlush += 1
                if (sinceFlush >= STUDY_FLUSH_SECONDS) {
                    sinceFlush = 0.0
                    flushStudyTime()
                }
            }
        }
    }

    private fun stopStudyTicker() {
        studyTicker?.cancel()
        studyTicker = null
    }

    private fun studySectionChanged() {
        flushStudyTime()
        pendingStudySection = currentStudySection
    }

    /** Sends accrued seconds under the section they were spent on. */
    fun flushStudyTime() {
        val seconds = pendingStudySeconds
        val section = pendingStudySection
        pendingStudySeconds = 0.0
        if (seconds <= 0 || section == null || account == null) return
        scope.launch {
            val token = runCatching { auth.accessToken() }.getOrNull() ?: return@launch
            runCatching {
                auth.api.rpc(
                    "bump_study_seconds",
                    JSONObject(
                        "p_section" to JSONValue.Str(section), "p_day" to JSONValue.Str(StudyDates.today()),
                        "p_delta" to JSONValue.Num(seconds.roundToLong().toDouble()),
                    ),
                    token,
                )
            }
        }
    }

    /** Adds to today's tally, rolling over on a new day and flagging the moment the daily goal is first crossed: the web's `addStudySeconds`. */
    fun addStudySeconds(seconds: Double) {
        val today = StudyDates.today()
        val before = if (studyGoalDate == today) studySecondsToday else 0.0
        val after = before + seconds
        val goal = dailyGoalSeconds
        if (goal > 0 && before < goal && after >= goal && goalCelebratedDate != today) {
            goalCelebratedDate = today
            goalJustReached = true
            prefs.put("goalCelebratedDate", today)
            update { it.markStudied() }
        }
        studyGoalDate = today
        studySecondsToday = after
        prefs.put("studyGoalDate", today)
        prefs.put("studySecondsToday", after)
    }

    /* ------------------------------------------------------------------ */
    /* Classrooms: the same tables and functions the website's pages use     */
    /* ------------------------------------------------------------------ */

    data class Classroom(val id: String, val name: String, val joinCode: String?, val examDate: String?, val archived: Boolean)
    data class Assignment(val id: String, val section: String, val targetMinutes: Int, val dueDate: String?, val note: String?)
    data class LeaderRow(val id: String, val name: String, val seconds: Double, val correct: Double, val total: Double)
    data class ClassroomDetail(
        val assignments: List<Assignment>,
        /** Student -> section -> seconds, for the signed-in student (or every student, for a teacher). */
        val sectionSeconds: Map<String, Map<String, Double>>,
        val leaderboard: List<LeaderRow>,
    )

    suspend fun classrooms(): List<Classroom> {
        val token = auth.accessToken()
        val rows = auth.api.select("classrooms", listOf("select" to "id,name,join_code,exam_date,archived", "order" to "created_at.asc"), token)
        return rows.mapNotNull { r ->
            val id = r["id"]?.stringValue ?: return@mapNotNull null
            val name = r["name"]?.stringValue ?: return@mapNotNull null
            Classroom(id, name, r["join_code"]?.stringValue, r["exam_date"]?.stringValue, r["archived"]?.boolValue ?: false)
        }
    }

    /** Redeems a join code; returns the classroom's name. The database's own messages are written for students and passed through as-is. */
    suspend fun joinClassroom(code: String): String {
        val token = auth.accessToken()
        val rows = auth.api.rpcRows("join_classroom", JSONObject("code" to JSONValue.Str(code)), token)
        return rows.firstOrNull()?.get("classroom_name")?.stringValue ?: "your classroom"
    }

    suspend fun leaveClassroom(id: String) {
        val userId = account?.userId ?: return
        val token = auth.accessToken()
        auth.api.delete("classroom_members", listOf("classroom_id" to "eq.$id", "student_id" to "eq.$userId"), token)
    }

    /** A teacher takes a student off the roster, as the website's Teach page does. */
    suspend fun removeStudent(studentId: String, classroomId: String) {
        val token = auth.accessToken()
        auth.api.delete("classroom_members", listOf("classroom_id" to "eq.$classroomId", "student_id" to "eq.$studentId"), token)
    }

    suspend fun classroomDetail(id: String): ClassroomDetail = withContext(Dispatchers.IO) {
        val token = auth.accessToken()
        val assignmentRows = async {
            auth.api.select(
                "assignments",
                listOf("classroom_id" to "eq.$id", "select" to "id,section,target_minutes,due_date,note", "order" to "due_date.asc.nullslast"), token,
            )
        }
        val timeRows = async { auth.api.rpcRows("classroom_section_time", JSONObject("cid" to JSONValue.Str(id)), token) }
        val boardRows = async { auth.api.rpcRows("classroom_leaderboard", JSONObject("cid" to JSONValue.Str(id)), token) }

        val assignments = assignmentRows.await().mapNotNull { r ->
            val aid = r["id"]?.stringValue ?: return@mapNotNull null
            val section = r["section"]?.stringValue ?: return@mapNotNull null
            Assignment(aid, section, r["target_minutes"]?.intValue ?: 0, r["due_date"]?.stringValue, r["note"]?.stringValue)
        }
        val seconds = HashMap<String, MutableMap<String, Double>>()
        for (r in timeRows.await()) {
            val student = r["student_id"]?.stringValue ?: continue
            val section = r["section"]?.stringValue ?: continue
            seconds.getOrPut(student) { HashMap() }[section] = number(r["seconds"])
        }
        val board = boardRows.await().mapNotNull { r ->
            val sid = r["student_id"]?.stringValue ?: return@mapNotNull null
            LeaderRow(sid, r["display_name"]?.stringValue ?: "Student", number(r["total_seconds"]), number(r["overall_correct"]), number(r["overall_total"]))
        }
        // Ranked by time studied, not accuracy, as on the website: three perfect answers shouldn't outrank three hundred at 90%.
        ClassroomDetail(assignments, seconds, board.sortedByDescending { it.seconds })
    }

    /** PostgREST returns bigint and numeric columns as JSON numbers or, for very large values, strings. */
    private fun number(v: JSONValue?): Double = v?.doubleValue ?: v?.stringValue?.toDoubleOrNull() ?: 0.0

    /* ------------------------------------------------------------------ */
    /* The first run                                                        */
    /* ------------------------------------------------------------------ */

    /**
     * A first launch with nothing to show for it: no account, no lessons, no
     * deck, no quiz answers, no passages opened. Anyone who already has work
     * (synced from the website or from before this screen existed) goes
     * straight in.
     */
    val needsOnboarding: Boolean
        get() {
            if (prefs.bool("showOnboarding")) return true
            if (prefs.bool("seedDemo")) return false
            if (prefs.bool(ONBOARDED_KEY)) return false
            if (account != null) return false
            val p = progress
            return p.learner == null && p.lessons.isEmpty() && p.vocab.isEmpty() && p.quizAttempts.isEmpty() &&
                (p.raw["passages"]?.objectValue?.isEmpty ?: true)
        }

    /**
     * Records what the student chose (null when they skipped) and takes them to
     * the right first screen: the course (into the first lesson when
     * [openStart]), Today for an AP student, Classroom for a teacher.
     */
    fun finishOnboarding(profile: LearnerProfile?, minutes: Int? = null, openStart: Boolean = false) {
        prefs.put(ONBOARDED_KEY, true)
        prefs.remove("showOnboarding")
        if (profile != null) {
            update { doc ->
                doc.setLearner(profile)
                if (minutes != null) doc.setStudyPlan(minutesPerDay = minutes)
            }
        }
        showOnboarding = false
        if (profile == null) return
        scope.launch {
            delay(350)
            when (profile.track) {
                "new", "some" -> {
                    selectedTab = AppTab.Learn
                    val start = profile.startLessonId
                    if (openStart && start != null) openLesson(start)
                }
                "ap" -> selectedTab = AppTab.Today
                "teacher" -> selectedTab = AppTab.Classroom
            }
        }
    }

    /* ------------------------------------------------------------------ */
    /* Widgets and the daily reminder                                       */
    /* ------------------------------------------------------------------ */

    /** Writes what the widgets need and asks them to redraw. Cheap: a list of due dates and recent study days. */
    fun refreshWidgets() {
        val library = content
        val snapshot = WidgetSnapshot(
            examDate = library?.meta?.examDate ?: "2027-05-14",
            dueDates = vocab.values.map { it.due },
            studyDays = progress.studyDays.sorted().takeLast(60),
            goalMinutes = progress.studyPlan.minutesPerDay,
            studySeconds = studySecondsToday,
            studyDay = studyGoalDate,
            lines = upcomingLines,
            dailyDone = progress.daily.keys.sorted().takeLast(10),
            nextLesson = nextCourseLesson?.let {
                WidgetSnapshot.NextLesson(it.lesson.id, "${it.level.title} ${it.unit.n}.${it.number}", Rich.plain(it.lesson.title))
            },
        )
        if (snapshot == lastWidgetSnapshot) return
        lastWidgetSnapshot = snapshot
        WidgetBridge.publish(app, snapshot)
    }

    /** The Sententia for today and the next six days, for the widget. */
    private val upcomingLines: List<WidgetSnapshot.DayLine>?
        get() {
            val list = content?.sententiae ?: return null
            if (list.isEmpty()) return null
            val today = dailyDay
            return (0 until 7).mapNotNull { n ->
                val day = Daily.shift(today, n)
                Daily.sententia(day, list)?.let { WidgetSnapshot.DayLine(day, it.latin, it.english, Rich.plain(it.source)) }
            }
        }

    var reminderEnabled: Boolean
        get() = prefs.bool("reminderEnabled")
        set(value) = prefs.put("reminderEnabled", value)

    /** Minutes after midnight, local time. Defaults to 4pm, after school. */
    var reminderMinutes: Int
        get() = prefs.int("reminderMinutes", 16 * 60)
        set(value) = prefs.put("reminderMinutes", value)

    /** (Re)schedules the reminder; the notification itself works out the day's numbers when it fires (see [Reminders]). */
    fun rescheduleReminder() = Reminders.reschedule(app, reminderEnabled, reminderMinutes)

    /* ------------------------------------------------------------------ */
    /* Sample progress, for screenshots                                       */
    /* ------------------------------------------------------------------ */

    /** A few weeks of study, a part-way deck, graded work and the first two lessons, so a fresh install has something on every screen. */
    fun loadSampleProgress() {
        val library = content ?: return
        // The same point in the day on every run, so every screenshot agrees.
        studySecondsToday = 18 * 60.0
        studyGoalDate = StudyDates.today()
        if (progress.vocab.isNotEmpty()) return
        val now = Instant.now()
        val zone = java.time.ZoneId.systemDefault()
        update { doc ->
            // A deck part-way through unit 4, some of it due.
            val words = library.coreVocabulary.filter { "4" in it.units }.take(60)
            doc.seedVocab(words.map { it.id }, now)
            words.forEachIndexed { i, w ->
                if (i % 3 == 0) return@forEachIndexed
                val then = now.minusSeconds((i % 9) * 86_400L)
                doc.reviewVocab(w.id, if (i % 7 == 0) 0 else 4, then, zone)
            }
            // A few weeks of study, and graded work across all three skills.
            for (d in 0 until 12) if (d % 5 != 4) doc.markStudied(now.minusSeconds(d * 86_400L))
            library.questions.take(40).forEachIndexed { i, q ->
                val chosen = if (i % 4 == 0) (q.options.firstOrNull { it.id != q.answerId }?.id ?: q.answerId) else q.answerId
                doc.recordQuiz(q.id, chosen == q.answerId, chosen, q.type, q.skillCategory, q.unit, q.passageId, null, now)
            }
            // Two lessons into the course.
            for ((id, score) in listOf("prima-1-1" to 0.92, "prima-1-2" to 0.85)) {
                library.course.place(id)?.lesson?.let { doc.completeLesson(id, score, it.vocabIds, now) }
            }
            // The Sententia done the last three days, not yet today.
            for (d in 1..3) {
                val then = now.minusSeconds(d * 86_400L)
                val day = Daily.localDay(then, zone)
                Daily.sententia(day, library.sententiae)?.let { doc.completeDaily(day, it.id, 1.0, then) }
            }
            library.passage("aen-1-1-33")?.let { aeneid ->
                doc.markOpened(aeneid.id, now)
                doc.toggleBookmark(aeneid.id)
                aeneid.lines.firstOrNull()?.let { line ->
                    doc.setHighlight(aeneid.id, line.n, 0, 2, line.tokens.take(3).joinToString("") { it.text }, "gilt", now)
                }
            }
        }
    }

    /** The grammar topic open in Grammar & Syntax (from a search result), if any. */
    var grammarTopicId: String? by mutableStateOf(null)

    /** Where Back goes from a section that isn't a tab: the screen it was opened from (Browse), else Today. */
    var backTarget: AppTab? by mutableStateOf(null)

    /** Opens a section, remembering where Back should return to. */
    fun openSection(tab: AppTab, from: AppTab? = null) {
        backTarget = from
        selectedTab = tab
    }

    fun openGrammarTopic(id: String) {
        grammarTopicId = id
        openSection(AppTab.Grammar, from = AppTab.Search)
    }

    /* Deep links */

    private var pendingLink: String? = null

    /**
     * A lectio:// link: the sign-up confirmation email returns here, and so do
     * the widgets, the launcher shortcuts and the notifications. lectio://vocab,
     * lectio://read/<passage-id>, lectio://learn/<lesson-id>, learn/daily,
     * learn/review, learn/next.
     */
    fun handleLink(url: String) {
        val library = content
        if (library == null) {
            pendingLink = url
            return
        }
        AuthCallback.parse(url)?.let { callback ->
            scope.launch { completeEmailLink(callback) }
            return
        }
        val uri = runCatching { java.net.URI(url) }.getOrNull() ?: return
        if (uri.scheme != "lectio") return
        open(uri.host, uri.path?.trim('/') ?: "")
    }

    fun open(host: String?, path: String) {
        val library = content ?: return
        val tab = AppTab.fromHost(host) ?: return
        selectedTab = tab
        if (tab == AppTab.Read && path.isNotEmpty()) library.passage(path)?.let { readPassageId = it.id }
        // lectio://learn/<lesson-id> opens that lesson; learn/daily the Sententia of the day, learn/review a review, learn/next the next lesson of the course.
        if (tab == AppTab.Learn && path.isNotEmpty()) {
            when (path) {
                "daily" -> openDaily()
                "review" -> openReview()
                "sentences" -> openSentences()
                "derivatives" -> openDerivatives()
                "next" -> nextCourseLesson?.let { openLesson(it.lesson.id) }
                else -> openLesson(path)
            }
        }
    }

    /** Opens a passage in the Reading Room. */
    fun openPassage(passage: Passage) {
        readPassageId = passage.id
        selectedTab = AppTab.Read
    }

    fun destroy() {
        scope.cancel()
    }

    companion object {
        const val PUSH_DEBOUNCE_MS = 2500L
        const val PULL_INTERVAL_MS = 90_000L
        const val STUDY_FLUSH_SECONDS = 30.0
        private const val ONBOARDED_KEY = "onboarded"
    }
}
