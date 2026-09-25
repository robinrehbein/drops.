package de.birneklub.drop.server

import de.birneklub.drop.core.stats.PurchaseVerifyRequest
import de.birneklub.drop.core.stats.PurchaseVerifyResponse
import io.ktor.http.HttpStatusCode
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.post
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.slf4j.LoggerFactory
import java.net.URI
import java.net.URLEncoder
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.security.KeyFactory
import java.security.Signature
import java.security.spec.PKCS8EncodedKeySpec
import java.time.Duration
import java.util.Base64

/** Products the app sells; anything else is rejected before asking Google. */
val KNOWN_PRODUCTS = setOf("founding_member")

/** Result of asking Google Play about one purchase token. */
data class PlayPurchase(val state: String, val orderId: String?)

fun interface PlayVerifier {
    /** Returns null when Google could not be asked (network, credentials). */
    fun check(productId: String, token: String): PlayPurchase?
}

/**
 * Asks the Google Play Developer API (purchases.products.get) with a service
 * account. The account needs the Play Console permission to view financial
 * data for the app.
 */
class GooglePlayVerifier(serviceAccountJson: String, private val packageName: String) : PlayVerifier {
    private val log = LoggerFactory.getLogger("drops")
    private val http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build()
    private val account: JsonObject = Json.parseToJsonElement(serviceAccountJson).jsonObject
    private val email = account.getValue("client_email").jsonPrimitive.content
    private val tokenUri = account["token_uri"]?.jsonPrimitive?.contentOrNull ?: "https://oauth2.googleapis.com/token"
    private val privateKey = KeyFactory.getInstance("RSA").generatePrivate(
        PKCS8EncodedKeySpec(
            Base64.getMimeDecoder().decode(
                account.getValue("private_key").jsonPrimitive.content
                    .replace("-----BEGIN PRIVATE KEY-----", "").replace("-----END PRIVATE KEY-----", "").trim(),
            ),
        ),
    )
    private var accessToken: String? = null
    private var accessTokenExpires = 0L

    override fun check(productId: String, token: String): PlayPurchase? = runCatching {
        val url = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications/$packageName" +
            "/purchases/products/${enc(productId)}/tokens/${enc(token)}"
        val response = http.send(
            HttpRequest.newBuilder(URI(url)).header("Authorization", "Bearer ${bearer()}").timeout(Duration.ofSeconds(15)).GET().build(),
            HttpResponse.BodyHandlers.ofString(),
        )
        when (response.statusCode()) {
            200 -> {
                val body = Json.parseToJsonElement(response.body()).jsonObject
                val state = when (body["purchaseState"]?.jsonPrimitive?.intOrNull) {
                    0 -> PurchaseVerifyResponse.PURCHASED
                    1 -> PurchaseVerifyResponse.CANCELED
                    2 -> PurchaseVerifyResponse.PENDING
                    else -> PurchaseVerifyResponse.INVALID
                }
                PlayPurchase(state, body["orderId"]?.jsonPrimitive?.contentOrNull)
            }
            400, 404, 410 -> PlayPurchase(PurchaseVerifyResponse.INVALID, null)
            else -> { log.warn("Play API answered {}", response.statusCode()); null }
        }
    }.onFailure { log.error("Play purchase check failed", it) }.getOrNull()

    @Synchronized
    private fun bearer(): String {
        val now = System.currentTimeMillis() / 1000
        accessToken?.takeIf { now < accessTokenExpires - 60 }?.let { return it }
        val b64 = Base64.getUrlEncoder().withoutPadding()
        val header = b64.encodeToString("""{"alg":"RS256","typ":"JWT"}""".toByteArray())
        val claims = b64.encodeToString(
            """{"iss":"$email","scope":"https://www.googleapis.com/auth/androidpublisher","aud":"$tokenUri","iat":$now,"exp":${now + 3600}}""".toByteArray(),
        )
        val signature = Signature.getInstance("SHA256withRSA").run {
            initSign(privateKey)
            update("$header.$claims".toByteArray())
            b64.encodeToString(sign())
        }
        val form = "grant_type=${enc("urn:ietf:params:oauth:grant-type:jwt-bearer")}&assertion=$header.$claims.$signature"
        val response = http.send(
            HttpRequest.newBuilder(URI(tokenUri)).header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(form)).timeout(Duration.ofSeconds(15)).build(),
            HttpResponse.BodyHandlers.ofString(),
        )
        check(response.statusCode() == 200) { "token endpoint answered ${response.statusCode()}" }
        val body = Json.parseToJsonElement(response.body()).jsonObject
        return body.getValue("access_token").jsonPrimitive.content.also {
            accessToken = it
            accessTokenExpires = now + (body["expires_in"]?.jsonPrimitive?.intOrNull ?: 3600)
        }
    }

    private fun enc(s: String) = URLEncoder.encode(s, Charsets.UTF_8)
}

/**
 * POST /api/purchases/verify: the app sends its purchase token after buying
 * and when it starts; refunds show up as "canceled". Without a verifier the
 * answer is "unverified" and the app keeps trusting Play's local result.
 */
fun Route.purchaseRoutes(store: Store, verifier: PlayVerifier?) {
    post("/api/purchases/verify") {
        val req = call.receiveLimited<PurchaseVerifyRequest>()
        if (req.productId !in KNOWN_PRODUCTS || req.purchaseToken.length !in 10..1000) {
            throw ApiException(HttpStatusCode.BadRequest, "invalid", "Unbekanntes Produkt oder ungültiger Token")
        }
        if (verifier == null) return@post call.respond(PurchaseVerifyResponse(PurchaseVerifyResponse.UNVERIFIED))
        val result = withContext(Dispatchers.IO) { verifier.check(req.productId, req.purchaseToken) }
            ?: return@post call.respond(PurchaseVerifyResponse(PurchaseVerifyResponse.UNVERIFIED))
        store.recordPurchase(req.purchaseToken, req.productId, result.orderId, result.state, System.currentTimeMillis())
        call.respond(PurchaseVerifyResponse(result.state))
    }
}
