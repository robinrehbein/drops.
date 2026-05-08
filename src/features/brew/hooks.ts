import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useRepos } from '@/features/_provider/RepoProvider';
import type { EndArgs, FinalizeArgs, StartArgs } from './repo';

const KEYS = {
  list: (beanId?: string) => ['brewSessions', { beanId }] as const,
  one: (id: string) => ['brewSession', id] as const,
  inProgress: ['brewSession', 'inProgress'] as const,
  milestones: (sessionId: string) => ['brewMilestones', sessionId] as const,
};

export function useSessions(beanId?: string) {
  const { brew } = useRepos();
  return useQuery({
    queryKey: KEYS.list(beanId),
    queryFn: () => brew.listSessions(beanId ? { beanId } : undefined),
  });
}

export function useSession(id: string) {
  const { brew } = useRepos();
  return useQuery({ queryKey: KEYS.one(id), queryFn: () => brew.getSession(id), enabled: !!id });
}

export function useMilestones(sessionId: string) {
  const { brew } = useRepos();
  return useQuery({
    queryKey: KEYS.milestones(sessionId),
    queryFn: () => brew.listMilestones(sessionId),
    enabled: !!sessionId,
  });
}

export function useInProgressSession() {
  const { brew } = useRepos();
  return useQuery({ queryKey: KEYS.inProgress, queryFn: () => brew.findInProgress() });
}

export function useStartSession() {
  const { brew } = useRepos();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: StartArgs) => brew.startSession(args),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.inProgress }),
  });
}

export function useAddMilestone() {
  const { brew } = useRepos();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, kind, tSeconds }: { sessionId: string; kind: string; tSeconds: number }) =>
      brew.addMilestone(sessionId, kind, tSeconds),
    onSuccess: (_, { sessionId }) =>
      qc.invalidateQueries({ queryKey: KEYS.milestones(sessionId) }),
  });
}

export function useEndSession() {
  const { brew } = useRepos();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, args }: { id: string; args: EndArgs }) => brew.endSession(id, args),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS.inProgress });
      void qc.invalidateQueries({ queryKey: ['brewSessions'] });
    },
  });
}

export function useFinalizeSession() {
  const { brew } = useRepos();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, args }: { id: string; args: FinalizeArgs }) =>
      brew.finalizeWithNotes(id, args),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['brewSessions'] });
      void qc.invalidateQueries({ queryKey: ['beans'] });
    },
  });
}

export function useDiscardSession() {
  const { brew } = useRepos();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => brew.discardSession(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['brewSessions'] });
      void qc.invalidateQueries({ queryKey: KEYS.inProgress });
    },
  });
}
