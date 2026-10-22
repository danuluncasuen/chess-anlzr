import { Dexie, type EntityTable } from 'dexie'
import type { Game } from '../types'

/** Cached list of a player's monthly archive URLs. */
export interface ArchiveListRecord {
  username: string
  urls: string[]
  fetchedAt: number
}

/** Marks a monthly archive as fetched; its games live in the `games` table. */
export interface ArchiveRecord {
  url: string
  username: string
  gameCount: number
  fetchedAt: number
}

export const db = new Dexie('chess-anlzr') as Dexie & {
  games: EntityTable<Game, 'id'>
  archives: EntityTable<ArchiveRecord, 'url'>
  archiveLists: EntityTable<ArchiveListRecord, 'username'>
}

// Add new tables (e.g. analyses) as a new db.version(n), never by editing an old one.
db.version(1).stores({
  games: 'id, username, [username+endTime]',
  archives: 'url, username',
  archiveLists: 'username',
})
