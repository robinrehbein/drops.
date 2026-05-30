/**
 * Dialing Coach — pure espresso dialing logic.
 *
 * Conventions:
 * - "finer" decreases a numeric grind value, "coarser" increases it. This matches the
 *   most common espresso grinder dialing (lower number = finer). Non-numeric grind
 *   settings are left untouched and the advice text stays advisory.
 * - Taste wins over time on conflict (the barista rule).
 */

export type ShotSignal = {
  doseG: number;
  yieldG: number | null;
  durationS: number | null;
  acidity?: number | null;
  bitterness?: number | null;
  balance?: number | null;
  rating?: number | null;
};

export type DialingTarget = {
  ratioTarget: number;
  timeMinS: number;
  timeMaxS: number;
};

export type Lever =
  | 'grind-finer'
  | 'grind-coarser'
  | 'ratio-up'
  | 'ratio-down'
  | 'temp-up'
  | 'temp-down'
  | 'dialed-in';

export type Verdict = 'too-fast' | 'too-slow' | 'sour' | 'bitter' | 'in-range' | 'dialed-in';

export type DialingAdvice = {
  verdict: Verdict;
  primary: { lever: Lever; magnitude: 'small' | 'medium'; text: string };
  secondary?: { lever: Lever; text: string };
  confidence: 'low' | 'high';
  rationale: string;
};

const TASTE_THRESHOLD = 1.5; // |acidity - bitterness| at/above this is a clear taste signal
const TASTE_MEDIUM = 2.5; // net at/above this nudges by 2 steps
const BALANCE_GOOD = 4; // balance at/above this counts as taste-side dialed-in
const TIME_MEDIUM_S = 4; // seconds outside the window that warrant a 2-step move

type PrefsLike = { dialTimeMinS: number; dialTimeMaxS: number; defaultRatio: number };
type RecipeLike = { durationTargetS?: number | null; ratioTarget?: number | null };

export function resolveDialingTarget(recipe: RecipeLike | null, prefs: PrefsLike): DialingTarget {
  const ratioTarget = recipe?.ratioTarget ?? prefs.defaultRatio;
  const halfWidth = (prefs.dialTimeMaxS - prefs.dialTimeMinS) / 2;
  if (recipe?.durationTargetS != null) {
    return {
      ratioTarget,
      timeMinS: recipe.durationTargetS - halfWidth,
      timeMaxS: recipe.durationTargetS + halfWidth,
    };
  }
  return { ratioTarget, timeMinS: prefs.dialTimeMinS, timeMaxS: prefs.dialTimeMaxS };
}

type SessionLike = Pick<ShotSignal, 'doseG' | 'yieldG' | 'durationS' | 'rating'>;
type NoteLike = { acidity?: number | null; bitterness?: number | null; balance?: number | null };

export function buildShotSignal(session: SessionLike, note: NoteLike | null): ShotSignal {
  return {
    doseG: session.doseG,
    yieldG: session.yieldG,
    durationS: session.durationS,
    rating: session.rating ?? null,
    acidity: note?.acidity ?? null,
    bitterness: note?.bitterness ?? null,
    balance: note?.balance ?? null,
  };
}

function grindText(lever: 'grind-finer' | 'grind-coarser', magnitude: 'small' | 'medium'): string {
  const steps = magnitude === 'medium' ? 2 : 1;
  const dir = lever === 'grind-finer' ? 'finer' : 'coarser';
  return `Grind ~${steps} step${steps > 1 ? 's' : ''} ${dir}`;
}

