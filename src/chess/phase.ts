import type { Color } from '../types'

export type Phase = 'opening' | 'middlegame' | 'endgame'
export type MoveTag = 'rook-endgame'

/** The opening lasts at most this many full moves. */
export const OPENING_MOVES = 12
/**
 * Endgame once at most this many knights, bishops, rooks and queens are left
 * (both sides together; 14 at the start). Similar to Lichess's rule. Counting pieces
 * rather than checking for queens keeps an early queen trade in the middlegame.
 */
export const ENDGAME_PIECES = 6

type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k'

export type PieceCounts = Record<Color, Record<PieceType, number>>

/** Counts every piece on the board from the FEN's first field. */
export function countPieces(fen: string): PieceCounts {
  const empty = () => ({ p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 })
  const counts: PieceCounts = { white: empty(), black: empty() }
  for (const ch of fen.split(' ')[0] ?? '') {
    const type = ch.toLowerCase()
    if (!(type in counts.white)) continue
    counts[ch === type ? 'black' : 'white'][type as PieceType]++
  }
  return counts
}

/** Knights, bishops, rooks and queens of both sides. */
export function pieceCount({ white, black }: PieceCounts): number {
  return white.n + white.b + white.r + white.q + black.n + black.b + black.r + black.q
}

/** Phase of a position. Endgame wins over opening, e.g. after a big early trade-off. */
export function phaseOf(fen: string, moveNumber: number): Phase {
  if (pieceCount(countPieces(fen)) <= ENDGAME_PIECES) return 'endgame'
  return moveNumber <= OPENING_MOVES ? 'opening' : 'middlegame'
}

/** Tags describing a position's material. */
export function tagsOf(fen: string): MoveTag[] {
  const { white, black } = countPieces(fen)
  const minorsOrQueens = white.n + white.b + white.q + black.n + black.b + black.q
  const rooks = white.r + black.r
  return minorsOrQueens === 0 && rooks > 0 ? ['rook-endgame'] : []
}
