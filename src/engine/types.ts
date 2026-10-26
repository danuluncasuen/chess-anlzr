import type { Color } from '../types'

/**
 * An evaluation, always from White's point of view.
 * cp: centipawns, positive = White is better.
 * mate: `winner` mates in `moves` (0 = the position is already checkmate).
 */
export type Score = { type: 'cp'; value: number } | { type: 'mate'; moves: number; winner: Color }

export interface PositionEval {
  score: Score
  /** Best move in UCI form ("e2e4"), or null if the game is over in this position. */
  bestMove: string | null
  depth: number
}

/**
 * Anything that can evaluate a position. Kept small so the in-browser
 * Stockfish can be swapped for another engine or a server later.
 */
export interface Engine {
  /** Starts the engine and returns its id (e.g. "Stockfish 19 Lite WASM"), stored with each analysis. */
  init(): Promise<string>
  /** Evaluates one position. Rejects with an AbortError if `signal` fires. */
  evaluate(fen: string, options: { depth: number; signal?: AbortSignal }): Promise<PositionEval>
  dispose(): void
}

export function abortError(): DOMException {
  return new DOMException('Analysis was cancelled', 'AbortError')
}

export function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError'
}
