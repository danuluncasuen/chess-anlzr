// Moves the player tries out on the board, away from the game ("what if I had played...").
import { Chess, type PieceSymbol, type Square } from 'chess.js'
import type { Color } from '../types'

export interface VariationMove {
  san: string
  uci: string
  /** Position after the move. */
  fen: string
  moveNumber: number
  color: Color
  captured: PieceSymbol | null
}

/**
 * Plays `from`-`to` in `fen` if it's legal, or returns null. Pawns reaching the last rank
 * become queens (the board has no promotion picker).
 */
export function tryMove(fen: string, from: string, to: string): VariationMove | null {
  const chess = new Chess(fen)
  const moveNumber = chess.moveNumber()
  const color: Color = chess.turn() === 'w' ? 'white' : 'black'
  try {
    const move = chess.move({ from, to, promotion: 'q' })
    return {
      san: move.san,
      uci: move.from + move.to + (move.promotion ?? ''),
      fen: chess.fen(),
      moveNumber,
      color,
      captured: move.captured ?? null,
    }
  } catch {
    return null
  }
}

/** Squares the piece on `square` can legally move to (empty if it isn't that side's turn). */
export function legalTargets(fen: string, square: string): string[] {
  return new Chess(fen).moves({ square: square as Square, verbose: true }).map((m) => m.to)
}

/** Whose turn it is in a FEN. */
export function turnOf(fen: string): Color {
  return fen.split(' ')[1] === 'b' ? 'black' : 'white'
}

/** "18... Nxd5 19. Bxf6 gxf6": numbers before White's moves, and before a first move by Black. */
export function formatLine(moves: VariationMove[]): string {
  return moves
    .map((m, i) =>
      m.color === 'white' ? `${m.moveNumber}. ${m.san}` : i === 0 ? `${m.moveNumber}... ${m.san}` : m.san,
    )
    .join(' ')
}

/**
 * The game position the board shows: after the selected move (ply), the start when none is
 * selected, or before the move when its "best move" view is open.
 */
export function shownGameFen(
  moves: { fenBefore: string; fenAfter: string }[],
  selected: number | null,
  beforeMove: boolean,
): string {
  const move = selected ? moves[selected - 1] : undefined
  if (!move) return moves[0]?.fenBefore ?? new Chess().fen()
  return beforeMove ? move.fenBefore : move.fenAfter
}
