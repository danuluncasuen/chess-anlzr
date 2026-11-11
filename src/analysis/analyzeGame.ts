import { pgnToPositions } from '../chess/positions'
import type { Engine, PositionEval } from '../engine/types'
import type { Analysis, Game } from '../types'

export interface AnalyzeOptions {
  depth: number
  /** Engine lines per position; 2 also scores the second-best move (for brilliant moves). */
  lines?: number
  signal?: AbortSignal
  /** Called after each position with how many are done out of the total. */
  onProgress?: (done: number, total: number) => void
}

/** Evaluates every position of a game. Rejects with an AbortError if cancelled. */
export async function analyzeGame(
  engine: Engine,
  game: Game,
  { depth, lines = 1, signal, onProgress }: AnalyzeOptions,
): Promise<Analysis> {
  const engineId = await engine.init()
  const { positions } = pgnToPositions(game.pgn)

  const plies: PositionEval[] = []
  for (const fen of positions) {
    plies.push(await engine.evaluate(fen, { depth, lines, signal }))
    onProgress?.(plies.length, positions.length)
  }

  return { gameId: game.id, engineId, depth, lines, plies, analyzedAt: Date.now() }
}
