-keepattributes *Annotation*, InnerClasses
-dontwarn org.slf4j.**
-dontwarn javax.annotation.**

-keep class com.norvodesigns.lectio.core.** { *; }
-keepclassmembers class com.norvodesigns.lectio.** { *** Companion; }
