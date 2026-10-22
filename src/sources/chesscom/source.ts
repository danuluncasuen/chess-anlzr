import { Dexie } from 'dexie'
import { db } from '../../db/db'
import type { Game } from '../../types'
import type { GameSource } from '../types'
import { fetchArchive, fetchArchiveList } from './api'
import { normalizeGame } from './normalize'

/** Look back at most this many monthly archives. */
const MAX_MONTHS = 3
const ARCHIVE_LIST_TTL_MS = 60 * 60 * 1000
/** The current month keeps growing, so refetch it after this long. */
const CURRENT_MONTH_TTL_MS = 10 * 60 * 1000

export const chessComSource: GameSource = {
  async loadRecentGames(username, limit, { signal, onProgress } = {}) {
    const user = username.trim().toLowerCase()
    const now = Date.now()

    onProgress?.({ message: 'Loading archive list…' })
    const archiveUrls = await getArchiveList(user, now, signal)
    const newestFirst = [...archiveUrls].reverse().slice(0, MAX_MONTHS)

    // Requests run one at a time on purpose, to stay polite to chess.com.
    let collected = 0
    for (const [i, url] of newestFirst.entries()) {
      if (collected >= limit) break
      const cached = await db.archives.get(url)
      const isCurrentMonth = i === 0
      const fresh = cached && (!isCurrentMonth || now - cached.fetchedAt < CURRENT_MONTH_TTL_MS)

      if (fresh) {
        collected += cached.gameCount
        continue
      }

      onProgress?.({ message: `Fetching ${archiveLabel(url)}…` })
      const games = (await fetchArchive(url, signal))
        .map((raw) => normalizeGame(raw, user))
        .filter((g): g is Game => g !== null)

      await db.transaction('rw', db.games, db.archives, async () => {
        await db.games.bulkPut(games)
        await db.archives.put({ url, username: user, gameCount: games.length, fetchedAt: now })
      })
      collected += games.length
    }

    return db.games
      .where('[username+endTime]')
      .between([user, Dexie.minKey], [user, Dexie.maxKey])
      .reverse()
      .limit(limit)
      .toArray()
  },
}

async function getArchiveList(user: string, now: number, signal?: AbortSignal): Promise<string[]> {
  const cached = await db.archiveLists.get(user)
  if (cached && now - cached.fetchedAt < ARCHIVE_LIST_TTL_MS) return cached.urls
  const urls = await fetchArchiveList(user, signal)
  await db.archiveLists.put({ username: user, urls, fetchedAt: now })
  return urls
}

/** ".../games/2026/10" -> "2026-10" */
function archiveLabel(url: string): string {
  return url.split('/').slice(-2).join('-')
}
