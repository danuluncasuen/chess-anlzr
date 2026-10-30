import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type FormEvent, type MouseEvent } from 'react'
import { AnalysisQueue } from './analysis/queue'
import { accuracyOf, summarize } from './analysis/summary'
import { useClassifiedGames } from './analysis/useClassifiedGames'
import { AnalysisPanel } from './components/AnalysisPanel'
import { GameDetail } from './components/GameDetail'
import { Footer } from './components/Footer'
import { GameList } from './components/GameList'
import { Intro } from './components/Intro'
import { SummaryView } from './components/SummaryView'
import { ThemeToggle } from './components/ThemeToggle'
import { StockfishEngine } from './engine/stockfish'
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

/** Scrolls to an in-page section without adding a history entry (which Back would replay). */
function scrollToSection(e: MouseEvent<HTMLAnchorElement>) {
  const target = document.querySelector(e.currentTarget.hash)
  if (!target) return
  e.preventDefault()
  target.scrollIntoView({ behavior: 'smooth' })
}

export default function App() {
  const [queue] = useState(() => new AnalysisQueue(() => new StockfishEngine()))
  const queueState = useSyncExternalStore(queue.subscribe, queue.getState)
  useEffect(() => () => void queue.dispose(), [queue])

  const [username, setUsername] = useState(readLastUsername)
  const [limit, setLimit] = useState(DEFAULT_LIMIT)
  const [games, setGames] = useState<Game[] | null>(null)
  const [openGameId, setOpenGameId] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const listScrollRef = useRef(0)
  const usernameRef = useRef<HTMLInputElement>(null)

  // Opening a game adds a history entry, so the phone's back gesture (or the browser's
  // back button) returns to the list at the same scroll position.
  useEffect(() => {
    const onPopState = () => {
      setOpenGameId(null)
      requestAnimationFrame(() => window.scrollTo(0, listScrollRef.current))
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  /** Back to the start page: stops loading and pauses analysis (finished results stay saved). */
  function goHome(e: MouseEvent<HTMLAnchorElement>) {
    e.preventDefault()
    abortRef.current?.abort()
    abortRef.current = null
    void queue.pause()
    setGames(null)
    setOpenGameId(null)
    setStatus(null)
    setError(null)
    setLoading(false)
    window.scrollTo(0, 0)
  }

  function openGameDetail(gameId: string) {
    listScrollRef.current = window.scrollY
    history.pushState({ gameId }, '')
    setOpenGameId(gameId)
    window.scrollTo(0, 0)
  }

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
      setOpenGameId(null)
      await queue.setGames(result)
      if (!controller.signal.aborted) queue.start()
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

  const classified = useClassifiedGames(games, queueState.analyzed)
  const summary = useMemo(() => summarize(classified), [classified])
  const accuracies = useMemo(
    () => new Map(classified.map((c) => [c.game.id, accuracyOf(c)])),
    [classified],
  )
  const openGame = games?.find((g) => g.id === openGameId)

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <h1>
            <a href="/" className="brand" onClick={goHome}>
              chess-anlzr
            </a>
          </h1>
          <form className="search" onSubmit={handleSubmit}>
            <input
              ref={usernameRef}
              aria-label="chess.com username"
              placeholder="chess.com username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
            />
            <label>
              <span className="limit-label">Games</span>
              <input
                aria-label="Number of games"
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
          {games && !openGame && (
            <nav className="topnav">
              <a href="#summary" onClick={scrollToSection}>
                summary
              </a>
              <a href="#games" onClick={scrollToSection}>
                games
              </a>
            </nav>
          )}
          <ThemeToggle />
        </div>
      </header>
      <main>
        {status && <p className="status">{status}</p>}
        {error && <p className="error">{error}</p>}
        {!games && <Intro onStart={() => usernameRef.current?.focus()} />}
        {games && <AnalysisPanel queue={queue} state={queueState} />}
        {games && openGame && (
          <GameDetail
            game={openGame}
            analyzed={queueState.analyzed.has(openGame.id)}
            usualAccuracy={summary.accuracy}
            onBack={() => history.back()}
          />
        )}
        {games && !openGame && <SummaryView summary={summary} totalGames={games.length} />}
        {games && !openGame && (
          <GameList
            games={games}
            analysis={queueState}
            accuracies={accuracies}
            usualAccuracy={summary.accuracy}
            onOpen={openGameDetail}
          />
        )}
      </main>
      <Footer />
    </>
  )
}
