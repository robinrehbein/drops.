import { useBrewStore } from '@/features/brew/store';

describe('brew store', () => {
  beforeEach(() => useBrewStore.getState().reset());

  it('exposes initialState', () => {
    expect(useBrewStore.getState().status).toBe('IdleSetup');
  });

  it('configure mutates draft', () => {
    useBrewStore.getState().send({ type: 'configure', beanId: 'b1', doseG: 18 });
    expect(useBrewStore.getState().draft.beanId).toBe('b1');
    expect(useBrewStore.getState().draft.doseG).toBe(18);
  });

  it('start moves to Pulling', () => {
    useBrewStore.getState().send({ type: 'configure', beanId: 'b1' });
    useBrewStore.getState().send({ type: 'start', at: new Date(), sessionId: 's1' });
    expect(useBrewStore.getState().status).toBe('Pulling');
  });
});
