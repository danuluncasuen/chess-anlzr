import { useLayoutEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { formatScore, moveLabel, winProbability, type MoveAnalysis } from '../analysis/classify'
import type { Color } from '../types'

const HEIGHT = 200
const M = { top: 8, right: 8, bottom: 22, left: 40 }
/** Room a phase label needs to the right of its line ("middlegame" at 11px, plus padding). */
const PHASE_LABEL_WIDTH = 72
/** Must match .graph-tooltip's max-width in index.css. */
const TOOLTIP_MAX_WIDTH = 240
const ERROR_CLASSES = new Set(['inaccuracy', 'mistake', 'blunder'])

interface Props {
  moves: MoveAnalysis[]
  myColor: Color
  /** Selected position index (0 = start, i = after ply i). */
  selected: number | null
  onSelect: (index: number) => void
}

/** The player's winning chances after every move, with their errors marked. */
export function EvalGraph({ moves, myColor, selected, onSelect }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const width = useWidth(wrapRef)
  const [hover, setHover] = useState<number | null>(null)

  const mine = (whiteProb: number) => (myColor === 'white' ? whiteProb : 1 - whiteProb)
  const points = [
    mine(winProbability(moves[0]!.evalBefore)),
    ...moves.map((m) => mine(winProbability(m.evalAfter))),
  ]
  const n = points.length - 1
  const innerW = Math.max(0, width - M.left - M.right)
  const innerH = HEIGHT - M.top - M.bottom
  const x = (i: number) => M.left + (n === 0 ? 0 : (i / n) * innerW)
  const y = (p: number) => M.top + (1 - p) * innerH

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p)}`).join('')
  const area = `${line}L${x(n)},${y(0)}L${x(0)},${y(0)}Z`
  const errors = moves.filter((m) => m.color === myColor && ERROR_CLASSES.has(m.class))
  const moveTicks = xTicks(moves, innerW)
  // Where each phase starts: the position before its first move.
  const phaseStarts = moves
    .filter((m, i) => i === 0 || m.phase !== moves[i - 1]!.phase)
    .map((m) => ({ index: m.ply - 1, phase: m.phase }))

  const indexAt = (e: MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const i = Math.round(((e.clientX - rect.left - M.left) / innerW) * n)
    return Math.min(n, Math.max(0, i))
  }

  const onKeyDown = (e: KeyboardEvent) => {
    const current = selected ?? 0
    const next =
      e.key === 'ArrowRight' ? current + 1
      : e.key === 'ArrowLeft' ? current - 1
      : e.key === 'Home' ? 0
      : e.key === 'End' ? n
      : null
    if (next === null) return
    e.preventDefault()
    onSelect(Math.min(n, Math.max(0, next)))
  }

  const active = hover ?? selected
  // The tooltip is centered on the point but kept inside the graph (it is at most TOOLTIP_MAX_WIDTH wide).
  const half = Math.min(TOOLTIP_MAX_WIDTH, width) / 2
  const tooltipLeft = active === null ? 0 : Math.min(Math.max(x(active), half), width - half)

  return (
    <div className="eval-graph" ref={wrapRef}>
      {width > 0 && (
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label="Your winning chances after each move. Use the arrow keys to step through moves."
          tabIndex={0}
          onKeyDown={onKeyDown}
          onPointerMove={(e) => setHover(indexAt(e))}
          onPointerLeave={() => setHover(null)}
          onClick={(e) => onSelect(indexAt(e))}
        >
          {[0, 0.25, 0.5, 0.75, 1].map((p) => (
            <g key={p}>
              <line
                className={p === 0.5 ? 'midline' : 'gridline'}
                x1={M.left}
                x2={M.left + innerW}
                y1={y(p)}
                y2={y(p)}
              />
              {p % 0.5 === 0 && (
                <text className="axis-label" x={M.left - 6} y={y(p)} dy="0.32em" textAnchor="end">
                  {p * 100}%
                </text>
              )}
            </g>
          ))}
          {moveTicks.map((t) => (
            <text key={t.index} className="axis-label" x={x(t.index)} y={HEIGHT - 6} textAnchor="middle">
              {t.label}
            </text>
          ))}

          {phaseStarts.map((p) => {
            // Labels too close to the right edge (narrow screens) go left of their line instead.
            const flip = x(p.index) + PHASE_LABEL_WIDTH > M.left + innerW
            return (
              <g key={p.phase} className="phase-mark">
                {p.index > 0 && <line x1={x(p.index)} x2={x(p.index)} y1={M.top} y2={M.top + innerH} />}
                <text
                  x={x(p.index) + (flip ? -4 : 4)}
                  y={M.top + innerH - 6}
                  textAnchor={flip ? 'end' : 'start'}
                >
                  {p.phase}
                </text>
              </g>
            )
          })}

          <path className="area" d={area} />
          <path className="line" d={line} />

          {active !== null && (
            <g className="crosshair">
              <line x1={x(active)} x2={x(active)} y1={M.top} y2={M.top + innerH} />
              <circle cx={x(active)} cy={y(points[active]!)} r={4} />
            </g>
          )}

          {errors.map((m) => (
            <circle
              key={m.ply}
              className={`marker marker-${m.class}`}
              cx={x(m.ply)}
              cy={y(points[m.ply]!)}
              r={m.ply === selected ? 7 : 5}
            />
          ))}
        </svg>
      )}

      {active !== null && (
        <div
          className="graph-tooltip"
          // Sit at the top of the plot, or the bottom when the line is up there.
          style={points[active]! > 0.6 ? { left: tooltipLeft, bottom: M.bottom + 4 } : { left: tooltipLeft, top: M.top + 4 }}
          aria-hidden="true"
        >
          <strong>{Math.round(points[active]! * 100)}%</strong>{' '}
          <span className="muted">your chances</span>
          <div>{active === 0 ? 'Start' : describeMove(moves[active - 1]!)}</div>
        </div>
      )}
    </div>
  )
}

function describeMove(m: MoveAnalysis): string {
  const parts = [moveLabel(m), formatScore(m.evalAfter)]
  if (ERROR_CLASSES.has(m.class)) parts.push(m.class)
  if (m.class !== 'best' && m.bestMoveSan) parts.push(`best ${m.bestMoveSan}`)
  return parts.join(' · ')
}

/** Move-number labels along the x axis, spaced so they don't collide. */
function xTicks(moves: MoveAnalysis[], innerW: number) {
  const lastMove = moves.at(-1)?.moveNumber ?? 1
  const maxTicks = Math.max(2, Math.floor(innerW / 50))
  const step = [1, 2, 5, 10, 20, 50].find((s) => lastMove / s <= maxTicks) ?? 100
  return moves
    .filter((m) => m.color === 'white' && m.moveNumber % step === 0)
    .map((m) => ({ index: m.ply - 1, label: String(m.moveNumber) }))
}

function useWidth(ref: React.RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry!.contentRect.width)))
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])
  return width
}
