package de.birneklub.drop.server

import de.birneklub.drop.core.sync.ApiError
import de.birneklub.drop.core.sync.AuthResponse
import de.birneklub.drop.core.sync.DropsJson
import de.birneklub.drop.core.sync.LoginRequest
import de.birneklub.drop.core.sync.MeResponse
import de.birneklub.drop.core.sync.RegisterRequest
import de.birneklub.drop.core.sync.SyncCollections
import de.birneklub.drop.core.sync.SyncLimits
import de.birneklub.drop.core.sync.SyncRequest
import de.birneklub.drop.core.sync.SyncResponse
import io.ktor.http.HttpStatusCode
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.Application
import io.ktor.server.application.ApplicationCall
import io.ktor.server.application.install
import io.ktor.server.auth.Authentication
import io.ktor.server.auth.authenticate
import io.ktor.server.auth.bearer
import io.ktor.server.auth.principal
import io.ktor.server.engine.embeddedServer
import io.ktor.server.netty.Netty
import io.ktor.server.plugins.BadRequestException
import io.ktor.server.plugins.calllogging.CallLogging
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.plugins.forwardedheaders.XForwardedHeaders
import io.ktor.server.plugins.origin
import io.ktor.server.plugins.ratelimit.RateLimit
import io.ktor.server.plugins.ratelimit.RateLimitName
import io.ktor.server.plugins.ratelimit.rateLimit
import io.ktor.server.plugins.statuspages.StatusPages
import io.ktor.server.request.contentLength
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.delete
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.route
import io.ktor.server.routing.routing
import org.slf4j.LoggerFactory
import de.birneklub.drop.core.stats.StatEvents
import de.birneklub.drop.core.stats.StatsLimits
import de.birneklub.drop.core.stats.StatsUpload
import io.ktor.http.HttpHeaders
import kotlinx.datetime.Clock
import kotlinx.datetime.LocalDate
import kotlinx.datetime.TimeZone
import kotlinx.datetime.daysUntil
import kotlinx.datetime.todayIn
import java.io.File
import java.security.MessageDigest
import kotlin.time.Duration.Companion.minutes

data class ServerConfig(
    val port: Int = 8080,
    val databasePath: String = "/data/drops.db",
    val allowSignup: Boolean = true,
    /** Requests per minute and client IP on the auth endpoints. */
    val authRateLimit: Int = 10,
    val behindProxy: Boolean = true,
    /** Bearer token for GET /api/stats/report; the report is disabled without one. */
    val statsToken: String? = null,
    /** Public base URL for QR links, e.g. https://sync.example.com; defaults to the request host. */
    val publicUrl: String? = null,
    /** SHA-256 fingerprints of the app signing key(s), so Android opens /r/ links in the app. */
    val androidCertSha256: List<String> = emptyList(),
) {
    companion object {
        fun fromEnv(env: Map<String, String> = System.getenv()) = ServerConfig(
            port = env["PORT"]?.toIntOrNull() ?: 8080,
            databasePath = env["DATABASE_PATH"] ?: "/data/drops.db",
            allowSignup = env["ALLOW_SIGNUP"]?.lowercase() != "false",
            authRateLimit = env["AUTH_RATE_LIMIT_PER_MINUTE"]?.toIntOrNull() ?: 10,
            behindProxy = env["BEHIND_PROXY"]?.lowercase() != "false",
            statsToken = env["STATS_TOKEN"]?.takeIf { it.length >= 16 },
            publicUrl = env["PUBLIC_URL"]?.trimEnd('/')?.takeIf { it.startsWith("https://") || it.startsWith("http://") },
            androidCertSha256 = env["ANDROID_CERT_SHA256"].orEmpty().split(',').map { it.trim() }.filter { it.isNotEmpty() },
        )
    }
}

private const val MAX_BODY_BYTES = 10L * 1024 * 1024
private val EMAIL = Regex("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")
private val AUTH_LIMIT = RateLimitName("auth")
private val STATS_LIMIT = RateLimitName("stats")
private val INSTALL_ID = Regex("^[A-Za-z0-9-]{16,64}$")

