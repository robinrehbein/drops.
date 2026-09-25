package de.birneklub.drop.android

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import de.birneklub.drop.android.ui.DropsRoot
import de.birneklub.drop.android.ui.DropsTheme
import kotlinx.coroutines.flow.MutableStateFlow

class MainActivity : ComponentActivity() {
    /** Screen requested by a notification tap, consumed by the navigation. */
    private val deepLink = MutableStateFlow<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        if (savedInstanceState == null) deepLink.value = intent?.getStringExtra(EXTRA_ROUTE)
        val container = (application as DropsApp).container
        setContent {
            DropsTheme {
                DropsRoot(container, deepLink)
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        intent.getStringExtra(EXTRA_ROUTE)?.let { deepLink.value = it }
    }
}
