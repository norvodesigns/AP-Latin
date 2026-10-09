package com.norvodesigns.lectio.watch

import android.net.Uri
import com.google.android.gms.wearable.DataEvent
import com.google.android.gms.wearable.DataEventBuffer
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.Node
import com.google.android.gms.wearable.WearableListenerService
import com.norvodesigns.lectio.LectioApplication
import com.norvodesigns.lectio.core.WatchPaths
import com.norvodesigns.lectio.core.WatchReview

/**
 * Receives the grades made on the watch (queued by the data layer and delivered
 * when the two are next in reach) and applies each, as of when it was made. When
 * a watch connects, it gets today's deck.
 */
class ReviewListenerService : WearableListenerService() {
    private val model get() = (application as LectioApplication).model

    override fun onDataChanged(events: DataEventBuffer) {
        for (event in events) {
            if (event.type != DataEvent.TYPE_CHANGED) continue
            val path = event.dataItem.uri.path ?: continue
            if (!path.startsWith(WatchPaths.REVIEW_PREFIX)) continue
            val bytes = event.dataItem.data
            val review = bytes?.let { WatchReview.fromJson(it.toString(Charsets.UTF_8)) }
            if (review != null) model.applyWatchReview(review)
            WatchBridge.delete(this, event.dataItem.uri)
        }
    }

    override fun onPeerConnected(peer: Node) {
        model.sendWatchDeck(force = true)
    }
}
