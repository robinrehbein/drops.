package de.birneklub.drop.android.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.birneklub.drop.android.ui.Drops
import de.birneklub.drop.android.ui.DropsCard
import de.birneklub.drop.android.ui.DropsType
import de.birneklub.drop.android.ui.DropsViewModel
import de.birneklub.drop.android.ui.Segmented

/**
 * Consent for the anonymous beta statistics. Nothing is selected until the
 * user chooses, and "Nein" is as easy as "Ja".
 */
@Composable
fun StatsConsentCard(vm: DropsViewModel) {
    val optIn by vm.statsOptIn.collectAsStateWithLifecycle()
    val c = Drops.colors
    DropsCard(Modifier.fillMaxWidth()) {
        Text("Anonyme Beta-Statistik teilen?", style = DropsType.bodyStrong, color = c.ink)
        Text(
            "Wir zählen pro Tag, wie oft die App genutzt, ein Shot gespeichert, Pflege erledigt oder ein Nachkauf-Link geöffnet wird. " +
                "Keine Namen, keine Bohnen, kein Konto, keine Werbe-IDs. Du kannst es hier jederzeit wieder ausschalten; dann löschen wir die ID auf dem Gerät.",
            style = DropsType.small, color = c.muted, modifier = Modifier.padding(top = 6.dp, bottom = 12.dp),
        )
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Segmented(
                listOf("Ja, teilen", "Nein"),
                when (optIn) { true -> 0; false -> 1; null -> -1 },
                { vm.setStatsOptIn(it == 0) },
                Modifier.fillMaxWidth(),
            )
        }
    }
}
