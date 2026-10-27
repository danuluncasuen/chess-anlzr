// Accuracy as Lichess computes it (https://lichess.org/page/accuracy, lila's AccuracyPercent.scala).
import type { Color } from '../types'
import { winProbability, type MoveAnalysis } from './classify'

/**
 * Accuracy of one move (0..100) from the drop in the mover's winning chances,
 * both in percent. No drop = 100; a 10-point drop ≈ 63; a 30-point drop ≈ 24.
 */
export function moveAccuracy(winPctBefore: number, winPctAfter: number): number {
  const drop = Math.max(0, winPctBefore - winPctAfter)
  const raw = 103.1668100711649 * Math.exp(-0.04354415386753951 * drop) - 3.166924740191411
  return Math.min(100, Math.max(0, raw))
}

/**
 * A player's accuracy over a game (0..100), or null if they made no moves.
 * The mean of two averages of their move accuracies:
 * - weighted by how volatile the game was around each move, so quiet moves count less;
 * - harmonic, so a few big blunders pull the result down hard.
 */
export function gameAccuracy(moves: MoveAnalysis[], color: Color): number | null {
  if (moves.length === 0) return null

  // White's winning chances (%) at every position, start included.
  const winPcts = [
    winProbability(moves[0]!.evalBefore) * 100,
    ...moves.map((m) => winProbability(m.evalAfter) * 100),
  ]
  const weights = volatilityWeights(winPcts)

  const scored = moves.flatMap((m, i) =>
    m.color === color
      ? [{ accuracy: moveAccuracy(m.winProbBefore * 100, m.winProbAfter * 100), weight: weights[i]! }]
      : [],
  )
  if (scored.length === 0) return null

  const weightSum = scored.reduce((s, x) => s + x.weight, 0)
  const weighted = scored.reduce((s, x) => s + x.accuracy * x.weight, 0) / weightSum
  // A move with 0 accuracy makes the harmonic mean 0 (1/0 = Infinity), as in Lichess.
  const harmonic = scored.length / scored.reduce((s, x) => s + 1 / x.accuracy, 0)
  return (weighted + harmonic) / 2
}

/**
 * One weight per move: the standard deviation of winning chances in a window of
 * positions around it, clamped to 0.5..12. Window size grows with game length (2..8).
 */
function volatilityWeights(winPcts: number[]): number[] {
  const moveCount = winPcts.length - 1
  const size = Math.min(8, Math.max(2, Math.floor(moveCount / 10)))
  const first = winPcts.slice(0, size)
  const windows: number[][] = [
    // Pad the start so every move gets a window.
    ...Array.from({ length: Math.min(size, winPcts.length) - 2 }, () => first),
    ...Array.from({ length: Math.max(0, winPcts.length - size + 1) }, (_, i) =>
      winPcts.slice(i, i + size),
    ),
  ]
  return windows.slice(0, moveCount).map((w) => Math.min(12, Math.max(0.5, stdDev(w))))
}

function stdDev(xs: number[]): number {
  const mean = xs.reduce((s, x) => s + x, 0) / xs.length
  return Math.sqrt(xs.reduce((s, x) => s + (x - mean) ** 2, 0) / xs.length)
}
