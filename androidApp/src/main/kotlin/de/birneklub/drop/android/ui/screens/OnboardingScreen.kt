package de.birneklub.drop.android.ui.screens

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import de.birneklub.drop.android.ui.ButtonKind
import de.birneklub.drop.android.ui.Drops
import de.birneklub.drop.android.ui.DropsCard
import de.birneklub.drop.android.ui.DropsIcons
import de.birneklub.drop.android.ui.DropsType
import de.birneklub.drop.android.ui.DropsViewModel
import de.birneklub.drop.android.ui.Eyebrow
import de.birneklub.drop.android.ui.Icon
import de.birneklub.drop.android.ui.PillButton
import de.birneklub.drop.android.ui.Routes
import de.birneklub.drop.android.ui.TextAction
import de.birneklub.drop.android.ui.a11y
import de.birneklub.drop.android.ui.rememberNotificationPermission
import de.birneklub.drop.core.catalog.EquipmentCatalog
import de.birneklub.drop.core.catalog.GrinderModel
import de.birneklub.drop.core.catalog.MachineModel
import de.birneklub.drop.core.model.EquipmentKind

/** First start: machine, grinder, first bean. Each step can be skipped. */
@Composable
fun OnboardingScreen(vm: DropsViewModel, nav: NavController) {
    var step by rememberSaveable { mutableIntStateOf(0) }
    var machineId by rememberSaveable { mutableStateOf<String?>(null) }
    val c = Drops.colors

    val (notificationsAllowed, askNotifications) = rememberNotificationPermission()

    fun leave(then: String?) {
        // Care reminders are the point of the machine step, so ask right after it.
        if (!notificationsAllowed) askNotifications()
        vm.finishSetup()
        nav.navigate(Routes.TODAY) { popUpTo(Routes.ONBOARDING) { inclusive = true } }
        then?.let { nav.navigate(it) }
    }

    ScreenColumn {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Eyebrow("Schritt ${step + 1} von 3")
            if (step > 0) TextAction("‹ Zurück", { step-- })
        }
        when (step) {
            0 -> {
                ScreenTitle("Deine Maschine")
                Text("Damit stimmen Pflegeplan und Erinnerungen von Anfang an.", style = DropsType.body, color = c.muted)
                EquipmentPicker(EquipmentKind.MACHINE, suggestedFor = null) { machine, _, custom ->
                    vm.chooseMachine(machine, custom)
                    machineId = machine?.id
                    step = 1
                }
                TextAction("Erst mal mit Beispieldaten umsehen", {
                    vm.exploreWithSamples()
                    nav.navigate(Routes.TODAY) { popUpTo(Routes.ONBOARDING) { inclusive = true } }
                }, c.muted)
            }
            1 -> {
                ScreenTitle("Deine Mühle")
                Text("Die Skala deiner Mühle bestimmt, in welchen Schritten drops. den Mahlgrad vorschlägt.", style = DropsType.body, color = c.muted)
                EquipmentPicker(EquipmentKind.GRINDER, suggestedFor = machineId) { _, grinder, custom ->
                    vm.chooseGrinder(grinder, custom)
                    step = 2
                }
            }
            else -> {
                ScreenTitle("Deine erste Bohne")
                DropsCard(Modifier.fillMaxWidth()) {
                    Text("Was ist gerade im Trichter?", style = DropsType.bodyStrong, color = c.ink)
                    Text(
                        "Mit Röstdatum und Menge erinnert dich drops., bevor die Tüte leer ist, und merkt sich das Rezept für den Nachkauf.",
                        style = DropsType.small, color = c.muted, modifier = Modifier.padding(top = 6.dp),
                    )
                }
                StatsConsentCard(vm)
                PillButton("Bohne anlegen", { leave(Routes.ADD_BEAN) }, Modifier.fillMaxWidth(), kind = ButtonKind.Ink, height = 56.dp)
                val bcImporter = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
                    if (uri != null) { vm.importBeanconqueror(uri); leave(null) }
                }
                TextAction("Von Beanconqueror umziehen", { bcImporter.launch(arrayOf("application/zip", "application/json", "application/octet-stream")) })
                TextAction("Später", { leave(null) }, c.muted)
            }
        }
    }
}

