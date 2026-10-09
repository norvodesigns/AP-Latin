package com.norvodesigns.lectio.wear

import com.google.android.gms.wearable.DataEvent
import com.google.android.gms.wearable.DataEventBuffer
import com.google.android.gms.wearable.WearableListenerService
import com.norvodesigns.lectio.core.WatchDeck
import com.norvodesigns.lectio.core.WatchPaths

/** The phone's deck of due cards, whenever it sends a new one. */
class DeckListenerService : WearableListenerService() {
    override fun onDataChanged(events: DataEventBuffer) {
        for (event in events) {
            if (event.type != DataEvent.TYPE_CHANGED || event.dataItem.uri.path != WatchPaths.DECK) continue
            val deck = event.dataItem.data?.let { WatchDeck.fromJson(it.toString(Charsets.UTF_8)) } ?: continue
            WatchStore.get(this).receive(deck)
        }
    }
}
