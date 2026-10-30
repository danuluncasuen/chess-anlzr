import { Chess, type PieceSymbol } from 'chess.js'
import type { Color } from '../types'

export interface PlyMove {
  /** 1-based half-move index: ply 1 is White's first move. */
  ply: number
  /** Full-move number as written in the PGN ("12." for both 12. Nf3 and 12... Nf6). */
  moveNumber: number
  color: Color
  san: string
  /** Long algebraic, e.g. "e2e4" or "e7e8q". Same format as Stockfish's best moves. */
  uci: string
  /** The piece this move captured (en passant included), or null. */
  captured: PieceSymbol | null
}

export interface GamePositions {
  /**
   * FEN of every position in the game: positions[0] is the start,
   * positions[i] is the position after moves[i - 1]. Always moves.length + 1 long.
   */
  positions: string[]
  moves: PlyMove[]
}

export class PgnParseError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'PgnParseError'
  }
}

/** Replays a PGN and returns the position after every move. Throws PgnParseError on bad input. */
export function pgnToPositions(pgn: string): GamePositions {
  const chess = new Chess()
  try {
    chess.loadPgn(pgn)
  } catch (err) {
    throw new PgnParseError(`Could not parse PGN: ${err instanceof Error ? err.message : String(err)}`, {
      cause: err,
    })
  }

  const history = chess.history({ verbose: true })
  // With no moves the board is still at the start (which may come from a FEN header).
  const positions = [history[0]?.before ?? chess.fen(), ...history.map((m) => m.after)]

  const moves = history.map((m, i): PlyMove => ({
    ply: i + 1,
    moveNumber: fullMoveNumber(m.before),
    color: m.color === 'w' ? 'white' : 'black',
    san: m.san,
    uci: m.lan,
    captured: m.captured ?? null,
  }))

  return { positions, moves }
}

/** The sixth FEN field is the full-move number of the side to move. */
function fullMoveNumber(fen: string): number {
  return Number(fen.split(' ')[5])
}

/** Converts a UCI move ("g1f3") to SAN ("Nf3") in the given position, or null if it is not legal there. */
export function uciToSan(fen: string, uci: string): string | null {
  try {
    const move = new Chess(fen).move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.slice(4) || undefined,
    })
    return move.san
  } catch {
    return null
  }
}
