# ProGuard rules for Shopping List App

# Keep all classes in the app package
-keep class com.intelliron.shoppinglist.** { *; }

# Keep Retrofit interfaces
-keep interface com.intelliron.shoppinglist.data.api.** { *; }

# Keep data classes (Kotlin)
-keepclassmembers class com.intelliron.shoppinglist.data.models.** {
    *;
}

# Keep ViewModel classes
-keepclassmembers class * extends androidx.lifecycle.ViewModel {
    <init>();
}

# Retrofit
-keepattributes Signature
-keepattributes *Annotation*
-keep class retrofit2.** { *; }
-keep interface retrofit2.** { *; }
-dontwarn retrofit2.**

# OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**

# Gson
-keep class com.google.gson.** { *; }
-keep class * implements com.google.gson.TypeAdapterFactory
-keep class * implements com.google.gson.JsonSerializer
-keep class * implements com.google.gson.JsonDeserializer
-keepclassmembers,allowobfuscation class * {
    @com.google.gson.annotations.SerializedName <fields>;
}

# Hilt
-keep class dagger.hilt.** { *; }
-keep interface dagger.hilt.** { *; }

# Kotlin
-keepclassmembers class **$WhenMappings {
    <fields>;
}
-keep class kotlin.Metadata { *; }
