package de.birneklub.drop.android.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Text
import androidx.compose.animation.AnimatedVisibility
import de.birneklub.drop.android.ui.Motion
import de.birneklub.drop.android.ui.rememberReducedMotion
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import de.birneklub.drop.android.BuildConfig
import de.birneklub.drop.android.ui.ButtonKind
import de.birneklub.drop.android.ui.Drops
import de.birneklub.drop.android.ui.DropsCard
import de.birneklub.drop.android.ui.DropsIcons
import de.birneklub.drop.android.ui.DropsType
import de.birneklub.drop.android.ui.DropsViewModel
import de.birneklub.drop.android.ui.Icon
import de.birneklub.drop.android.ui.PillButton
import de.birneklub.drop.android.ui.Segmented
import de.birneklub.drop.android.ui.TextAction
import de.birneklub.drop.android.ui.a11y

@Composable
fun AccountScreen(vm: DropsViewModel, nav: NavController) {
    val state by vm.account.collectAsStateWithLifecycle()
    val c = Drops.colors
    val reduced = rememberReducedMotion()
    ScreenColumn {
        Row(verticalAlignment = Alignment.CenterVertically) { TextAction("‹ Zurück", { nav.popBackStack() }) }
        ScreenTitle("Konto")

        DropsCard(Modifier.fillMaxWidth()) {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(DropsIcons.Cloud, null, tint = c.muted, size = 20.dp)
                Text("Alles funktioniert ohne Konto.", style = DropsType.bodyStrong, color = c.ink)
            }
            Text(
                "Deine Daten liegen lokal auf dem Gerät. Ein Konto brauchst du nur für Backup und Sync zwischen Handy, Tablet und später dem iPhone.",
                style = DropsType.body, color = c.muted, modifier = Modifier.padding(top = 8.dp),
            )
        }

        val session = state.session
        if (session != null) {
            DropsCard(Modifier.fillMaxWidth()) {
                Text("Angemeldet als", style = DropsType.small, color = c.muted)
                Text(session.email, style = DropsType.bodyStrong, color = c.ink)
                Text(session.serverUrl, style = DropsType.small, color = c.muted)
                state.lastSyncMessage?.let { Text(it, style = DropsType.small, color = c.ok, modifier = Modifier.padding(top = 8.dp)) }
                AnimatedVisibility(state.error != null, enter = Motion.expandIn(reduced), exit = Motion.collapseOut(reduced)) {
                    Text(state.error.orEmpty(), style = DropsType.small, color = c.bad, modifier = Modifier.padding(top = 8.dp))
                }
            }
            PillButton(if (state.busy) "Synchronisiere …" else "Jetzt synchronisieren", { vm.syncNow() }, Modifier.fillMaxWidth(), enabled = !state.busy, icon = DropsIcons.Refresh)
            PillButton("Abmelden", { vm.logout() }, Modifier.fillMaxWidth(), kind = ButtonKind.Ghost)
            var confirm by rememberSaveable { mutableStateOf(false) }
            if (!confirm) TextAction("Konto löschen", { confirm = true }, c.bad)
            AnimatedVisibility(confirm, enter = Motion.expandIn(reduced), exit = Motion.collapseOut(reduced)) {
                DropsCard(Modifier.fillMaxWidth()) {
                    Text("Konto und alle Daten auf dem Server löschen? Die Daten auf diesem Gerät bleiben erhalten.", style = DropsType.body, color = c.ink)
                    Row(Modifier.padding(top = 12.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        PillButton("Abbrechen", { confirm = false }, Modifier.weight(1f), kind = ButtonKind.Ghost, height = 44.dp)
                        PillButton("Löschen", { vm.deleteAccount(); confirm = false }, Modifier.weight(1f), kind = ButtonKind.Ink, height = 44.dp)
                    }
                }
            }
        } else {
            var mode by rememberSaveable { mutableStateOf(0) }
            var server by rememberSaveable { mutableStateOf(BuildConfig.DEFAULT_SYNC_URL) }
            var email by rememberSaveable { mutableStateOf("") }
            var password by rememberSaveable { mutableStateOf("") }

            Segmented(listOf("Anmelden", "Registrieren"), mode, { mode = it }, Modifier.fillMaxWidth())
            Column(Modifier.clip(RoundedCornerShape(18.dp)).border(1.dp, c.line, RoundedCornerShape(18.dp)).background(c.line), verticalArrangement = Arrangement.spacedBy(1.dp)) {
                Field("Server", server, { server = it }, KeyboardType.Uri)
                Field("E-Mail", email, { email = it }, KeyboardType.Email)
                Field("Passwort", password, { password = it }, KeyboardType.Password, secret = true)
            }
            AnimatedVisibility(state.error != null, enter = Motion.expandIn(reduced), exit = Motion.collapseOut(reduced)) {
                Text(state.error.orEmpty(), style = DropsType.small, color = c.bad)
            }
            PillButton(
                when { state.busy -> "Bitte warten …"; mode == 0 -> "Anmelden"; else -> "Konto erstellen" },
                { vm.login(server, email, password, register = mode == 1) },
                Modifier.fillMaxWidth(),
                kind = ButtonKind.Ink,
                enabled = !state.busy && email.isNotBlank() && password.length >= 8,
            )
            Text("Nach dem Anmelden werden deine lokalen Daten hochgeladen und mit anderen Geräten abgeglichen.", style = DropsType.small, color = c.muted)
        }
    }
}

@Composable
private fun Field(label: String, value: String, onChange: (String) -> Unit, type: KeyboardType, secret: Boolean = false) {
    val c = Drops.colors
    Column(Modifier.fillMaxWidth().background(c.surface).padding(horizontal = 14.dp, vertical = 10.dp)) {
        Text(label, style = DropsType.caption, color = c.muted)
        Box {
            BasicTextField(
                value, onChange,
                singleLine = true,
                textStyle = DropsType.body.copy(color = c.ink),
                cursorBrush = SolidColor(c.accent),
                keyboardOptions = KeyboardOptions(keyboardType = type, autoCorrectEnabled = false),
                visualTransformation = if (secret) PasswordVisualTransformation() else VisualTransformation.None,
                modifier = Modifier.fillMaxWidth().padding(top = 2.dp).a11y(label),
            )
        }
    }
}
