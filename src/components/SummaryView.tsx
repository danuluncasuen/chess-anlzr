import { insights, type GroupStats, type Summary } from '../analysis/summary'

interface Props {
  summary: Summary
  totalGames: number
}

/** Where the player loses points, across their analyzed games. */
export function SummaryView({ summary, totalGames }: Props) {
  const { overall } = summary
  if (overall.moves === 0) return null

  const findings = insights(summary)
  const perGame = (n: number) => (n / overall.games).toFixed(1)
  const endgameIndex = summary.byPhase.findIndex((g) => g.key === 'endgame')
  // Rook endgames are part of the endgame, so they sit right under it.
  const phaseRows =
    endgameIndex >= 0 && summary.rookEndgames.moves > 0
      ? [
          ...summary.byPhase.slice(0, endgameIndex + 1),
          { ...summary.rookEndgames, sub: true },
          ...summary.byPhase.slice(endgameIndex + 1),
        ]
      : summary.byPhase

  return (
    <section className="summary">
      <h2>Where you lose points</h2>
      <p className="muted">
        Based on {overall.games} of {totalGames} games ({overall.moves} of your moves). A point is one
        percentage point of winning chances; in the tables, the thin line marks your average.
      </p>

      <div className="stat-tiles">
        <StatTile value={overall.avgLoss.toFixed(1)} label="points lost per move" />
        <StatTile value={perGame(overall.blunders)} label="blunders per game" />
        <StatTile value={perGame(overall.mistakes)} label="mistakes per game" />
        <StatTile value={perGame(overall.inaccuracies)} label="inaccuracies per game" />
      </div>

      {findings.length > 0 && (
        <ul className="insights">
          {findings.map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ul>
      )}

      <GroupTable title="By phase" rows={phaseRows} overall={overall} />
      <GroupTable title="By color" rows={summary.byColor} overall={overall} />
      <GroupTable title="By time control" rows={summary.byTimeClass} overall={overall} />
    </section>
  )
}

function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <div className="stat-tile">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function GroupTable({
  title,
  rows,
  overall,
}: {
  title: string
  rows: (GroupStats & { sub?: boolean })[]
  overall: GroupStats
}) {
  if (rows.length === 0) return null
  // Scale bars to the largest value in the table (or the average, if that's larger).
  const max = Math.max(overall.avgLoss, ...rows.map((r) => r.avgLoss)) || 1
  const pct = (v: number) => `${(v / max) * 100}%`

  return (
    <div className="table-wrap">
      <table className="group-table">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col" />
            <th scope="col" className="num wide-only">
              Games
            </th>
            <th scope="col" className="num wide-only">
              Moves
            </th>
            <th scope="col" className="bar-col">
              Points lost per move
            </th>
            <th scope="col" className="num" title="Share of all the points you lost">
              Share
            </th>
            <th scope="col" className="num" title="Blunders / mistakes / inaccuracies">
              ?? / ? / ?!
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.key}
              className={r.sub ? 'sub-row' : undefined}
              title={`${r.label}: ${r.avgLoss.toFixed(1)} points lost per move over ${r.moves} moves in ${r.games} games (average ${overall.avgLoss.toFixed(1)})`}
            >
              <th scope="row">{r.sub ? `↳ ${r.label}` : r.label}</th>
              <td className="num wide-only">{r.games}</td>
              <td className="num wide-only">{r.moves}</td>
              <td className="bar-col">
                <div className="bar-cell">
                  <div className="bar-track">
                    <div className="bar" style={{ width: pct(r.avgLoss) }} />
                    <div className="bar-avg" style={{ left: pct(overall.avgLoss) }} />
                  </div>
                  <span className="num">{r.avgLoss.toFixed(1)}</span>
                </div>
              </td>
              <td className="num">{Math.round(r.share * 100)}%</td>
              <td className="num">
                {r.blunders} / {r.mistakes} / {r.inaccuracies}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