class ApiException(val status: HttpStatusCode, val code: String, message: String) : RuntimeException(message)

fun main() {
    val config = ServerConfig.fromEnv()
    File(config.databasePath).absoluteFile.parentFile?.mkdirs()
    val store = Store(config.databasePath)
    LoggerFactory.getLogger("drops").info("Starting on :${config.port}, db=${config.databasePath}, signup=${config.allowSignup}")
    embeddedServer(Netty, port = config.port) { dropsModule(store, config) }.start(wait = true)
}

fun Application.dropsModule(store: Store, config: ServerConfig) {
    install(CallLogging)
    // Coolify puts Traefik/Caddy in front; use the client IP it forwards for rate limiting.
    if (config.behindProxy) install(XForwardedHeaders)
    install(ContentNegotiation) { json(DropsJson) }
    install(StatusPages) {
        exception<ApiException> { call, e -> call.respond(e.status, ApiError(e.code, e.message ?: e.code)) }
        exception<BadRequestException> { call, _ -> call.respond(HttpStatusCode.BadRequest, ApiError("bad_request", "Ungültige Anfrage")) }
        exception<Throwable> { call, e ->
            LoggerFactory.getLogger("drops").error("Unhandled error", e)
            call.respond(HttpStatusCode.InternalServerError, ApiError("internal", "Interner Fehler"))
        }
    }
    install(RateLimit) {
        register(AUTH_LIMIT) {
            rateLimiter(limit = config.authRateLimit, refillPeriod = 1.minutes)
            requestKey { it.request.origin.remoteAddress }
        }
        register(STATS_LIMIT) {
            rateLimiter(limit = 30, refillPeriod = 1.minutes)
            requestKey { it.request.origin.remoteAddress }
        }
    }
    install(Authentication) {
        bearer("token") {
            authenticate { credential -> store.sessionForToken(credential.token) }
        }
    }

    routing {
        get("/healthz") {
            call.respond(if (store.ping()) mapOf("status" to "ok") else throw ApiException(HttpStatusCode.ServiceUnavailable, "db", "Datenbank nicht erreichbar"))
        }

        roasterPages(config)

        route("/api") {
            rateLimit(AUTH_LIMIT) {
                post("/auth/register") {
                    if (!config.allowSignup) throw ApiException(HttpStatusCode.Forbidden, "signup_disabled", "Registrierung ist deaktiviert")
                    val req = call.receiveLimited<RegisterRequest>()
                    val email = normalizeEmail(req.email)
                    validatePassword(req.password)
                    val user = store.createUser(email, Passwords.hash(req.password))
                        ?: throw ApiException(HttpStatusCode.Conflict, "email_taken", "Diese E-Mail ist bereits registriert")
                    val (token, deviceId) = store.issueToken(user.id, req.deviceName, req.platform)
                    call.respond(HttpStatusCode.Created, AuthResponse(token, user.id, user.email, deviceId))
                }
                post("/auth/login") {
                    val req = call.receiveLimited<LoginRequest>()
                    val user = store.findUserByEmail(normalizeEmail(req.email))
                    if (user == null || !Passwords.verify(req.password, user.passwordHash)) {
                        throw ApiException(HttpStatusCode.Unauthorized, "invalid_credentials", "E-Mail oder Passwort falsch")
                    }
                    val (token, deviceId) = store.issueToken(user.id, req.deviceName, req.platform)
                    call.respond(AuthResponse(token, user.id, user.email, deviceId))
                }
            }

            rateLimit(STATS_LIMIT) {
                post("/stats/events") {
                    val upload = call.receiveLimited<StatsUpload>()
                    store.addStats(upload.installId, upload.platform.take(16), upload.appVersion.take(32), validateStats(upload, Clock.System.todayIn(TimeZone.UTC)))
                    call.respond(HttpStatusCode.NoContent)
                }
            }
            get("/stats/report") {
                val expected = config.statsToken ?: throw ApiException(HttpStatusCode.NotFound, "not_found", "Nicht gefunden")
                val given = call.request.headers[HttpHeaders.Authorization]?.removePrefix("Bearer ")?.trim().orEmpty()
                if (!MessageDigest.isEqual(given.toByteArray(), expected.toByteArray())) {
                    throw ApiException(HttpStatusCode.Unauthorized, "unauthorized", "Nicht angemeldet")
                }
                call.respond(BetaReports.compute(store.statRows(), Clock.System.todayIn(TimeZone.UTC)))
            }

            authenticate("token") {
                post("/auth/logout") {
                    store.revoke(call.session())
                    call.respond(HttpStatusCode.NoContent)
                }
                get("/me") {
                    val s = call.session()
                    call.respond(MeResponse(s.userId, s.email, store.devices(s.userId)))
                }
                delete("/me") {
                    store.deleteUser(call.session().userId)
                    call.respond(HttpStatusCode.NoContent)
                }
                post("/sync") {
                    val session = call.session()
                    val req = call.receiveLimited<SyncRequest>()
                    validateSync(req)
                    val (serverTime, changes) = store.sync(session, req.since, req.changes)
                    call.respond(SyncResponse(serverTime, changes))
                }
            }
        }
    }
}

