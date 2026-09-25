import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    alias(libs.plugins.androidApplication)
    alias(libs.plugins.kotlinAndroid)
    alias(libs.plugins.composeCompiler)
}

// CI passes the run number and tag; local builds use 1 / 0.1.0-dev.
val ciVersionCode = providers.environmentVariable("DROPS_VERSION_CODE").map(String::toInt).orElse(1)
val ciVersionName = providers.environmentVariable("DROPS_VERSION_NAME").orElse("0.1.0-dev")
val keystorePath = providers.environmentVariable("DROPS_KEYSTORE_PATH")
// Pre-filled server address on the account screen; users can change it.
val defaultSyncUrl = providers.environmentVariable("DROPS_SYNC_URL").orElse("https://")

android {
    namespace = "de.birneklub.drop.android"
    compileSdk = 35

    defaultConfig {
        // Same application id as the store listing, so the Kotlin app can replace it.
        applicationId = "de.birneklub.drop"
        minSdk = 26
        targetSdk = 35
        versionCode = ciVersionCode.get()
        versionName = ciVersionName.get()
        buildConfigField("String", "DEFAULT_SYNC_URL", "\"${defaultSyncUrl.get()}\"")
        // Roaster QR cards link to <sync server>/r/…; the app claims those links.
        manifestPlaceholders["linkHost"] = defaultSyncUrl.get().removePrefix("https://").substringBefore('/').ifBlank { "drops.invalid" }
    }

    signingConfigs {
        if (keystorePath.isPresent) {
            create("release") {
                storeFile = file(keystorePath.get())
                storePassword = providers.environmentVariable("DROPS_KEYSTORE_PASSWORD").get()
                keyAlias = providers.environmentVariable("DROPS_KEY_ALIAS").get()
                keyPassword = providers.environmentVariable("DROPS_KEY_PASSWORD").get()
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            signingConfig = signingConfigs.findByName("release")
        }
        debug {
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
    packaging {
        resources.excludes += setOf("/META-INF/{AL2.0,LGPL2.1}", "/META-INF/INDEX.LIST", "/META-INF/io.netty.versions.properties")
    }
}

kotlin {
    compilerOptions { jvmTarget.set(JvmTarget.JVM_17) }
}

dependencies {
    implementation(project(":data"))
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.work.runtime)
    implementation(libs.play.billing)
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.navigation.compose)
    implementation(libs.kotlinx.coroutines.android)
    implementation(platform(libs.compose.bom))
    implementation(libs.compose.ui)
    implementation(libs.compose.foundation)
    implementation(libs.compose.material3)
    implementation(libs.compose.ui.tooling.preview)
    debugImplementation(libs.compose.ui.tooling)
}
