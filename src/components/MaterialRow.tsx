import type { PieceSymbol } from 'chess.js'
import { defaultPieces } from 'react-chessboard'
import type { Color } from '../types'

const PIECE_NAME: Record<PieceSymbol, string> = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king',
}

interface Props {
  /** The side whose captures this row shows. */
  color: Color
  label: string
  /** Pieces this side has taken, cheapest first. */
  captured: PieceSymbol[]
  /** This side's material lead in points (shown as "+3" when positive). */
  advantage: number
}

/** One side's captured pieces (as small icons, like a scoresheet margin) and its material lead. */
export function MaterialRow({ color, label, captured, advantage }: Props) {
  const victim = color === 'white' ? 'b' : 'w'
  const counts = captured.reduce<Partial<Record<PieceSymbol, number>>>(
    (c, p) => ({ ...c, [p]: (c[p] ?? 0) + 1 }),
    {},
  )
  const summary = Object.entries(counts)
    .map(([p, n]) => `${n} ${PIECE_NAME[p as PieceSymbol]}${n > 1 ? 's' : ''}`)
    .join(', ')

  return (
    <div
      className="material-row"
      aria-label={`${label}: ${summary ? `captured ${summary}` : 'no captures'}${advantage > 0 ? `, ahead by ${advantage}` : ''}`}
    >
      <span className="material-label">{label}</span>
      {captured.length > 0 && (
        <span className="captured" aria-hidden="true">
          {captured.map((p, i) => (
            // Same pieces overlap a little, a new piece type starts with a small gap.
            <span key={i} className={i > 0 && captured[i - 1] !== p ? 'captured-piece new-type' : 'captured-piece'}>
              {defaultPieces[`${victim}${p.toUpperCase()}`]?.()}
            </span>
          ))}
        </span>
      )}
      {advantage > 0 && <span className="material-advantage">+{advantage}</span>}
    </div>
  )
}
