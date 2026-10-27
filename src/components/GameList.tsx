import type { QueueState } from '../analysis/queue'
import { estimateGameRating, expectedAccuracy } from '../analysis/rating'
import type { GameAccuracy } from '../analysis/summary'
import type { Game } from '../types'

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

interface Props {
  games: Game[]
  analysis: QueueState
  accuracies: ReadonlyMap<string, GameAccuracy>
  /** The player's average accuracy, which per-game rating estimates start from. */
  usualAccuracy: number | null
  onOpen: (gameId: string) => void
}

export function GameList({ games, analysis, accuracies, usualAccuracy, onOpen }: Props) {
  if (games.length === 0) return <p>No standard games found in the last few months.</p>

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
        <tbody>
          {games.map((g) => {
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
                <td className={`result result-${g.result}`}>{g.result}</td>
                <td className="opening" title={g.opening ?? undefined}>
                  {g.opening ?? '—'}
                </td>
                <td className="accuracy">
                  {accuracyCell(accuracies.get(g.id)?.mine ?? null, usualAccuracy ?? expectedAccuracy(g.myRating))}
                </td>
                <td className="status-cell">{analysisStatus(g.id, analysis, onOpen)}</td>
              </tr>
            )
          })}
        </tbody>
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

function accuracyCell(accuracy: number | null, usual: number) {
  if (accuracy === null) return <span className="muted">—</span>
  const gap = accuracy - usual
  return (
    <>
      {accuracy.toFixed(1)}% <span className="muted">~{estimateGameRating(accuracy, usual)}</span>
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
