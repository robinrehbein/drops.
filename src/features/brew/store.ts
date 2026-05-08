import { create } from 'zustand';

import { brewMachine, initialState, type BrewEvent, type State } from './machine';

type BrewStore = State & {
  send: (event: BrewEvent) => void;
  reset: () => void;
};

export const useBrewStore = create<BrewStore>((set, get) => ({
  ...initialState,
  send: (event) => set(brewMachine(get(), event)),
  reset: () => set(initialState),
}));
