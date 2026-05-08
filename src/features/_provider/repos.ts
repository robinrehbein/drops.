import { getDb } from '@/db/client';
import { makeBeansRepo, type BeansRepo } from '@/features/beans/repo';
import { makeBrewRepo, type BrewRepo } from '@/features/brew/repo';
import { makeDashboardRepo, type DashboardRepo } from '@/features/dashboard/repo';

export type Repos = { beans: BeansRepo; brew: BrewRepo; dashboard: DashboardRepo };

let _repos: Repos | null = null;

export function getRepos(): Repos {
  if (_repos) return _repos;
  const db = getDb();
  _repos = {
    beans: makeBeansRepo(db),
    brew: makeBrewRepo(db),
    dashboard: makeDashboardRepo(db),
  };
  return _repos;
}

export function __setReposForTests(repos: Repos): void {
  _repos = repos;
}
