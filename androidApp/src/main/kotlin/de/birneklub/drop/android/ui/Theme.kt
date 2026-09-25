package de.birneklub.drop.android.ui

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontVariation
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import de.birneklub.drop.android.R

/** "Röster-Ledger": warm paper, espresso ink, one crema accent. */
@Immutable
data class DropsColors(
    val paper: Color,
    val surface: Color,
    val ink: Color,
    val muted: Color,
    val line: Color,
    val track: Color,
    val accent: Color,
    val onAccent: Color,
    val hero: Color,
    val heroInk: Color,
    val heroMuted: Color,
    val heroLine: Color,
    val heroAccent: Color,
    val ok: Color,
    val okSoft: Color,
    val warn: Color,
    val warnSoft: Color,
    val bad: Color,
    val badSoft: Color,
    val ice: Color,
    val iceSoft: Color,
    val inverse: Color,
    val onInverse: Color,
    val sea: Color,
    val land: Color,
    val landLine: Color,
)

val LightDropsColors = DropsColors(
    paper = Color(0xFFF3EEE5), surface = Color(0xFFFBF8F3), ink = Color(0xFF1E1915), muted = Color(0xFF62574D),
    line = Color(0xFFE0D6C8), track = Color(0xFFEAE1D4), accent = Color(0xFFA4521E), onAccent = Color(0xFFFBF8F3),
    hero = Color(0xFF2A211B), heroInk = Color(0xFFF6EFE6), heroMuted = Color(0xFFBFB2A4), heroLine = Color(0xFF43372E),
    heroAccent = Color(0xFFE08A4F), ok = Color(0xFF3E6A55), okSoft = Color(0xFFDCE8DF), warn = Color(0xFFA4521E),
    warnSoft = Color(0xFFF1DFD0), bad = Color(0xFF9B2C20), badSoft = Color(0xFFF4D9D3), ice = Color(0xFF2F5064),
    iceSoft = Color(0xFFDDE6EC), inverse = Color(0xFF1E1915), onInverse = Color(0xFFFBF8F3),
    sea = Color(0xFFE4EAE8), land = Color(0xFFF7F2EA), landLine = Color(0xFFCFC4B4),
)

val DarkDropsColors = DropsColors(
    paper = Color(0xFF16110E), surface = Color(0xFF201915), ink = Color(0xFFF2E9DF), muted = Color(0xFFAE9F90),
    line = Color(0xFF382D26), track = Color(0xFF2E251F), accent = Color(0xFFE08A4F), onAccent = Color(0xFF1E1915),
    hero = Color(0xFF2B211B), heroInk = Color(0xFFF6EFE6), heroMuted = Color(0xFFBFB2A4), heroLine = Color(0xFF453830),
    heroAccent = Color(0xFFE08A4F), ok = Color(0xFF7FB39A), okSoft = Color(0xFF1F3029), warn = Color(0xFFE08A4F),
    warnSoft = Color(0xFF3A2618), bad = Color(0xFFE88A7C), badSoft = Color(0xFF3A1C18), ice = Color(0xFF9CC0D6),
    iceSoft = Color(0xFF1D2A33), inverse = Color(0xFFF2E9DF), onInverse = Color(0xFF1E1915),
    sea = Color(0xFF1A2123), land = Color(0xFF2A221D), landLine = Color(0xFF4A3E35),
)

val LocalDropsColors = staticCompositionLocalOf { LightDropsColors }

@OptIn(androidx.compose.ui.text.ExperimentalTextApi::class)
private fun geist(weight: Int) = Font(
    R.font.geist, FontWeight(weight),
    variationSettings = FontVariation.Settings(FontVariation.weight(weight)),
)

@OptIn(androidx.compose.ui.text.ExperimentalTextApi::class)
private fun geistMono(weight: Int) = Font(
    R.font.geist_mono, FontWeight(weight),
    variationSettings = FontVariation.Settings(FontVariation.weight(weight)),
)

val SerifFamily = FontFamily(Font(R.font.instrument_serif))
val SansFamily = FontFamily(geist(400), geist(500), geist(600))
val MonoFamily = FontFamily(geistMono(400), geistMono(500))

object DropsType {
    val display = TextStyle(fontFamily = SerifFamily, fontSize = 40.sp, lineHeight = 42.sp, letterSpacing = (-0.01).em)
    val title = TextStyle(fontFamily = SerifFamily, fontSize = 32.sp, lineHeight = 34.sp)
    val headline = TextStyle(fontFamily = SerifFamily, fontSize = 26.sp, lineHeight = 28.sp)
    val section = TextStyle(fontFamily = SansFamily, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
    val body = TextStyle(fontFamily = SansFamily, fontSize = 15.sp, lineHeight = 21.sp)
    val bodyStrong = body.copy(fontWeight = FontWeight.Medium)
    val small = TextStyle(fontFamily = SansFamily, fontSize = 13.sp, lineHeight = 18.sp)
    val caption = TextStyle(fontFamily = SansFamily, fontSize = 12.sp, lineHeight = 16.sp)
    val number = TextStyle(fontFamily = MonoFamily, fontSize = 18.sp)
    val numberLarge = TextStyle(fontFamily = MonoFamily, fontSize = 24.sp, fontWeight = FontWeight.Medium)
    val eyebrow = TextStyle(fontFamily = MonoFamily, fontSize = 11.sp, letterSpacing = 0.12.em)
}

object Drops {
    val colors: DropsColors @Composable get() = LocalDropsColors.current
}

@Composable
fun DropsTheme(dark: Boolean = isSystemInDarkTheme(), content: @Composable () -> Unit) {
    val c = if (dark) DarkDropsColors else LightDropsColors
    val material = if (dark) {
        darkColorScheme(primary = c.accent, onPrimary = c.onAccent, background = c.paper, surface = c.surface, onSurface = c.ink, onBackground = c.ink, outline = c.line)
    } else {
        lightColorScheme(primary = c.accent, onPrimary = c.onAccent, background = c.paper, surface = c.surface, onSurface = c.ink, onBackground = c.ink, outline = c.line)
    }
    CompositionLocalProvider(LocalDropsColors provides c) {
        MaterialTheme(colorScheme = material, content = content)
    }
}
