import type { Game } from '../types'

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

export function GameList({ games }: { games: Game[] }) {
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
