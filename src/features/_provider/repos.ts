import { getDb } from '@/db/client';
import { makeBeansRepo, type BeansRepo } from '@/features/beans/repo';
import { makeBrewRepo, type BrewRepo } from '@/features/brew/repo';
import { makeDashboardRepo, type DashboardRepo } from '@/features/dashboard/repo';
import { makeInsightsRepo, type InsightsRepo } from '@/features/insights/repo';
import { makeMachinesRepo, type MachinesRepo } from '@/features/machines/repo';
import { makeMaintenanceRepo, type MaintenanceRepo } from '@/features/maintenance/repo';
import { makePlacesRepo, type PlacesRepo } from '@/features/places/repo';
import { makePreferencesRepo, type PreferencesRepo } from '@/features/preferences/repo';
import { makeRecipesRepo, type RecipesRepo } from '@/features/recipes/repo';
import { makeWaterRepo, type WaterRepo } from '@/features/water/repo';

export type Repos = {
  beans: BeansRepo;
  brew: BrewRepo;
  dashboard: DashboardRepo;
  preferences: PreferencesRepo;
  insights: InsightsRepo;
  water: WaterRepo;
  recipes: RecipesRepo;
  machines: MachinesRepo;
  maintenance: MaintenanceRepo;
  places: PlacesRepo;
};

let _repos: Repos | null = null;

export function getRepos(): Repos {
  if (_repos) return _repos;
  const db = getDb();
  _repos = {
    beans: makeBeansRepo(db),
    brew: makeBrewRepo(db),
    dashboard: makeDashboardRepo(db),
    preferences: makePreferencesRepo(db),
    insights: makeInsightsRepo(db),
    water: makeWaterRepo(db),
    recipes: makeRecipesRepo(db),
    machines: makeMachinesRepo(db),
    maintenance: makeMaintenanceRepo(db),
    places: makePlacesRepo(db),
  };
  return _repos;
}

export function __setReposForTests(repos: Repos): void {
  _repos = repos;
}
