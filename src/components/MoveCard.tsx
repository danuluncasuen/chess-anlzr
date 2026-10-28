import { formatScore, hasBetterMove, moveLabel, type MoveAnalysis } from '../analysis/classify'
import { explainMove } from '../analysis/explain'
import type { Color } from '../types'
import { ClassBadge } from './ClassBadge'

interface Props {
  move: MoveAnalysis | undefined
  /** The move played after it, to tell whether the punishing reply was found. */
  next: MoveAnalysis | undefined
  myColor: Color
  showBest: boolean
  onToggleBest: () => void
}

/** What happened on the selected move: its rating, the change in winning chances and the engine's choice. */
export function MoveCard({ move, next, myColor, showBest, onToggleBest }: Props) {
  if (!move) {
    return (
      <div className="move-card muted">
        Select a move in the list, on the graph or among your mistakes to see it here and on the board.
      </div>
    )
  }

  const mine = move.color === myColor
  const before = Math.round(move.winProbBefore * 100)
  const after = Math.round(move.winProbAfter * 100)
  const phase = move.tags.includes('rook-endgame') ? 'rook endgame' : move.phase
  const why = explainMove(move, next, myColor)

  return (
    <div className="move-card" aria-live="polite">
      <div className="move-card-head">
        <ClassBadge cls={move.class} />
        <strong>{moveLabel(move)}</strong>
        <span className="muted">
          {mine ? 'you' : 'opponent'} · {phase}
        </span>
      </div>

      {/* The mover's winning chances: the part kept, then what this move lost (or gained). */}
      <div
        className="chance-bar"
        role="img"
        aria-label={`${mine ? 'Your' : 'Their'} winning chances went from ${before}% to ${after}%`}
      >
        <div className="chance-kept" style={{ width: `${Math.min(before, after)}%` }} />
        {after < before && (
          <div className={`chance-lost chance-lost-${move.class}`} style={{ width: `${before - after}%` }} />
        )}
        {after > before && <div className="chance-gained" style={{ width: `${after - before}%` }} />}
      </div>
      <div className="chance-labels muted">
        <span>{mine ? 'Your' : 'Their'} winning chances</span>
        <span>
          {before}% → {after}%
        </span>
      </div>

      {why.length > 0 && <p className="move-why">{why.join(' ')}</p>}

      <div className="move-card-foot">
        <span className="muted">
          eval {formatScore(move.evalBefore)} → {formatScore(move.evalAfter)}
        </span>
        {hasBetterMove(move) ? (
          <button type="button" className="link-button" aria-pressed={showBest} onClick={onToggleBest}>
            {showBest ? 'Hide best move' : `Best was ${move.bestMoveSan ?? move.bestMoveUci}: show on board`}
          </button>
        ) : (
          <span className="muted">{move.class === 'best' ? 'Stockfish’s top choice' : ''}</span>
        )}
      </div>
    </div>
  )
}