export function dialingAdvice(shot: ShotSignal | null, target: DialingTarget): DialingAdvice | null {
  if (!shot) return null;

  const hasTaste = shot.acidity != null && shot.bitterness != null;
  const net = hasTaste ? shot.acidity! - shot.bitterness! : null;
  const hasTime = shot.durationS != null;
  const actualRatio = shot.yieldG != null && shot.doseG > 0 ? shot.yieldG / shot.doseG : null;
  const ratioStr =
    actualRatio != null ? `1:${actualRatio.toFixed(1)}` : `1:${target.ratioTarget.toFixed(1)}`;

  // Time branch
  let timeDir: 'fast' | 'slow' | 'ok' | null = null;
  let timeMag: 'small' | 'medium' = 'small';
  if (hasTime) {
    const d = shot.durationS!;
    if (d < target.timeMinS) {
      timeDir = 'fast';
      timeMag = target.timeMinS - d > TIME_MEDIUM_S ? 'medium' : 'small';
    } else if (d > target.timeMaxS) {
      timeDir = 'slow';
      timeMag = d - target.timeMaxS > TIME_MEDIUM_S ? 'medium' : 'small';
    } else {
      timeDir = 'ok';
    }
  }

  // Taste branch
  let tasteDir: 'sour' | 'bitter' | 'balanced' | null = null;
  let tasteMag: 'small' | 'medium' = 'small';
  if (hasTaste) {
    if (net! >= TASTE_THRESHOLD) {
      tasteDir = 'sour';
      tasteMag = net! >= TASTE_MEDIUM ? 'medium' : 'small';
    } else if (net! <= -TASTE_THRESHOLD) {
      tasteDir = 'bitter';
      tasteMag = net! <= -TASTE_MEDIUM ? 'medium' : 'small';
    } else {
      tasteDir = (shot.balance ?? 0) >= BALANCE_GOOD ? 'balanced' : null;
    }
  }

  // Taste drives when it gives a clear sour/bitter signal.
  if (tasteDir === 'sour' || tasteDir === 'bitter') {
    const lever = tasteDir === 'sour' ? 'grind-finer' : 'grind-coarser';
    const corroborates =
      (tasteDir === 'sour' && timeDir === 'fast') || (tasteDir === 'bitter' && timeDir === 'slow');
    const conflicts =
      (tasteDir === 'sour' && timeDir === 'slow') || (tasteDir === 'bitter' && timeDir === 'fast');
    const confidence: 'low' | 'high' = conflicts ? 'low' : 'high';
    const timeNote = hasTime ? ` · ${shot.durationS!.toFixed(0)}s` : '';
    return {
      verdict: tasteDir,
      primary: { lever, magnitude: tasteMag, text: grindText(lever, tasteMag) },
      confidence,
      rationale: `${ratioStr}${timeNote} · tastes ${tasteDir} → ${
        tasteDir === 'sour' ? 'under' : 'over'
      }-extracted${corroborates ? ' (time agrees)' : ''}`,
    };
  }

  // No clear taste signal: fall back to time.
  if (timeDir === 'fast' || timeDir === 'slow') {
    const lever = timeDir === 'fast' ? 'grind-finer' : 'grind-coarser';
    const verdict: Verdict = timeDir === 'fast' ? 'too-fast' : 'too-slow';
    // Balanced taste contradicting the clock → keep confidence low.
    const confidence: 'low' | 'high' = tasteDir === 'balanced' ? 'low' : timeMag === 'medium' ? 'high' : 'low';
    return {
      verdict,
      primary: { lever, magnitude: timeMag, text: grindText(lever, timeMag) },
      confidence,
      rationale: `${shot.durationS!.toFixed(0)}s for ${ratioStr} — ran ${timeDir}`,
    };
  }

  // Everything in range / balanced → dialed in.
  if (tasteDir === 'balanced' || timeDir === 'ok') {
    return {
      verdict: 'dialed-in',
      primary: { lever: 'dialed-in', magnitude: 'small', text: 'Dialed in — nice shot' },
      secondary: { lever: 'ratio-up', text: 'To explore: try a longer ratio (e.g. 1:2.5)' },
      confidence: 'high',
      rationale: `${ratioStr}${hasTime ? ` · ${shot.durationS!.toFixed(0)}s` : ''} — in the zone`,
    };
  }

  // No usable signal (no time, no taste).
  return {
    verdict: 'in-range',
    primary: { lever: 'dialed-in', magnitude: 'small', text: 'Log shot time or taste for tips' },
    confidence: 'low',
    rationale: 'Not enough signal yet',
  };
}

export function nudgeGrind(current: string | null, advice: DialingAdvice | null): string | null {
  if (current == null || !advice) return current;
  const { lever, magnitude } = advice.primary;
  if (lever !== 'grind-finer' && lever !== 'grind-coarser') return current;
  const n = Number(current);
  if (!Number.isFinite(n) || current.trim() === '') return current;
  const steps = magnitude === 'medium' ? 2 : 1;
  const next = lever === 'grind-finer' ? n - steps : n + steps;
  return String(next);
}
