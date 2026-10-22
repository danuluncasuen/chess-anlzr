import { describe, expect, it } from 'vitest'
import { rawGame } from './fixtures'
import { normalizeGame, openingFromEcoUrl } from './normalize'

describe('normalizeGame', () => {
  it('maps a game from the winner’s side', () => {
    expect(normalizeGame(rawGame(), 'dlunc')).toMatchObject({
      id: 'chesscom:74c530b0-ce0e-11f1-920b-e2735601000f',
      username: 'dlunc',
      endTime: 1792670134000,
      timeClass: 'blitz',
      myColor: 'white',
      result: 'win',
      myRating: 998,
      opponentName: 'keishon26',
      opponentRating: 966,
      opening: 'Center Game Accepted Normal Variation',
    })
  })

  it('maps the same game from the loser’s side, ignoring username case', () => {
    expect(normalizeGame(rawGame(), 'KEISHON26')).toMatchObject({
      username: 'keishon26',
      myColor: 'black',
      result: 'loss',
      myRating: 966,
      opponentName: 'dlunc',
    })
  })

  it('treats any non-win result as a draw when nobody won', () => {
    const game = rawGame({
      white: { username: 'dlunc', rating: 1000, result: 'repetition' },
      black: { username: 'other', rating: 1000, result: 'repetition' },
    })
    expect(normalizeGame(game, 'dlunc')?.result).toBe('draw')
  })

  it('skips variants, missing PGNs and games the user did not play', () => {
    expect(normalizeGame(rawGame({ rules: 'chess960' }), 'dlunc')).toBeNull()
    expect(normalizeGame(rawGame({ pgn: undefined }), 'dlunc')).toBeNull()
    expect(normalizeGame(rawGame(), 'someone-else')).toBeNull()
  })
})

describe('openingFromEcoUrl', () => {
  it('handles missing or odd URLs', () => {
    expect(openingFromEcoUrl(undefined)).toBeNull()
    expect(openingFromEcoUrl('https://www.chess.com/something')).toBeNull()
    expect(openingFromEcoUrl('https://www.chess.com/openings/Sicilian-Defense...2.Nf3')).toBe(
      'Sicilian Defense...2.Nf3',
    )
  })
})
