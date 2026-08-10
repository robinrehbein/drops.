package de.birneklub.drops.ui

import androidx.lifecycle.ViewModelProvider.AndroidViewModelFactory.Companion.APPLICATION_KEY
import androidx.lifecycle.createSavedStateHandle
import androidx.lifecycle.viewmodel.CreationExtras
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import de.birneklub.drops.DropsApp
import de.birneklub.drops.ui.screens.AttemptLogViewModel
import de.birneklub.drops.ui.screens.BeanDetailViewModel
import de.birneklub.drops.ui.screens.BeanEditViewModel
import de.birneklub.drops.ui.screens.BeanListViewModel
import de.birneklub.drops.ui.screens.CareViewModel
import de.birneklub.drops.ui.screens.DiscoverViewModel
import de.birneklub.drops.ui.screens.SettingsViewModel

fun CreationExtras.dropsApp(): DropsApp = this[APPLICATION_KEY] as DropsApp

object AppViewModelProvider {
    val Factory = viewModelFactory {
        initializer {
            BeanListViewModel(dropsApp().container.repository)
        }
        initializer {
            BeanEditViewModel(createSavedStateHandle(), dropsApp().container.repository)
        }
        initializer {
            BeanDetailViewModel(createSavedStateHandle(), dropsApp().container.repository)
        }
        initializer {
            AttemptLogViewModel(
                createSavedStateHandle(),
                dropsApp().container.repository,
                dropsApp().container.grinderSettings,
            )
        }
        initializer {
            SettingsViewModel(dropsApp().container.grinderSettings, dropsApp().container.dataExporter)
        }
        initializer {
            CareViewModel(dropsApp().container.careRepository)
        }
        initializer {
            DiscoverViewModel(dropsApp().container.placeRepository)
        }
    }
}
