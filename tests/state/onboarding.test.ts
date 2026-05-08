import { useOnboardingStore } from '@/state/onboarding';

describe('onboarding store', () => {
  beforeEach(() => {
    useOnboardingStore.getState().reset();
  });

  it('starts with completed=false and step=0', () => {
    const state = useOnboardingStore.getState();
    expect(state.completed).toBe(false);
    expect(state.step).toBe(0);
  });

  it('setStep advances the step', () => {
    useOnboardingStore.getState().setStep(2);
    expect(useOnboardingStore.getState().step).toBe(2);
  });

  it('complete sets completed=true', () => {
    useOnboardingStore.getState().complete();
    expect(useOnboardingStore.getState().completed).toBe(true);
    expect(useOnboardingStore.getState().step).toBe(3);
  });

  it('reset clears completion', () => {
    useOnboardingStore.getState().complete();
    useOnboardingStore.getState().reset();
    expect(useOnboardingStore.getState().completed).toBe(false);
    expect(useOnboardingStore.getState().step).toBe(0);
  });
});
