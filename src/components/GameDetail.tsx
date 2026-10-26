import { useEffect, useState } from 'react'
import {
  CLASS_SYMBOL,
  classifyGame,
  formatScore,
  moveLabel,
  type MoveAnalysis,
  type MoveClass,
} from '../analysis/classify'
import { db } from '../db/db'
import type { Game } from '../types'
import { EvalGraph } from './EvalGraph'

const MAX_MISTAKES = 10
const ERROR_CLASSES: MoveClass[] = ['inaccuracy', 'mistake', 'blunder']
const CLASS_LABEL: Record<MoveClass, string> = {
  best: 'Best',
  ok: 'OK',
  inaccuracy: 'Inaccuracy',
  mistake: 'Mistake',
  blunder: 'Blunder',
}

interface Props {
  game: Game
  /** Re-read the analysis when this flips to true. */
  analyzed: boolean
  onBack: () => void
}

export function GameDetail({ game, analyzed, onBack }: Props) {
  const [moves, setMoves] = useState<MoveAnalysis[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    db.analyses
      .get(game.id)
      .then((analysis) => {
        if (cancelled) return
        setMoves(analysis ? classifyGame(game.pgn, analysis) : null)
        setError(null)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [game, analyzed])

  const opponentColor = game.myColor === 'white' ? 'black' : 'white'
  const myErrors = (moves ?? [])
    .filter((m) => m.color === game.myColor && ERROR_CLASSES.includes(m.class))
    .sort((a, b) => b.winProbLoss - a.winProbLoss)
    .slice(0, MAX_MISTAKES)
  const selectedMove = selected ? moves?.[selected - 1] : undefined

  return (
    <section className="game-detail">
      <button type="button" className="link-button" onClick={onBack}>
        ← All games
      </button>
      <h2>
        You ({game.myColor}, {game.myRating}) vs {game.opponentName} ({game.opponentRating}){' '}
        <span className={`result-${game.result}`}>{game.result}</span>
      </h2>
      <p className="muted">
        {game.timeClass} {game.timeControl}
        {game.opening && ` · ${game.opening}`} ·{' '}
        <a href={game.url} target="_blank" rel="noreferrer">
          open on chess.com
        </a>
      </p>

      {error && <p className="error">{error}</p>}
      {!moves && !error && <p className="muted">This game hasn’t been analyzed yet.</p>}
      {moves && moves.length === 0 && <p className="muted">No moves were played.</p>}

      {moves && moves.length > 0 && (
        <>
          <ErrorCounts moves={moves} myColor={game.myColor} opponentColor={opponentColor} />

          <EvalGraph moves={moves} myColor={game.myColor} selected={selected} onSelect={setSelected} />
          <p className="selected-move" aria-live="polite">
            {selectedMove ? describeSelected(selectedMove, game.myColor) : 'Click the graph or a mistake below to inspect a move.'}
          </p>

          <h3>Your biggest mistakes</h3>
          {myErrors.length === 0 ? (
            <p className="muted">No inaccuracies, mistakes or blunders. Nice game!</p>
          ) : (
            <ol className="mistakes">
              {myErrors.map((m) => (
                <li key={m.ply}>
                  <button
                    type="button"
                    className={m.ply === selected ? 'selected' : undefined}
                    onClick={() => setSelected(m.ply)}
                  >
                    <ClassBadge cls={m.class} />
                    <strong>{moveLabel(m)}</strong>
                    <span>
                      {pct(m.winProbBefore)} → {pct(m.winProbAfter)}
                    </span>
                    {m.bestMoveSan && <span className="muted">best was {m.bestMoveSan}</span>}
                    <span className="muted">
                      {m.tags.includes('rook-endgame') ? 'rook endgame' : m.phase}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          )}

          <details className="all-moves">
            <summary>All moves</summary>
            <div className="table-wrap">
              <table className="games">
                <thead>
                  <tr>
                    <th>Move</th>
                    <th>Eval after</th>
                    <th>Rating</th>
                    <th>Best move</th>
                    <th>Phase</th>
                  </tr>
                </thead>
                <tbody>
                  {moves.map((m) => (
                    <tr key={m.ply} className={m.color === game.myColor ? undefined : 'muted'}>
                      <td>{moveLabel(m)}</td>
                      <td>{formatScore(m.evalAfter)}</td>
                      <td>{ERROR_CLASSES.includes(m.class) ? <ClassBadge cls={m.class} /> : CLASS_LABEL[m.class]}</td>
                      <td>{m.class === 'best' ? '' : (m.bestMoveSan ?? '')}</td>
                      <td>{m.tags.includes('rook-endgame') ? 'rook endgame' : m.phase}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </section>
  )
}

function ErrorCounts({
  moves,
  myColor,
  opponentColor,
}: {
  moves: MoveAnalysis[]
  myColor: string
  opponentColor: string
}) {
  const row = (color: string) => {
    const own = moves.filter((m) => m.color === color)
    const acpl = own.length ? Math.round(own.reduce((s, m) => s + m.centipawnLoss, 0) / own.length) : 0
    return [...ERROR_CLASSES.map((c) => own.filter((m) => m.class === c).length), acpl]
  }
  return (
    <div className="table-wrap">
      <table className="error-counts">
        <thead>
          <tr>
            <th />
            {ERROR_CLASSES.map((c) => (
              <th key={c} title={CLASS_LABEL[c]}>
                <span className="class-badge">
                  <span className={`dot dot-${c}`} aria-hidden="true" />
                  <span className="wide-only">{CLASS_LABEL[c]}</span>
                  <span className="narrow-only">{CLASS_SYMBOL[c]}</span>
                </span>
              </th>
            ))}
            <th title="Average centipawn loss per move (lower is better)">Avg. loss</th>
          </tr>
        </thead>
        <tbody>
          {[
            ['You', myColor],
            ['Opponent', opponentColor],
          ].map(([label, color]) => (
            <tr key={label}>
              <th scope="row">{label}</th>
              {row(color!).map((v, i) => (
                <td key={i}>{v}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ClassBadge({ cls }: { cls: MoveClass }) {
  return (
    <span className="class-badge">
      <span className={`dot dot-${cls}`} aria-hidden="true" />
      {CLASS_LABEL[cls]}
    </span>
  )
}

function describeSelected(m: MoveAnalysis, myColor: string): string {
  const who = m.color === myColor ? 'You' : 'Opponent'
  const parts = [`${who}: ${moveLabel(m)} (${CLASS_LABEL[m.class].toLowerCase()})`]
  parts.push(`eval ${formatScore(m.evalBefore)} → ${formatScore(m.evalAfter)}`)
  if (m.class !== 'best' && m.bestMoveSan) parts.push(`best was ${m.bestMoveSan}`)
  return parts.join(' · ')
}

function pct(p: number): string {
  return `${Math.round(p * 100)}%`
}
