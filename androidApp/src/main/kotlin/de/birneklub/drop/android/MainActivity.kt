package de.birneklub.drop.android

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import de.birneklub.drop.android.ui.DropsRoot
import de.birneklub.drop.core.roaster.RoasterCard
import de.birneklub.drop.android.ui.DropsTheme
import kotlinx.coroutines.flow.MutableStateFlow

class MainActivity : ComponentActivity() {
    /** Screen requested by a notification tap, consumed by the navigation. */
    private val deepLink = MutableStateFlow<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        if (savedInstanceState == null) deepLink.value = routeFor(intent)
        val container = (application as DropsApp).container
        setContent {
            DropsTheme {
                DropsRoot(container, deepLink)
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        routeFor(intent)?.let { deepLink.value = it }
    }

    /** A notification's screen, or a roaster card opened from a scanned QR link. */
    private fun routeFor(intent: Intent?): String? {
        intent ?: return null
        intent.getStringExtra(EXTRA_ROUTE)?.let { return it }
        val path = intent.data?.path ?: return null
        val payload = path.removePrefix(RoasterCard.PATH).takeIf { path.startsWith(RoasterCard.PATH) && it.isNotBlank() } ?: return null
        return "card/$payload"
    }
}
