import { classifyLoss, formatScore, winProbability } from '../analysis/classify'
import { uciToSan } from '../chess/positions'
import { formatLine, type VariationMove } from '../chess/variation'
import type { PositionEval, Score } from '../engine/types'
import type { Color } from '../types'

interface Props {
  variation: VariationMove[]
  /** Where the line starts, e.g. "after 18. Kb1??". */
  startLabel: string
  /** The game's evaluation of the starting position, to compare the line against. */
  gameScore: Score
  /** The engine's evaluation of the line's last position; null while it's thinking. */
  evaluation: PositionEval | null
  error: string | null
  myColor: Color
  onExit: () => void
}

/** The player's own line: where it leads compared with the game, and what Stockfish would play next. */
export function ExplorerCard({ variation, startLabel, gameScore, evaluation, error, myColor, onExit }: Props) {
  const mine = (score: Score) => {
    const white = winProbability(score)
    return Math.round((myColor === 'white' ? white : 1 - white) * 100)
  }
  const game = mine(gameScore)
  const line = evaluation ? mine(evaluation.score) : null
  const fen = variation.at(-1)!.fen
  const reply = evaluation?.bestMove ? uciToSan(fen, evaluation.bestMove) : null
  const over = evaluation && !evaluation.bestMove

  return (
    <div className="move-card explorer-card" aria-live="polite">
      <div className="move-card-head">
        <strong>Your line</strong>
        <span className="muted">from {startLabel}</span>
        <button type="button" className="link-button explorer-exit" onClick={onExit}>
          Back to game
        </button>
      </div>
      <p className="explorer-line">{formatLine(variation)}</p>

      {error ? (
        <p className="error">The engine couldn’t evaluate this position: {error}</p>
      ) : line === null ? (
        <p className="muted explorer-thinking">Stockfish is thinking…</p>
      ) : (
        <>
          {/* Your winning chances with this line, against the game at the same starting point. */}
          <div
            className="chance-bar"
            role="img"
            aria-label={`Your winning chances: ${game}% in the game, ${line}% with this line`}
          >
            <div className="chance-kept" style={{ width: `${Math.min(game, line)}%` }} />
            {line < game && (
              <div
                className={`chance-lost chance-lost-${classifyLoss((game - line) / 100)}`}
                style={{ width: `${game - line}%` }}
              />
            )}
            {line > game && <div className="chance-gained" style={{ width: `${line - game}%` }} />}
          </div>
          <div className="chance-labels muted">
            <span>Your winning chances</span>
            <span>
              game {game}% → your line {line}%
            </span>
          </div>
          <div className="move-card-foot">
            <span className="muted">eval {formatScore(evaluation!.score)}</span>
            <span>
              {over
                ? 'Game over in this position'
                : reply && (
                    <>
                      Stockfish would play <strong>{reply}</strong> (green arrow)
                    </>
                  )}
            </span>
          </div>
        </>
      )}
    </div>
  )
}
