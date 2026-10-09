# kotlinx.serialization keeps its generated serializers via the plugin's own consumer rules.
-keepattributes *Annotation*, InnerClasses
-dontwarn org.slf4j.**
-dontwarn javax.annotation.**
# OkHttp and Okio ship their own consumer rules; these are belt and braces.
-dontwarn okhttp3.internal.platform.**
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**
