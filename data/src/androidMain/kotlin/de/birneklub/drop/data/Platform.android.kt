package de.birneklub.drop.data

import android.content.Context
import app.cash.sqldelight.driver.android.AndroidSqliteDriver
import app.cash.sqldelight.db.SqlDriver
import de.birneklub.drop.data.db.DropsDatabase
import io.ktor.client.engine.HttpClientEngine
import io.ktor.client.engine.okhttp.OkHttp

fun createDatabase(context: Context): DropsDatabase {
    val driver: SqlDriver = AndroidSqliteDriver(DropsDatabase.Schema, context, "drops.db")
    return DropsDatabase(driver)
}

fun defaultHttpEngine(): HttpClientEngine = OkHttp.create()
