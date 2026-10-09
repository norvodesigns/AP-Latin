# kotlinx.serialization keeps its generated serializers via the plugin's own consumer rules.
-keepattributes *Annotation*, InnerClasses
-dontwarn org.slf4j.**
-dontwarn javax.annotation.**
# OkHttp and Okio ship their own consumer rules; these are belt and braces.
-dontwarn okhttp3.internal.platform.**
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**

# The course and progress models are decoded from JSON by generated serializers and by name. They are a small
# part of the app; keeping them whole costs nothing and rules out a class of release-only failures.
-keep class com.norvodesigns.lectio.core.** { *; }
-keepclassmembers class com.norvodesigns.lectio.** { *** Companion; }
