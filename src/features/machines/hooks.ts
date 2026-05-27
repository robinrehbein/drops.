import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useRepos } from '@/features/_provider/RepoProvider';
import type { MachineInput } from '@/domain/validators/machine';

export function useMachines() {
  const { machines } = useRepos();
  return useQuery({ queryKey: ['machines'], queryFn: () => machines.listMachines() });
}

export function useMachine(id: string | null) {
  const { machines } = useRepos();
  return useQuery({
    queryKey: ['machine', id],
    queryFn: () => (id ? machines.getMachine(id) : null),
    enabled: !!id,
  });
}

export function usePrimaryMachine() {
  const { machines } = useRepos();
  return useQuery({
    queryKey: ['machine', 'primary'],
    queryFn: () => machines.getPrimary(),
  });
}

export function useAddMachine() {
  const { machines } = useRepos();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: MachineInput) => machines.addMachine(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['machines'] }),
  });
}

export function useUpdateMachine() {
  const { machines } = useRepos();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<MachineInput> }) =>
      machines.updateMachine(id, patch),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['machines'] });
      qc.invalidateQueries({ queryKey: ['machine', id] });
      qc.invalidateQueries({ queryKey: ['machine', 'primary'] });
    },
  });
}

export function useSetPrimaryMachine() {
  const { machines } = useRepos();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => machines.setPrimary(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['machines'] });
      qc.invalidateQueries({ queryKey: ['machine', 'primary'] });
    },
  });
}

export function useDeleteMachine() {
  const { machines } = useRepos();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => machines.softDeleteMachine(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['machines'] });
      qc.invalidateQueries({ queryKey: ['machine', 'primary'] });
    },
  });
}
