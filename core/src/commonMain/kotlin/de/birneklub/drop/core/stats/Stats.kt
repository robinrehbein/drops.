package de.birneklub.drop.core.stats

import kotlinx.datetime.LocalDate
import kotlinx.serialization.Serializable

/**
 * Anonymous beta statistics, sent only after the user opted in. The app counts
 * events per day under a random install id; nothing identifies the person, the
 * account or what they brew.
 */
object StatEvents {
    const val APP_OPEN = "app_open"
    const val SETUP_DONE = "setup_done"
    const val BEAN_ADDED = "bean_added"
    const val SHOT_LOGGED = "shot_logged"
    const val TASK_DONE = "task_done"
    const val LINK_REORDER = "link_reorder"
    const val LINK_SUPPLY = "link_supply"
    const val FOUNDING_VIEW = "founding_view"
    const val FOUNDING_BUY = "founding_buy"
    const val ROASTER_RECIPE = "roaster_recipe"

    val all: Set<String> = setOf(APP_OPEN, SETUP_DONE, BEAN_ADDED, SHOT_LOGGED, TASK_DONE, LINK_REORDER, LINK_SUPPLY, FOUNDING_VIEW, FOUNDING_BUY, ROASTER_RECIPE)
}

@Serializable
data class StatCount(val day: LocalDate, val event: String, val count: Int)

@Serializable
data class StatsUpload(
    val installId: String,
    val platform: String,
    val appVersion: String,
    val counts: List<StatCount>,
)

object StatsLimits {
    const val MAX_COUNTS_PER_UPLOAD = 500
    const val MAX_COUNT = 10_000
    /** Offline phones may upload late, but not arbitrarily old or future days. */
    const val MAX_AGE_DAYS = 60
}

/**
 * The 90-day goal's key results, computed by the server from the counts.
 * Shares are 0..1 and null while there is not enough data yet.
 */
@Serializable
data class BetaReport(
    val today: LocalDate,
    val installs: Int,
    /** KR1: installs that finished onboarding (machine, grinder, first bean or skip). */
    val setupCompletedShare: Double?,
    val activeLast30Days: Int,
    val activeLast7Days: Int,
    /** KR2: of installs first seen at least 35 days ago, share active on day 28–35. */
    val day30RetentionShare: Double?,
    val day30Cohort: Int,
    /** KR3: logged shots per week in which the install was active. */
    val shotsPerActiveWeek: Double?,
    /** KR3: completed care tasks per install active in the last 30 days. */
    val tasksDonePerActiveInstall: Double?,
    /** KR4: installs with a founding-member purchase, of those active in the last 30 days. */
    val foundingBuyerShare: Double?,
    val foundingBuyers: Int,
    /** KR5: installs that opened a reorder or supply link in the last 30 days, of the active ones. */
    val linkClickShare: Double?,
    /** KR6: beans added from a roaster's QR card (only from opted-in installs). */
    val roasterRecipes: Int = 0,
    val weekly: List<WeekRow>,
)

@Serializable
data class WeekRow(val weekStart: LocalDate, val newInstalls: Int, val activeInstalls: Int, val shots: Int)
