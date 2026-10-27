import { useState, type CSSProperties, type KeyboardEvent } from 'react'
import { Chessboard } from 'react-chessboard'
import { moveLabel, type MoveAnalysis, type MoveClass } from '../analysis/classify'
import type { Color } from '../types'

// Board colors match the app icon; they stay the same in both themes, like a real board.
const LIGHT_SQUARE: CSSProperties = { backgroundColor: '#ffe2bd' }
const DARK_SQUARE: CSSProperties = { backgroundColor: '#8b6f4e' }
const LAST_MOVE_TINT = 'rgba(255, 214, 10, 0.45)'
/** Square tint and arrow color for the played move, by its rating (same hues as the dots). */
const CLASS_COLOR: Partial<Record<MoveClass, string>> = {
  inaccuracy: 'rgba(250, 178, 25, 0.75)',
  mistake: 'rgba(236, 131, 90, 0.8)',
  blunder: 'rgba(208, 59, 59, 0.8)',
}
const BEST_ARROW = 'rgba(46, 160, 67, 0.9)'
const ARROW_NAME: Partial<Record<MoveClass, string>> = { inaccuracy: 'amber', mistake: 'orange', blunder: 'red' }

interface Props {
  moves: MoveAnalysis[]
  /** Ply shown on the board (the position after that move); null = the starting position. */
  selected: number | null
  onSelect: (ply: number | null) => void
  orientation: Color
}

/** The position after the selected move, with step controls and the engine's better move on request. */
export function GameBoard({ moves, selected, onSelect, orientation }: Props) {
  const move = selected ? moves[selected - 1] : undefined
  // Which ply the "best move" view is open for; selecting another move closes it.
  const [bestShownFor, setBestShownFor] = useState<number | null>(null)
  const canShowBest = !!move && move.class !== 'best' && !!move.bestMoveUci
  const showBest = canShowBest && bestShownFor === selected

  const last = moves.length
  const step = (ply: number) => onSelect(ply <= 0 ? null : Math.min(ply, last))
  const current = selected ?? 0

  const onKeyDown = (e: KeyboardEvent) => {
    const next = { ArrowLeft: current - 1, ArrowRight: current + 1, Home: 0, End: last }[e.key]
    if (next === undefined) return
    e.preventDefault()
    step(next)
  }

  const tint = (move && CLASS_COLOR[move.class]) ?? LAST_MOVE_TINT
  const options = {
    id: 'game-board',
    position: showBest ? move!.fenBefore : (move?.fenAfter ?? moves[0]?.fenBefore ?? 'start'),
    boardOrientation: orientation,
    allowDragging: false,
    allowDrawingArrows: false,
    animationDurationInMs: 150,
    lightSquareStyle: LIGHT_SQUARE,
    darkSquareStyle: DARK_SQUARE,
    squareStyles:
      move && !showBest
        ? { [move.uci.slice(0, 2)]: { backgroundColor: tint }, [move.uci.slice(2, 4)]: { backgroundColor: tint } }
        : {},
    arrows: showBest
      ? [
          { startSquare: move!.uci.slice(0, 2), endSquare: move!.uci.slice(2, 4), color: tint },
          { startSquare: move!.bestMoveUci!.slice(0, 2), endSquare: move!.bestMoveUci!.slice(2, 4), color: BEST_ARROW },
        ]
      : [],
  }

  return (
    <div className="game-board">
      <div
        className="board-frame"
        tabIndex={0}
        role="group"
        aria-label="Game board. Left and right arrow keys step through the moves."
        onKeyDown={onKeyDown}
      >
        <Chessboard options={options} />
      </div>

      <div className="board-controls">
        <button type="button" onClick={() => step(0)} disabled={current === 0} aria-label="Start position">
          ⏮
        </button>
        <button type="button" onClick={() => step(current - 1)} disabled={current === 0} aria-label="Previous move">
          ◀
        </button>
        <button type="button" onClick={() => step(current + 1)} disabled={current === last} aria-label="Next move">
          ▶
        </button>
        <button type="button" onClick={() => step(last)} disabled={current === last} aria-label="Last move">
          ⏭
        </button>
        {canShowBest && (
          <button
            type="button"
            className={showBest ? 'best-toggle active' : 'best-toggle'}
            aria-pressed={showBest}
            onClick={() => setBestShownFor(showBest ? null : selected)}
          >
            {showBest ? 'Hide best move' : `Best: ${move.bestMoveSan ?? move.bestMoveUci}`}
          </button>
        )}
      </div>

      <p className="board-caption muted" aria-live="polite">
        {!move
          ? 'Starting position'
          : showBest
            ? `Before ${moveLabel(move)}: the move played (${ARROW_NAME[move.class] ?? 'yellow'}) vs Stockfish’s ${move.bestMoveSan ?? 'choice'} (green)`
            : `After ${moveLabel(move)}`}
      </p>
    </div>
  )
}
