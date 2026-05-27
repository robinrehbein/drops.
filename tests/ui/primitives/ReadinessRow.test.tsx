import { render, screen } from '@testing-library/react-native';

import { ReadinessRow } from '@/ui/primitives/ReadinessRow';
import { ThemeProvider } from '@/ui/theme/ThemeProvider';
import type { NextDue } from '@/domain/maintenance';

const ok: NextDue = { unit: 'days', remaining: 5, dueAt: null, status: 'ok' };
const dueSoon: NextDue = { unit: 'days', remaining: 1, dueAt: null, status: 'due_soon' };
const overdue: NextDue = { unit: 'shots', remaining: -10, dueAt: null, status: 'overdue' };

describe('ReadinessRow', () => {
  it('renders ok status', () => {
    render(<ThemeProvider><ReadinessRow label="Filter" status={ok} /></ThemeProvider>);
    expect(screen.getByTestId('readiness-row')).toBeTruthy();
    expect(screen.getByText('5 days left')).toBeTruthy();
  });

  it('renders due_soon status', () => {
    render(<ThemeProvider><ReadinessRow label="Backflush" status={dueSoon} /></ThemeProvider>);
    expect(screen.getByText('Due in 1 days')).toBeTruthy();
  });

  it('renders overdue status with negative remaining', () => {
    render(<ThemeProvider><ReadinessRow label="Burr" status={overdue} /></ThemeProvider>);
    expect(screen.getByTestId('readiness-value')).toBeTruthy();
    expect(screen.getByText('Overdue 10 shots')).toBeTruthy();
  });
});
