import type { CSSProperties } from 'react'
import { accuracyHue, accuracyWord } from '../analysis/accuracy'
import type { QueueState } from '../analysis/queue'
import { estimateGameRating } from '../analysis/rating'
import type { GameAccuracy } from '../analysis/summary'
import { groupByTimeClass, TIME_CLASS_LABEL } from '../analysis/gameTypes'
import type { Game, TimeClass } from '../types'

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

interface Props {
  games: Game[]
  analysis: QueueState
  accuracies: ReadonlyMap<string, GameAccuracy>
  /** The player's brilliant moves per game; games with any get a "!!" badge. */
  brilliantCounts: ReadonlyMap<string, number>
  /** The player's average accuracy, for the above/below-average arrows. */
  usualAccuracy: number | null
  /** Show the games in sections by type (when all types are shown). */
  grouped: boolean
  onOpen: (gameId: string) => void
}

export function GameList({ games, analysis, accuracies, brilliantCounts, usualAccuracy, grouped, onOpen }: Props) {
  if (games.length === 0) return <p>No standard games found in the last few months.</p>

  // With every type shown, the games come in sections by type (fastest first); otherwise one list.
  const groups: { timeClass: TimeClass | null; games: Game[] }[] = grouped
    ? groupByTimeClass(games)
    : [{ timeClass: null, games }]

  const row = (g: Game) => {
    const analyzed = analysis.analyzed.has(g.id)
    return (
      <tr
        key={g.id}
        className={analyzed ? 'openable' : undefined}
        // Tapping anywhere on an analyzed row opens it (the View button stays for keyboards).
        onClick={(e) => {
          if (analyzed && !(e.target as HTMLElement).closest('a, button')) onOpen(g.id)
        }}
      >
        <td className="date">
          <a href={g.url} target="_blank" rel="noreferrer">
            {dateFormat.format(g.endTime)}
          </a>
        </td>
        <td className="type">
          {g.timeClass} <span className="muted">{g.timeControl}</span>
        </td>
        <td className="color">{g.myColor}</td>
        <td className="opponent">
          {g.opponentName} <span className="muted">({g.opponentRating})</span>
        </td>
        <td className={`result result-${g.result}`}>
          {g.result}
          <BrilliantBadge count={brilliantCounts.get(g.id) ?? 0} />
        </td>
        <td className="opening" title={g.opening ?? undefined}>
          {g.opening ?? '—'}
        </td>
        <td className="accuracy">
          {accuracyCell(accuracies.get(g.id)?.mine ?? null, usualAccuracy)}
        </td>
        <td className="status-cell">{analysisStatus(g.id, analysis, onOpen)}</td>
      </tr>
    )
  }

  return (
    <div className="table-wrap" id="games">
      <table className="games">
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Color</th>
            <th>Opponent</th>
            <th>Result</th>
            <th>Opening</th>
            <th title="Your accuracy, and the rating it suggests (rough)">Accuracy</th>
            <th>Analysis</th>
          </tr>
        </thead>
        {groups.map((group) => (
          <tbody key={group.timeClass ?? 'all'}>
            {group.timeClass && (
              <tr className="group-row">
                <th colSpan={8} scope="rowgroup">
                  {TIME_CLASS_LABEL[group.timeClass]}{' '}
                  <span className="muted">{groupSummary(group.games, accuracies)}</span>
                </th>
              </tr>
            )}
            {group.games.map(row)}
          </tbody>
        ))}
      </table>
    </div>
  )
}

function analysisStatus(
  gameId: string,
  { analyzed, failed, current }: QueueState,
  onOpen: (gameId: string) => void,
) {
  if (analyzed.has(gameId)) {
    return (
      <button type="button" className="view-button" onClick={() => onOpen(gameId)}>
        View
      </button>
    )
  }
  const error = failed.get(gameId)
  if (error) return <span className="error" title={error}>failed</span>
  if (current?.gameId === gameId) {
    const pct = current.total ? Math.round((current.done / current.total) * 100) : 0
    return <span>{pct}%</span>
  }
  return <span className="muted">queued</span>
}

/** Games this many accuracy points above or below the player's usual get an arrow. */
const NOTABLE_GAP = 5

/** The game's accuracy and "played like" estimate; the arrow compares it with the player's average. */
function accuracyCell(accuracy: number | null, usual: number | null) {
  if (accuracy === null) return <span className="muted">—</span>
  const gap = usual === null ? 0 : accuracy - usual
  return (
    <>
      {/* Tinted from red (poor) to green (excellent) by accuracy; the word is in the tooltip. */}
      <span
        className="play-rating"
        style={{ '--hue': accuracyHue(accuracy) } as CSSProperties}
        title={`${accuracyWord(accuracy)} game: ${accuracy.toFixed(1)}% accuracy, played like ~${estimateGameRating(accuracy)}`}
      >
        {accuracy.toFixed(1)}% <span className="muted">~{estimateGameRating(accuracy)}</span>
      </span>
      {gap >= NOTABLE_GAP && (
        <span className="trend trend-up" title={`${gap.toFixed(1)} points above your average`}>
          {' '}▲
        </span>
      )}
      {gap <= -NOTABLE_GAP && (
        <span className="trend trend-down" title={`${(-gap).toFixed(1)} points below your average`}>
          {' '}▼
        </span>
      )}
    </>
  )
}

/** A teal "!!" for games where the player made a brilliant move (with the count when more than one). */
function BrilliantBadge({ count }: { count: number }) {
  if (count === 0) return null
  const label = `${count} brilliant move${count > 1 ? 's' : ''}`
  return (
    <span className="brilliant-badge" title={label} aria-label={label}>
      !!{count > 1 && <span className="brilliant-count">×{count}</span>}
    </span>
  )
}

/** "· 25 games · average accuracy 68.2%" for a section header. */
function groupSummary(games: Game[], accuracies: ReadonlyMap<string, GameAccuracy>): string {
  const scores = games.map((g) => accuracies.get(g.id)?.mine).filter((a): a is number => a != null)
  const average = scores.length ? ` · average accuracy ${(scores.reduce((s, a) => s + a, 0) / scores.length).toFixed(1)}%` : ''
  return `· ${games.length} game${games.length === 1 ? '' : 's'}${average}`
}
