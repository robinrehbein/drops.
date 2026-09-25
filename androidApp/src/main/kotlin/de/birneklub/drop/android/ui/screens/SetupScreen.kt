package de.birneklub.drop.android.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import de.birneklub.drop.android.ui.ButtonKind
import de.birneklub.drop.android.ui.Drops
import de.birneklub.drop.android.ui.DropsCard
import de.birneklub.drop.android.ui.DropsIcons
import de.birneklub.drop.android.ui.DropsType
import de.birneklub.drop.android.ui.DropsViewModel
import de.birneklub.drop.android.ui.HeroCard
import de.birneklub.drop.android.ui.Icon
import de.birneklub.drop.android.ui.MonoFamily
import de.birneklub.drop.android.ui.PillButton
import de.birneklub.drop.android.ui.Routes
import de.birneklub.drop.android.ui.SectionHeader
import de.birneklub.drop.android.ui.TaskRow
import de.birneklub.drop.android.ui.fmtDe
import de.birneklub.drop.android.ui.grouped
import de.birneklub.drop.core.domain.TaskState
import de.birneklub.drop.core.model.EquipmentKind

@Composable
fun SetupScreen(vm: DropsViewModel, nav: NavController) {
    val lib by vm.library.collectAsStateWithLifecycle()
    val account by vm.account.collectAsStateWithLifecycle()
    val plan = lib.carePlan(vm.now())
    val overdue = plan.count { it.state == TaskState.OVERDUE }
    val c = Drops.colors
    val machine = lib.equipment.firstOrNull { it.kind == EquipmentKind.MACHINE }
    val grinder = lib.equipment.firstOrNull { it.kind == EquipmentKind.GRINDER }

    ScreenColumn {
        ScreenTitle("Setup", if (overdue > 0) "$overdue überfällig" else "Alles im grünen Bereich", if (overdue > 0) c.bad else c.ok)

        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            machine?.let {
                HeroCard(Modifier.weight(1f)) {
                    Icon(DropsIcons.Machine, null, tint = c.heroAccent, size = 28.dp)
                    Column {
                        Text(it.name, style = DropsType.bodyStrong, color = c.heroInk)
                        Text(it.details, style = DropsType.caption, color = c.heroMuted)
                    }
                    Column {
                        Text(it.shotCount.grouped(), style = DropsType.number.copy(fontSize = 20.sp), color = c.heroInk)
                        Text("Shots gesamt", style = DropsType.caption.copy(fontSize = 11.sp), color = c.heroMuted)
                    }
                }
            }
            grinder?.let {
                HeroCard(Modifier.weight(1f)) {
                    Icon(DropsIcons.Grinder, null, tint = c.heroAccent, size = 28.dp)
                    Column {
                        Text(it.name, style = DropsType.bodyStrong, color = c.heroInk)
                        Text(it.details, style = DropsType.caption, color = c.heroMuted)
                    }
                    Column {
                        Text("${it.groundKg.fmtDe()} kg", style = DropsType.number.copy(fontSize = 20.sp), color = c.heroInk)
                        Text("gemahlen", style = DropsType.caption.copy(fontSize = 11.sp), color = c.heroMuted)
                    }
                }
            }
        }

        if (machine?.waterHardness != null) {
            DropsCard(Modifier.fillMaxWidth(), padding = PaddingValues(horizontal = 14.dp, vertical = 12.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Icon(DropsIcons.Drop, null, tint = c.ice, size = 20.dp)
                    Text(
                        "Wasser: Leitung ${machine.waterHardness!!.fmtDe(0)} °dH → Filter ${machine.filteredHardness?.fmtDe(0) ?: "–"} °dH",
                        style = DropsType.body.copy(fontSize = 14.sp), color = c.ink, modifier = Modifier.weight(1f),
                    )
                }
            }
        }

        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            SectionHeader("Pflegeplan", trailing = "nach Dringlichkeit")
            plan.forEach { s -> DropsCard(Modifier.fillMaxWidth(), padding = PaddingValues(0.dp)) { TaskRow(s, compact = false) { vm.completeTask(s) } } }
        }

        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            SectionHeader("Konto & Sync")
            DropsCard(Modifier.fillMaxWidth(), onClick = { nav.navigate(Routes.ACCOUNT) }) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Icon(DropsIcons.Cloud, null, tint = if (account.session != null) c.ok else c.muted, size = 22.dp)
                    Column(Modifier.weight(1f)) {
                        Text(account.session?.email ?: "Nur auf diesem Gerät", style = DropsType.bodyStrong, color = c.ink)
                        Text(
                            if (account.session != null) account.lastSyncMessage ?: "Angemeldet" else "Optional: Konto für Backup und mehrere Geräte",
                            style = DropsType.small, color = c.muted,
                        )
                    }
                    Text("›", style = DropsType.headline, color = c.muted)
                }
            }
        }

        if (lib.beans.any { it.id.startsWith(de.birneklub.drop.data.SampleData.PREFIX) }) {
            PillButton("Beispielbohnen entfernen", { vm.removeSampleData() }, Modifier.fillMaxWidth(), kind = ButtonKind.Ghost)
        }
        Text("Version ${de.birneklub.drop.android.BuildConfig.VERSION_NAME}", style = DropsType.caption.copy(fontFamily = MonoFamily), color = c.muted, modifier = Modifier.align(Alignment.CenterHorizontally))
    }
}
