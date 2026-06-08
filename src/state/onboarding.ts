import { create } from 'zustand';
import { Storage } from 'expo-sqlite/kv-store';

type OnboardingState = {
  completed: boolean;
  step: number;
  complete: () => void;
  setStep: (step: number) => void;
  reset: () => void;
};

const STORAGE_KEY = 'drop_onboarding_completed';

function readStored(): boolean {
  try {
    return Storage.getItemSync(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function writeStored(completed: boolean): void {
  try {
    Storage.setItemSync(STORAGE_KEY, String(completed));
  } catch {
    // ignore storage errors
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
