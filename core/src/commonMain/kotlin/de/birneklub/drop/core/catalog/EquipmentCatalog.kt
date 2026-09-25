package de.birneklub.drop.core.catalog

import de.birneklub.drop.core.model.Equipment
import de.birneklub.drop.core.model.EquipmentKind
import de.birneklub.drop.core.model.GrindScale
import de.birneklub.drop.core.model.IntervalUnit
import de.birneklub.drop.core.model.MaintenanceTask
import kotlinx.datetime.Instant

enum class MachineType(val label: String) {
    SINGLE_BOILER("Einkreiser"),
    HEAT_EXCHANGER("Zweikreiser"),
    DUAL_BOILER("Dualboiler"),
    THERMOBLOCK("Thermoblock"),
}

data class MachineModel(
    val id: String,
    val brand: String,
    val name: String,
    val type: MachineType,
    /** Has a three-way valve, so it can be backflushed with a blind basket. */
    val backflush: Boolean,
    /** Replacement interval of the manufacturer's tank filter, if it uses one. */
    val tankFilterDays: Int? = null,
    /** Detergent backflush by shot count, as some manufacturers specify. */
    val detergentEveryShots: Int? = null,
    /** Descaling interval for machines whose manufacturer asks for it. */
    val descaleDays: Int? = null,
    val group: String = "",
) {
    val displayName: String get() = "$brand $name"
    val details: String get() = listOf(type.label, group).filter { it.isNotBlank() }.joinToString(" · ")
}

data class GrinderModel(
    val id: String,
    val brand: String,
    val name: String,
    val scale: GrindScale,
    val burrs: String,
    val manual: Boolean = false,
    /** Built into a machine; picking the machine suggests it. */
    val builtInto: String? = null,
) {
    val displayName: String get() = "$brand $name"
}

/**
 * The machines and grinders people set up most often, with their dial and a
 * sensible care plan. Intervals follow the manufacturers' manuals where they
 * name one, otherwise common practice; users can change every task.
 */
object EquipmentCatalog {
    private fun stepless(from: Double, to: Double) = GrindScale(0.0, 100.0, 1.0, from, to, "Stufenlos: eigene Markierung")

    val machines: List<MachineModel> = listOf(
        MachineModel("sage-bambino-plus", "Sage", "the Bambino Plus", MachineType.THERMOBLOCK, backflush = false, tankFilterDays = 90, descaleDays = 90, group = "54 mm"),
        MachineModel("sage-barista-express", "Sage", "the Barista Express", MachineType.THERMOBLOCK, backflush = true, tankFilterDays = 90, detergentEveryShots = 200, descaleDays = 90, group = "54 mm"),
        MachineModel("sage-barista-pro", "Sage", "the Barista Pro", MachineType.THERMOBLOCK, backflush = true, tankFilterDays = 90, detergentEveryShots = 200, descaleDays = 90, group = "54 mm"),
        MachineModel("sage-barista-touch", "Sage", "the Barista Touch", MachineType.THERMOBLOCK, backflush = true, tankFilterDays = 90, detergentEveryShots = 200, descaleDays = 90, group = "54 mm"),
        MachineModel("sage-dual-boiler", "Sage", "the Dual Boiler", MachineType.DUAL_BOILER, backflush = true, tankFilterDays = 90, detergentEveryShots = 200, descaleDays = 90, group = "58 mm"),
        MachineModel("delonghi-dedica", "De'Longhi", "Dedica EC685", MachineType.THERMOBLOCK, backflush = false, tankFilterDays = 60, descaleDays = 90, group = "51 mm"),
        MachineModel("delonghi-specialista-arte", "De'Longhi", "La Specialista Arte", MachineType.THERMOBLOCK, backflush = false, tankFilterDays = 60, descaleDays = 90, group = "51 mm"),
        MachineModel("gaggia-classic-pro", "Gaggia", "Classic Pro / Evo Pro", MachineType.SINGLE_BOILER, backflush = true, descaleDays = 90, group = "58 mm"),
        MachineModel("rancilio-silvia", "Rancilio", "Silvia", MachineType.SINGLE_BOILER, backflush = true, group = "58 mm"),
        MachineModel("lelit-anna", "Lelit", "Anna PL41TEM", MachineType.SINGLE_BOILER, backflush = false, group = "57 mm"),
        MachineModel("lelit-mara-x", "Lelit", "Mara X", MachineType.HEAT_EXCHANGER, backflush = true, group = "E61"),
        MachineModel("lelit-elizabeth", "Lelit", "Elizabeth", MachineType.DUAL_BOILER, backflush = true, group = "58 mm"),
        MachineModel("lelit-bianca", "Lelit", "Bianca", MachineType.DUAL_BOILER, backflush = true, group = "E61"),
        MachineModel("rocket-appartamento", "Rocket", "Appartamento", MachineType.HEAT_EXCHANGER, backflush = true, group = "E61"),
        MachineModel("rocket-mozzafiato", "Rocket", "Mozzafiato Cronometro", MachineType.HEAT_EXCHANGER, backflush = true, group = "E61"),
        MachineModel("ecm-classika", "ECM", "Classika PID", MachineType.SINGLE_BOILER, backflush = true, group = "E61"),
        MachineModel("ecm-mechanika", "ECM", "Mechanika V Slim", MachineType.HEAT_EXCHANGER, backflush = true, group = "E61"),
        MachineModel("ecm-synchronika", "ECM", "Synchronika", MachineType.DUAL_BOILER, backflush = true, group = "E61"),
        MachineModel("profitec-go", "Profitec", "GO", MachineType.SINGLE_BOILER, backflush = true, group = "58 mm"),
        MachineModel("profitec-pro-300", "Profitec", "Pro 300", MachineType.DUAL_BOILER, backflush = true, group = "58 mm"),
        MachineModel("profitec-pro-600", "Profitec", "Pro 600", MachineType.DUAL_BOILER, backflush = true, group = "E61"),
        MachineModel("profitec-pro-700", "Profitec", "Pro 700", MachineType.DUAL_BOILER, backflush = true, group = "E61"),
        MachineModel("lamarzocco-linea-micra", "La Marzocco", "Linea Micra", MachineType.DUAL_BOILER, backflush = true, group = "58 mm"),
        MachineModel("lamarzocco-linea-mini", "La Marzocco", "Linea Mini", MachineType.DUAL_BOILER, backflush = true, group = "58 mm"),
    )

