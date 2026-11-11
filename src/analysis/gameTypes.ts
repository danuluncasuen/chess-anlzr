// Game types (time classes): their order and labels, and grouping games by them.
import type { TimeClass } from '../types'

/** Fastest first. */
export const TIME_CLASS_ORDER: TimeClass[] = ['bullet', 'blitz', 'rapid', 'daily']

export const TIME_CLASS_LABEL: Record<TimeClass, string> = {
  bullet: 'Bullet',
  blitz: 'Blitz',
  rapid: 'Rapid',
  daily: 'Daily',
}

/** A filter choice: one game type, or all of them. */
export type TypeFilter = TimeClass | 'all'

/** Games split by type, fastest type first, keeping each group's games in their original order. */
export function groupByTimeClass<T extends { timeClass: TimeClass }>(
  games: T[],
): { timeClass: TimeClass; games: T[] }[] {
  return TIME_CLASS_ORDER.map((timeClass) => ({ timeClass, games: games.filter((g) => g.timeClass === timeClass) })).filter(
    (group) => group.games.length > 0,
  )
}

/** The games matching a filter. */
export function filterByType<T extends { timeClass: TimeClass }>(games: T[], filter: TypeFilter): T[] {
  return filter === 'all' ? games : games.filter((g) => g.timeClass === filter)
}
