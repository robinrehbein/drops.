import { useQuery } from '@tanstack/react-query';

import { useRepos } from '@/features/_provider/RepoProvider';

export function useWeeklyRecap() {
  const { insights } = useRepos();
  return useQuery({
    queryKey: ['insights', 'weekly'],
    queryFn: () => insights.weeklyRecap(),
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}
