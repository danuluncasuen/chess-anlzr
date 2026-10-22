import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../db/db'
import type { RawGame } from './api'
import { rawGame } from './fixtures'
import { chessComSource } from './source'

const ARCHIVES = 'https://api.chess.com/pub/player/dlunc/games/archives'
const month = (m: string) => `https://api.chess.com/pub/player/dlunc/games/2026/${m}`

/** n games for dlunc, with end times counting down from `start` (seconds). */
function games(n: number, start: number): RawGame[] {
  return Array.from({ length: n }, (_, i) =>
    rawGame({ uuid: `g-${start}-${i}`, end_time: start - i }),
  )
}

let responses: Record<string, unknown>
const fetchMock = vi.fn(async (url: string) => {
  const body = responses[url]
  return new Response(JSON.stringify(body), { status: body ? 200 : 404 })
})

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
  fetchMock.mockClear()
  vi.stubGlobal('fetch', fetchMock)
  responses = {
    [ARCHIVES]: { archives: [month('08'), month('09'), month('10')] },
    [month('10')]: { games: games(20, 3_000) },
    [month('09')]: { games: games(20, 2_000) },
    [month('08')]: { games: games(20, 1_000) },
  }
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('chessComSource.loadRecentGames', () => {
  it('fetches newest months until the limit is reached, newest game first', async () => {
    const result = await chessComSource.loadRecentGames('dlunc', 30)

    expect(result).toHaveLength(30)
    expect(result[0]?.endTime).toBe(3_000_000)
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([ARCHIVES, month('10'), month('09')])
  })

  it('serves a repeat visit from the cache', async () => {
    await chessComSource.loadRecentGames('dlunc', 30)
    fetchMock.mockClear()

    const result = await chessComSource.loadRecentGames('DLUNC', 30)

    expect(result).toHaveLength(30)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('reports an unknown player', async () => {
    await expect(chessComSource.loadRecentGames('nobody', 30)).rejects.toThrow('Player not found')
  })
})
