import { secondsBetween } from '@/domain/time';

export type Status = 'IdleSetup' | 'Pulling' | 'Capturing' | 'SavedKeep' | 'SavedAnother' | 'Discarded';

export type Milestone = { kind: 'pre_infusion_end' | 'first_drop' | 'note_marker'; tSeconds: number };

export type LiveSession = {
  id: string;
  beanId: string;
  method: 'espresso';
  doseG: number;
  startedAt: Date;
  endedAt: Date | null;
  durationS: number | null;
  preInfusionS: number | null;
  firstDropS: number | null;
  yieldG: number | null;
  rating: number | null;
  comment: string | null;
  grinderLabel: string | null;
  grindSetting: string | null;
  waterTempC: number | null;
  milestones: Milestone[];
};

export type Draft = {
  beanId: string | null;
  doseG: number;
  targetYieldG: number;
  grindSetting: string | null;
  grinderLabel: string | null;
  waterTempC: number | null;
};

export type State = {
  status: Status;
  draft: Draft;
  session: LiveSession | null;
  lastError: string | null;
};

export type BrewEvent =
  | { type: 'configure'; beanId?: string; doseG?: number; targetYieldG?: number; grindSetting?: string | null; grinderLabel?: string | null; waterTempC?: number | null }
  | { type: 'start'; at: Date; sessionId: string }
  | { type: 'milestone'; kind: Milestone['kind']; tSeconds: number }
  | { type: 'stop'; at: Date }
  | { type: 'save'; mode: 'keep' | 'another'; yieldG: number; rating?: number; comment?: string }
  | { type: 'discard' }
  | { type: 'reset'; preserveDraft?: boolean }
  | { type: 'recoverFromDb'; session: LiveSession };

export const initialState: State = {
  status: 'IdleSetup',
  draft: {
    beanId: null,
    doseG: 18,
    targetYieldG: 36,
    grindSetting: null,
    grinderLabel: null,
    waterTempC: null,
  },
  session: null,
  lastError: null,
};

export function brewMachine(state: State, event: BrewEvent): State {
  switch (event.type) {
    case 'configure': {
      const draft = { ...state.draft, ...stripUndefined(event) };
      return { ...state, draft, lastError: null };
    }
    case 'start': {
      if (state.status !== 'IdleSetup') return state;
      if (!state.draft.beanId) return { ...state, lastError: 'select a bean before starting' };
      const session: LiveSession = {
        id: event.sessionId,
        beanId: state.draft.beanId,
        method: 'espresso',
        doseG: state.draft.doseG,
        startedAt: event.at,
        endedAt: null,
        durationS: null,
        preInfusionS: null,
        firstDropS: null,
        yieldG: null,
        rating: null,
        comment: null,
        grinderLabel: state.draft.grinderLabel,
        grindSetting: state.draft.grindSetting,
        waterTempC: state.draft.waterTempC,
        milestones: [],
      };
      return { ...state, status: 'Pulling', session, lastError: null };
    }
    case 'milestone': {
      if (state.status !== 'Pulling' || !state.session) return state;
      const ms: Milestone = { kind: event.kind, tSeconds: event.tSeconds };
      const session: LiveSession = {
        ...state.session,
        milestones: [...state.session.milestones, ms],
        preInfusionS: event.kind === 'pre_infusion_end' ? event.tSeconds : state.session.preInfusionS,
        firstDropS: event.kind === 'first_drop' ? event.tSeconds : state.session.firstDropS,
      };
      return { ...state, session };
    }
    case 'stop': {
      if (state.status !== 'Pulling' || !state.session) return state;
      const durationS = secondsBetween(state.session.startedAt.getTime(), event.at.getTime());
      const session = { ...state.session, endedAt: event.at, durationS };
      return { ...state, status: 'Capturing', session };
    }
    case 'save': {
      if (state.status !== 'Capturing' || !state.session) return state;
      const session = {
        ...state.session,
        yieldG: event.yieldG,
        rating: event.rating ?? null,
        comment: event.comment ?? null,
      };
      const next: Status = event.mode === 'keep' ? 'SavedKeep' : 'SavedAnother';
      return { ...state, status: next, session };
    }
    case 'discard': {
      if (state.status !== 'Capturing') return state;
      return { ...state, status: 'Discarded' };
    }
    case 'reset': {
      return event.preserveDraft
        ? { ...initialState, draft: state.draft }
        : initialState;
    }
    case 'recoverFromDb': {
      return {
        ...state,
        status: 'Pulling',
        session: event.session,
        draft: { ...state.draft, beanId: event.session.beanId, doseG: event.session.doseG },
        lastError: null,
      };
    }
  }
}

function stripUndefined<T extends object>(o: T): Partial<T> {
  const out: Partial<T> = {};
  for (const k of Object.keys(o) as (keyof T)[]) {
    if (o[k] !== undefined && k !== ('type' as keyof T)) out[k] = o[k];
  }
  return out;
}
