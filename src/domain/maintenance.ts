export type CadenceKind = 'every_n_days' | 'every_n_shots' | 'every_n_liters';
export type DueStatus = 'ok' | 'due_soon' | 'overdue';

export type NextDueInput = {
  cadenceKind: CadenceKind;
  cadenceValue: number;
  lastDoneAt: Date | null; // null = never done
  lastDoneShots: number | null; // shot count snapshot at last completion
  lastDoneLiters: number | null; // liters snapshot at last completion
  currentShots: number;
  currentLiters: number;
  now: Date;
};

export type NextDue = {
  unit: 'days' | 'shots' | 'liters';
  remaining: number; // can be negative when overdue
  dueAt: Date | null; // only meaningful for every_n_days; null otherwise
  status: DueStatus;
};

const DAY_MS = 86_400_000;

function statusFor(remaining: number, cadenceValue: number): DueStatus {
  if (remaining < 0) return 'overdue';
  const soonThreshold = Math.ceil(cadenceValue * 0.15);
  if (remaining <= soonThreshold) return 'due_soon';
  return 'ok';
}

/**
 * Computes when a maintenance task is next due across all three cadence rhythms.
 * A never-done task (null baselines) reports a full cadence remaining with status `ok`.
 */
export function nextDueAt(input: NextDueInput): NextDue {
  const { cadenceKind, cadenceValue, now } = input;

  if (cadenceKind === 'every_n_days') {
    const base = input.lastDoneAt ?? now;
    const elapsedDays = Math.floor((now.getTime() - base.getTime()) / DAY_MS);
    const remaining = cadenceValue - elapsedDays;
    const dueAt = new Date(base.getTime() + cadenceValue * DAY_MS);
    return { unit: 'days', remaining, dueAt, status: statusFor(remaining, cadenceValue) };
  }

  if (cadenceKind === 'every_n_shots') {
    const base = input.lastDoneShots ?? input.currentShots;
    const used = input.currentShots - base;
    const remaining = cadenceValue - used;
    return { unit: 'shots', remaining, dueAt: null, status: statusFor(remaining, cadenceValue) };
  }

  // every_n_liters
  const base = input.lastDoneLiters ?? input.currentLiters;
  const used = input.currentLiters - base;
  const remaining = cadenceValue - used;
  return { unit: 'liters', remaining, dueAt: null, status: statusFor(remaining, cadenceValue) };
}
