import { nextDueAt } from '@/domain/maintenance';

const DAY = 86_400_000;
const now = new Date('2026-05-27T08:00:00Z');
const daysAgo = (n: number) => new Date(now.getTime() - n * DAY);

describe('nextDueAt — every_n_days', () => {
  const dayInput = {
    cadenceKind: 'every_n_days' as const,
    cadenceValue: 7,
    lastDoneShots: null,
    lastDoneLiters: null,
    currentShots: 0,
    currentLiters: 0,
    now,
  };

  it('never done → full cadence remaining, ok', () => {
    const r = nextDueAt({ ...dayInput, lastDoneAt: null });
    expect(r).toMatchObject({ unit: 'days', remaining: 7, status: 'ok' });
    expect(r.dueAt).toEqual(new Date(now.getTime() + 7 * DAY));
  });
  it('done 6 days ago → due_soon (within 15% threshold)', () => {
    expect(nextDueAt({ ...dayInput, lastDoneAt: daysAgo(6) })).toMatchObject({
      remaining: 1,
      status: 'due_soon',
    });
  });
  it('done exactly cadence ago → remaining 0, due_soon', () => {
    expect(nextDueAt({ ...dayInput, lastDoneAt: daysAgo(7) })).toMatchObject({
      remaining: 0,
      status: 'due_soon',
    });
  });
  it('done long ago → overdue', () => {
    expect(nextDueAt({ ...dayInput, lastDoneAt: daysAgo(10) })).toMatchObject({
      remaining: -3,
      status: 'overdue',
    });
  });
});

describe('nextDueAt — every_n_shots', () => {
  const shotInput = {
    cadenceKind: 'every_n_shots' as const,
    cadenceValue: 200,
    lastDoneAt: null,
    lastDoneLiters: null,
    currentLiters: 0,
    now,
  };

  it('never done → full cadence remaining, dueAt null', () => {
    const r = nextDueAt({ ...shotInput, lastDoneShots: null, currentShots: 42 });
    expect(r).toMatchObject({ unit: 'shots', remaining: 200, status: 'ok', dueAt: null });
  });
  it('partway through → ok', () => {
    expect(nextDueAt({ ...shotInput, lastDoneShots: 100, currentShots: 150 })).toMatchObject({
      remaining: 150,
      status: 'ok',
    });
  });
  it('approaching cadence → due_soon', () => {
    expect(nextDueAt({ ...shotInput, lastDoneShots: 100, currentShots: 290 })).toMatchObject({
      remaining: 10,
      status: 'due_soon',
    });
  });
  it('past cadence → overdue', () => {
    expect(nextDueAt({ ...shotInput, lastDoneShots: 100, currentShots: 350 })).toMatchObject({
      remaining: -50,
      status: 'overdue',
    });
  });
});

describe('nextDueAt — every_n_liters', () => {
  const literInput = {
    cadenceKind: 'every_n_liters' as const,
    cadenceValue: 60,
    lastDoneAt: null,
    lastDoneShots: null,
    currentShots: 0,
    now,
  };

  it('never done → full cadence remaining', () => {
    expect(nextDueAt({ ...literInput, lastDoneLiters: null, currentLiters: 5 })).toMatchObject({
      unit: 'liters',
      remaining: 60,
      status: 'ok',
      dueAt: null,
    });
  });
  it('approaching cadence → due_soon', () => {
    expect(nextDueAt({ ...literInput, lastDoneLiters: 10, currentLiters: 65 })).toMatchObject({
      remaining: 5,
      status: 'due_soon',
    });
  });
  it('past cadence → overdue', () => {
    expect(nextDueAt({ ...literInput, lastDoneLiters: 10, currentLiters: 80 })).toMatchObject({
      remaining: -10,
      status: 'overdue',
    });
  });
});
