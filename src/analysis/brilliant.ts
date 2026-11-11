// Brilliant moves ("!!"): sound piece sacrifices. A knight, bishop, rook or queen moved where the
// opponent can win it, yet it's Stockfish's best move, in a position that wasn't already won.
// Chess.com's exact rule isn't public; this follows its spirit.
import { Chess, type PieceSymbol, type Square } from 'chess.js'
import { materialBalance, PIECE_VALUE } from '../chess/material'

/** Material given up, in points, to count as a sacrifice: a piece for a pawn, or the exchange. */
export const MIN_SACRIFICE = 2
/** Not brilliant when the mover was already this sure to win... */
const MAX_WIN_BEFORE = 0.9
/** ...or ends up worse than this afterwards. */
const MIN_WIN_AFTER = 0.4

/** For choosing the cheapest capturer; the king captures last. */
const CAPTURE_ORDER: Record<PieceSymbol, number> = { ...PIECE_VALUE, k: 100 }

/**
 * Material the side to move wins by capturing on `square` and letting the recaptures play out
 * (static exchange evaluation): each side takes with its cheapest piece, and stops when going on
 * would lose material. Never negative. Leaves `chess` as it found it.
 */
export function exchangeGain(chess: Chess, square: Square): number {
  const captures = chess.moves({ verbose: true }).filter((m) => m.to === square && m.captured)
  if (captures.length === 0) return 0
  const capture = captures.reduce((a, b) => (CAPTURE_ORDER[b.piece] < CAPTURE_ORDER[a.piece] ? b : a))
  chess.move(capture)
  const gain = PIECE_VALUE[capture.captured!] - exchangeGain(chess, square)
  chess.undo()
  return Math.max(0, gain)
}

/** Only these can be sacrificed for a brilliant move: never a pawn, never the king. */
const SACRIFICEABLE: ReadonlySet<PieceSymbol> = new Set(['n', 'b', 'r', 'q'])

/**
 * Points of material the mover gives up with the piece they move: what the opponent wins by
 * taking it once the recaptures on that square play out (so an even trade is 0). Counts whether or
 * not the opponent actually takes it. Pawn and king moves give up nothing here.
 */
export function sacrificedMaterial(fenBefore: string, uci: string): number {
  const chess = new Chess(fenBefore)
  const mover = chess.turn()
  const forMover = (fen: string) => (mover === 'w' ? 1 : -1) * materialBalance(fen)
  const before = forMover(fenBefore)

  let move
  try {
    move = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4) || undefined })
  } catch {
    return 0
  }
  if (!SACRIFICEABLE.has(move.piece)) return 0
  const afterMove = forMover(chess.fen())
  return Math.max(0, before - (afterMove - exchangeGain(chess, move.to as Square)))
}

/**
 * Whether a move is brilliant: Stockfish's own choice, offering the moved piece (knight or better)
 * for at least MIN_SACRIFICE points, in a position that wasn't already won and doesn't end up worse.
 */
export function isBrilliant(m: {
  fenBefore: string
  uci: string
  /** Whether the move is exactly the engine's best move. */
  isBest: boolean
  winProbBefore: number
  winProbAfter: number
}): boolean {
  if (!m.isBest) return false
  if (m.winProbBefore > MAX_WIN_BEFORE || m.winProbAfter < MIN_WIN_AFTER) return false
  // The only legal move is never brilliant, however much it gives up.
  if (new Chess(m.fenBefore).moves().length < 2) return false
  return sacrificedMaterial(m.fenBefore, m.uci) >= MIN_SACRIFICE
}
