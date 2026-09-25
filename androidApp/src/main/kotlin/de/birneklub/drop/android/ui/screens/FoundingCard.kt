package de.birneklub.drop.android.ui.screens

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.activity.compose.LocalActivity
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.birneklub.drop.android.FoundingMember
import de.birneklub.drop.android.ui.ButtonKind
import de.birneklub.drop.android.ui.Drops
import de.birneklub.drop.android.ui.DropsType
import de.birneklub.drop.android.ui.DropsViewModel
import de.birneklub.drop.android.ui.Eyebrow
import de.birneklub.drop.android.ui.HeroCard
import de.birneklub.drop.android.ui.PillButton

/** The one-time founding-member offer for beta users. */
@Composable
fun FoundingCard(vm: DropsViewModel) {
    val state by vm.founding.state.collectAsStateWithLifecycle()
    val activity = LocalActivity.current
    val c = Drops.colors
    LaunchedEffect(Unit) { vm.foundingViewed() }

    HeroCard(Modifier.fillMaxWidth()) {
        Eyebrow("Founding Member", c.heroAccent)
        if (state == FoundingMember.State.Owned) {
            Text("Danke, dass du drops. von Anfang an trägst.", style = DropsType.headline, color = c.heroInk)
            Text("Alle Pro-Funktionen, die nach der Beta kommen, sind für dich dauerhaft freigeschaltet.", style = DropsType.small, color = c.heroMuted)
            return@HeroCard
        }
        Text("Einmal zahlen, für immer dabei.", style = DropsType.headline, color = c.heroInk)
        Text(
            "drops. bleibt ohne Konto und ohne Werbung nutzbar. Als Founding Member finanzierst du die Beta und bekommst alle späteren Pro-Funktionen ohne Abo.",
            style = DropsType.small, color = c.heroMuted, modifier = Modifier.padding(bottom = 4.dp),
        )
        when (val s = state) {
            is FoundingMember.State.Available -> PillButton(
                "Founding Member werden · ${s.price}",
                { activity?.let(vm.founding::buy) },
                Modifier.fillMaxWidth(), kind = ButtonKind.Hero,
            )
            FoundingMember.State.Pending -> Text("Zahlung wird noch bestätigt …", style = DropsType.small, color = c.heroInk)
            FoundingMember.State.Loading -> Text("Lade Angebot …", style = DropsType.small, color = c.heroMuted)
            else -> Text("Der Kauf öffnet mit der Beta im Play Store.", style = DropsType.small, color = c.heroMuted)
        }
    }
}
