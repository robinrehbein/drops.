package de.birneklub.drop.android.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import de.birneklub.drop.android.ui.ButtonKind
import de.birneklub.drop.android.ui.Chip
import de.birneklub.drop.android.ui.Drops
import de.birneklub.drop.android.ui.DropsType
import de.birneklub.drop.android.ui.DropsViewModel
import de.birneklub.drop.android.ui.PillButton
import de.birneklub.drop.android.ui.Routes
import de.birneklub.drop.android.ui.TextAction
import de.birneklub.drop.android.ui.a11y
import de.birneklub.drop.core.model.Bean
import de.birneklub.drop.core.model.GeoPoint
import de.birneklub.drop.core.model.Process
import de.birneklub.drop.core.model.Purchase
import de.birneklub.drop.core.model.PurchaseChannel
import kotlinx.datetime.LocalDate

/** Approximate coordinates for pins on the map; exact farm locations are rarely known. */
val CoffeeCountries = linkedMapOf(
    "Äthiopien" to GeoPoint(7.0, 38.7), "Kenia" to GeoPoint(-0.4, 37.0), "Ruanda" to GeoPoint(-2.3, 29.5), "Burundi" to GeoPoint(-3.0, 29.9),
    "Kolumbien" to GeoPoint(2.0, -75.5), "Brasilien" to GeoPoint(-19.0, -46.5), "Guatemala" to GeoPoint(15.0, -91.0), "Costa Rica" to GeoPoint(9.7, -84.0),
    "Honduras" to GeoPoint(14.5, -88.0), "El Salvador" to GeoPoint(13.8, -89.0), "Panama" to GeoPoint(8.8, -82.4), "Peru" to GeoPoint(-6.0, -78.0),
    "Mexiko" to GeoPoint(16.5, -92.5), "Indonesien" to GeoPoint(3.5, 98.5), "Jemen" to GeoPoint(15.3, 44.0), "Indien" to GeoPoint(12.5, 75.5),
)

val Cities = linkedMapOf(
    "Hamburg" to GeoPoint(53.55, 9.99), "Berlin" to GeoPoint(52.52, 13.40), "Leipzig" to GeoPoint(51.34, 12.37), "München" to GeoPoint(48.14, 11.58),
    "Köln" to GeoPoint(50.94, 6.96), "Frankfurt" to GeoPoint(50.11, 8.68), "Kopenhagen" to GeoPoint(55.68, 12.57), "Amsterdam" to GeoPoint(52.37, 4.90),
    "Wien" to GeoPoint(48.21, 16.37), "Zürich" to GeoPoint(47.37, 8.54),
)

