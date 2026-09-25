package de.birneklub.drop.server

import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.contentType
import io.ktor.server.application.ApplicationCall
import io.ktor.server.plugins.origin
import io.ktor.server.request.contentType
import io.ktor.server.request.receiveParameters
import io.ktor.server.request.receiveText
import io.ktor.server.response.respond
import io.ktor.server.response.respondText
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import org.slf4j.LoggerFactory
import java.security.MessageDigest
import kotlin.time.Duration.Companion.days

@Serializable
data class WaitlistRequest(val email: String, val consent: Boolean = false, val source: String = "web")

@Serializable
data class WaitlistResponse(val status: String)

private val WAITLIST_EMAIL = Regex("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")
private val lenientJson = Json { ignoreUnknownKeys = true }

/**
 * Waitlist with double opt-in (required in Germany for marketing mail): a
 * sign-up only counts once the link in the confirmation mail was opened.
 * Every mail carries a link that deletes the address again.
 */
fun Route.waitlistRoutes(store: Store, config: ServerConfig, mailer: Mailer) {
    post("/api/waitlist") {
        val form = call.request.contentType().match(ContentType.Application.FormUrlEncoded)
        val req = if (form) {
            val p = call.receiveParameters()
            WaitlistRequest(p["email"].orEmpty(), p["consent"] != null, p["source"] ?: "web")
        } else {
            runCatching { lenientJson.decodeFromString(WaitlistRequest.serializer(), call.receiveText()) }.getOrNull()
                ?: throw ApiException(HttpStatusCode.BadRequest, "bad_request", "Ungültige Anfrage")
        }
        val email = req.email.trim().lowercase()
        val problem = when {
            email.length > 254 || !WAITLIST_EMAIL.matches(email) -> "Bitte eine gültige E-Mail-Adresse eingeben."
            !req.consent -> "Bitte der Benachrichtigung zustimmen."
            else -> null
        }
        if (problem != null) {
            if (form) return@post call.respondHtml(page("Warteliste", "<p class=err>$problem</p><p><a href=\"/#warteliste\">Zurück</a></p>"), HttpStatusCode.BadRequest)
            throw ApiException(HttpStatusCode.BadRequest, "invalid", problem)
        }

        val now = System.currentTimeMillis()
        store.waitlistPurgeUnconfirmed(now - 7.days.inWholeMilliseconds)
        val token = store.waitlistAdd(email, req.source.take(32).ifBlank { "web" }, now)
        if (token != null) {
            val base = baseUrl(call, config)
            val text = """
                Hallo,

                bitte bestätige, dass wir dich benachrichtigen dürfen, sobald die Beta von drops. startet:
                $base/waitlist/confirm?token=$token

                Wenn du dich nicht eingetragen hast, ignoriere diese Mail einfach. Ohne Bestätigung löschen wir die Adresse nach sieben Tagen.

                Austragen und Adresse löschen, jederzeit:
                $base/waitlist/remove?token=$token

                drops.
            """.trimIndent()
            // Mail problems must not reveal whether an address exists; they are logged.
            withContext(Dispatchers.IO) {
                runCatching { mailer.send(email, "Bitte bestätige deine Anmeldung bei drops.", text) }
                    .onFailure { LoggerFactory.getLogger("drops").error("Waitlist mail failed", it) }
            }
        }
        // Same answer whether the address is new, pending or confirmed.
        if (form) {
            call.respondHtml(page("Fast geschafft", "<p>Wir haben dir eine Mail geschickt. Bitte bestätige darin deine Anmeldung.</p><p><a href=\"/\">Zur Startseite</a></p>"))
        } else {
            call.respond(HttpStatusCode.Accepted, WaitlistResponse("check_mail"))
        }
    }

    get("/waitlist/confirm") {
        val ok = store.waitlistConfirm(call.request.queryParameters["token"].orEmpty(), System.currentTimeMillis())
        call.respondHtml(
            if (ok) page("Du bist dabei", "<p>Danke! Wir melden uns, sobald du drops. testen kannst.</p><p><a href=\"/\">Zur Startseite</a></p>")
            else page("Link ungültig", "<p>Dieser Link ist abgelaufen oder wurde schon verwendet. Trag dich einfach neu ein.</p><p><a href=\"/#warteliste\">Zur Warteliste</a></p>"),
            if (ok) HttpStatusCode.OK else HttpStatusCode.NotFound,
        )
    }

    get("/waitlist/remove") {
        store.waitlistRemove(call.request.queryParameters["token"].orEmpty())
        call.respondHtml(page("Ausgetragen", "<p>Deine Adresse ist gelöscht. Du bekommst keine Mails mehr von uns.</p>"))
    }

    get("/api/waitlist/export") {
        call.requireStatsToken(config)
        val csv = buildString {
            appendLine("email,source,confirmed_at")
            store.waitlistConfirmed().forEach { (email, source, at) -> appendLine("$email,$source,${java.time.Instant.ofEpochMilli(at)}") }
        }
        call.response.headers.append(HttpHeaders.ContentDisposition, "attachment; filename=\"drops-warteliste.csv\"")
        call.respondText(csv, ContentType.Text.CSV)
    }
}

/** The report and exports need the STATS_TOKEN; without one they do not exist. */
internal fun ApplicationCall.requireStatsToken(config: ServerConfig) {
    val expected = config.statsToken ?: throw ApiException(HttpStatusCode.NotFound, "not_found", "Nicht gefunden")
    val given = request.headers[HttpHeaders.Authorization]?.removePrefix("Bearer ")?.trim().orEmpty()
    if (!MessageDigest.isEqual(given.toByteArray(), expected.toByteArray())) {
        throw ApiException(HttpStatusCode.Unauthorized, "unauthorized", "Nicht angemeldet")
    }
}
