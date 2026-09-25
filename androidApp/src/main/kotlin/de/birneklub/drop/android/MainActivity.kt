package de.birneklub.drop.android

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import de.birneklub.drop.android.ui.DropsRoot
import de.birneklub.drop.android.ui.DropsTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val container = (application as DropsApp).container
        setContent {
            DropsTheme {
                DropsRoot(container)
            }
        }
    }
}
