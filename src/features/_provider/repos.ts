import { getDb } from '@/db/client';
import { makeBeansRepo, type BeansRepo } from '@/features/beans/repo';
import { makeBrewRepo, type BrewRepo } from '@/features/brew/repo';
import { makeDashboardRepo, type DashboardRepo } from '@/features/dashboard/repo';
import { makeInsightsRepo, type InsightsRepo } from '@/features/insights/repo';
import { makePreferencesRepo, type PreferencesRepo } from '@/features/preferences/repo';
import { makeWaterRepo, type WaterRepo } from '@/features/water/repo';

export type Repos = {
  beans: BeansRepo;
  brew: BrewRepo;
  dashboard: DashboardRepo;
  preferences: PreferencesRepo;
  insights: InsightsRepo;
  water: WaterRepo;
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
  };
  return _repos;
}

export function __setReposForTests(repos: Repos): void {
  _repos = repos;
}
