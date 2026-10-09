import org.jetbrains.kotlin.gradle.dsl.JvmTarget
import javax.inject.Inject

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.roborazzi)
}

// Signing comes from the environment or keystore.properties (never committed):
// LECTIO_KEYSTORE (path), LECTIO_KEYSTORE_PASSWORD, LECTIO_KEY_ALIAS, LECTIO_KEY_PASSWORD.
fun secret(name: String): String? = System.getenv(name)?.takeIf { it.isNotBlank() }

android {
    namespace = "com.norvodesigns.lectio"
    compileSdk = 37

    defaultConfig {
        applicationId = "com.norvodesigns.lectio"
        minSdk = 26
        targetSdk = 36
        // Play needs a number that only goes up; CI passes the run number.
        versionCode = (project.findProperty("lectio.versionCode") as String?)?.toInt() ?: 1
        versionName = "1.0.0"
        vectorDrawables.useSupportLibrary = true
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
        buildConfig = true
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
                // Where Robolectric's Android jars are already downloaded (a sandbox with no route to Maven Central).
                System.getenv("ROBOLECTRIC_DIR")?.let {
                    test.systemProperty("robolectric.dependency.dir", it)
                    test.systemProperty("robolectric.offline", "true")
                }
                test.maxHeapSize = "3g"
            }
        }
    }

    bundle {
        // Every language the app has is English; keep splits off so the AAB is one plain set.
        language { enableSplit = false }
    }
}

kotlin {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_17)
        freeCompilerArgs.addAll("-opt-in=androidx.compose.material3.ExperimentalMaterial3Api", "-opt-in=androidx.compose.foundation.ExperimentalFoundationApi", "-opt-in=androidx.compose.foundation.layout.ExperimentalLayoutApi")
    }
}

// The course is written once, on the website. The app bundles the same JSON the iOS app does
// (ios/Content, exported by `npm run export:content`) and the scansion corpus the website serves
// (public/scansion), copied into assets at build time so there is one source of truth.
abstract class BundleContent : DefaultTask() {
    @get:InputDirectory @get:PathSensitive(PathSensitivity.RELATIVE) abstract val course: DirectoryProperty
    @get:InputDirectory @get:PathSensitive(PathSensitivity.RELATIVE) abstract val scansion: DirectoryProperty
    @get:OutputDirectory abstract val outputDir: DirectoryProperty
    @get:Inject abstract val fs: FileSystemOperations

    @TaskAction
    fun bundle() {
        fs.sync {
            into(outputDir)
            from(course) { into("content") }
            from(scansion) { into("scansion") }
        }
    }
}

val bundleContent = tasks.register<BundleContent>("bundleContent") {
    course.set(rootProject.layout.projectDirectory.dir("../ios/Content"))
    scansion.set(rootProject.layout.projectDirectory.dir("../public/scansion"))
    outputDir.set(layout.buildDirectory.dir("generated/lectioAssets"))
}

androidComponents {
    onVariants { variant ->
        variant.sources.assets?.addGeneratedSourceDirectory(bundleContent, BundleContent::outputDir)
    }
}

dependencies {
    implementation(project(":core"))
    implementation(libs.kotlinx.coroutines.android)
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.core.splashscreen)
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.lifecycle.process)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.compose.foundation)
    implementation(libs.androidx.compose.animation)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.material3.window.size)
    implementation(libs.androidx.compose.material.icons)
    implementation(libs.androidx.work.runtime)
    implementation(libs.androidx.glance.appwidget)
    implementation(libs.androidx.glance.material3)
    implementation(libs.androidx.browser)
    implementation(libs.play.services.wearable)
    implementation(libs.okhttp)

    debugImplementation(libs.androidx.compose.ui.test.manifest)

    testImplementation(libs.junit)
    testImplementation(libs.kotlin.test)
    testImplementation(libs.robolectric)
    testImplementation(libs.roborazzi)
    testImplementation(libs.roborazzi.compose)
    testImplementation(libs.roborazzi.junit)
    testImplementation(platform(libs.androidx.compose.bom))
    testImplementation(libs.androidx.compose.ui.test.junit4)
    testImplementation(libs.androidx.test.ext.junit)
    testImplementation(libs.androidx.test.core)
}
