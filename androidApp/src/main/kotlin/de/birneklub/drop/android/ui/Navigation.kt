package de.birneklub.drop.android.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.clickable
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import de.birneklub.drop.android.AppContainer
import kotlinx.coroutines.flow.MutableStateFlow
import de.birneklub.drop.android.ui.screens.AccountScreen
import de.birneklub.drop.android.ui.screens.AddBeanScreen
import de.birneklub.drop.android.ui.screens.BeanDetailScreen
import de.birneklub.drop.android.ui.screens.BeansScreen
import de.birneklub.drop.android.ui.screens.EquipmentScreen
import de.birneklub.drop.android.ui.screens.MapScreen
import de.birneklub.drop.android.ui.screens.OnboardingScreen
import de.birneklub.drop.core.model.EquipmentKind
import de.birneklub.drop.android.ui.screens.SetupScreen
import de.birneklub.drop.android.ui.screens.ShotScreen
import de.birneklub.drop.android.ui.screens.TodayScreen

object Routes {
    const val TODAY = "today"
    const val BEANS = "beans"
    const val MAP = "map"
    const val SETUP = "setup"
    const val BEAN = "bean/{id}"
    const val SHOT = "shot/{beanId}"
    const val ADD_BEAN = "add-bean"
    const val ACCOUNT = "account"
    const val ONBOARDING = "onboarding"
    const val EQUIPMENT = "equipment/{kind}"

    fun bean(id: String) = "bean/$id"
    fun shot(beanId: String) = "shot/$beanId"
    fun equipment(kind: EquipmentKind) = "equipment/${kind.name}"
}

private data class Tab(val route: String, val label: String, val icon: ImageVector)

private val tabs = listOf(
    Tab(Routes.TODAY, "Heute", DropsIcons.Home),
    Tab(Routes.BEANS, "Bohnen", DropsIcons.Bean),
    Tab(Routes.MAP, "Karte", DropsIcons.Map),
    Tab(Routes.SETUP, "Setup", DropsIcons.Setup),
)

@Composable
fun DropsRoot(container: AppContainer, deepLink: MutableStateFlow<String?> = MutableStateFlow(null)) {
    val vm: DropsViewModel = viewModel(factory = DropsViewModel.factory(container))
    val nav = rememberNavController()
    val snackbar = remember { SnackbarHostState() }
    val message by vm.messages.collectAsStateWithLifecycle()
    LaunchedEffect(message) {
        message?.let { snackbar.showSnackbar(it); vm.consumeMessage() }
    }
    val entry by nav.currentBackStackEntryAsState()
    val route = entry?.destination?.route
    val showTabs = route in tabs.map { it.route }
    val setupDone by vm.setupDone.collectAsStateWithLifecycle()
    // Decide the start screen once; later changes navigate explicitly.
    val start = remember(setupDone == null) { if (setupDone == false) Routes.ONBOARDING else Routes.TODAY }

    Scaffold(
        containerColor = Drops.colors.paper,
        snackbarHost = { SnackbarHost(snackbar) },
        bottomBar = { if (showTabs) TabBar(route, nav) },
    ) { padding ->
        if (setupDone == null) return@Scaffold
        val link by deepLink.collectAsStateWithLifecycle()
        LaunchedEffect(link, setupDone) {
            val target = link ?: return@LaunchedEffect
            if (setupDone != true) return@LaunchedEffect
            deepLink.value = null
            nav.navigate(target) { launchSingleTop = true }
        }
        NavHost(nav, startDestination = start, modifier = Modifier.fillMaxSize().padding(bottom = padding.calculateBottomPadding())) {
            composable(Routes.TODAY) { TodayScreen(vm, nav) }
            composable(Routes.BEANS) { BeansScreen(vm, nav) }
            composable(Routes.MAP) { MapScreen(vm) }
            composable(Routes.SETUP) { SetupScreen(vm, nav) }
            composable(Routes.BEAN) { BeanDetailScreen(vm, nav, it.arguments?.getString("id").orEmpty()) }
            composable(Routes.SHOT) { ShotScreen(vm, nav, it.arguments?.getString("beanId").orEmpty()) }
            composable(Routes.ADD_BEAN) { AddBeanScreen(vm, nav) }
            composable(Routes.ACCOUNT) { AccountScreen(vm, nav) }
            composable(Routes.ONBOARDING) { OnboardingScreen(vm, nav) }
            composable(Routes.EQUIPMENT) {
                val kind = EquipmentKind.entries.firstOrNull { k -> k.name == it.arguments?.getString("kind") } ?: EquipmentKind.MACHINE
                EquipmentScreen(vm, nav, kind)
            }
        }
    }
}

@Composable
private fun TabBar(current: String?, nav: NavHostController) {
    val c = Drops.colors
    Column(Modifier.background(c.surface)) {
        Divider()
        Row(Modifier.fillMaxWidth().windowInsetsPadding(WindowInsets.navigationBars).padding(horizontal = 6.dp, vertical = 6.dp)) {
            tabs.forEach { tab ->
                val on = tab.route == current
                Column(
                    Modifier
                        .weight(1f)
                        .heightIn(min = 52.dp)
                        .semantics { selected = on }
                        .clickable(role = Role.Tab) {
                            nav.navigate(tab.route) {
                                popUpTo(nav.graph.findStartDestination().id) { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(3.dp, Alignment.CenterVertically),
                ) {
                    val tint = if (on) c.accent else c.muted
                    Icon(tab.icon, null, tint = tint)
                    Text(tab.label, style = DropsType.caption.copy(fontSize = 11.sp), color = tint)
                }
            }
        }
    }
}

@Composable
fun ScreenBox(content: @Composable () -> Unit) = Box(Modifier.fillMaxSize().background(Drops.colors.paper)) { content() }
