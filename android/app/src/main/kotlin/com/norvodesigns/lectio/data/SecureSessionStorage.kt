package com.norvodesigns.lectio.data

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import androidx.core.content.edit
import com.norvodesigns.lectio.core.AuthSession
import com.norvodesigns.lectio.core.LectioJson
import com.norvodesigns.lectio.core.SessionStorage
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * The signed-in session, encrypted with a key that lives in the Android
 * Keystore and never leaves it: the app's Keychain. The file is excluded from
 * backups and device transfer, so a restored phone starts signed out and
 * simply signs in again.
 */
class SecureSessionStorage(context: Context) : SessionStorage {
    private val sp = context.getSharedPreferences("lectio_secure", Context.MODE_PRIVATE)

    override fun load(): AuthSession? {
        val stored = sp.getString(KEY, null) ?: return null
        return runCatching {
            val bytes = Base64.decode(stored, Base64.NO_WRAP)
            val iv = bytes.copyOfRange(0, IV_BYTES)
            val cipher = Cipher.getInstance(TRANSFORMATION).apply { init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, iv)) }
            val json = cipher.doFinal(bytes, IV_BYTES, bytes.size - IV_BYTES).toString(Charsets.UTF_8)
            LectioJson.decodeFromString(AuthSession.serializer(), json)
        }.getOrNull()
    }

    override fun save(session: AuthSession?) {
        if (session == null) {
            sp.edit { remove(KEY) }
            return
        }
        runCatching {
            val cipher = Cipher.getInstance(TRANSFORMATION).apply { init(Cipher.ENCRYPT_MODE, key()) }
            val encrypted = cipher.doFinal(LectioJson.encodeToString(AuthSession.serializer(), session).toByteArray())
            sp.edit { putString(KEY, Base64.encodeToString(cipher.iv + encrypted, Base64.NO_WRAP)) }
        }
    }

    private fun key(): SecretKey {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (store.getKey(ALIAS, null) as? SecretKey)?.let { return it }
        val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
        generator.init(
            KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build(),
        )
        return generator.generateKey()
    }

    private companion object {
        const val ALIAS = "lectio-session"
        const val KEY = "session"
        const val TRANSFORMATION = "AES/GCM/NoPadding"
        const val IV_BYTES = 12
    }
}
