plugins {
    alias(libs.plugins.android.application)
}

android {
    // Redirect build directory to a local temp folder to avoid OneDrive sync locks
    layout.buildDirectory.set(file("C:/temp/android-builds/${rootProject.name}/${project.name}"))

    namespace = "xyz.intelliron.shoppinglistapp"
    compileSdk {
        version = release(36) {
            minorApiLevel = 1
        }
    }

    defaultConfig {
        applicationId = "xyz.intelliron.shoppinglistapp"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"

        buildConfigField("String", "BASE_URL", "\"https://shoppinglist.api.intelliron.xyz/api/v1/\"")
    }

    buildTypes {
        release {
            optimization {
                enable = false
            }
        }

        getByName("debug") {
            buildConfigField("String", "BASE_URL", "\"http://10.0.2.2:3000/api/v1/\"")
        }
    }

    buildFeatures {
        buildConfig = true
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
}

dependencies {
    implementation(libs.appcompat)
    implementation(libs.material)
    testImplementation(libs.junit)
    androidTestImplementation(libs.espresso.core)
    androidTestImplementation(libs.ext.junit)

    implementation("com.squareup.okhttp3:okhttp:4.9.3")
    implementation("com.squareup.retrofit2:retrofit:2.9.0")
    implementation("com.squareup.retrofit2:converter-gson:2.9.0")
}