package com.norvodesigns.lectio.wear

import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.wear.watchface.complications.datasource.ComplicationDataSourceUpdateRequester
import com.google.android.gms.wearable.PutDataRequest
import com.google.android.gms.wearable.Wearable
import com.norvodesigns.lectio.core.WatchDeck
import com.norvodesigns.lectio.core.WatchPaths
import com.norvodesigns.lectio.core.WatchReview
import android.content.ComponentName
import java.util.UUID

/**
 * What the watch knows: the phone's last deck, and where this session is in it.
 * The phone owns the schedule. It sends the due cards here and applies each grade
 * sent back, so the watch works offline and nothing is ever scheduled twice.
 */
class WatchStore private constructor(context: Context) {
    private val app = context.applicationContext
    private val prefs = app.getSharedPreferences("watch", Context.MODE_PRIVATE)

    var deck by mutableStateOf<WatchDeck?>(null)
        private set

    /** Card ids still to go this session, in order. */
    var queue by mutableStateOf<List<String>>(emptyList())
        private set
    var reviewed by mutableIntStateOf(0)
        private set

    /** Cards missed this session: the phone reschedules a miss for tomorrow and drops it from the next deck, but it still comes back once more before this session ends. */
    private val retry = HashMap<String, WatchDeck.Card>()

    init {
        prefs.getString("deck", null)?.let { WatchDeck.fromJson(it) }?.let { receive(it, save = false) }
    }

    fun card(id: String): WatchDeck.Card? = deck?.cards?.firstOrNull { it.id == id } ?: retry[id]

    fun receive(next: WatchDeck, save: Boolean = true) {
        deck = next
        if (save) prefs.edit().putString("deck", next.toJson()).apply()
        // Keep the current session's order; add anything new at the end.
        val ids = next.cards.map { it.id }
        queue = queue.filter { it in ids || it in retry } + ids.filter { it !in queue }
        publish()
    }

    fun grade(id: String, quality: Int) {
        // Queued by the data layer and delivered when the phone is next in reach.
        runCatching {
            val review = WatchReview(id, quality)
            val request = PutDataRequest.create(WatchPaths.REVIEW_PREFIX + UUID.randomUUID()).setData(review.toJson().toByteArray(Charsets.UTF_8)).setUrgent()
            Wearable.getDataClient(app).putDataItem(request)
        }
        reviewed++
        val graded = card(id)
        queue = queue.filter { it != id }
        retry.remove(id)
        // A miss comes back at the end of this session, as on the phone.
        if (quality < 3 && graded != null) {
            retry[id] = graded
            queue = queue + id
        }
        publish()
    }

    /** What the complication shows: cards left in this session. */
    val cardsLeft: Int get() = queue.size

    private fun publish() {
        val current = deck ?: return
        prefs.edit().putInt("cardsLeft", queue.size).putInt("streak", current.streak).putInt("days", current.daysUntilExam).apply()
        runCatching {
            ComplicationDataSourceUpdateRequester.create(app, ComponentName(app, CardsComplicationService::class.java)).requestUpdateAll()
        }
    }

    companion object {
        @Volatile private var instance: WatchStore? = null
        fun get(context: Context): WatchStore = instance ?: synchronized(this) { instance ?: WatchStore(context).also { instance = it } }
    }
}
