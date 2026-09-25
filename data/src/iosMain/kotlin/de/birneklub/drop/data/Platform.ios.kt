package de.birneklub.drop.data

import app.cash.sqldelight.driver.native.NativeSqliteDriver
import de.birneklub.drop.data.db.DropsDatabase
import io.ktor.client.engine.HttpClientEngine
import io.ktor.client.engine.darwin.Darwin

/** Entry points for the Swift app: `PlatformKt.createDatabase()` etc. */
fun createDatabase(): DropsDatabase = DropsDatabase(NativeSqliteDriver(DropsDatabase.Schema, "drops.db"))

fun defaultHttpEngine(): HttpClientEngine = Darwin.create()
