import { useQuery } from '@tanstack/react-query';

import { useRepos } from '@/features/_provider/RepoProvider';

export function useTodaySummary() {
  const { dashboard } = useRepos();
  return useQuery({ queryKey: ['dashboard', 'today'], queryFn: () => dashboard.todaySummary() });
}

export function useRecentShots(n = 3) {
  const { dashboard } = useRepos();
  return useQuery({
    queryKey: ['dashboard', 'recent', n],
    queryFn: () => dashboard.recentShots(n),
  });
}
