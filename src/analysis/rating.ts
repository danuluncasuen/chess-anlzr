/**
 * Rough rating estimate from game accuracy.
 *
 * Calibration (2026-10-26): 290 player-games of chess.com blitz, analyzed with this
 * app's engine settings (Stockfish 19 lite, depth 12): 174 from randomly sampled
 * players (100–3261, incl. GMs/FMs) and 116 from dlunc's games. Least-squares fit:
 *
 *   accuracy ≈ 15.55 + 8.56 · ln(rating)     (r = 0.38)
 *
 * e.g. 64% ≈ 300, 70% ≈ 600, 75% ≈ 1000, 78% ≈ 1500, 81% ≈ 2000, 84% ≈ 3000.
 * Accuracy flattens out at the top (the lite engine at depth 12 can't tell strong
 * players apart well), so estimates above ~2000 are especially unreliable.
 *
 * A single game's accuracy scatters about ±15 points around the fit, so one game
 * barely pins down a rating; an average over many games is far more meaningful.
 */
const FIT_INTERCEPT = 15.55
const FIT_SLOPE = 8.56
/** Spread of one game's accuracy around the fit, in accuracy points. */
export const ACCURACY_SPREAD = 15

const MIN_RATING = 100
const MAX_RATING = 3000

/**
 * How far one game moves its estimate away from the anchor (0..1). With ±15 points of noise
 * per game, 0.25 corresponds to a player's real form varying by about ±9 points from game to game.
 */
export const GAME_WEIGHT = 0.25

/**
 * How much players' true average accuracy differs from one to the next (standard deviation, in
 * accuracy points). It follows from the two numbers above: GAME_WEIGHT is the share of one game's
 * variance that comes from the player rather than from noise, so this is about 8.7.
 */
const PLAYER_SPREAD = ACCURACY_SPREAD * Math.sqrt(GAME_WEIGHT / (1 - GAME_WEIGHT))

/**
 * Every estimate starts from the accuracy of a typical player at this rating, the same for
 * everyone, so it depends only on the accuracy: never on who played, their rating or their
 * history. Better play always means a higher estimate.
 */
export const GAME_ANCHOR_RATING = 1000

/** Typical accuracy at a rating, from the same fit. */
export function expectedAccuracy(rating: number): number {
  return FIT_INTERCEPT + FIT_SLOPE * Math.log(Math.max(MIN_RATING, rating))
}

/**
 * How far an average over `games` games moves the estimate away from the anchor (0..1): GAME_WEIGHT
 * for one game, approaching 1 as more games average out the noise (6 games ≈ 0.67, 30 ≈ 0.91).
 */
export function averageWeight(games: number): number {
  const n = Math.max(1, games)
  return (n * GAME_WEIGHT) / (1 + (n - 1) * GAME_WEIGHT)
}

/**
 * Estimated rating from the average accuracy of `games` games, with a likely range (one standard
 * deviation either side). It starts at the anchor's accuracy and moves averageWeight(games) of the
 * way toward the average, so one game gives the same number as estimateGameRating, and the
 * estimate always lies within the spread of the games' own estimates. The range narrows with more
 * games.
 */
export function estimateRatingRange(
  averageAccuracy: number,
  games: number,
): { estimate: number; low: number; high: number } {
  const anchor = expectedAccuracy(GAME_ANCHOR_RATING)
  const weight = averageWeight(games)
  const accuracy = anchor + weight * (averageAccuracy - anchor)
  const margin = Math.sqrt(1 - weight) * PLAYER_SPREAD
  return {
    estimate: estimateRating(accuracy),
    low: estimateRating(accuracy - margin),
    high: estimateRating(accuracy + margin),
  }
}

/**
 * "Played like" estimate for one game, from its accuracy alone: starts at the anchor's accuracy and
 * moves GAME_WEIGHT of the way toward this game's (e.g. 82.7% → ~1250, 69.9% → ~850).
 */
export function estimateGameRating(accuracy: number): number {
  return estimateRatingRange(accuracy, 1).estimate
}

/** Estimated rating for an accuracy (0..100) on the raw fit, rounded to the nearest 50. */
export function estimateRating(accuracy: number): number {
  const rating = Math.exp((accuracy - FIT_INTERCEPT) / FIT_SLOPE)
  const clamped = Math.min(MAX_RATING, Math.max(MIN_RATING, rating))
  return Math.round(clamped / 50) * 50
}
