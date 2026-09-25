package de.birneklub.drop.android.ui

import android.Manifest
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import de.birneklub.drop.android.ReminderNotifications

/** Whether reminders may be shown, and a callback that asks for it (Android 13+). */
@Composable
fun rememberNotificationPermission(): Pair<Boolean, () -> Unit> {
    val context = LocalContext.current
    var allowed by remember { mutableStateOf(ReminderNotifications.allowed(context)) }
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted -> allowed = granted }
    return allowed to {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) launcher.launch(Manifest.permission.POST_NOTIFICATIONS)
    }
}
