package de.birneklub.drops

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.Composable
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import de.birneklub.drops.ui.screens.AttemptLogScreen
import de.birneklub.drops.ui.screens.BeanDetailScreen
import de.birneklub.drops.ui.screens.BeanEditScreen
import de.birneklub.drops.ui.screens.BeanListScreen
import de.birneklub.drops.ui.screens.SettingsScreen
import de.birneklub.drops.ui.theme.DropsTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            DropsTheme {
                DropsNavHost()
            }
        }
    }
}

@Composable
fun DropsNavHost() {
    val navController = rememberNavController()

    NavHost(navController = navController, startDestination = "beans") {
        composable("beans") {
            BeanListScreen(
                onOpenBean = { id -> navController.navigate("bean/$id") },
                onAddBean = { navController.navigate("beanEdit") },
                onOpenSettings = { navController.navigate("settings") },
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
        ) { backStackEntry ->
            val wasNew = backStackEntry.arguments?.getString("beanId") == null
            BeanEditScreen(
                onBack = { navController.popBackStack() },
                onSaved = { id ->
                    if (wasNew) {
                        // Nach dem Anlegen direkt ins Detail, damit das Eindialen starten kann
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
