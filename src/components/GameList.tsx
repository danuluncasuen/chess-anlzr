import type { QueueState } from '../analysis/queue'
import type { Game } from '../types'

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

interface Props {
  games: Game[]
  analysis: QueueState
  onOpen: (gameId: string) => void
}

export function GameList({ games, analysis, onOpen }: Props) {
  if (games.length === 0) return <p>No standard games found in the last few months.</p>

  return (
    <div className="table-wrap">
      <table className="games">
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Color</th>
            <th>Opponent</th>
            <th>Result</th>
            <th>Opening</th>
            <th>Analysis</th>
          </tr>
        </thead>
        <tbody>
          {games.map((g) => (
            <tr key={g.id}>
              <td>
                <a href={g.url} target="_blank" rel="noreferrer">
                  {dateFormat.format(g.endTime)}
                </a>
              </td>
              <td>
                {g.timeClass} <span className="muted">{g.timeControl}</span>
              </td>
              <td>{g.myColor}</td>
              <td>
                {g.opponentName} <span className="muted">({g.opponentRating})</span>
              </td>
              <td className={`result-${g.result}`}>{g.result}</td>
              <td className="opening">{g.opening ?? '—'}</td>
              <td>{analysisStatus(g.id, analysis, onOpen)}</td>
            </tr>
          ))}
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
