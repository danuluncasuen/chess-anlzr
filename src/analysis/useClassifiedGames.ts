import { useEffect, useRef, useState } from 'react'
import { db } from '../db/db'
import type { Game } from '../types'
import { classifyGame, type MoveAnalysis } from './classify'
import type { ClassifiedGame } from './summary'

/**
 * The analyzed games among `games`, with every move classified. Re-reads only
 * games that became analyzed since the last run, so it is cheap to call as the
 * queue finishes games one by one.
 */
export function useClassifiedGames(games: Game[] | null, analyzed: ReadonlySet<string>): ClassifiedGame[] {
  const cache = useRef(new Map<string, MoveAnalysis[]>())
  const [result, setResult] = useState<ClassifiedGame[]>([])

  useEffect(() => {
    let cancelled = false
    const ids = (games ?? []).map((g) => g.id).filter((id) => analyzed.has(id))
    // Forget games that are no longer analyzed (e.g. now stale after an engine change).
    for (const id of cache.current.keys()) if (!analyzed.has(id)) cache.current.delete(id)
    const missing = ids.filter((id) => !cache.current.has(id))

    db.analyses.bulkGet(missing).then((analyses) => {
      if (cancelled) return
      for (const analysis of analyses) {
        const game = analysis && games?.find((g) => g.id === analysis.gameId)
        if (!game) continue
        try {
          cache.current.set(game.id, classifyGame(game.pgn, analysis))
        } catch {
          // An analysis that doesn't match its game is left out of the summary.
        }
      }
      setResult(
        (games ?? []).flatMap((game) => {
          const moves = cache.current.get(game.id)
          return moves ? [{ game, moves }] : []
        }),
      )
    })
    return () => {
      cancelled = true
    }
  }, [games, analyzed])

  return result
}
