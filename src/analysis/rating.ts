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
 * How far one game moves the estimate away from the player's usual level (0..1).
 * With ±15 points of noise per game, 0.25 corresponds to a player's real form
 * varying by about ±9 points from game to game.
 */
export const GAME_WEIGHT = 0.25

/** Typical accuracy at a rating, from the same fit. */
export function expectedAccuracy(rating: number): number {
  return FIT_INTERCEPT + FIT_SLOPE * Math.log(Math.max(MIN_RATING, rating))
}

/**
 * Rating estimate for one game: starts from the player's usual accuracy
 * (`usualAccuracy`) and moves GAME_WEIGHT of the way toward this game's.
 */
export function estimateGameRating(accuracy: number, usualAccuracy: number): number {
  return estimateRating(usualAccuracy + GAME_WEIGHT * (accuracy - usualAccuracy))
}

/** Estimated rating for an accuracy (0..100), rounded to the nearest 50. */
export function estimateRating(accuracy: number): number {
  const rating = Math.exp((accuracy - FIT_INTERCEPT) / FIT_SLOPE)
  const clamped = Math.min(MAX_RATING, Math.max(MIN_RATING, rating))
  return Math.round(clamped / 50) * 50
}

/**
 * Estimate from the average accuracy of `games` games, with a likely range
 * (one standard error of the mean either side).
 */
export function estimateRatingRange(
  averageAccuracy: number,
  games: number,
): { estimate: number; low: number; high: number } {
  const margin = ACCURACY_SPREAD / Math.sqrt(Math.max(1, games))
  return {
    estimate: estimateRating(averageAccuracy),
    low: estimateRating(averageAccuracy - margin),
    high: estimateRating(averageAccuracy + margin),
  }
}
