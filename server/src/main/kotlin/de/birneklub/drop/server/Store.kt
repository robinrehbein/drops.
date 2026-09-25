package de.birneklub.drop.server

import de.birneklub.drop.core.sync.DeviceInfo
import de.birneklub.drop.core.sync.DropsJson
import de.birneklub.drop.core.sync.SyncRecord
import kotlinx.serialization.json.JsonElement
import java.security.MessageDigest
import java.sql.Connection
import java.sql.DriverManager
import java.util.UUID

data class User(val id: String, val email: String, val passwordHash: String)

data class Session(val userId: String, val deviceId: String, val email: String)

data class StatRow(val installId: String, val day: String, val event: String, val count: Int)

/**
 * SQLite-backed storage. The server is small and personal-scale, so a single
 * connection guarded by a lock is plenty and keeps SQLite writes serialized.
 */
class Store(path: String) : AutoCloseable {
    private val conn: Connection = DriverManager.getConnection("jdbc:sqlite:$path")
    private val lock = Any()
    private var lastServerTime = 0L

    init {
        conn.createStatement().use { st ->
            st.execute("PRAGMA journal_mode=WAL")
            st.execute("PRAGMA foreign_keys=ON")
            st.execute(
                """CREATE TABLE IF NOT EXISTS users(
                    id TEXT PRIMARY KEY,
                    email TEXT NOT NULL UNIQUE,
                    password_hash TEXT NOT NULL,
                    created_at INTEGER NOT NULL)""",
            )
            st.execute(
                """CREATE TABLE IF NOT EXISTS devices(
                    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    device_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    platform TEXT NOT NULL,
                    last_seen_at INTEGER NOT NULL,
                    PRIMARY KEY(user_id, device_id))""",
            )
            st.execute(
                """CREATE TABLE IF NOT EXISTS tokens(
                    token_hash TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    device_id TEXT NOT NULL,
                    created_at INTEGER NOT NULL)""",
            )
            st.execute(
                """CREATE TABLE IF NOT EXISTS records(
                    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    collection TEXT NOT NULL,
                    id TEXT NOT NULL,
                    updated_at INTEGER NOT NULL,
                    deleted INTEGER NOT NULL DEFAULT 0,
                    data TEXT,
                    server_time INTEGER NOT NULL,
                    PRIMARY KEY(user_id, collection, id))""",
            )
            st.execute("CREATE INDEX IF NOT EXISTS records_by_time ON records(user_id, server_time)")
            // Anonymous beta statistics: daily event counts per random install id.
            st.execute(
                """CREATE TABLE IF NOT EXISTS stat_counts(
                    install_id TEXT NOT NULL,
                    day TEXT NOT NULL,
                    event TEXT NOT NULL,
                    count INTEGER NOT NULL,
                    PRIMARY KEY(install_id, day, event))""",
            )
            // Verified Play purchases; the token is stored hashed.
            st.execute(
                """CREATE TABLE IF NOT EXISTS purchases(
                    token_hash TEXT PRIMARY KEY,
                    product_id TEXT NOT NULL,
                    order_id TEXT,
                    state TEXT NOT NULL,
                    checked_at INTEGER NOT NULL)""",
            )
            // Waitlist with double opt-in: an address counts only once confirmed.
            st.execute(
                """CREATE TABLE IF NOT EXISTS waitlist(
                    email TEXT PRIMARY KEY,
                    token TEXT NOT NULL UNIQUE,
                    source TEXT NOT NULL,
                    created_at INTEGER NOT NULL,
                    confirmed_at INTEGER)""",
            )
            st.execute(
                """CREATE TABLE IF NOT EXISTS stat_installs(
                    install_id TEXT PRIMARY KEY,
                    platform TEXT NOT NULL,
                    app_version TEXT NOT NULL)""",
            )
        }
    }

    // --- purchases -------------------------------------------------------------

    fun recordPurchase(token: String, productId: String, orderId: String?, state: String, now: Long) = synchronized(lock) {
        conn.prepareStatement(
            "INSERT INTO purchases(token_hash, product_id, order_id, state, checked_at) VALUES(?,?,?,?,?) " +
                "ON CONFLICT(token_hash) DO UPDATE SET state = excluded.state, order_id = coalesce(excluded.order_id, order_id), checked_at = excluded.checked_at",
        ).use { ps ->
            ps.setString(1, sha256(token)); ps.setString(2, productId); ps.setString(3, orderId); ps.setString(4, state); ps.setLong(5, now)
            ps.executeUpdate()
        }
    }

