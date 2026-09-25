package de.birneklub.drop.server

import com.google.zxing.BarcodeFormat
import com.google.zxing.EncodeHintType
import com.google.zxing.qrcode.QRCodeWriter
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel
import de.birneklub.drop.core.model.Process
import de.birneklub.drop.core.roaster.RoasterCard
import io.ktor.http.ContentType
import io.ktor.http.HttpStatusCode
import io.ktor.http.Parameters
import io.ktor.server.application.ApplicationCall
import io.ktor.server.plugins.origin
import io.ktor.server.response.respondText
import io.ktor.server.routing.Route
import io.ktor.server.routing.get

/**
 * Roaster QR cards: a form for roasters, a printable card with a QR code, and
 * the page the QR code opens. The Android app claims /r/ links (App Links), so
 * with drops. installed the scan goes straight into the app.
 */
fun Route.roasterPages(config: ServerConfig) {
    get("/roaster") { call.respondHtml(page("Rezeptkarte erstellen", form())) }

    get("/roaster/card") {
        val card = try {
            cardFrom(call.request.queryParameters).validate()
        } catch (e: IllegalArgumentException) {
            return@get call.respondHtml(page("Rezeptkarte erstellen", "<p class=err>${esc(e.message ?: "Ungültige Angaben")}</p>" + form(call.request.queryParameters)), HttpStatusCode.BadRequest)
        }
        val link = baseUrl(call, config) + RoasterCard.PATH + card.encode()
        call.respondHtml(page("Rezeptkarte · ${card.coffee}", printable(card, link)))
    }

    get("/r/{payload}") {
        val card = RoasterCard.decode(call.parameters["payload"].orEmpty())
            ?: return@get call.respondHtml(page("Karte ungültig", "<p>Dieser Code ist beschädigt oder unvollständig.</p>"), HttpStatusCode.NotFound)
        call.respondHtml(page("${card.coffee} · ${card.roaster}", landing(card)))
    }

    get("/.well-known/assetlinks.json") {
        val fingerprints = config.androidCertSha256
        if (fingerprints.isEmpty()) return@get call.respondText("[]", ContentType.Application.Json, HttpStatusCode.NotFound)
        val list = fingerprints.joinToString(",") { "\"${it}\"" }
        call.respondText(
            """[{"relation":["delegate_permission/common.handle_all_urls"],"target":{"namespace":"android_app","package_name":"de.birneklub.drops","sha256_cert_fingerprints":[$list]}}]""",
            ContentType.Application.Json,
        )
    }
}

internal fun baseUrl(call: ApplicationCall, config: ServerConfig): String =
    config.publicUrl ?: "${call.request.origin.scheme}://${call.request.origin.serverHost}" +
        (call.request.origin.serverPort.takeIf { it != 80 && it != 443 }?.let { ":$it" } ?: "")

internal fun cardFrom(p: Parameters): RoasterCard {
    fun num(name: String): Double = p[name]?.replace(',', '.')?.trim()?.toDoubleOrNull() ?: throw IllegalArgumentException("Bitte „$name“ als Zahl angeben")
    return RoasterCard(
        roaster = p["roaster"].orEmpty().trim(),
        coffee = p["coffee"].orEmpty().trim(),
        country = p["country"].orEmpty().trim(),
        region = p["region"].orEmpty().trim(),
        process = Process.entries.firstOrNull { it.name == p["process"] } ?: Process.WASHED,
        notes = p["notes"].orEmpty().split(',').map { it.trim() }.filter { it.isNotEmpty() },
        doseGrams = num("dose"),
        yieldGrams = num("yield"),
        timeMinSec = num("tmin").toInt(),
        timeMaxSec = num("tmax").toInt(),
        temperatureC = num("temp").toInt(),
        hint = p["hint"].orEmpty().trim(),
        url = p["url"]?.trim()?.ifEmpty { null },
    )
}

internal suspend fun ApplicationCall.respondHtml(body: String, status: HttpStatusCode = HttpStatusCode.OK) =
    respondText(body, ContentType.Text.Html.withParameter("charset", "utf-8"), status)

internal fun esc(s: String) = s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;").replace("'", "&#39;")

private fun fmt(d: Double) = if (d % 1.0 == 0.0) d.toInt().toString() else d.toString().replace('.', ',')

private fun qrSvg(text: String): String {
    val matrix = QRCodeWriter().encode(text, BarcodeFormat.QR_CODE, 0, 0, mapOf(EncodeHintType.ERROR_CORRECTION to ErrorCorrectionLevel.M, EncodeHintType.MARGIN to 2))
    val path = buildString {
        for (y in 0 until matrix.height) for (x in 0 until matrix.width) if (matrix[x, y]) append("M$x ${y}h1v1h-1z")
    }
    return """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${matrix.width} ${matrix.height}" shape-rendering="crispEdges" role="img" aria-label="QR-Code"><rect width="100%" height="100%" fill="#fff"/><path d="$path" fill="#1e1915"/></svg>"""
}

private fun recipeLines(c: RoasterCard) = """
    <dl class=recipe>
      <div><dt>Dosis</dt><dd>${fmt(c.doseGrams)} g</dd></div>
      <div><dt>Ertrag</dt><dd>${fmt(c.yieldGrams)} g</dd></div>
      <div><dt>Zeit</dt><dd>${c.timeMinSec}–${c.timeMaxSec} s</dd></div>
      <div><dt>Temperatur</dt><dd>${c.temperatureC} °C</dd></div>
    </dl>
    ${if (c.hint.isNotBlank()) "<p class=hint>${esc(c.hint)}</p>" else ""}
"""