/** Setup tab: swap the machine or grinder later. */
@Composable
fun EquipmentScreen(vm: DropsViewModel, nav: NavController, kind: EquipmentKind) {
    ScreenColumn {
        Row(verticalAlignment = Alignment.CenterVertically) { TextAction("‹ Zurück", { nav.popBackStack() }) }
        ScreenTitle(if (kind == EquipmentKind.MACHINE) "Maschine ändern" else "Mühle ändern")
        Text(
            "Der Pflegeplan wird neu angelegt. Deine Shots und Rezepte bleiben.",
            style = DropsType.body, color = Drops.colors.muted,
        )
        EquipmentPicker(kind, suggestedFor = null) { machine, grinder, custom ->
            if (kind == EquipmentKind.MACHINE) vm.chooseMachine(machine, custom) else vm.chooseGrinder(grinder, custom)
            nav.popBackStack()
        }
    }
}

/**
 * Searchable catalog list with a free-text fallback. Calls [onPick] with the
 * catalog entry, or with nulls and the typed name for anything not listed.
 */
@Composable
private fun EquipmentPicker(kind: EquipmentKind, suggestedFor: String?, onPick: (MachineModel?, GrinderModel?, String) -> Unit) {
    val c = Drops.colors
    var query by rememberSaveable { mutableStateOf("") }
    val machine = kind == EquipmentKind.MACHINE

    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(c.surface).border(1.dp, c.line, RoundedCornerShape(14.dp))
            .padding(horizontal = 14.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(DropsIcons.Search, null, tint = c.muted, size = 18.dp)
        Box(Modifier.weight(1f)) {
            if (query.isEmpty()) Text(if (machine) "Marke oder Modell, z. B. Silvia" else "Marke oder Modell, z. B. Niche", style = DropsType.body, color = c.muted)
            BasicTextField(
                query, { query = it }, singleLine = true, textStyle = DropsType.body.copy(color = c.ink), cursorBrush = SolidColor(c.accent),
                modifier = Modifier.fillMaxWidth().a11y("Suche"),
            )
        }
    }

    Column(Modifier.clip(RoundedCornerShape(18.dp)).border(1.dp, c.line, RoundedCornerShape(18.dp)).background(c.line), verticalArrangement = Arrangement.spacedBy(1.dp)) {
        if (machine) {
            EquipmentCatalog.search(EquipmentCatalog.machines, query) { it.displayName }.forEach { m ->
                PickerRow(m.displayName, m.details) { onPick(m, null, "") }
            }
        } else {
            val found = EquipmentCatalog.search(EquipmentCatalog.grinders, query) { it.displayName }
            // A machine with a built-in grinder puts that grinder first.
            val sorted = found.sortedByDescending { suggestedFor != null && it.builtInto == suggestedFor }
            sorted.forEach { g ->
                val scale = g.scale
                val range = if (scale.label.startsWith("Stufenlos")) scale.label else "Skala ${scale.min.clean()}–${scale.max.clean()}${if (scale.label.isNotBlank()) " ${scale.label}" else ""}"
                PickerRow(g.displayName, "${g.burrs} · $range") { onPick(null, g, "") }
            }
        }
        if (query.isNotBlank()) {
            PickerRow("„${query.trim()}“ verwenden", if (machine) "Nicht in der Liste: allgemeiner Pflegeplan" else "Nicht in der Liste: eigene Skala") {
                onPick(null, null, query.trim())
            }
        }
    }
}

@Composable
private fun PickerRow(title: String, subtitle: String, onClick: () -> Unit) {
    val c = Drops.colors
    Row(
        Modifier.fillMaxWidth().heightIn(min = 56.dp).background(c.surface).clickable(role = Role.Button, onClick = onClick).padding(horizontal = 14.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Text(title, style = DropsType.bodyStrong, color = c.ink)
            if (subtitle.isNotBlank()) Text(subtitle, style = DropsType.small, color = c.muted)
        }
        Text("›", style = DropsType.headline, color = c.muted)
    }
}

private fun Double.clean(): String = if (this % 1.0 == 0.0) toInt().toString() else toString()
