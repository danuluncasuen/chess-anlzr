import { useEffect, useState } from 'react'
import {
  CLASS_LABEL,
  CLASS_SYMBOL,
  classifyGame,
  hasBetterMove,
  formatScore,
  moveLabel,
  type MoveAnalysis,
  type MoveClass,
} from '../analysis/classify'
import { gameAccuracy } from '../analysis/accuracy'
import { estimateGameRating, expectedAccuracy } from '../analysis/rating'
import { db } from '../db/db'
import type { Game } from '../types'
import { EvalGraph } from './EvalGraph'
import { ClassBadge } from './ClassBadge'
import { GameBoard } from './GameBoard'
import { MoveCard } from './MoveCard'
import { MoveList } from './MoveList'

const MAX_MISTAKES = 10
const ERROR_CLASSES: MoveClass[] = ['inaccuracy', 'mistake', 'blunder']

interface Props {
  game: Game
  /** Re-read the analysis when this flips to true. */
  analyzed: boolean
  /** The player's average accuracy, which this game's rating estimate starts from. */
  usualAccuracy: number | null
  onBack: () => void
}

export function GameDetail({ game, analyzed, usualAccuracy, onBack }: Props) {
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
  // Which ply the "best move" view is open for; selecting another move closes it.
  const [bestShownFor, setBestShownFor] = useState<number | null>(null)
  const showBest = hasBetterMove(selectedMove) && bestShownFor === selected
  const toggleBest = () => setBestShownFor(showBest ? null : selected)

  /** Selects a move from the lists below the board, scrolling the board into view when stacked (phones). */
  function showOnBoard(ply: number) {
    setSelected(ply)
    const board = document.querySelector('.game-board')
    if (board && board.getBoundingClientRect().top < 0) board.scrollIntoView({ behavior: 'smooth' })
  }

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
          <AccuracyVerdict game={game} moves={moves} usualAccuracy={usualAccuracy} />
          <ErrorCounts moves={moves} myColor={game.myColor} opponentColor={opponentColor} />

          <div className="board-and-graph">
            <GameBoard
              moves={moves}
              selected={selected}
              onSelect={setSelected}
              orientation={game.myColor}
              showBest={showBest}
              onToggleBest={toggleBest}
            />
            <div className="graph-column">
              <EvalGraph moves={moves} myColor={game.myColor} selected={selected} onSelect={setSelected} />
              <MoveCard
                move={selectedMove}
                next={selected ? moves[selected] : undefined}
                myColor={game.myColor}
                showBest={showBest}
                onToggleBest={toggleBest}
              />
              <MoveList moves={moves} selected={selected} onSelect={setSelected} />
            </div>
          </div>

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
                    onClick={() => showOnBoard(m.ply)}
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
                    <tr
                      key={m.ply}
                      className={[m.color === game.myColor ? '' : 'muted', m.ply === selected ? 'selected' : '']
                        .join(' ')
                        .trim() || undefined}
                      onClick={() => showOnBoard(m.ply)}
                    >
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

const ONE_GAME_CAVEAT =
  'One game says little on its own, so each estimate starts from the player’s usual level ' +
  '(your average accuracy; for your opponent, the accuracy typical of their rating) ' +
  'and moves only partway toward this game.'

function AccuracyVerdict({
  game,
  moves,
  usualAccuracy,
}: {
  game: Game
  moves: MoveAnalysis[]
  usualAccuracy: number | null
}) {
  const mine = gameAccuracy(moves, game.myColor)
  const theirs = gameAccuracy(moves, game.myColor === 'white' ? 'black' : 'white')
  if (mine === null) return <p className="muted">You made no moves in this game.</p>

  const usual = usualAccuracy ?? expectedAccuracy(game.myRating)
  const myEstimate = estimateGameRating(mine, usual)
  const theirEstimate = theirs === null ? null : estimateGameRating(theirs, expectedAccuracy(game.opponentRating))
  const fmt = (a: number) => `${a.toFixed(1)}%`
  const vsUsual =
    Math.abs(mine - usual) < 3 ? 'about your usual' : mine > usual ? 'above your usual' : 'below your usual'
  let conclusion = `You played at ${fmt(mine)} accuracy (${vsUsual} ${fmt(usual)}), roughly ${myEstimate}-level play`
  if (theirs !== null) {
    const gap = mine - theirs
    conclusion +=
      Math.abs(gap) < 3
        ? `, about as accurate as your opponent (${fmt(theirs)}).`
        : gap > 0
          ? `, more accurate than your opponent (${fmt(theirs)}).`
          : `, less accurate than your opponent (${fmt(theirs)}).`
  } else {
    conclusion += '.'
  }

  return (
    <div className="verdict">
      <div className="stat-tiles" title={ONE_GAME_CAVEAT}>
        <div className="stat-tile">
          <strong>{fmt(mine)}</strong>
          <span>your accuracy · played like ~{myEstimate}</span>
        </div>
        {theirs !== null && theirEstimate !== null && (
          <div className="stat-tile">
            <strong>{fmt(theirs)}</strong>
            <span>
              opponent · played like ~{theirEstimate} (rated {game.opponentRating})
            </span>
          </div>
        )}
      </div>
      <p>
        {conclusion}{' '}
        <span className="muted" title={ONE_GAME_CAVEAT}>
          (rough: one game moves the estimate only partway from your usual level)
        </span>
      </p>
    </div>
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

function pct(p: number): string {
  return `${Math.round(p * 100)}%`
}
