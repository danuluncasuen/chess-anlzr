import type { Color, Game, GameResult, TimeClass } from '../../types'
import type { RawGame } from './api'

const TIME_CLASSES: readonly TimeClass[] = ['bullet', 'blitz', 'rapid', 'daily']

/**
 * Converts a chess.com game into our Game shape, from `username`'s point of view.
 * Returns null for games we can't analyze (variants, missing PGN, user not a player).
 */
export function normalizeGame(raw: RawGame, username: string): Game | null {
  if (raw.rules !== 'chess' || !raw.pgn) return null
  if (!TIME_CLASSES.includes(raw.time_class as TimeClass)) return null

  const user = username.toLowerCase()
  let myColor: Color
  if (raw.white.username.toLowerCase() === user) myColor = 'white'
  else if (raw.black.username.toLowerCase() === user) myColor = 'black'
  else return null

  const me = raw[myColor]
  const opponent = raw[myColor === 'white' ? 'black' : 'white']

  return {
    id: `chesscom:${raw.uuid}`,
    username: user,
    source: 'chesscom',
    url: raw.url,
    endTime: raw.end_time * 1000,
    timeClass: raw.time_class as TimeClass,
    timeControl: raw.time_control,
    myColor,
    result: toResult(me.result, opponent.result),
    myRating: me.rating,
    opponentName: opponent.username,
    opponentRating: opponent.rating,
    opening: openingFromEcoUrl(raw.eco),
    pgn: raw.pgn,
  }
}

// chess.com gives each side a code ("win", "checkmated", "timeout", "agreed", ...).
// Only "win" is a win, so anything else is a loss if the opponent won, otherwise a draw.
function toResult(mine: string, theirs: string): GameResult {
  if (mine === 'win') return 'win'
  if (theirs === 'win') return 'loss'
  return 'draw'
}

/** "https://www.chess.com/openings/Center-Game-Accepted-Normal-Variation" -> "Center Game Accepted Normal Variation" */
export function openingFromEcoUrl(ecoUrl: string | undefined): string | null {
  if (!ecoUrl) return null
  const slug = ecoUrl.split('/openings/')[1]
  if (!slug) return null
  return decodeURIComponent(slug).replace(/-/g, ' ').trim() || null
}
