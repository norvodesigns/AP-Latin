package com.norvodesigns.lectio.watch

import android.content.Context
import com.google.android.gms.wearable.PutDataRequest
import com.google.android.gms.wearable.Wearable
import com.norvodesigns.lectio.core.WatchDeck
import com.norvodesigns.lectio.core.WatchPaths

/**
 * The phone's end of the Wear OS link. Sends the watch the cards that are due;
 * every grade the watch sends back arrives in [ReviewListenerService], which
 * hands it to the app to apply with the same SM-2 port as everything else.
 *
 * All best effort: a phone without Google Play services, or without a watch,
 * simply has nobody to send to.
 */
object WatchBridge {
    /** Replaces the watch's deck. A newer item supersedes an undelivered older one, and an unchanged deck isn't sent twice. */
    fun send(context: Context, deck: WatchDeck) {
        runCatching {
            val request = PutDataRequest.create(WatchPaths.DECK).setData(deck.toJson().toByteArray(Charsets.UTF_8)).setUrgent()
            Wearable.getDataClient(context.applicationContext).putDataItem(request)
        }
    }

    /** Takes a handled grade off the data layer so it isn't applied twice. */
    fun delete(context: Context, uri: android.net.Uri) {
        runCatching { Wearable.getDataClient(context.applicationContext).deleteDataItems(uri) }
    }
}
