package de.birneklub.drops

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.filled.Coffee
import androidx.compose.material.icons.filled.Explore
import androidx.compose.material.icons.filled.Handyman
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import de.birneklub.drops.ui.screens.AttemptLogScreen
import de.birneklub.drops.ui.screens.BeanDetailScreen
import de.birneklub.drops.ui.screens.BeanEditScreen
import de.birneklub.drops.ui.screens.BeanListScreen
import de.birneklub.drops.ui.screens.CareScreen
import de.birneklub.drops.ui.screens.DiscoverScreen
import de.birneklub.drops.ui.screens.GuideDetailScreen
import de.birneklub.drops.ui.screens.GuideScreen
import de.birneklub.drops.ui.screens.SettingsScreen
import de.birneklub.drops.ui.theme.DropsTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            DropsTheme {
                DropsRoot()
            }
        }
    }
}

private data class TabItem(val route: String, val label: String, val icon: ImageVector)

private val TABS = listOf(
    TabItem("beans", "Bohnen", Icons.Default.Coffee),
    TabItem("guide", "Guide", Icons.AutoMirrored.Filled.MenuBook),
    TabItem("care", "Pflege", Icons.Default.Handyman),
    TabItem("discover", "Entdecken", Icons.Default.Explore),
)

@Composable
fun DropsRoot() {
    val navController = rememberNavController()
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route
    val showBottomBar = TABS.any { it.route == currentRoute }

    Scaffold(
        bottomBar = {
            if (showBottomBar) {
                NavigationBar {
                    TABS.forEach { tab ->
                        NavigationBarItem(
                            selected = currentRoute == tab.route,
                            onClick = {
                                navController.navigate(tab.route) {
                                    popUpTo(navController.graph.findStartDestination().id) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            icon = { Icon(tab.icon, contentDescription = tab.label) },
                            label = { Text(tab.label) },
                        )
                    }
                }
            }
        },
    ) { padding ->
        NavHost(
            navController = navController,
            startDestination = "beans",
            modifier = Modifier.padding(padding),
        ) {
            composable("beans") {
                BeanListScreen(
                    onOpenBean = { id -> navController.navigate("bean/$id") },
                    onAddBean = { navController.navigate("beanEdit") },
                    onOpenSettings = { navController.navigate("settings") },
                )
            }
            composable("guide") {
                GuideScreen(onOpenGuide = { id -> navController.navigate("guideDetail/$id") })
            }
            composable("care") {
                CareScreen()
            }
            composable("discover") {
                DiscoverScreen()
            }
            composable(
                route = "guideDetail/{guideId}",
                arguments = listOf(navArgument("guideId") { type = NavType.StringType }),
            ) { entry ->
                GuideDetailScreen(
                    guideId = entry.arguments?.getString("guideId").orEmpty(),
                    onBack = { navController.popBackStack() },
                )
            }
            composable(
                route = "bean/{beanId}",
                arguments = listOf(navArgument("beanId") { type = NavType.StringType }),
            ) {
                BeanDetailScreen(
                    onBack = { navController.popBackStack() },
                    onEdit = { id -> navController.navigate("beanEdit?beanId=$id") },
                    onLogAttempt = { id -> navController.navigate("attempt/$id") },
                )
            }
            composable(
                route = "beanEdit?beanId={beanId}",
                arguments = listOf(
                    navArgument("beanId") {
                        type = NavType.StringType
                        nullable = true
                        defaultValue = null
                    }
                ),
            ) { backStack ->
                val wasNew = backStack.arguments?.getString("beanId") == null
                BeanEditScreen(
                    onBack = { navController.popBackStack() },
                    onSaved = { id ->
                        if (wasNew) {
                            navController.navigate("bean/$id") {
                                popUpTo("beans")
                            }
                        } else {
                            navController.popBackStack()
                        }
                    },
                )
            }
            composable(
                route = "attempt/{beanId}",
                arguments = listOf(navArgument("beanId") { type = NavType.StringType }),
            ) {
                AttemptLogScreen(onBack = { navController.popBackStack() })
            }
            composable("settings") {
                SettingsScreen(onBack = { navController.popBackStack() })
            }
        }
    }
}
