export type Dimension =
  | 'curiosity'
  | 'reliability'
  | 'factChecking'
  | 'diverseThinking'
  | 'uncertaintyTolerance'
  | 'lowEgoHighDrive';

export interface EMAEvent {
  dimension: Dimension;
  scoreRaw: number; // 0-1
  isImplicit?: boolean;
  timestamp: number;
}

export interface Portrait {
  curiosity: number;
  reliability: number;
  factChecking: number;
  diverseThinking: number;
  uncertaintyTolerance: number;
  lowEgoHighDrive: number;
}

const ALPHA = 0.3;
const IMPLICIT_FACTOR = 0.15;
const DIMENSIONS: Dimension[] = [
  'curiosity',
  'reliability',
  'factChecking',
  'diverseThinking',
  'uncertaintyTolerance',
  'lowEgoHighDrive',
];

/** Compute the EMA portrait from a list of events. */
export function computePortrait(events: EMAEvent[]): Portrait {
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
  const ema: Record<Dimension, number> = Object.fromEntries(
    DIMENSIONS.map((d) => [d, 0]),
  ) as Record<Dimension, number>;

  const hasData: Record<Dimension, boolean> = Object.fromEntries(
    DIMENSIONS.map((d) => [d, false]),
  ) as Record<Dimension, boolean>;

  for (const ev of sorted) {
    const raw = Math.max(0, Math.min(1, ev.scoreRaw));
    // Stage 1: base score; implicit gets a reduction factor
    const adjusted = ev.isImplicit ? raw * IMPLICIT_FACTOR : raw;
    // Stage 2-3: EMA smoothing
    if (!hasData[ev.dimension]) {
      ema[ev.dimension] = adjusted;
      hasData[ev.dimension] = true;
    } else {
      ema[ev.dimension] = ALPHA * adjusted + (1 - ALPHA) * ema[ev.dimension];
    }
  }

  // Convert 0-1 → 0-100 scale
  const result = {} as Portrait;
  for (const d of DIMENSIONS) {
    (result as Record<Dimension, number>)[d] = Math.round(
      ema[d] * 100,
    );
  }
  return result;
}

/** Compute the overall certification score (0-100). */
export function computeCertScore(portrait: Portrait): number {
  const values = DIMENSIONS.map((d) => (portrait as Record<Dimension, number>)[d]);
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  return Math.round(avg);
}

/** Get certification level based on score. */
export function getCertLevel(
  certScore: number,
): 'C1' | 'C2' | 'C3' | null {
  if (certScore >= 88) return 'C3';
  if (certScore >= 75) return 'C2';
  if (certScore >= 60) return 'C1';
  return null;
}

/** Generate mock events that produce the target portrait values. */
export function generateMockEvents(targets: number[]): EMAEvent[] {
  const events: EMAEvent[] = [];
  const now = Date.now();
  targets.forEach((target, i) => {
    const dim = DIMENSIONS[i];
    // 8 explicit + 2 implicit events per dimension, tuned to hit target
    for (let j = 0; j < 8; j++) {
      events.push({
        dimension: dim,
        scoreRaw: target / 100 + (Math.random() - 0.5) * 0.08,
        isImplicit: false,
        timestamp: now - (80 - i * 10 - j) * 3600_000,
      });
    }
    for (let j = 0; j < 2; j++) {
      events.push({
        dimension: dim,
        scoreRaw: target / 100 + (Math.random() - 0.5) * 0.05,
        isImplicit: true,
        timestamp: now - (80 - i * 10 - 8 - j) * 3600_000,
      });
    }
  });
  return events;
}
