package de.birneklub.drop.server

import io.ktor.server.http.content.staticResources
import io.ktor.server.routing.Route

/**
 * The marketing site (landing page, waitlist form, legal pages) ships inside
 * the server image, so one Coolify resource serves both the website domain and
 * the sync subdomain.
 */
fun Route.website() {
    staticResources("/", "website", index = "index.html") {
        extensions("html")
    }
}
