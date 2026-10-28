import { useEffect, useRef, useState } from 'react'
import { StockfishEngine } from '../engine/stockfish'
import { isAbortError, type Engine, type PositionEval } from '../engine/types'

/** Same depth as the game analysis, so variation evals compare fairly with the game's. */
export const EXPLORE_DEPTH = 12

/**
 * Evaluates `fen` on demand with its own engine (separate from the background analysis queue).
 * The engine starts on the first request; a new fen cancels the search for the previous one.
 * Returns null while thinking (or when fen is null).
 */
export function usePositionEval(
  fen: string | null,
  createEngine: () => Engine = () => new StockfishEngine(),
): { evaluation: PositionEval | null; error: string | null } {
  const engineRef = useRef<Engine | null>(null)
  // Only the first factory matters: the engine is created once and kept.
  const createEngineRef = useRef(createEngine)
  const [results, setResults] = useState<Record<string, PositionEval>>({})
  const [error, setError] = useState<string | null>(null)
  const known = fen ? results[fen] : undefined

  useEffect(
    () => () => {
      engineRef.current?.dispose()
      engineRef.current = null
    },
    [],
  )

  useEffect(() => {
    if (!fen || known) return
    const controller = new AbortController()
    engineRef.current ??= createEngineRef.current()
    engineRef.current
      .evaluate(fen, { depth: EXPLORE_DEPTH, signal: controller.signal })
      .then((evaluation) => setResults((r) => ({ ...r, [fen]: evaluation })))
      .catch((err: unknown) => {
        if (!isAbortError(err)) setError(err instanceof Error ? err.message : String(err))
      })
    return () => controller.abort()
  }, [fen, known])

  return { evaluation: known ?? null, error }
}
