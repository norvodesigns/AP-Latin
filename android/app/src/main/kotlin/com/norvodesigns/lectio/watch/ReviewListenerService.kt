package com.norvodesigns.lectio.watch

import android.os.Looper
import com.google.android.gms.wearable.DataEvent
import com.google.android.gms.wearable.DataEventBuffer
import com.google.android.gms.wearable.Node
import com.google.android.gms.wearable.WearableListenerService
import com.norvodesigns.lectio.AppModel
import com.norvodesigns.lectio.LectioApplication
import com.norvodesigns.lectio.core.WatchPaths
import com.norvodesigns.lectio.core.WatchReview
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking

/**
 * Receives the grades made on the watch (queued by the data layer and delivered
 * when the two are next in reach) and applies each, as of when it was made. When
 * a watch connects, it gets today's deck.
 *
 * Play services may start the app's process just for this, with no screen, so
 * the work waits for the course content to load (as iOS starts its watch link
 * only once the content is in), and runs on the main thread like every other
 * change to the model.
 */
class ReviewListenerService : WearableListenerService() {
    private val model get() = (application as LectioApplication).model

    override fun onDataChanged(events: DataEventBuffer) {
        // Copied out now: the buffer is released when this returns.
        val received = events.mapNotNull { event ->
            val path = event.dataItem.uri.path ?: return@mapNotNull null
            if (event.type != DataEvent.TYPE_CHANGED || !path.startsWith(WatchPaths.REVIEW_PREFIX)) return@mapNotNull null
            event.dataItem.uri to event.dataItem.data?.copyOf()
        }
        if (received.isEmpty()) return
        onMain {
            loadContent()
            for ((_, bytes) in received) bytes?.let { WatchReview.fromJson(it.toString(Charsets.UTF_8)) }?.let(::applyWatchReview)
            // On disk before the grades leave the data layer, so a process killed now loses nothing.
            saveNow()
        }
        received.forEach { (uri, _) -> WatchBridge.delete(this, uri) }
    }

    override fun onPeerConnected(peer: Node) {
        onMain {
            loadContent()
            sendWatchDeck(force = true)
        }
    }

    /** Runs [work] on the main thread and waits for it (the callbacks come on a background thread). */
    private fun onMain(work: suspend AppModel.() -> Unit) {
        val model = model
        if (Looper.myLooper() == Looper.getMainLooper()) {
            model.scope.launch { model.work() }
        } else {
            runBlocking(Dispatchers.Main) { model.work() }
        }
    }
}
