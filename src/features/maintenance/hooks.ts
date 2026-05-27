import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useRepos } from '@/features/_provider/RepoProvider';
import type { MaintenanceTaskInput } from '@/domain/validators/maintenance';
import type { LogTaskArgs } from './repo';

export function useTasksWithStatus(machineId: string | null) {
  const { maintenance } = useRepos();
  return useQuery({
    queryKey: ['maintenance', 'tasks-status', machineId],
    queryFn: () => (machineId ? maintenance.tasksWithStatus(machineId) : []),
    enabled: !!machineId,
  });
}

export function useMachineTasks(machineId: string | null) {
  const { maintenance } = useRepos();
  return useQuery({
    queryKey: ['maintenance', 'tasks', machineId],
    queryFn: () => (machineId ? maintenance.listTasksForMachine(machineId) : []),
    enabled: !!machineId,
  });
}

export function useAddTask() {
  const { maintenance } = useRepos();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: MaintenanceTaskInput) => maintenance.addTask(input),
    onSuccess: (_data, input) => {
      qc.invalidateQueries({ queryKey: ['maintenance', 'tasks', input.machineId] });
      qc.invalidateQueries({ queryKey: ['maintenance', 'tasks-status', input.machineId] });
    },
  });
}

export function useLogTask() {
  const { maintenance } = useRepos();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: LogTaskArgs & { machineId: string }) => maintenance.logTask(args),
    onSuccess: (_data, { machineId }) => {
      qc.invalidateQueries({ queryKey: ['maintenance', 'tasks-status', machineId] });
    },
  });
}

export function useUpdateTask() {
  const { maintenance } = useRepos();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<MaintenanceTaskInput>;
      machineId: string;
    }) => maintenance.updateTask(id, patch),
    onSuccess: (_data, { machineId }) => {
      qc.invalidateQueries({ queryKey: ['maintenance', 'tasks', machineId] });
      qc.invalidateQueries({ queryKey: ['maintenance', 'tasks-status', machineId] });
    },
  });
}

export function useDeleteTask() {
  const { maintenance } = useRepos();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; machineId: string }) => maintenance.softDeleteTask(id),
    onSuccess: (_data, { machineId }) => {
      qc.invalidateQueries({ queryKey: ['maintenance', 'tasks', machineId] });
      qc.invalidateQueries({ queryKey: ['maintenance', 'tasks-status', machineId] });
    },
  });
}
