import { groupByTimeClass, TIME_CLASS_LABEL, type TypeFilter as Filter } from '../analysis/gameTypes'
import type { Game } from '../types'

interface Props {
  games: Game[]
  value: Filter
  onChange: (filter: Filter) => void
}

/**
 * Chips to show all games or one type (bullet, blitz, ...), with counts. Only the types actually
 * played are offered, and nothing shows when there's just one.
 */
export function TypeFilter({ games, value, onChange }: Props) {
  const groups = groupByTimeClass(games)
  if (groups.length < 2) return null

  const chip = (filter: Filter, label: string, count: number) => (
    <button
      key={filter}
      type="button"
      className="type-chip"
      aria-pressed={value === filter}
      onClick={() => onChange(filter)}
    >
      {label} <span className="type-count">{count}</span>
    </button>
  )

  return (
    <div className="type-filter" role="group" aria-label="Show games of type">
      {chip('all', 'All', games.length)}
      {groups.map((g) => chip(g.timeClass, TIME_CLASS_LABEL[g.timeClass], g.games.length))}
    </div>
  )
}
