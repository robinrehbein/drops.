package de.birneklub.drop.android.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import de.birneklub.drop.android.ui.ButtonKind
import de.birneklub.drop.android.ui.Drops
import de.birneklub.drop.android.ui.DropsCard
import de.birneklub.drop.android.ui.DropsType
import de.birneklub.drop.android.ui.DropsViewModel
import de.birneklub.drop.android.ui.Eyebrow
import de.birneklub.drop.android.ui.PillButton
import de.birneklub.drop.android.ui.Routes
import de.birneklub.drop.android.ui.TextAction
import de.birneklub.drop.android.ui.fmt
import de.birneklub.drop.core.roaster.RoasterCard

/** Preview of a scanned roaster card before it becomes a bean with a recipe. */
@Composable
fun RoasterCardScreen(vm: DropsViewModel, nav: NavController, payload: String) {
    val card = remember(payload) { RoasterCard.decode(payload) }
    val c = Drops.colors
    ScreenColumn {
        TextAction("‹ Zurück", { if (!nav.popBackStack()) nav.navigate(Routes.TODAY) })
        if (card == null) {
            ScreenTitle("Karte ungültig")
            Text("Dieser Code ist beschädigt oder unvollständig. Frag die Rösterei nach einer neuen Karte.", style = DropsType.body, color = c.muted)
            return@ScreenColumn
        }
        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Eyebrow("Startrezept von ${card.roaster}", c.accent)
            ScreenTitle(card.coffee)
            val origin = listOf(card.country, card.region).filter { it.isNotBlank() }.joinToString(", ")
            if (origin.isNotBlank() || card.notes.isNotEmpty()) {
                Text(listOf(origin, card.notes.joinToString(", ")).filter { it.isNotBlank() }.joinToString(" · "), style = DropsType.body, color = c.muted)
            }
        }
        DropsCard(Modifier.fillMaxWidth()) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Fact("Dosis", "${card.doseGrams.fmt()} g")
                Fact("Ertrag", "${card.yieldGrams.fmt()} g")
                Fact("Zeit", "${card.timeMinSec}–${card.timeMaxSec} s")
                Fact("Temp.", "${card.temperatureC} °C")
            }
            if (card.hint.isNotBlank()) Text(card.hint, style = DropsType.small, color = c.ink, modifier = Modifier.padding(top = 12.dp))
        }
        Text("Den Mahlgrad findest du mit deiner Mühle selbst; drops. hilft dir beim ersten Shot.", style = DropsType.small, color = c.muted)
        PillButton("Bohne und Rezept übernehmen", {
            val id = vm.addRoasterCard(card)
            nav.navigate(Routes.bean(id)) { popUpTo(Routes.ROASTER_CARD) { inclusive = true } }
        }, Modifier.fillMaxWidth(), kind = ButtonKind.Ink, height = 56.dp)
    }
}

@Composable
private fun Fact(label: String, value: String) {
    Column {
        Text(label, style = DropsType.caption, color = Drops.colors.muted)
        Text(value, style = DropsType.bodyStrong, color = Drops.colors.ink)
    }
}
