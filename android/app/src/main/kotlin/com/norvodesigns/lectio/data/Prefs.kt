package com.norvodesigns.lectio.data

import android.content.Context
import android.content.SharedPreferences
import androidx.core.content.edit

/** Device-only settings (appearance, the daily reminder, today's study time): the app's `UserDefaults`. */
class Prefs(context: Context) {
    private val sp: SharedPreferences = context.getSharedPreferences("lectio", Context.MODE_PRIVATE)

    fun string(key: String): String? = sp.getString(key, null)
    fun bool(key: String, default: Boolean = false): Boolean = sp.getBoolean(key, default)
    fun int(key: String, default: Int): Int = sp.getInt(key, default)
    fun double(key: String, default: Double = 0.0): Double = if (sp.contains(key)) java.lang.Double.longBitsToDouble(sp.getLong(key, 0)) else default
    fun has(key: String): Boolean = sp.contains(key)

    fun put(key: String, value: String?) = sp.edit { if (value == null) remove(key) else putString(key, value) }
    fun put(key: String, value: Boolean) = sp.edit { putBoolean(key, value) }
    fun put(key: String, value: Int) = sp.edit { putInt(key, value) }
    fun put(key: String, value: Double) = sp.edit { putLong(key, java.lang.Double.doubleToRawLongBits(value)) }
    fun remove(key: String) = sp.edit { remove(key) }
}
