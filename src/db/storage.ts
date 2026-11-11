// What this device keeps for the app, and the user's controls over it.
import { db } from './db'

/** The last username searched, prefilled on the next visit. */
export const LAST_USER_KEY = 'chess-anlzr:lastUsername'

/**
 * Asks the browser not to delete the saved games and analyses when it cleans up storage (Chrome
 * does this under disk pressure; Safari after 7 days without a visit, unless the app is on the home
 * screen). Chrome and Safari decide silently; Firefox may ask the user once. Returns whether the data
 * is now kept, or false where the browser doesn't support it.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  const storage = typeof navigator === 'undefined' ? undefined : navigator.storage
  if (!storage?.persist) return false
  try {
    return (await storage.persisted()) || (await storage.persist())
  } catch {
    return false
  }
}

/** Roughly how much this site stores on the device, in bytes, or null if the browser won't say. */
export async function savedDataSize(): Promise<number | null> {
  try {
    const estimate = await navigator.storage?.estimate?.()
    return estimate?.usage ?? null
  } catch {
    return null
  }
}

/**
 * Deletes everything saved about games on this device: fetched games, archive caches, analyses and
 * the remembered username. Display preferences (the theme) stay.
 */
export async function clearSavedData(storage: Pick<Storage, 'removeItem'> | null = browserStorage()): Promise<void> {
  await db.transaction('rw', db.tables, () => Promise.all(db.tables.map((table) => table.clear())))
  try {
    storage?.removeItem(LAST_USER_KEY)
  } catch {
    // Storage unavailable (private mode etc.); nothing was saved there anyway.
  }
}

function browserStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

/** "364 KB", "2.1 MB". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
