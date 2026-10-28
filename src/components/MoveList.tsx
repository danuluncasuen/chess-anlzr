import { useEffect, useRef, type KeyboardEvent } from 'react'
import { CLASS_SYMBOL, type MoveAnalysis } from '../analysis/classify'

interface Props {
  moves: MoveAnalysis[]
  /** Ply shown on the board; null = the starting position. */
  selected: number | null
  onSelect: (ply: number | null) => void
}

/** The game's moves in two columns (White, Black), with ?!/?/?? marks. Clicking one shows it on the board. */
export function MoveList({ moves, selected, onSelect }: Props) {
  const listRef = useRef<HTMLDivElement>(null)

  // Keep the selected move visible by scrolling the list itself (never the page): when the selection
  // changes, and when the list resizes (it shrinks as the move card above it grows).
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const reveal = () => {
      const cell = list.querySelector<HTMLElement>('[aria-current="true"]')
      if (!cell) return
      const top = cell.offsetTop
      const bottom = top + cell.offsetHeight
      if (top < list.scrollTop) list.scrollTop = top - 4
      else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight + 4
    }
    if (selected === null) list.scrollTop = 0
    else reveal()
    const observer = new ResizeObserver(reveal)
    observer.observe(list)
    return () => observer.disconnect()
  }, [selected])

  // One tab stop for the whole list; arrow keys move between moves (like the board).
  const onKeyDown = (e: KeyboardEvent) => {
    const current = selected ?? 0
    const next = {
      ArrowLeft: current - 1,
      ArrowRight: current + 1,
      ArrowUp: current - 2,
      ArrowDown: current + 2,
      Home: 0,
      End: moves.length,
    }[e.key]
    if (next === undefined) return
    e.preventDefault()
    const ply = Math.min(Math.max(next, 0), moves.length)
    onSelect(ply === 0 ? null : ply)
    listRef.current?.querySelector<HTMLElement>(`[data-ply="${ply}"]`)?.focus()
  }

  const focusPly = selected ?? moves[0]?.ply ?? 1

  return (
    <div className="move-list" ref={listRef} role="list" aria-label="Moves" onKeyDown={onKeyDown}>
      {rows(moves).map(([white, black]) => {
        const number = (white ?? black)!.moveNumber
        return (
          <div className="move-row" role="listitem" key={number}>
            <span className="move-number">{number}.</span>
            {/* "…" when the game starts with Black to move; a blank when it ends on White's move */}
            {white ? (
              <MoveCell move={white} selected={selected} focusPly={focusPly} onSelect={onSelect} />
            ) : (
              <span className="move-cell muted">…</span>
            )}
            {black && <MoveCell move={black} selected={selected} focusPly={focusPly} onSelect={onSelect} />}
          </div>
        )
      })}
    </div>
  )
}

function MoveCell({
  move,
  selected,
  focusPly,
  onSelect,
}: {
  move: MoveAnalysis
  selected: number | null
  focusPly: number
  onSelect: (ply: number) => void
}) {
  const symbol = CLASS_SYMBOL[move.class]
  return (
    <button
      type="button"
      className="move-cell"
      data-ply={move.ply}
      aria-current={move.ply === selected}
      tabIndex={move.ply === focusPly ? 0 : -1}
      onClick={() => onSelect(move.ply)}
    >
      {move.san}
      {symbol && <span className={`move-symbol symbol-${move.class}`}>{symbol}</span>}
    </button>
  )
}

/** Pairs moves into [white, black] rows by move number (a game may start with Black to move). */
function rows(moves: MoveAnalysis[]): [MoveAnalysis | undefined, MoveAnalysis | undefined][] {
  const byNumber = new Map<number, [MoveAnalysis | undefined, MoveAnalysis | undefined]>()
  for (const m of moves) {
    const row = byNumber.get(m.moveNumber) ?? [undefined, undefined]
    row[m.color === 'white' ? 0 : 1] = m
    byNumber.set(m.moveNumber, row)
  }
  return [...byNumber.values()]
}