private fun printable(c: RoasterCard, link: String) = """
  <section class=card>
    <div class=qr>${qrSvg(link)}</div>
    <div>
      <p class=eyebrow>${esc(c.roaster)}</p>
      <h2>${esc(c.coffee)}</h2>
      <p class=muted>${esc(listOf(c.country, c.region).filter { it.isNotBlank() }.joinToString(", "))}${if (c.notes.isNotEmpty()) " · " + esc(c.notes.joinToString(", ")) else ""}</p>
      ${recipeLines(c)}
      <p class=small>Scannen und in drops. übernehmen</p>
    </div>
  </section>
  <p class=noprint>Drucken (Strg/Cmd + P) und der Tüte beilegen. Der Code enthält das Rezept selbst, es wird nichts gespeichert.<br><a href="${esc(link)}">Vorschau der Scan-Seite</a> · <a href="/roaster">Neue Karte</a></p>
"""

private fun landing(c: RoasterCard) = """
  <p class=eyebrow>Startrezept von ${esc(c.roaster)}</p>
  <h1>${esc(c.coffee)}</h1>
  ${recipeLines(c)}
  <p><a class=button href="https://play.google.com/store/apps/details?id=de.birneklub.drops">drops. für Android holen</a></p>
  <p class=small>Mit installierter App öffnet dieser Link die Bohne direkt in drops. Der Mahlgrad fehlt bewusst: Er hängt von deiner Mühle ab.</p>
  ${c.url?.let { "<p><a href=\"${esc(it)}\">Beim Röster ansehen</a></p>" } ?: ""}
"""

private fun form(p: Parameters = Parameters.Empty): String {
    fun v(name: String, default: String = "") = esc(p[name] ?: default)
    val processes = listOf(Process.WASHED to "Gewaschen", Process.NATURAL to "Natural", Process.HONEY to "Honey", Process.ANAEROBIC to "Anaerob", Process.OTHER to "Andere")
    return """
  <p class=muted>Für Röstereien: Startrezept eintragen, Karte drucken, der Tüte beilegen. Wer den Code mit drops. scannt, hat Bohne und Rezept sofort in der App.</p>
  <form action="/roaster/card" method="get">
    <label>Rösterei<input name=roaster required maxlength=60 value="${v("roaster")}"></label>
    <label>Kaffee<input name=coffee required maxlength=80 value="${v("coffee")}"></label>
    <div class=row><label>Land<input name=country maxlength=40 value="${v("country")}"></label><label>Region<input name=region maxlength=60 value="${v("region")}"></label></div>
    <label>Aufbereitung<select name=process>${processes.joinToString("") { (proc, label) -> "<option value=${proc.name}${if (p["process"] == proc.name) " selected" else ""}>$label</option>" }}</select></label>
    <label>Aromen, mit Komma<input name=notes value="${v("notes")}"></label>
    <div class=row><label>Dosis (g)<input name=dose inputmode=decimal required value="${v("dose", "18")}"></label><label>Ertrag (g)<input name=yield inputmode=decimal required value="${v("yield", "40")}"></label></div>
    <div class=row><label>Zeit von (s)<input name=tmin inputmode=numeric required value="${v("tmin", "26")}"></label><label>bis (s)<input name=tmax inputmode=numeric required value="${v("tmax", "32")}"></label><label>Temperatur (°C)<input name=temp inputmode=numeric required value="${v("temp", "93")}"></label></div>
    <label>Tipp (optional)<input name=hint maxlength=200 value="${v("hint")}"></label>
    <label>Shop-Link zum Nachkaufen (optional)<input name=url type=url placeholder="https://" value="${v("url")}"></label>
    <button>Karte erstellen</button>
  </form>
"""
}

internal fun page(title: String, body: String) = """<!doctype html>
<html lang=de><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<style>
  :root{--ink:#1e1915;--muted:#6f6259;--line:#e3dbd2;--paper:#faf7f3;--accent:#b4532a}
  body{margin:0;padding:24px 16px;background:var(--paper);color:var(--ink);font:16px/1.5 system-ui,sans-serif}
  main{max-width:640px;margin:0 auto}
  h1,h2{font-family:Georgia,serif;font-weight:400;margin:.2em 0}
  .eyebrow{text-transform:uppercase;letter-spacing:.08em;font-size:12px;color:var(--accent);margin:0}
  .muted{color:var(--muted)} .small{font-size:13px;color:var(--muted)} .err{color:#a32020}
  form{display:grid;gap:12px} label{display:grid;gap:4px;font-size:14px;color:var(--muted)}
  input,select{font:inherit;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:#fff;color:var(--ink)}
  .row{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px}
  button,.button{font:inherit;font-weight:600;padding:12px 20px;border:0;border-radius:999px;background:var(--ink);color:#fff;text-decoration:none;display:inline-block;cursor:pointer}
  .recipe{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:12px 0}
  .recipe dt{font-size:12px;color:var(--muted)} .recipe dd{margin:0;font-weight:600;font-variant-numeric:tabular-nums}
  .card{display:grid;grid-template-columns:150px 1fr;gap:20px;align-items:center;background:#fff;border:1px solid var(--line);border-radius:16px;padding:20px;max-width:560px}
  .qr svg{width:150px;height:150px}
  @media (max-width:480px){.card{grid-template-columns:1fr}.recipe{grid-template-columns:repeat(2,1fr)}}
  @media print{body{background:#fff;padding:0}.noprint{display:none}.card{border:1px dashed #999}}
</style></head><body><main><h1>${esc(title)}</h1>$body</main></body></html>"""
