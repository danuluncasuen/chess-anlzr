import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Game } from '../types'
import { db } from './db'
import { clearSavedData, formatBytes, LAST_USER_KEY, requestPersistentStorage } from './storage'

const game = { id: 'g1', username: 'dlunc', endTime: 1 } as Game

describe('clearSavedData', () => {
  beforeEach(async () => {
    await db.games.put(game)
    await db.analyses.put({ gameId: 'g1', engineId: 'e', depth: 12, plies: [], analyzedAt: 0 })
    await db.archiveLists.put({ username: 'dlunc', urls: [], fetchedAt: 0 })
  })

  it('empties every table and forgets the username, leaving other keys alone', async () => {
    const store = new Map([
      [LAST_USER_KEY, 'dlunc'],
      ['chess-anlzr:theme', 'cream'],
    ])
    await clearSavedData({ removeItem: (key: string) => void store.delete(key) })

    for (const table of db.tables) expect(await table.count()).toBe(0)
    expect([...store.keys()]).toEqual(['chess-anlzr:theme'])
  })

  it('works without localStorage', async () => {
    await clearSavedData(null)
    expect(await db.games.count()).toBe(0)
  })
})

describe('requestPersistentStorage', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('asks only when the data isn’t kept already', async () => {
    const persist = vi.fn().mockResolvedValue(true)
    vi.stubGlobal('navigator', { storage: { persisted: vi.fn().mockResolvedValue(false), persist } })
    expect(await requestPersistentStorage()).toBe(true)
    expect(persist).toHaveBeenCalledOnce()

    persist.mockClear()
    vi.stubGlobal('navigator', { storage: { persisted: vi.fn().mockResolvedValue(true), persist } })
    expect(await requestPersistentStorage()).toBe(true)
    expect(persist).not.toHaveBeenCalled()
  })

  it('reports false where the browser doesn’t support it', async () => {
    vi.stubGlobal('navigator', {})
    expect(await requestPersistentStorage()).toBe(false)
  })
})

describe('formatBytes', () => {
  it('uses KB below a megabyte and MB above', () => {
    expect(formatBytes(372_000)).toBe('363 KB')
    expect(formatBytes(2_200_000)).toBe('2.1 MB')
    expect(formatBytes(10)).toBe('1 KB')
  })
})