@Composable
fun AddBeanScreen(vm: DropsViewModel, nav: NavController) {
    val c = Drops.colors
    var name by rememberSaveable { mutableStateOf("") }
    var roaster by rememberSaveable { mutableStateOf("") }
    var country by rememberSaveable { mutableStateOf("Äthiopien") }
    var region by rememberSaveable { mutableStateOf("") }
    var roastDate by rememberSaveable { mutableStateOf("") }
    var weight by rememberSaveable { mutableStateOf("250") }
    var price by rememberSaveable { mutableStateOf("") }
    var notes by rememberSaveable { mutableStateOf("") }
    var shopUrl by rememberSaveable { mutableStateOf("") }
    var process by rememberSaveable { mutableStateOf(Process.WASHED) }
    var city by rememberSaveable { mutableStateOf("Hamburg") }
    var channel by rememberSaveable { mutableStateOf(PurchaseChannel.IN_STORE) }
    var error by rememberSaveable { mutableStateOf<String?>(null) }

    ScreenColumn {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            TextAction("Abbrechen", { nav.popBackStack() })
        }
        ScreenTitle("Neue Bohne")

        Column(Modifier.clip(RoundedCornerShape(18.dp)).border(1.dp, c.line, RoundedCornerShape(18.dp)).background(c.line), verticalArrangement = Arrangement.spacedBy(1.dp)) {
            FormField("Name", name, { name = it })
            FormField("Rösterei", roaster, { roaster = it })
            FormField("Region", region, { region = it })
            Row(horizontalArrangement = Arrangement.spacedBy(1.dp)) {
                FormField("Röstdatum (JJJJ-MM-TT)", roastDate, { roastDate = it }, Modifier.weight(1f), KeyboardType.Number)
                FormField("Menge (g)", weight, { weight = it }, Modifier.weight(1f), KeyboardType.Number)
            }
            Row(horizontalArrangement = Arrangement.spacedBy(1.dp)) {
                FormField("Preis (€)", price, { price = it }, Modifier.weight(1f), KeyboardType.Decimal)
                FormField("Aromen, mit Komma", notes, { notes = it }, Modifier.weight(1f))
            }
            FormField("Shop-Link zum Nachkaufen (optional)", shopUrl, { shopUrl = it }, type = KeyboardType.Uri)
        }

        ChoiceRow("Land", CoffeeCountries.keys.toList(), country) { country = it }
        ChoiceRow("Aufbereitung", listOf("Washed", "Natural", "Honey", "Anaerob"), processLabel(process)) {
            process = when (it) { "Natural" -> Process.NATURAL; "Honey" -> Process.HONEY; "Anaerob" -> Process.ANAEROBIC; else -> Process.WASHED }
        }
        ChoiceRow("Gekauft in", Cities.keys.toList(), city) { city = it }
        ChoiceRow("Wie gekauft", listOf("vor Ort", "online", "auf Reisen"), channelLabel(channel)) {
            channel = when (it) { "online" -> PurchaseChannel.ONLINE; "auf Reisen" -> PurchaseChannel.TRAVEL; else -> PurchaseChannel.IN_STORE }
        }

        error?.let { Text(it, style = DropsType.small, color = c.bad) }
        PillButton("Speichern", {
            val date = roastDate.takeIf { it.isNotBlank() }?.let { runCatching { LocalDate.parse(it.trim()) }.getOrNull() }
            when {
                name.isBlank() -> error = "Bitte einen Namen eintragen."
                roastDate.isNotBlank() && date == null -> error = "Röstdatum bitte als JJJJ-MM-TT eingeben, z. B. 2026-09-22."
                else -> {
                    val grams = weight.toIntOrNull() ?: 250
                    val bean = Bean(
                        id = vm.newId(), name = name.trim(), roaster = roaster.trim(), country = country, region = region.trim(),
                        origin = CoffeeCountries[country], process = process, roastDate = date, weightGrams = grams, remainingGrams = grams.toDouble(),
                        tastingNotes = notes.split(',').map { it.trim() }.filter { it.isNotEmpty() },
                        purchase = Purchase(roaster.trim().ifBlank { "Rösterei" }, city, Cities[city], channel, price.replace(',', '.').toDoubleOrNull()?.let { (it * 100).toInt() },
                            url = shopUrl.trim().takeIf { it.startsWith("https://") || it.startsWith("http://") }),
                        updatedAt = vm.now(),
                    )
                    vm.addBean(bean)
                    nav.popBackStack()
                    nav.navigate(Routes.bean(bean.id))
                }
            }
        }, Modifier.fillMaxWidth(), kind = ButtonKind.Ink, height = 56.dp)
        Text("Etikett-Scan kommt als nächster Schritt (Kamera + Texterkennung auf dem Gerät).", style = DropsType.small, color = c.muted)
    }
}

@Composable
private fun FormField(label: String, value: String, onChange: (String) -> Unit, modifier: Modifier = Modifier.fillMaxWidth(), type: KeyboardType = KeyboardType.Text) {
    val c = Drops.colors
    Column(modifier.background(c.surface).padding(horizontal = 14.dp, vertical = 10.dp)) {
        Text(label, style = DropsType.caption, color = c.muted)
        BasicTextField(
            value, onChange, singleLine = true, textStyle = DropsType.body.copy(color = c.ink), cursorBrush = SolidColor(c.accent),
            keyboardOptions = KeyboardOptions(keyboardType = type), modifier = Modifier.fillMaxWidth().padding(top = 2.dp).a11y(label),
        )
    }
}

@Composable
private fun ChoiceRow(label: String, options: List<String>, selected: String, onSelect: (String) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(label, style = DropsType.small, color = Drops.colors.muted)
        Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            options.forEach { Chip(it, it == selected) { onSelect(it) } }
        }
    }
}
