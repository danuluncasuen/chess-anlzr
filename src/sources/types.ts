import type { Game } from '../types'

export interface LoadProgress {
  message: string
}

/**
 * A place games come from. chess.com is the only one for now; Lichess or
 * PGN upload can be added later by implementing this interface.
 */
export interface GameSource {
  /** Fetches (or reads from cache) the user's most recent games, newest first. */
  loadRecentGames(
    username: string,
    limit: number,
    options?: { signal?: AbortSignal; onProgress?: (p: LoadProgress) => void },
  ): Promise<Game[]>
}
