import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { type Repos, getRepos } from './repos';

const RepoCtx = createContext<Repos | null>(null);

export function RepoProvider({ children, repos }: { children: ReactNode; repos?: Repos }) {
  const value = useMemo(() => repos ?? getRepos(), [repos]);
  return <RepoCtx.Provider value={value}>{children}</RepoCtx.Provider>;
}

export function useRepos(): Repos {
  const r = useContext(RepoCtx);
  if (!r) throw new Error('useRepos must be used within RepoProvider');
  return r;
}
