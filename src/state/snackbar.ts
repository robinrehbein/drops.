import { create } from 'zustand';

export type SnackAction = { label: string; onPress: () => void };

type SnackState = {
  message: string | null;
  action: SnackAction | null;
  show: (message: string, action?: SnackAction) => void;
  dismiss: () => void;
};

export const useSnackbarStore = create<SnackState>((set) => ({
  message: null,
  action: null,
  show: (message, action) => set({ message, action: action ?? null }),
  dismiss: () => set({ message: null, action: null }),
}));
