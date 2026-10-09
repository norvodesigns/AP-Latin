import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.roborazzi)
}

// Signing comes from the environment, as for the phone app.
fun secret(name: String): String? = System.getenv(name)?.takeIf { it.isNotBlank() }

android {
    namespace = "com.norvodesigns.lectio.wear"
    compileSdk = 37

    defaultConfig {
        // The same id as the phone app: the data layer only links apps that share one, and Play lists the watch app under the phone app's listing.
        applicationId = "com.norvodesigns.lectio"
        minSdk = 30
        targetSdk = 36
        // Play's version codes are one list for the whole app, so the watch app's sit a million above the phone's.
        versionCode = 1_000_000 + ((project.findProperty("lectio.versionCode") as String?)?.toInt() ?: 1)
        versionName = "1.0.0"
    }

    signingConfigs {
        val keystore = secret("LECTIO_KEYSTORE")
        if (keystore != null) {
            create("release") {
                storeFile = file(keystore)
                storePassword = secret("LECTIO_KEYSTORE_PASSWORD")
                keyAlias = secret("LECTIO_KEY_ALIAS")
                keyPassword = secret("LECTIO_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            signingConfigs.findByName("release")?.let { signingConfig = it }
        }
    }

    buildFeatures {
        compose = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    packaging {
        resources.excludes += "/META-INF/{AL2.0,LGPL2.1}"
    }

    testOptions {
        unitTests {
            isIncludeAndroidResources = true
            isReturnDefaultValues = true
            all { test ->
                System.getenv("ROBOLECTRIC_DIR")?.let {
                    test.systemProperty("robolectric.dependency.dir", it)
                    test.systemProperty("robolectric.offline", "true")
                }
                test.maxHeapSize = "2g"
            }
        }
    }

    bundle {
        language { enableSplit = false }
    }
}

kotlin {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_17)
    }
}

dependencies {
    implementation(project(":core"))
    implementation(libs.kotlinx.coroutines.android)
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.foundation)
    implementation(libs.androidx.wear)
    implementation(libs.androidx.wear.compose.material3)
    implementation(libs.androidx.wear.compose.foundation)
    implementation(libs.androidx.wear.complications.source)
    implementation(libs.play.services.wearable)

    testImplementation(libs.junit)
    testImplementation(libs.robolectric)
    testImplementation(libs.roborazzi)
    testImplementation(libs.roborazzi.compose)
    testImplementation(libs.roborazzi.junit)
    testImplementation(libs.androidx.test.ext.junit)
    testImplementation(libs.androidx.test.core)
    testImplementation(libs.androidx.compose.ui.test.junit4)
    debugImplementation(libs.androidx.compose.ui.test.manifest)
}
