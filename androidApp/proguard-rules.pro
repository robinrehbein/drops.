# kotlinx.serialization
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.**
-keepclassmembers class kotlinx.serialization.json.** { *** Companion; }
-keepclasseswithmembers class de.birneklub.drop.** { kotlinx.serialization.KSerializer serializer(...); }
-keep,includedescriptorclasses class de.birneklub.drop.**$$serializer { *; }
-keepclassmembers class de.birneklub.drop.** { *** Companion; }
# Ktor / OkHttp
-dontwarn org.slf4j.**
-dontwarn io.ktor.**
-dontwarn okhttp3.internal.platform.**
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**
