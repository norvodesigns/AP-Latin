package com.norvodesigns.lectio

import android.app.Application
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.ProcessLifecycleOwner

class LectioApplication : Application() {
    lateinit var model: AppModel
        private set

    override fun onCreate() {
        super.onCreate()
        model = AppModel(this)
        // Study time counts only while the app is on screen, and progress is saved the moment it isn't.
        ProcessLifecycleOwner.get().lifecycle.addObserver(object : DefaultLifecycleObserver {
            override fun onStart(owner: LifecycleOwner) = model.sceneBecameActive()
            override fun onStop(owner: LifecycleOwner) = model.sceneResignedActive()
        })
    }
}