    /** Verified purchases by state, e.g. {purchased=12, canceled=1}. */
    fun purchaseCounts(): Map<String, Int> = synchronized(lock) {
        conn.createStatement().use { st ->
            st.executeQuery("SELECT state, count(*) FROM purchases GROUP BY state").use { rs ->
                buildMap { while (rs.next()) put(rs.getString(1), rs.getInt(2)) }
            }
        }
    }

    private fun sha256(s: String): String =
        MessageDigest.getInstance("SHA-256").digest(s.toByteArray()).joinToString("") { "%02x".format(it) }

    // --- waitlist ----------------------------------------------------------------

    /**
     * Adds an address as unconfirmed and returns the token for its confirmation
     * mail, or null if it is already confirmed (nothing to send).
     */
    fun waitlistAdd(email: String, source: String, now: Long): String? = synchronized(lock) {
        val existing = conn.prepareStatement("SELECT token, confirmed_at FROM waitlist WHERE email = ?").use { ps ->
            ps.setString(1, email)
            ps.executeQuery().use { rs -> if (rs.next()) rs.getString(1) to (rs.getObject(2) != null) else null }
        }
        when {
            existing == null -> {
                val token = randomToken()
                conn.prepareStatement("INSERT INTO waitlist(email, token, source, created_at) VALUES(?,?,?,?)").use { ps ->
                    ps.setString(1, email); ps.setString(2, token); ps.setString(3, source); ps.setLong(4, now); ps.executeUpdate()
                }
                token
            }
            existing.second -> null
            else -> existing.first
        }
    }

    fun waitlistConfirm(token: String, now: Long): Boolean = synchronized(lock) {
        conn.prepareStatement("UPDATE waitlist SET confirmed_at = coalesce(confirmed_at, ?) WHERE token = ?").use { ps ->
            ps.setLong(1, now); ps.setString(2, token); ps.executeUpdate() > 0
        }
    }

    fun waitlistRemove(token: String): Boolean = synchronized(lock) {
        conn.prepareStatement("DELETE FROM waitlist WHERE token = ?").use { ps -> ps.setString(1, token); ps.executeUpdate() > 0 }
    }

    /** Confirmed addresses with source and confirmation time (epoch ms). */
    fun waitlistConfirmed(): List<Triple<String, String, Long>> = synchronized(lock) {
        conn.createStatement().use { st ->
            st.executeQuery("SELECT email, source, confirmed_at FROM waitlist WHERE confirmed_at IS NOT NULL ORDER BY confirmed_at").use { rs ->
                buildList { while (rs.next()) add(Triple(rs.getString(1), rs.getString(2), rs.getLong(3))) }
            }
        }
    }

    /** Unconfirmed sign-ups older than [before] are dropped; consent was never given. */
    fun waitlistPurgeUnconfirmed(before: Long): Int = synchronized(lock) {
        conn.prepareStatement("DELETE FROM waitlist WHERE confirmed_at IS NULL AND created_at < ?").use { ps -> ps.setLong(1, before); ps.executeUpdate() }
    }