/** Rejects malformed uploads; returns (day, event, count) triples to store. */
internal fun validateStats(upload: StatsUpload, today: LocalDate): List<Triple<String, String, Int>> {
    fun bad(msg: String): Nothing = throw ApiException(HttpStatusCode.BadRequest, "bad_stats", msg)
    if (!INSTALL_ID.matches(upload.installId)) bad("Ungültige Installations-ID")
    if (upload.counts.size > StatsLimits.MAX_COUNTS_PER_UPLOAD) bad("Zu viele Einträge")
    return upload.counts.map { c ->
        if (c.event !in StatEvents.all) bad("Unbekanntes Ereignis")
        if (c.count !in 1..StatsLimits.MAX_COUNT) bad("Ungültige Anzahl")
        val age = c.day.daysUntil(today)
        if (age !in -1..StatsLimits.MAX_AGE_DAYS) bad("Ungültiges Datum")
        Triple(c.day.toString(), c.event, c.count)
    }
}

private fun ApplicationCall.session(): Session = principal<Session>()
    ?: throw ApiException(HttpStatusCode.Unauthorized, "unauthorized", "Nicht angemeldet")

private suspend inline fun <reified T : Any> ApplicationCall.receiveLimited(): T {
    val length = request.contentLength()
    if (length != null && length > MAX_BODY_BYTES) {
        throw ApiException(HttpStatusCode.PayloadTooLarge, "too_large", "Anfrage zu groß")
    }
    return receive<T>()
}

private fun normalizeEmail(raw: String): String {
    val email = raw.trim().lowercase()
    if (email.length > 254 || !EMAIL.matches(email)) {
        throw ApiException(HttpStatusCode.BadRequest, "invalid_email", "Bitte eine gültige E-Mail angeben")
    }
    return email
}

private fun validatePassword(password: String) {
    if (password.length < SyncLimits.MIN_PASSWORD_LENGTH || password.length > 200) {
        throw ApiException(HttpStatusCode.BadRequest, "weak_password", "Passwort braucht mindestens ${SyncLimits.MIN_PASSWORD_LENGTH} Zeichen")
    }
}

private fun validateSync(req: SyncRequest) {
    if (req.changes.size > SyncLimits.MAX_RECORDS_PER_REQUEST) {
        throw ApiException(HttpStatusCode.PayloadTooLarge, "too_many_records", "Zu viele Änderungen in einer Anfrage")
    }
    req.changes.forEach { r ->
        if (r.collection !in SyncCollections.all) throw ApiException(HttpStatusCode.BadRequest, "unknown_collection", "Unbekannte Sammlung: ${r.collection}")
        if (r.id.isBlank() || r.id.length > SyncLimits.MAX_ID_LENGTH) throw ApiException(HttpStatusCode.BadRequest, "invalid_id", "Ungültige ID")
        if (!r.deleted && r.data == null) throw ApiException(HttpStatusCode.BadRequest, "missing_data", "Datensatz ohne Inhalt")
    }
}
