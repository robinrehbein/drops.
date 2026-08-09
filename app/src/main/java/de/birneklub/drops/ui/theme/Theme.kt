package de.birneklub.drops.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val Espresso = Color(0xFF4A2C20)
private val Crema = Color(0xFFF6EBDD)
private val Caramel = Color(0xFFB07B4F)
private val Cherry = Color(0xFFB3392E)
private val Leaf = Color(0xFF5E7A4E)

private val LightColors = lightColorScheme(
    primary = Espresso,
    onPrimary = Crema,
    primaryContainer = Color(0xFFE9D6C3),
    onPrimaryContainer = Color(0xFF331B12),
    secondary = Caramel,
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFF1DFCB),
    onSecondaryContainer = Color(0xFF3E2A18),
    tertiary = Leaf,
    error = Cherry,
    background = Color(0xFFFDF8F2),
    onBackground = Color(0xFF241A13),
    surface = Color(0xFFFDF8F2),
    onSurface = Color(0xFF241A13),
    surfaceVariant = Color(0xFFF0E4D6),
    onSurfaceVariant = Color(0xFF54463A),
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFFE3C6A8),
    onPrimary = Color(0xFF3A2417),
    primaryContainer = Color(0xFF54382A),
    onPrimaryContainer = Color(0xFFF2E2D0),
    secondary = Color(0xFFD3A87E),
    onSecondary = Color(0xFF3E2A18),
    secondaryContainer = Color(0xFF4E3826),
    onSecondaryContainer = Color(0xFFF1DFCB),
    tertiary = Color(0xFFA9C297),
    error = Color(0xFFE8938B),
    background = Color(0xFF1B140F),
    onBackground = Color(0xFFEFE4D9),
    surface = Color(0xFF1B140F),
    onSurface = Color(0xFFEFE4D9),
    surfaceVariant = Color(0xFF41352B),
    onSurfaceVariant = Color(0xFFD2C2B2),
)

@Composable
fun DropsTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        content = content,
    )
}
