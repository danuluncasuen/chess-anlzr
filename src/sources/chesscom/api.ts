// Thin client for chess.com's public API: https://www.chess.com/news/view/published-data-api
// The API sends `Access-Control-Allow-Origin: *`, so we call it straight from the browser.
// Don't add custom headers (they would trigger a CORS preflight); browsers can't set User-Agent anyway.

const BASE = 'https://api.chess.com/pub'

export interface RawPlayer {
  username: string
  rating: number
  result: string
}

export interface RawGame {
  uuid: string
  url: string
  pgn?: string
  time_control: string
  time_class: string
  end_time: number
  rated: boolean
  rules: string
  eco?: string
  white: RawPlayer
  black: RawPlayer
}

export class ChessComError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ChessComError'
    this.status = status
  }
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal })
  if (res.status === 404) throw new ChessComError('Player not found on chess.com', 404)
  if (res.status === 429) throw new ChessComError('chess.com rate limit hit, try again in a minute', 429)
  if (!res.ok) throw new ChessComError(`chess.com request failed (${res.status})`, res.status)
  return (await res.json()) as T
}

/** Monthly archive URLs, oldest first. */
export async function fetchArchiveList(username: string, signal?: AbortSignal): Promise<string[]> {
  const data = await getJson<{ archives: string[] }>(
    `${BASE}/player/${encodeURIComponent(username)}/games/archives`,
    signal,
  )
  return data.archives
}

export async function fetchArchive(archiveUrl: string, signal?: AbortSignal): Promise<RawGame[]> {
  const data = await getJson<{ games: RawGame[] }>(archiveUrl, signal)
  return data.games
}
