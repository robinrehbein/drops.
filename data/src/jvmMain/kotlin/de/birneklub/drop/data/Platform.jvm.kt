package de.birneklub.drop.data

import app.cash.sqldelight.driver.jdbc.sqlite.JdbcSqliteDriver
import de.birneklub.drop.data.db.DropsDatabase
import io.ktor.client.engine.HttpClientEngine
import io.ktor.client.engine.okhttp.OkHttp

/** JVM target is used for fast unit tests and tooling. */
fun createDatabase(url: String = JdbcSqliteDriver.IN_MEMORY): DropsDatabase {
    val driver = JdbcSqliteDriver(url)
    DropsDatabase.Schema.create(driver)
    return DropsDatabase(driver)
}

fun defaultHttpEngine(): HttpClientEngine = OkHttp.create()
