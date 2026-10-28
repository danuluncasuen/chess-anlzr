import { useState, type CSSProperties, type KeyboardEvent } from 'react'
import { Chessboard } from 'react-chessboard'
import { hasBetterMove, moveLabel, type MoveAnalysis, type MoveClass } from '../analysis/classify'
import { formatLine, legalTargets, shownGameFen, turnOf, type VariationMove } from '../chess/variation'
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
/** The last move of the player's own line, and the piece they've picked up (tap-to-move). */
const VARIATION_TINT = 'rgba(80, 150, 255, 0.45)'
const PICKED_TINT = 'rgba(80, 150, 255, 0.6)'
/** A dot on each square the picked-up piece can move to. */
const TARGET_STYLE: CSSProperties = {
  backgroundImage: 'radial-gradient(circle, rgba(33, 33, 33, 0.35) 20%, transparent 22%)',
}
const ARROW_NAME: Partial<Record<MoveClass, string>> = { inaccuracy: 'amber', mistake: 'orange', blunder: 'red' }

interface Props {
  moves: MoveAnalysis[]
  /** Ply shown on the board (the position after that move); null = the starting position. */
  selected: number | null
  onSelect: (ply: number | null) => void
  orientation: Color
  /** Show the position before the selected move, with arrows for it and the engine's choice. */
  showBest: boolean
  onToggleBest: () => void
  /** Moves the player is trying out from the shown game position; the board shows where they lead. */
  variation: VariationMove[]
  /** The engine's move at the end of the variation (UCI), drawn as an arrow. */
  variationBest: string | null
  /** Plays a move from the position on the board; returns false if it isn't legal. */
  onTry: (from: string, to: string) => boolean
  onUndo: () => void
  onExit: () => void
}

/**
 * The position after the selected move, with step controls and the engine's better move on
 * request. Pieces can be dragged (or tapped, then a square tapped) to try other moves.
 */
export function GameBoard({
  moves,
  selected,
  onSelect,
  orientation,
  showBest: showBestProp,
  onToggleBest,
  variation,
  variationBest,
  onTry,
  onUndo,
  onExit,
}: Props) {
  const move = selected ? moves[selected - 1] : undefined
  const canShowBest = hasBetterMove(move)
  const showBest = canShowBest && showBestProp
  const exploring = variation.length > 0
  const fen = exploring ? variation.at(-1)!.fen : shownGameFen(moves, selected, showBest)
  const turn = turnOf(fen)[0] // "w" / "b", as in piece codes like "wN"

  // Tap-to-move: the square of the piece picked up, tied to the position it was picked in.
  const [pick, setPick] = useState<{ fen: string; square: string } | null>(null)
  const picked = pick?.fen === fen ? pick.square : null
  const targets = picked ? legalTargets(fen, picked) : []
  const play = (from: string, to: string) => {
    setPick(null)
    return onTry(from, to)
  }

  const last = moves.length
  const step = (ply: number) => onSelect(ply <= 0 ? null : Math.min(ply, last))
  const current = selected ?? 0

  const onKeyDown = (e: KeyboardEvent) => {
    if (exploring) {
      if (e.key === 'ArrowLeft' || e.key === 'Escape') {
        e.preventDefault()
        if (e.key === 'Escape') onExit()
        else onUndo()
      }
      return
    }
    const next = { ArrowLeft: current - 1, ArrowRight: current + 1, Home: 0, End: last }[e.key]
    if (next === undefined) return
    e.preventDefault()
    step(next)
  }

  const tint = (move && CLASS_COLOR[move.class]) ?? LAST_MOVE_TINT
  const lastTried = variation.at(-1)
  const squareStyles: Record<string, CSSProperties> = lastTried
    ? {
        [lastTried.uci.slice(0, 2)]: { backgroundColor: VARIATION_TINT },
        [lastTried.uci.slice(2, 4)]: { backgroundColor: VARIATION_TINT },
      }
    : move && !showBest
      ? { [move.uci.slice(0, 2)]: { backgroundColor: tint }, [move.uci.slice(2, 4)]: { backgroundColor: tint } }
      : {}
  if (picked) squareStyles[picked] = { backgroundColor: PICKED_TINT }
  for (const square of targets) squareStyles[square] = { ...squareStyles[square], ...TARGET_STYLE }

  const arrows = exploring
    ? variationBest
      ? [{ startSquare: variationBest.slice(0, 2), endSquare: variationBest.slice(2, 4), color: BEST_ARROW }]
      : []
    : showBest
      ? [
          { startSquare: move!.uci.slice(0, 2), endSquare: move!.uci.slice(2, 4), color: tint },
          { startSquare: move!.bestMoveUci!.slice(0, 2), endSquare: move!.bestMoveUci!.slice(2, 4), color: BEST_ARROW },
        ]
      : []

  const options = {
    id: 'game-board',
    position: fen,
    boardOrientation: orientation,
    allowDragging: true,
    allowDrawingArrows: false,
    animationDurationInMs: 150,
    lightSquareStyle: LIGHT_SQUARE,
    darkSquareStyle: DARK_SQUARE,
    squareStyles,
    arrows,
    canDragPiece: ({ piece }: { piece: { pieceType: string } }) => piece.pieceType[0] === turn,
    onPieceDrop: ({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string | null }) =>
      targetSquare !== null && play(sourceSquare, targetSquare),
    onSquareClick: ({ piece, square }: { piece: { pieceType: string } | null; square: string }) => {
      if (picked && targets.includes(square)) play(picked, square)
      else if (piece && piece.pieceType[0] === turn && square !== picked) setPick({ fen, square })
      else setPick(null)
    },
  }

  return (
    <div className="game-board">
      <div
        className="board-frame"
        tabIndex={0}
        role="group"
        aria-label="Game board. Arrow keys step through the moves. Drag a piece, or tap it and then a square, to try another move."
        onKeyDown={onKeyDown}
      >
        <Chessboard options={options} />
      </div>

      {exploring ? (
        <div className="board-controls">
          <button type="button" onClick={onUndo} aria-label="Take back your last move">
            ◀ Undo
          </button>
          <button type="button" className="best-toggle active" onClick={onExit}>
            Back to game
          </button>
        </div>
      ) : (
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
          {move && canShowBest && (
            <button
              type="button"
              className={showBest ? 'best-toggle active' : 'best-toggle'}
              aria-pressed={showBest}
              onClick={onToggleBest}
            >
              {showBest ? 'Hide best move' : `Best: ${move.bestMoveSan ?? move.bestMoveUci}`}
            </button>
          )}
        </div>
      )}

      <p className="board-caption muted" aria-live="polite">
        {exploring
          ? `Your line: ${formatLine(variation)}`
          : !move
            ? 'Starting position · move a piece to try your own line'
            : showBest
              ? `Before ${moveLabel(move)}: the move played (${ARROW_NAME[move.class] ?? 'yellow'}) vs Stockfish’s ${move.bestMoveSan ?? 'choice'} (green)`
              : `After ${moveLabel(move)} · move a piece to try your own line`}
      </p>
    </div>
  )
}
