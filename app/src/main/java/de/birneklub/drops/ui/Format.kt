package de.birneklub.drops.ui

import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit

fun formatGrind(value: Double): String =
    if (value % 1.0 == 0.0) value.toInt().toString() else "%.1f".format(value)

fun formatGrams(value: Double): String =
    if (value % 1.0 == 0.0) value.toInt().toString() else "%.1f".format(value)

fun formatRecipeShort(dose: Double?, yield_: Double?, timeSec: Int?): String {
    if (dose == null || yield_ == null || timeSec == null) return ""
    return "${formatGrams(dose)} g → ${formatGrams(yield_)} g · $timeSec s"
}

fun freshnessLabel(roastDate: LocalDate?): String? {
    roastDate ?: return null
    val days = ChronoUnit.DAYS.between(roastDate, LocalDate.now())
    return if (days >= 0) "Tag ${days + 1} nach Röstung" else null
}

private val dateFormat: DateTimeFormatter = DateTimeFormatter.ofPattern("dd.MM.yyyy")

fun formatDate(date: LocalDate): String = date.format(dateFormat)
