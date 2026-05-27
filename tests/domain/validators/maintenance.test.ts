import { validateMaintenanceTask } from '@/domain/validators/maintenance';

const base = {
  machineId: 'm1',
  kind: 'backflush' as const,
  label: 'Backflush group head',
  cadenceKind: 'every_n_days' as const,
  cadenceValue: 7,
};

describe('validateMaintenanceTask', () => {
  it('accepts a valid task', () => {
    expect(validateMaintenanceTask(base).ok).toBe(true);
  });
  it('accepts optional notes + active', () => {
    expect(validateMaintenanceTask({ ...base, notes: 'flush twice', active: false }).ok).toBe(true);
  });
  it('rejects missing machineId', () => {
    const { machineId: _omit, ...rest } = base;
    expect(validateMaintenanceTask(rest).ok).toBe(false);
  });
  it('rejects empty label', () => {
    expect(validateMaintenanceTask({ ...base, label: '' }).ok).toBe(false);
  });
  it('rejects unknown kind', () => {
    expect(validateMaintenanceTask({ ...base, kind: 'nope' }).ok).toBe(false);
  });
  it('rejects unknown cadenceKind', () => {
    expect(validateMaintenanceTask({ ...base, cadenceKind: 'every_full_moon' }).ok).toBe(false);
  });
  it('rejects non-positive cadenceValue', () => {
    expect(validateMaintenanceTask({ ...base, cadenceValue: 0 }).ok).toBe(false);
  });
});
