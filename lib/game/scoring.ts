export const SCORING_VERSION = '2.0.0'

// Score = hits per round. Nothing else.
export function calcScore(hitCount: number): number {
  return hitCount
}