    private fun randomToken(): String {
        val bytes = ByteArray(24).also { java.security.SecureRandom().nextBytes(it) }
        return java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)
    }

    // --- beta statistics -------------------------------------------------------

    fun addStats(installId: String, platform: String, appVersion: String, counts: List<Triple<String, String, Int>>) = synchronized(lock) {
        conn.autoCommit = false
        try {
            conn.prepareStatement("INSERT INTO stat_installs(install_id, platform, app_version) VALUES(?,?,?) ON CONFLICT(install_id) DO UPDATE SET platform = excluded.platform, app_version = excluded.app_version").use { ps ->
                ps.setString(1, installId); ps.setString(2, platform); ps.setString(3, appVersion); ps.executeUpdate()
            }
            conn.prepareStatement("INSERT INTO stat_counts(install_id, day, event, count) VALUES(?,?,?,?) ON CONFLICT(install_id, day, event) DO UPDATE SET count = min(count + excluded.count, 1000000)").use { ps ->
                counts.forEach { (day, event, count) ->
                    ps.setString(1, installId); ps.setString(2, day); ps.setString(3, event); ps.setInt(4, count); ps.addBatch()
                }
                ps.executeBatch()
            }
            conn.commit()
        } catch (e: Exception) {
            conn.rollback()
            throw e
        } finally {
            conn.autoCommit = true
        }
    }

    /** (install id, day, event, count) for the report. */
    fun statRows(): List<StatRow> = synchronized(lock) {
        conn.createStatement().use { st ->
            st.executeQuery("SELECT install_id, day, event, count FROM stat_counts").use { rs ->
                buildList { while (rs.next()) add(StatRow(rs.getString(1), rs.getString(2), rs.getString(3), rs.getInt(4))) }
            }
        }
    }

    fun ping(): Boolean = synchronized(lock) {
        conn.createStatement().use { it.executeQuery("SELECT 1").use { rs -> rs.next() } }
    }

    // --- users -------------------------------------------------------------

    fun findUserByEmail(email: String): User? = synchronized(lock) {
        conn.prepareStatement("SELECT id, email, password_hash FROM users WHERE email = ?").use { ps ->
            ps.setString(1, email)
            ps.executeQuery().use { rs -> if (rs.next()) User(rs.getString(1), rs.getString(2), rs.getString(3)) else null }
        }
    }

    /** Returns null when the e-mail is already registered. */
    fun createUser(email: String, passwordHash: String): User? = synchronized(lock) {
        val id = UUID.randomUUID().toString()
        try {
            conn.prepareStatement("INSERT INTO users(id, email, password_hash, created_at) VALUES(?,?,?,?)").use { ps ->
                ps.setString(1, id)
                ps.setString(2, email)
                ps.setString(3, passwordHash)
                ps.setLong(4, System.currentTimeMillis())
                ps.executeUpdate()
            }
            User(id, email, passwordHash)
        } catch (e: java.sql.SQLException) {
            if (e.message?.contains("UNIQUE") == true) null else throw e
        }
    }

    fun deleteUser(userId: String): Unit = synchronized(lock) {
        conn.prepareStatement("DELETE FROM users WHERE id = ?").use { it.setString(1, userId); it.executeUpdate() }
    }

    // --- devices & tokens ---------------------------------------------------

    /** Registers a device and issues a new bearer token (returned in plain text once). */
    fun issueToken(userId: String, deviceName: String, platform: String): Pair<String, String> = synchronized(lock) {
        val deviceId = UUID.randomUUID().toString()
        val token = Tokens.generate()
        val now = System.currentTimeMillis()
        conn.prepareStatement("INSERT INTO devices(user_id, device_id, name, platform, last_seen_at) VALUES(?,?,?,?,?)").use { ps ->
            ps.setString(1, userId)
            ps.setString(2, deviceId)
            ps.setString(3, deviceName.take(80))
            ps.setString(4, platform.take(20))
            ps.setLong(5, now)
            ps.executeUpdate()
        }
        conn.prepareStatement("INSERT INTO tokens(token_hash, user_id, device_id, created_at) VALUES(?,?,?,?)").use { ps ->
            ps.setString(1, Tokens.hash(token))
            ps.setString(2, userId)
            ps.setString(3, deviceId)
            ps.setLong(4, now)
            ps.executeUpdate()
        }
        token to deviceId
    }

    fun sessionForToken(token: String): Session? = synchronized(lock) {
        conn.prepareStatement(
            "SELECT t.user_id, t.device_id, u.email FROM tokens t JOIN users u ON u.id = t.user_id WHERE t.token_hash = ?",
        ).use { ps ->
            ps.setString(1, Tokens.hash(token))
            ps.executeQuery().use { rs -> if (rs.next()) Session(rs.getString(1), rs.getString(2), rs.getString(3)) else null }
        }
    }

    /** Logs a device out: removes its token and the device entry. */
    fun revoke(session: Session): Unit = synchronized(lock) {
        conn.prepareStatement("DELETE FROM tokens WHERE user_id = ? AND device_id = ?").use {
            it.setString(1, session.userId); it.setString(2, session.deviceId); it.executeUpdate()
        }
        conn.prepareStatement("DELETE FROM devices WHERE user_id = ? AND device_id = ?").use {
            it.setString(1, session.userId); it.setString(2, session.deviceId); it.executeUpdate()
        }
    }

    fun devices(userId: String): List<DeviceInfo> = synchronized(lock) {
        conn.prepareStatement("SELECT device_id, name, platform, last_seen_at FROM devices WHERE user_id = ? ORDER BY last_seen_at DESC").use { ps ->
            ps.setString(1, userId)
            ps.executeQuery().use { rs ->
                buildList { while (rs.next()) add(DeviceInfo(rs.getString(1), rs.getString(2), rs.getString(3), rs.getLong(4))) }
            }
        }
    }

    // --- sync --------------------------------------------------------------

    /**
     * Applies [incoming] with last-write-wins on updatedAt and returns every
     * record the device has not seen yet (changed after [since]), minus the
     * ones it just sent.
     */
    fun sync(session: Session, since: Long, incoming: List<SyncRecord>): Pair<Long, List<SyncRecord>> = synchronized(lock) {
        val serverTime = maxOf(System.currentTimeMillis(), lastServerTime + 1).also { lastServerTime = it }
        val written = HashSet<Pair<String, String>>()
        conn.autoCommit = false
        try {
            val select = conn.prepareStatement("SELECT updated_at FROM records WHERE user_id = ? AND collection = ? AND id = ?")
            val upsert = conn.prepareStatement(
                """INSERT INTO records(user_id, collection, id, updated_at, deleted, data, server_time) VALUES(?,?,?,?,?,?,?)
                   ON CONFLICT(user_id, collection, id) DO UPDATE SET
                     updated_at = excluded.updated_at, deleted = excluded.deleted, data = excluded.data, server_time = excluded.server_time""",
            )
            for (r in incoming) {
                select.setString(1, session.userId); select.setString(2, r.collection); select.setString(3, r.id)
                val existing = select.executeQuery().use { rs -> if (rs.next()) rs.getLong(1) else null }
                if (existing != null && existing >= r.updatedAt) continue
                upsert.setString(1, session.userId)
                upsert.setString(2, r.collection)
                upsert.setString(3, r.id)
                upsert.setLong(4, r.updatedAt)
                upsert.setInt(5, if (r.deleted) 1 else 0)
                upsert.setString(6, if (r.deleted) null else r.data?.let { DropsJson.encodeToString(JsonElement.serializer(), it) })
                upsert.setLong(7, serverTime)
                upsert.executeUpdate()
                written += r.collection to r.id
            }
            select.close(); upsert.close()
            conn.prepareStatement("UPDATE devices SET last_seen_at = ? WHERE user_id = ? AND device_id = ?").use {
                it.setLong(1, serverTime); it.setString(2, session.userId); it.setString(3, session.deviceId); it.executeUpdate()
            }
            conn.commit()
        } catch (e: Exception) {
            conn.rollback()
            throw e
        } finally {
            conn.autoCommit = true
        }

        val changes = conn.prepareStatement(
            "SELECT collection, id, updated_at, deleted, data FROM records WHERE user_id = ? AND server_time > ? ORDER BY server_time",
        ).use { ps ->
            ps.setString(1, session.userId)
            ps.setLong(2, since)
            ps.executeQuery().use { rs ->
                buildList {
                    while (rs.next()) {
                        val key = rs.getString(1) to rs.getString(2)
                        if (key in written) continue
                        val data = rs.getString(5)?.let { DropsJson.parseToJsonElement(it) }
                        add(SyncRecord(key.first, key.second, rs.getLong(3), rs.getInt(4) == 1, data))
                    }
                }
            }
        }
        serverTime to changes
    }

    override fun close() = conn.close()
}

