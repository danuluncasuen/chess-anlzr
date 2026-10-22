import { useRef, useState, type FormEvent } from 'react'
import { GameList } from './components/GameList'
import { chessComSource } from './sources/chesscom/source'
import type { Game } from './types'

const DEFAULT_LIMIT = 30
const LAST_USER_KEY = 'chess-anlzr:lastUsername'

function readLastUsername(): string {
  try {
    return localStorage.getItem(LAST_USER_KEY) ?? ''
  } catch {
    return ''
  }
}

export default function App() {
  const [username, setUsername] = useState(readLastUsername)
  const [limit, setLimit] = useState(DEFAULT_LIMIT)
  const [games, setGames] = useState<Game[] | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const user = username.trim()
    if (!user) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)
    try {
      localStorage.setItem(LAST_USER_KEY, user)
    } catch {
      // Storage unavailable (private mode etc.); not important.
    }

    try {
      const result = await chessComSource.loadRecentGames(user, limit, {
        signal: controller.signal,
        onProgress: (p) => setStatus(p.message),
      })
      setGames(result)
    } catch (err) {
      if (controller.signal.aborted) return
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      if (abortRef.current === controller) {
        setLoading(false)
        setStatus(null)
      }
    }
  }

  return (
    <main>
      <h1>Chess Analyzer</h1>
      <form className="search" onSubmit={handleSubmit}>
        <input
          aria-label="chess.com username"
          placeholder="chess.com username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
        />
        <label>
          Games
          <input
            type="number"
            min={1}
            max={200}
            value={limit}
            onChange={(e) => setLimit(Math.max(1, Number(e.target.value) || DEFAULT_LIMIT))}
          />
        </label>
        <button type="submit" disabled={loading || !username.trim()}>
          {loading ? 'Loading…' : 'Load games'}
        </button>
      </form>

      {status && <p className="status">{status}</p>}
      {error && <p className="error">{error}</p>}
      {games && <GameList games={games} />}
    </main>
  )
}
