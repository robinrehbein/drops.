import { create } from 'zustand';

type OnboardingState = {
  completed: boolean;
  step: number;
  complete: () => void;
  setStep: (step: number) => void;
  reset: () => void;
};

const STORAGE_KEY = 'brewlog_onboarding_completed';

function readStored(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function writeStored(completed: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(completed));
  } catch {
    // React Native: will use AsyncStorage via a persist middleware later
  }
}

export const useOnboardingStore = create<OnboardingState>()((set) => ({
  completed: readStored(),
  step: 0,
  complete: () => {
    writeStored(true);
    set({ completed: true, step: 3 });
  },
  setStep: (step) => set({ step }),
  reset: () => {
    writeStored(false);
    set({ completed: false, step: 0 });
  },
}));
