// Material: piece values, captured pieces and who is ahead.
import type { PieceSymbol } from 'chess.js'
import type { Color } from '../types'
import { countPieces } from './phase'

/** Standard piece values (pawn 1, knight/bishop 3, rook 5, queen 9). */
export const PIECE_VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }

/** Points of material on the board for White minus Black (positive = White is ahead). */
export function materialBalance(fen: string): number {
  const { white, black } = countPieces(fen)
  return (Object.keys(PIECE_VALUE) as PieceSymbol[]).reduce(
    (sum, type) => sum + PIECE_VALUE[type] * (white[type] - black[type]),
    0,
  )
}

/** The pieces each side has captured over `moves`, cheapest first (pawns, then knights, ...). */
export function capturedBy(
  moves: { color: Color; captured: PieceSymbol | null }[],
): Record<Color, PieceSymbol[]> {
  const result: Record<Color, PieceSymbol[]> = { white: [], black: [] }
  for (const m of moves) if (m.captured) result[m.color].push(m.captured)
  const order: PieceSymbol[] = ['p', 'n', 'b', 'r', 'q', 'k']
  for (const pieces of Object.values(result)) pieces.sort((a, b) => order.indexOf(a) - order.indexOf(b))
  return result
}
