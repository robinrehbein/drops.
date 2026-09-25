# iOS app (next step)

The iOS app will be a SwiftUI app that links the shared Kotlin framework
`DropsKit`, built from the `:data` module (it re-exports `:core`). Everything
below the UI is already shared with Android:

- models, maintenance/freshness/dial-in logic and map projections (`core`)
- local SQLite database, repository and optional account sync (`data`)

## Build the framework (on a Mac)

```bash
./gradlew :data:linkDebugFrameworkIosSimulatorArm64   # simulator
./gradlew :data:linkReleaseFrameworkIosArm64          # device
```

Frameworks land in `data/build/bin/<target>/<debug|release>Framework/DropsKit.framework`.

## Wiring in Swift

```swift
import DropsKit

let db = PlatformKt.createDatabase()
let repository = DropsRepository(db: db, clock: Clock.System.shared, io: Dispatchers.shared.IO)
let sync = SyncClient(db: db, engine: PlatformKt.defaultHttpEngine(),
                      deviceName: UIDevice.current.name, platform: "ios", io: Dispatchers.shared.IO)
```

Kotlin `Flow`s can be observed from Swift with SKIE or KMP-NativeCoroutines;
pick one when the Xcode project is created.
