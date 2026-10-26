import type { PositionEval } from './engine/types'

export type Color = 'white' | 'black'
export type GameResult = 'win' | 'loss' | 'draw'
export type TimeClass = 'bullet' | 'blitz' | 'rapid' | 'daily'

/** A finished game, normalized from whichever source it came from. */
export interface Game {
  /** Source-prefixed id, e.g. "chesscom:<uuid>". */
  id: string
  /** Lowercased username of the player being analyzed. */
  username: string
  source: 'chesscom'
  url: string
  /** Epoch milliseconds. */
  endTime: number
  timeClass: TimeClass
  timeControl: string
  myColor: Color
  result: GameResult
  myRating: number
  opponentName: string
  opponentRating: number
  /** Human-readable opening name, or null if unknown. */
  opening: string | null
  pgn: string
}

/** Engine output for one game. Re-analyze when engineId or depth changes. */
export interface Analysis {
  gameId: string
  /** e.g. "Stockfish 19 Lite WASM" */
  engineId: string
  depth: number
  /**
   * One entry per position: plies[0] is the start, plies[i] the position after ply i
   * (same indexing as GamePositions.positions). Scores are from White's point of view.
   */
  plies: PositionEval[]
  /** Epoch milliseconds. */
  analyzedAt: number
}
