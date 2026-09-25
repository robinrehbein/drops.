pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "drops"

// :core is pure Kotlin (models, domain logic, sync protocol) and is shared by
// the apps and the server. The server image builds with -Pdrops.serverOnly=true
// so it never needs the Android SDK.
include(":core", ":server")

if (providers.gradleProperty("drops.serverOnly").orNull != "true") {
    include(":data", ":androidApp")
}