object Tokens {
    private val random = java.security.SecureRandom()

    fun generate(): String {
        val bytes = ByteArray(32).also(random::nextBytes)
        return java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)
    }

    fun hash(token: String): String =
        MessageDigest.getInstance("SHA-256").digest(token.toByteArray()).joinToString("") { "%02x".format(it) }
}

/** PBKDF2-HMAC-SHA256 password hashing from the JDK, no extra dependency. */
object Passwords {
    private const val ITERATIONS = 210_000
    private const val KEY_BITS = 256
    private val random = java.security.SecureRandom()

    fun hash(password: String): String {
        val salt = ByteArray(16).also(random::nextBytes)
        val key = derive(password, salt, ITERATIONS)
        val enc = java.util.Base64.getEncoder()
        return "pbkdf2_sha256\$$ITERATIONS\$${enc.encodeToString(salt)}\$${enc.encodeToString(key)}"
    }

    fun verify(password: String, stored: String): Boolean {
        val parts = stored.split('$')
        if (parts.size != 4 || parts[0] != "pbkdf2_sha256") return false
        val dec = java.util.Base64.getDecoder()
        val expected = dec.decode(parts[3])
        val actual = derive(password, dec.decode(parts[2]), parts[1].toInt())
        return MessageDigest.isEqual(expected, actual)
    }

    private fun derive(password: String, salt: ByteArray, iterations: Int): ByteArray {
        val spec = javax.crypto.spec.PBEKeySpec(password.toCharArray(), salt, iterations, KEY_BITS)
        return javax.crypto.SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).encoded
    }
}