    val grinders: List<GrinderModel> = listOf(
        GrinderModel("niche-zero", "Niche", "Zero", GrindScale(0.0, 50.0, 0.5, 8.0, 18.0), "63 mm konisch"),
        GrinderModel("df64-gen2", "Turin", "DF64 Gen 2", GrindScale(0.0, 90.0, 0.5, 5.0, 20.0), "64 mm flach"),
        GrinderModel("eureka-mignon-specialita", "Eureka", "Mignon Specialità", stepless(10.0, 30.0), "55 mm flach"),
        GrinderModel("eureka-mignon-silenzio", "Eureka", "Mignon Silenzio", stepless(10.0, 30.0), "50 mm flach"),
        GrinderModel("eureka-mignon-zero", "Eureka", "Mignon Zero", stepless(10.0, 30.0), "65 mm flach"),
        GrinderModel("eureka-mignon-libra", "Eureka", "Mignon Libra", stepless(10.0, 30.0), "55 mm flach"),
        GrinderModel("eureka-atom-75", "Eureka", "Atom 75", stepless(10.0, 30.0), "75 mm flach"),
        GrinderModel("baratza-encore-esp", "Baratza", "Encore ESP", GrindScale(1.0, 40.0, 1.0, 1.0, 20.0), "40 mm konisch"),
        GrinderModel("fellow-opus", "Fellow", "Opus", GrindScale(1.0, 41.0, 1.0, 1.0, 10.0), "40 mm konisch"),
        GrinderModel("sage-smart-grinder-pro", "Sage", "the Smart Grinder Pro", GrindScale(1.0, 60.0, 1.0, 5.0, 25.0), "40 mm konisch"),
        GrinderModel("sage-dose-control-pro", "Sage", "the Dose Control Pro", GrindScale(1.0, 60.0, 1.0, 5.0, 25.0), "40 mm konisch"),
        GrinderModel("sage-express-builtin", "Sage", "Barista Express (eingebaut)", GrindScale(1.0, 16.0, 1.0, 3.0, 8.0), "40 mm konisch", builtInto = "sage-barista-express"),
        GrinderModel("sage-pro-builtin", "Sage", "Barista Pro/Touch (eingebaut)", GrindScale(1.0, 30.0, 1.0, 5.0, 20.0), "40 mm konisch", builtInto = "sage-barista-pro"),
        GrinderModel("comandante-c40", "Comandante", "C40 MK4", GrindScale(0.0, 40.0, 1.0, 6.0, 12.0, "Klicks"), "39 mm konisch", manual = true),
        GrinderModel("kingrinder-k6", "Kingrinder", "K6", GrindScale(0.0, 240.0, 1.0, 30.0, 60.0, "Klicks"), "48 mm konisch", manual = true),
    )

