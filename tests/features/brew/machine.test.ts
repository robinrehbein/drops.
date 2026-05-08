import { brewMachine, initialState, type BrewEvent } from '@/features/brew/machine';

const setup: BrewEvent = {
  type: 'configure',
  beanId: 'b1',
  doseG: 18,
  targetYieldG: 36,
  grindSetting: '3.2',
};

describe('brew state machine', () => {
  it('starts in IdleSetup with no in-flight session', () => {
    expect(initialState.status).toBe('IdleSetup');
    expect(initialState.session).toBeNull();
  });

  it('configure stores draft fields without changing status', () => {
    const s = brewMachine(initialState, setup);
    expect(s.status).toBe('IdleSetup');
    expect(s.draft.beanId).toBe('b1');
    expect(s.draft.doseG).toBe(18);
  });

  it('start with valid draft transitions to Pulling and stamps started_at', () => {
    const at = new Date('2026-05-08T07:00:00Z');
    const s = brewMachine(brewMachine(initialState, setup), { type: 'start', at, sessionId: 's1' });
    expect(s.status).toBe('Pulling');
    expect(s.session?.id).toBe('s1');
    expect(s.session?.startedAt).toEqual(at);
  });

  it('start without a beanId is rejected (stays IdleSetup, sets error)', () => {
    const s = brewMachine(initialState, { type: 'start', at: new Date(), sessionId: 's1' });
    expect(s.status).toBe('IdleSetup');
    expect(s.lastError).toMatch(/bean/);
  });

  it('milestone in Pulling appends to session.milestones', () => {
    let s = brewMachine(brewMachine(initialState, setup), {
      type: 'start', at: new Date(), sessionId: 's1',
    });
    s = brewMachine(s, { type: 'milestone', kind: 'first_drop', tSeconds: 7.4 });
    expect(s.session?.milestones).toEqual([{ kind: 'first_drop', tSeconds: 7.4 }]);
  });

  it('milestone outside Pulling is a no-op', () => {
    const s = brewMachine(initialState, { type: 'milestone', kind: 'first_drop', tSeconds: 4 });
    expect(s).toBe(initialState);
  });

  it('stop transitions to Capturing with ended_at + duration', () => {
    const at0 = new Date('2026-05-08T07:00:00Z');
    const at1 = new Date('2026-05-08T07:00:27.4Z');
    let s = brewMachine(brewMachine(initialState, setup), {
      type: 'start', at: at0, sessionId: 's1',
    });
    s = brewMachine(s, { type: 'stop', at: at1 });
    expect(s.status).toBe('Capturing');
    expect(s.session?.endedAt).toEqual(at1);
    expect(s.session?.durationS).toBeCloseTo(27.4, 3);
  });

  it('stop outside Pulling is a no-op', () => {
    const s = brewMachine(initialState, { type: 'stop', at: new Date() });
    expect(s).toBe(initialState);
  });

  it('save in Capturing with notes returns SavedKeep status', () => {
    const at0 = new Date(); const at1 = new Date(at0.getTime() + 27_400);
    let s = brewMachine(brewMachine(initialState, setup), { type: 'start', at: at0, sessionId: 's1' });
    s = brewMachine(s, { type: 'stop', at: at1 });
    s = brewMachine(s, { type: 'save', mode: 'keep', yieldG: 36, rating: 4 });
    expect(s.status).toBe('SavedKeep');
    expect(s.session?.yieldG).toBe(36);
    expect(s.session?.rating).toBe(4);
  });

  it('save mode "another" returns SavedAnother status (caller resets)', () => {
    let s = brewMachine(brewMachine(initialState, setup), { type: 'start', at: new Date(), sessionId: 's1' });
    s = brewMachine(s, { type: 'stop', at: new Date() });
    s = brewMachine(s, { type: 'save', mode: 'another', yieldG: 36 });
    expect(s.status).toBe('SavedAnother');
  });

  it('discard in Capturing returns Discarded status', () => {
    let s = brewMachine(brewMachine(initialState, setup), { type: 'start', at: new Date(), sessionId: 's1' });
    s = brewMachine(s, { type: 'stop', at: new Date() });
    s = brewMachine(s, { type: 'discard' });
    expect(s.status).toBe('Discarded');
  });

  it('reset always returns initialState (with draft preserved when explicit)', () => {
    let s = brewMachine(brewMachine(initialState, setup), { type: 'start', at: new Date(), sessionId: 's1' });
    s = brewMachine(s, { type: 'reset', preserveDraft: true });
    expect(s.status).toBe('IdleSetup');
    expect(s.draft.beanId).toBe('b1');
    expect(s.session).toBeNull();
  });

  it('recoverFromDb places state back into Pulling with the persisted session', () => {
    const persisted = {
      id: 's-rec',
      beanId: 'b1',
      doseG: 18,
      method: 'espresso' as const,
      startedAt: new Date('2026-05-08T07:00:00Z'),
      milestones: [],
      grinderLabel: null,
      grindSetting: null,
      waterTempC: null,
      yieldG: null,
      endedAt: null,
      durationS: null,
      preInfusionS: null,
      firstDropS: null,
      rating: null,
      comment: null,
    };
    const s = brewMachine(initialState, { type: 'recoverFromDb', session: persisted });
    expect(s.status).toBe('Pulling');
    expect(s.session?.id).toBe('s-rec');
  });
});
