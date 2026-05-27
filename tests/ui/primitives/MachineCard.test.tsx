import { render, screen } from '@testing-library/react-native';

import { MachineCard } from '@/ui/primitives/MachineCard';
import { ThemeProvider } from '@/ui/theme/ThemeProvider';
import type { MachineRow } from '@/features/machines/types';
import type { TaskWithStatus } from '@/features/maintenance/types';

const now = new Date();
const machine: MachineRow = {
  id: 'm1', name: 'Lelit Bianca', kind: 'espresso_machine',
  model: null, vendor: null, acquiredOn: null, notes: null,
  isPrimary: true, createdAt: now, updatedAt: now, deletedAt: null,
};

const task: TaskWithStatus = {
  id: 't1', machineId: 'm1', kind: 'backflush', label: 'Backflush', cadenceKind: 'every_n_days',
  cadenceValue: 7, notes: null, active: true,
  createdAt: now, updatedAt: now, deletedAt: null,
  lastDoneAt: null,
  nextDue: { unit: 'days', remaining: 2, dueAt: null, status: 'due_soon' },
};

describe('MachineCard', () => {
  it('renders machine name and kind', () => {
    render(<ThemeProvider><MachineCard machine={machine} tasks={[]} /></ThemeProvider>);
    expect(screen.getByText('Lelit Bianca')).toBeTruthy();
    expect(screen.getByText('Espresso machine')).toBeTruthy();
  });

  it('renders task status row', () => {
    render(<ThemeProvider><MachineCard machine={machine} tasks={[task]} /></ThemeProvider>);
    expect(screen.getByText('Due in 2 days')).toBeTruthy();
  });

  it('shows no-tasks message when empty', () => {
    render(<ThemeProvider><MachineCard machine={machine} tasks={[]} /></ThemeProvider>);
    expect(screen.getByText(/No maintenance tasks yet/)).toBeTruthy();
  });
});