    /** Fallback for anything not in the list; the user names it and uses their own marks. */
    val customGrindScale: GrindScale = GrindScale(0.0, 100.0, 0.5, 10.0, 20.0, "Eigene Skala")

    fun machine(id: String?): MachineModel? = machines.firstOrNull { it.id == id }
    fun grinder(id: String?): GrinderModel? = grinders.firstOrNull { it.id == id }

    /** Case-insensitive search over brand and model, every word has to match. */
    fun <T> search(items: List<T>, query: String, name: (T) -> String): List<T> {
        val words = query.lowercase().split(' ', '-').filter { it.isNotBlank() }
        if (words.isEmpty()) return items
        return items.filter { item -> val n = name(item).lowercase(); words.all { it in n } }
    }

    fun equipmentFor(model: MachineModel, id: String, now: Instant) = Equipment(
        id = id, kind = EquipmentKind.MACHINE, name = model.displayName, details = model.details, modelId = model.id, updatedAt = now,
    )

    fun equipmentFor(model: GrinderModel, id: String, now: Instant) = Equipment(
        id = id, kind = EquipmentKind.GRINDER, name = model.displayName, details = model.burrs, modelId = model.id, grindScale = model.scale, updatedAt = now,
    )

    /**
     * The care plan for a machine. Every task starts "done now", so a new user
     * is not greeted with a wall of overdue chores.
     */
    fun tasksFor(machine: MachineModel?, equipmentId: String, now: Instant, newId: () -> String): List<MaintenanceTask> {
        fun task(name: String, description: String, value: Double, unit: IntervalUnit, supply: String? = null) =
            MaintenanceTask(newId(), equipmentId, name, description, value, unit, lastDoneAt = now.takeIf { unit == IntervalUnit.DAYS }, supply = supply, updatedAt = now)

        val backflush = machine?.backflush ?: true
        return buildList {
            if (backflush) {
                add(task("Rückspülen mit Wasser", "Blindsieb, 5 × 10 s", 7.0, IntervalUnit.DAYS))
                val shots = machine?.detergentEveryShots
                if (shots != null) {
                    add(task("Reinigungszyklus mit Tablette", "Laut Hersteller alle $shots Shots", shots.toDouble(), IntervalUnit.SHOTS, "Reinigungstabletten"))
                } else {
                    add(task("Rückspülen mit Reiniger", "Blindsieb und Reinigungspulver, danach mit Wasser nachspülen", 21.0, IntervalUnit.DAYS, "Reinigungspulver"))
                }
            } else {
                add(task("Siebträger und Siebe einweichen", "In Reinigerlösung, danach gründlich abspülen", 14.0, IntervalUnit.DAYS, "Reinigungstabletten"))
            }
            add(task("Duschsieb abwischen", "Feuchtes Tuch, Kaffeereste aus der Dichtung", 7.0, IntervalUnit.DAYS))
            machine?.tankFilterDays?.let { add(task("Wasserfilter wechseln", "Laut Hersteller alle $it Tage", it.toDouble(), IntervalUnit.DAYS, "Wasserfilter ${machine.displayName}")) }
            val descale = machine?.descaleDays
            if (descale != null) {
                add(task("Entkalken", "Mit dem Entkalker des Herstellers", descale.toDouble(), IntervalUnit.DAYS, "Entkalker"))
            } else {
                add(task("Wasserhärte prüfen", "Teststreifen; Kesselmaschinen nur mit gefiltertem Wasser betreiben", 90.0, IntervalUnit.DAYS, "Teststreifen Wasserhärte"))
            }
            add(task("Brühgruppendichtung tauschen", "Wird hart und rissig, spätestens nach einem Jahr", 365.0, IntervalUnit.DAYS, machine?.let { "Brühgruppendichtung ${it.displayName}" } ?: "Brühgruppendichtung"))
        }
    }

    fun tasksFor(grinder: GrinderModel?, equipmentId: String, now: Instant, newId: () -> String): List<MaintenanceTask> = listOf(
        MaintenanceTask(
            newId(), equipmentId, "Mühle reinigen", "Pinsel und Blasebalg, Mahlscheiben abbürsten",
            if (grinder?.manual == true) 1.0 else 2.0, IntervalUnit.KILOGRAMS, supply = "Mühlenreiniger", updatedAt = now,
        ),
    )
}
