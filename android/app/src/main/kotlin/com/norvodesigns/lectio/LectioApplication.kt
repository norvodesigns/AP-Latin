package com.norvodesigns.lectio

import android.app.Application
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.ProcessLifecycleOwner

class LectioApplication : Application() {
    /**
     * Made on first use rather than in onCreate: the process also starts for a
     * widget update, a scheduled job or the watch, and reading the progress
     * file and the Keystore-sealed session needn't hold up those.
     */
    val model: AppModel by lazy { AppModel(this) }

    override fun onCreate() {
        super.onCreate()
        com.norvodesigns.lectio.notifications.ExamNotification.ensureChannel(this)
        com.norvodesigns.lectio.notifications.Reminders.ensureChannel(this)
        com.norvodesigns.lectio.widgets.WidgetRefreshWorker.schedule(this)
        com.norvodesigns.lectio.widgets.MidnightRedraw.schedule(this)
        // Study time counts only while the app is on screen, and progress is saved the moment it isn't.
        ProcessLifecycleOwner.get().lifecycle.addObserver(object : DefaultLifecycleObserver {
            override fun onStart(owner: LifecycleOwner) = model.sceneBecameActive()
            override fun onStop(owner: LifecycleOwner) = model.sceneResignedActive()
        })
    }
}
