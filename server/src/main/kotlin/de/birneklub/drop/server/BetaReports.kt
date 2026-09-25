package de.birneklub.drop.server

import de.birneklub.drop.core.stats.BetaReport
import de.birneklub.drop.core.stats.StatEvents
import de.birneklub.drop.core.stats.WeekRow
import kotlinx.datetime.DatePeriod
import kotlinx.datetime.DayOfWeek
import kotlinx.datetime.LocalDate
import kotlinx.datetime.daysUntil
import kotlinx.datetime.minus

/** Turns the raw daily counts into the numbers the 90-day goal is judged by. */
object BetaReports {
    private const val RETENTION_FROM = 28
    private const val RETENTION_TO = 35

    fun compute(rows: List<StatRow>, today: LocalDate): BetaReport {
        val parsed = rows.mapNotNull { r -> runCatching { LocalDate.parse(r.day) }.getOrNull()?.let { Row(r.installId, it, r.event, r.count) } }
        val byInstall = parsed.groupBy { it.install }
        val firstSeen = byInstall.mapValues { (_, rs) -> rs.minOf { it.day } }
        // Any counted event means the app was used that day.
        val activeDays = byInstall.mapValues { (_, rs) -> rs.map { it.day }.toSet() }

        fun activeWithin(days: Int) = activeDays.filterValues { ds -> ds.any { it.daysUntil(today) in 0 until days } }.keys
        val active30 = activeWithin(30)
        val active7 = activeWithin(7)

        val setupDone = parsed.filter { it.event == StatEvents.SETUP_DONE }.map { it.install }.toSet()

        val cohort = firstSeen.filterValues { it.daysUntil(today) >= RETENTION_TO }.keys
        val retained = cohort.count { id ->
            val first = firstSeen.getValue(id)
            activeDays.getValue(id).any { first.daysUntil(it) in RETENTION_FROM..RETENTION_TO }
        }

        val activeWeeks = activeDays.values.sumOf { ds -> ds.map { weekStart(it) }.toSet().size }
        val shots = parsed.filter { it.event == StatEvents.SHOT_LOGGED }.sumOf { it.count }

        val recent = parsed.filter { it.day.daysUntil(today) in 0 until 30 }
        val tasksDone = recent.filter { it.event == StatEvents.TASK_DONE }.sumOf { it.count }
        val clickers = recent.filter { it.event == StatEvents.LINK_REORDER || it.event == StatEvents.LINK_SUPPLY }.map { it.install }.toSet()
        val buyers = parsed.filter { it.event == StatEvents.FOUNDING_BUY }.map { it.install }.toSet()

        fun share(part: Int, whole: Int): Double? = if (whole == 0) null else part.toDouble() / whole

        val weeks = parsed.map { weekStart(it.day) }.toSortedSet().toList().takeLast(16)
        val weekly = weeks.map { w ->
            WeekRow(
                weekStart = w,
                newInstalls = firstSeen.values.count { weekStart(it) == w },
                activeInstalls = activeDays.count { (_, ds) -> ds.any { weekStart(it) == w } },
                shots = parsed.filter { it.event == StatEvents.SHOT_LOGGED && weekStart(it.day) == w }.sumOf { it.count },
            )
        }

        return BetaReport(
            today = today,
            installs = byInstall.size,
            setupCompletedShare = share(setupDone.size, byInstall.size),
            activeLast30Days = active30.size,
            activeLast7Days = active7.size,
            day30RetentionShare = share(retained, cohort.size),
            day30Cohort = cohort.size,
            shotsPerActiveWeek = if (activeWeeks == 0) null else shots.toDouble() / activeWeeks,
            tasksDonePerActiveInstall = if (active30.isEmpty()) null else tasksDone.toDouble() / active30.size,
            foundingBuyerShare = share(buyers.count { it in active30 }, active30.size),
            foundingBuyers = buyers.size,
            linkClickShare = share(clickers.count { it in active30 }, active30.size),
            weekly = weekly,
        )
    }

    private fun weekStart(d: LocalDate): LocalDate = d.minus(DatePeriod(days = d.dayOfWeek.ordinal - DayOfWeek.MONDAY.ordinal))

    private data class Row(val install: String, val day: LocalDate, val event: String, val count: Int)
}
