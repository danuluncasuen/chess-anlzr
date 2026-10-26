import { pgnToPositions, uciToSan } from '../chess/positions'
import type { Score } from '../engine/types'
import type { Analysis, Color } from '../types'

export type MoveClass = 'best' | 'ok' | 'inaccuracy' | 'mistake' | 'blunder'

/**
 * Minimum drop in the mover's winning chances (0..1) for each class.
 * Same as Lichess (0.1/0.2/0.3 on its -1..1 scale). Tune against real games.
 */
export const THRESHOLDS = { inaccuracy: 0.05, mistake: 0.1, blunder: 0.15 } as const

/** Evals beyond this many centipawns count as fully decided. */
const CP_CAP = 1000

export interface MoveAnalysis {
  ply: number
  moveNumber: number
  color: Color
  san: string
  uci: string
  /** Engine's preferred move in the position before this move, as SAN. */
  bestMoveSan: string | null
  /** White's point of view, before and after the move. */
  evalBefore: Score
  evalAfter: Score
  /** The mover's winning chances (0..1) before and after the move. */
  winProbBefore: number
  winProbAfter: number
  winProbLoss: number
  /** Drop in the mover's eval in centipawns (capped at ±1000, mate counts as 1000). */
  centipawnLoss: number
  class: MoveClass
}

/**
 * White's winning chances (0..1) for a score, using Lichess's logistic curve
 * (https://lichess.org/page/accuracy): equal = 0.5, +1 pawn ≈ 0.59, +3 ≈ 0.75.
 */
export function winProbability(score: Score): number {
  if (score.type === 'mate') return score.winner === 'white' ? 1 : 0
  const cp = clamp(score.value, -CP_CAP, CP_CAP)
  return 1 / (1 + Math.exp(-0.00368208 * cp))
}

/** Centipawns for White, with mates and big evals capped at ±CP_CAP. */
function cappedCp(score: Score): number {
  if (score.type === 'mate') return score.winner === 'white' ? CP_CAP : -CP_CAP
  return clamp(score.value, -CP_CAP, CP_CAP)
}

export function classifyLoss(winProbLoss: number): MoveClass {
  if (winProbLoss >= THRESHOLDS.blunder) return 'blunder'
  if (winProbLoss >= THRESHOLDS.mistake) return 'mistake'
  if (winProbLoss >= THRESHOLDS.inaccuracy) return 'inaccuracy'
  return 'ok'
}

/** Rates every move of a game from its engine analysis. */
export function classifyGame(pgn: string, analysis: Analysis): MoveAnalysis[] {
  const { positions, moves } = pgnToPositions(pgn)
  if (analysis.plies.length !== positions.length) {
    throw new Error(
      `Analysis has ${analysis.plies.length} positions but the game has ${positions.length}`,
    )
  }

  return moves.map((move, i) => {
    const before = analysis.plies[i]!
    const after = analysis.plies[i + 1]!
    const sign = move.color === 'white' ? 1 : -1
    const toMover = (p: number) => (move.color === 'white' ? p : 1 - p)

    const winProbBefore = toMover(winProbability(before.score))
    const winProbAfter = toMover(winProbability(after.score))
    // The engine's own move is never an error, even if the two searches disagree slightly.
    const isBest = before.bestMove === move.uci
    const winProbLoss = isBest ? 0 : Math.max(0, winProbBefore - winProbAfter)
    const centipawnLoss = isBest
      ? 0
      : Math.max(0, sign * (cappedCp(before.score) - cappedCp(after.score)))

    return {
      ...move,
      bestMoveSan: before.bestMove ? uciToSan(positions[i]!, before.bestMove) : null,
      evalBefore: before.score,
      evalAfter: after.score,
      winProbBefore,
      winProbAfter,
      winProbLoss,
      centipawnLoss,
      class: isBest ? 'best' : classifyLoss(winProbLoss),
    }
  })
}

/** "+1.3", "-0.4", "M3" (White mates), "-M2" (Black mates), "1-0"/"0-1" for checkmate on the board. */
export function formatScore(score: Score): string {
  if (score.type === 'mate') {
    if (score.moves === 0) return score.winner === 'white' ? '1-0' : '0-1'
    return `${score.winner === 'white' ? '' : '-'}M${score.moves}`
  }
  const pawns = score.value / 100
  return `${pawns > 0 ? '+' : ''}${pawns.toFixed(1)}`
}

/** Chess annotation symbols for each error class. */
export const CLASS_SYMBOL: Record<MoveClass, string> = {
  best: '',
  ok: '',
  inaccuracy: '?!',
  mistake: '?',
  blunder: '??',
}

/** "14. Nf3" or "14... Qe6??" */
export function moveLabel(m: MoveAnalysis): string {
  return `${m.moveNumber}${m.color === 'white' ? '.' : '...'} ${m.san}${CLASS_SYMBOL[m.class]}`
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n))
}
