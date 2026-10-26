// Parsing for the bits of the UCI protocol we use: https://backscattering.de/chess/uci/
import type { Color } from '../types'
import type { Score } from './types'

/** A score as the engine reports it: from the point of view of the side to move. */
export type RawScore = { cp: number } | { mate: number }

export interface InfoLine {
  depth: number
  multipv: number
  score: RawScore
  /** True for "lowerbound"/"upperbound" scores, which are not exact. */
  bound: boolean
}

/** Parses an "info ... score ..." line; returns null for any other line. */
export function parseInfo(line: string): InfoLine | null {
  const t = line.trim().split(/\s+/)
  if (t[0] !== 'info') return null

  let depth: number | null = null
  let multipv = 1
  let score: RawScore | null = null
  let bound = false
  for (let i = 1; i < t.length; i++) {
    switch (t[i]) {
      case 'depth':
        depth = Number(t[++i])
        break
      case 'multipv':
        multipv = Number(t[++i])
        break
      case 'score': {
        const kind = t[++i]
        const value = Number(t[++i])
        if (kind === 'cp') score = { cp: value }
        else if (kind === 'mate') score = { mate: value }
        break
      }
      case 'lowerbound':
      case 'upperbound':
        bound = true
        break
      case 'pv':
      case 'string':
        // Everything after these is moves or free text.
        i = t.length
        break
    }
  }
  if (depth === null || score === null) return null
  return { depth, multipv, score, bound }
}

/** Parses "bestmove e2e4 [ponder ...]". Returns undefined if not a bestmove line, null for "(none)". */
export function parseBestMove(line: string): string | null | undefined {
  const t = line.trim().split(/\s+/)
  if (t[0] !== 'bestmove' || !t[1]) return undefined
  return t[1] === '(none)' ? null : t[1]
}

/** The side to move, from the second FEN field. */
export function sideToMove(fen: string): Color {
  return fen.split(' ')[1] === 'b' ? 'black' : 'white'
}

/** Converts an engine score (side-to-move view) to White's view. */
export function toWhitePov(raw: RawScore, toMove: Color): Score {
  const opponent: Color = toMove === 'white' ? 'black' : 'white'
  if ('cp' in raw) return { type: 'cp', value: toMove === 'white' ? raw.cp : -raw.cp || 0 } // `|| 0` avoids -0
  // mate > 0: side to move mates. mate <= 0: side to move gets mated (0 = already is).
  return raw.mate > 0
    ? { type: 'mate', moves: raw.mate, winner: toMove }
    : { type: 'mate', moves: Math.abs(raw.mate), winner: opponent }
}
