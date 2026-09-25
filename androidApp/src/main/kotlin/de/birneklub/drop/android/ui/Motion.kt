package de.birneklub.drop.android.ui

import android.provider.Settings
import androidx.compose.animation.ContentTransform
import androidx.compose.animation.EnterTransition
import androidx.compose.animation.ExitTransition
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.FiniteAnimationSpec
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.tween
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.shrinkVertically
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntSize

/**
 * Material 3 transition patterns (m3.material.io/styles/motion/transitions),
 * with the legacy easing and duration tokens the guidelines still use.
 *
 * - Top level (tab bar): fade through. The old screen fades out quickly, then
 *   the new one fades in with a slight scale, never overlapping.
 * - Forward and backward (hierarchy): Android shared axis X. Screens slide a
 *   short distance while fading, so they never travel the full width.
 * - Enter and exit (components in a screen): expand and collapse along the y
 *   axis, no scale, short fades only.
 *
 * With "Remove animations" on, the system scales durations to 0; the helpers
 * then fall back to plain quick fades as the guidelines ask for.
 */
object Motion {
    // Easing tokens
    val Emphasized = CubicBezierEasing(0.2f, 0f, 0f, 1f)
    val EmphasizedDecelerate = CubicBezierEasing(0.05f, 0.7f, 0.1f, 1f)
    val EmphasizedAccelerate = CubicBezierEasing(0.3f, 0f, 0.8f, 0.15f)

    // Duration tokens (ms)
    const val SHORT4 = 200
    const val MEDIUM2 = 300
    const val MEDIUM4 = 400

    /** Shared axis slides only a fraction of the width; the fade does the rest. */
    private const val SHARED_AXIS_OFFSET_FRACTION = 0.08f

    // Fade through splits its duration: 35 % fade out, then the rest fades in.
    private const val FADE_THROUGH = MEDIUM2
    private const val FADE_THROUGH_OUT = 90
    private const val FADE_THROUGH_IN = FADE_THROUGH - FADE_THROUGH_OUT

    private fun <T> spec(duration: Int, delay: Int = 0, easing: androidx.compose.animation.core.Easing = Emphasized): FiniteAnimationSpec<T> =
        tween(duration, delay, easing)

    // --- top level ----------------------------------------------------------------

    fun fadeThroughIn(reduced: Boolean): EnterTransition =
        if (reduced) fadeIn(spec(SHORT4, easing = LinearEasing))
        else fadeIn(spec(FADE_THROUGH_IN, FADE_THROUGH_OUT, EmphasizedDecelerate)) +
            scaleIn(spec(FADE_THROUGH_IN, FADE_THROUGH_OUT, EmphasizedDecelerate), initialScale = 0.92f)

    fun fadeThroughOut(reduced: Boolean): ExitTransition =
        fadeOut(spec(if (reduced) SHORT4 else FADE_THROUGH_OUT, easing = if (reduced) LinearEasing else EmphasizedAccelerate))

    // --- forward and backward --------------------------------------------------------

    /** [forward] = deeper into the hierarchy; back navigation mirrors it. */
    fun sharedAxisXIn(forward: Boolean, reduced: Boolean): EnterTransition {
        if (reduced) return fadeIn(spec(SHORT4, easing = LinearEasing))
        // The incoming screen starts fading in only after the outgoing one is gone: clean fades.
        return slideInHorizontally(spec<IntOffset>(MEDIUM4, easing = Emphasized)) { w -> ((if (forward) 1 else -1) * w * SHARED_AXIS_OFFSET_FRACTION).toInt() } +
            fadeIn(spec(MEDIUM4 - 100, 100, EmphasizedDecelerate))
    }

    fun sharedAxisXOut(forward: Boolean, reduced: Boolean): ExitTransition {
        if (reduced) return fadeOut(spec(SHORT4, easing = LinearEasing))
        return slideOutHorizontally(spec<IntOffset>(MEDIUM4, easing = Emphasized)) { w -> ((if (forward) -1 else 1) * w * SHARED_AXIS_OFFSET_FRACTION).toInt() } +
            fadeOut(spec(100, easing = EmphasizedAccelerate))
    }

    /** Same pattern for content that swaps inside one screen, like onboarding steps. */
    fun sharedAxisX(forward: Boolean, reduced: Boolean): ContentTransform =
        sharedAxisXIn(forward, reduced) togetherWith sharedAxisXOut(forward, reduced)

    // --- enter and exit ----------------------------------------------------------------

    /** Expands downward from its top edge, as for content revealed below what was tapped. */
    fun expandIn(reduced: Boolean): EnterTransition =
        if (reduced) fadeIn(spec(SHORT4, easing = LinearEasing))
        else expandVertically(spec<IntSize>(MEDIUM2, easing = EmphasizedDecelerate), expandFrom = Alignment.Top) + fadeIn(spec(100, easing = LinearEasing))

    fun collapseOut(reduced: Boolean): ExitTransition =
        if (reduced) fadeOut(spec(SHORT4, easing = LinearEasing))
        else shrinkVertically(spec<IntSize>(SHORT4, easing = EmphasizedAccelerate), shrinkTowards = Alignment.Top) + fadeOut(spec(100, easing = LinearEasing))

    /** Bars that leave across the bottom edge (the tab bar on detail screens). */
    fun barIn(reduced: Boolean): EnterTransition =
        if (reduced) fadeIn(spec(SHORT4, easing = LinearEasing))
        else expandVertically(spec<IntSize>(MEDIUM2, easing = EmphasizedDecelerate), expandFrom = Alignment.Top)

    fun barOut(reduced: Boolean): ExitTransition =
        if (reduced) fadeOut(spec(SHORT4, easing = LinearEasing))
        else shrinkVertically(spec<IntSize>(SHORT4, easing = EmphasizedAccelerate), shrinkTowards = Alignment.Top)
}

/** True when the user turned animations off or down to zero in the system settings. */
@Composable
fun rememberReducedMotion(): Boolean {
    val context = LocalContext.current
    return remember(context) {
        Settings.Global.getFloat(context.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) == 0f
    }
}

/** Hierarchy depth of a route, so navigation knows whether it moves forward or back. */
fun routeDepth(route: String?): Int = when (route) {
    null -> 0
    Routes.TODAY, Routes.BEANS, Routes.MAP, Routes.SETUP, Routes.ONBOARDING -> 0
    Routes.BEAN, Routes.ADD_BEAN, Routes.ACCOUNT, Routes.EQUIPMENT, Routes.ROASTER_CARD -> 1
    Routes.SHOT -> 2
    else -> 1
}

fun isTopLevel(route: String?): Boolean = route in setOf(Routes.TODAY, Routes.BEANS, Routes.MAP, Routes.SETUP)

/** Picks the M3 pattern for a navigation step between two routes. */
fun patternFor(from: String?, to: String?, reduced: Boolean, popping: Boolean): Pair<EnterTransition, ExitTransition> =
    if (isTopLevel(from) && isTopLevel(to)) {
        Motion.fadeThroughIn(reduced) to Motion.fadeThroughOut(reduced)
    } else {
        val forward = if (popping) false else routeDepth(to) >= routeDepth(from)
        Motion.sharedAxisXIn(forward, reduced) to Motion.sharedAxisXOut(forward, reduced)
    }
