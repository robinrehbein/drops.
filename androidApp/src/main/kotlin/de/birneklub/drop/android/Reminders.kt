package de.birneklub.drop.android

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import de.birneklub.drop.core.reminders.Reminder
import de.birneklub.drop.core.reminders.ReminderKind
import java.util.concurrent.TimeUnit

/** Opens a screen when the app is launched from a notification. */
const val EXTRA_ROUTE = "de.birneklub.drop.ROUTE"

object ReminderNotifications {
    private const val CHANNEL_CARE = "care"
    private const val CHANNEL_REORDER = "reorder"
    private const val WORK_NAME = "reminders"

    /** Checks twice a day; the repository makes sure each reminder is sent once. */
    fun schedule(context: Context) {
        val request = PeriodicWorkRequestBuilder<ReminderWorker>(12, TimeUnit.HOURS).build()
        WorkManager.getInstance(context).enqueueUniquePeriodicWork(WORK_NAME, ExistingPeriodicWorkPolicy.KEEP, request)
    }

    fun createChannels(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = context.getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(NotificationChannel(CHANNEL_CARE, "Pflege", NotificationManager.IMPORTANCE_DEFAULT).apply {
            description = "Wenn Rückspülen, Filterwechsel oder Entkalken fällig ist"
        })
        manager.createNotificationChannel(NotificationChannel(CHANNEL_REORDER, "Nachkauf", NotificationManager.IMPORTANCE_DEFAULT).apply {
            description = "Wenn eine Tüte fast leer ist"
        })
    }

    fun allowed(context: Context): Boolean =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED

    fun show(context: Context, reminders: List<Reminder>) {
        if (!allowed(context) || !NotificationManagerCompat.from(context).areNotificationsEnabled()) return
        reminders.forEach { r ->
            val route = when (r.kind) {
                ReminderKind.CARE -> "setup"
                ReminderKind.REORDER -> "bean/${r.targetId}"
            }
            val intent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra(EXTRA_ROUTE, route)
            }
            val pending = PendingIntent.getActivity(context, r.key.hashCode(), intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
            val notification = NotificationCompat.Builder(context, if (r.kind == ReminderKind.CARE) CHANNEL_CARE else CHANNEL_REORDER)
                .setSmallIcon(R.drawable.ic_notification)
                .setContentTitle(r.title)
                .setContentText(r.text)
                .setStyle(NotificationCompat.BigTextStyle().bigText(r.text))
                .setContentIntent(pending)
                .setAutoCancel(true)
                .build()
            try {
                NotificationManagerCompat.from(context).notify(r.targetId.hashCode(), notification)
            } catch (_: SecurityException) {
                // Permission revoked between the check and the call.
            }
        }
    }
}

class ReminderWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val app = applicationContext as DropsApp
        // Without permission the reminders stay "unseen" and appear once it is granted.
        if (!ReminderNotifications.allowed(app)) return Result.success()
        ReminderNotifications.show(app, app.container.repository.takeNewReminders())
        return Result.success()
    }
}
