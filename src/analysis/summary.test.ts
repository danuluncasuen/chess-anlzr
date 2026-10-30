import { describe, expect, it } from 'vitest'
import type { Game } from '../types'
import { classifyLoss, type MoveAnalysis } from './classify'
import { insights, summarize, type ClassifiedGame } from './summary'

function game(id: string, overrides: Partial<Game> = {}): Game {
  return {
    id,
    username: 'dlunc',
    source: 'chesscom',
    url: '',
    endTime: 0,
    timeClass: 'blitz',
    timeControl: '180+2',
    myColor: 'white',
    result: 'win',
    myRating: 1000,
    opponentName: 'x',
    opponentRating: 1000,
    opening: null,
    pgn: '',
    ...overrides,
  }
}

/** A move that lost `loss` percentage points of winning chances. */
function move(color: 'white' | 'black', loss: number, extra: Partial<MoveAnalysis> = {}): MoveAnalysis {
  return {
    ply: 1,
    moveNumber: 1,
    color,
    san: 'e4',
    uci: 'e2e4',
    captured: null,
    fenBefore: '',
    fenAfter: '',
    bestMoveUci: null,
    bestMoveSan: null,
    replyUci: null,
    replySan: null,
    evalBefore: { type: 'cp', value: 0 },
    evalAfter: { type: 'cp', value: 0 },
    winProbBefore: 0.5,
    winProbAfter: 0.5 - loss / 100,
    winProbLoss: loss / 100,
    centipawnLoss: 0,
    class: classifyLoss(loss / 100),
    phase: 'opening',
    tags: [],
    ...extra,
  }
}

describe('summarize', () => {
  const summary = summarize([
    {
      game: game('a', { myColor: 'white', timeClass: 'blitz' }),
      moves: [
        move('white', 2), // opening
        move('black', 40), // opponent's blunder: ignored
        move('white', 20, { phase: 'middlegame' }), // blunder
        move('white', 6, { phase: 'endgame', tags: ['rook-endgame'] }), // inaccuracy
      ],
    },
    {
      game: game('b', { myColor: 'black', timeClass: 'rapid' }),
      moves: [move('white', 0), move('black', 12, { phase: 'endgame', tags: ['rook-endgame'] })],
    },
  ])

  it('only counts the player’s own moves', () => {
    expect(summary.overall).toMatchObject({ games: 2, moves: 4, inaccuracies: 1, mistakes: 1, blunders: 1 })
    expect(summary.overall.pointsLost).toBeCloseTo(40)
    expect(summary.overall.avgLoss).toBeCloseTo(10)
    expect(summary.overall.share).toBeCloseTo(1)
  })

  it('groups by phase in game order', () => {
    expect(summary.byPhase.map((g) => [g.key, g.moves, Math.round(g.pointsLost)])).toEqual([
      ['opening', 1, 2],
      ['middlegame', 1, 20],
      ['endgame', 2, 18],
    ])
    expect(summary.byPhase[2]!.avgLoss).toBeCloseTo(9)
    expect(summary.byPhase[1]!.share).toBeCloseTo(0.5)
  })

  it('groups by color and time class, leaving out empty groups', () => {
    expect(summary.byColor.map((g) => [g.key, g.games, g.moves])).toEqual([
      ['white', 1, 3],
      ['black', 1, 1],
    ])
    expect(summary.byTimeClass.map((g) => g.key)).toEqual(['blitz', 'rapid'])
  })

  it('collects rook endgame moves across games', () => {
    expect(summary.rookEndgames).toMatchObject({ games: 2, moves: 2, inaccuracies: 1, mistakes: 1 })
    expect(summary.rookEndgames.avgLoss).toBeCloseTo(9)
  })

  it('handles no games', () => {
    const empty = summarize([])
    expect(empty.overall).toMatchObject({ games: 0, moves: 0, avgLoss: 0, share: 0 })
    expect(empty.byPhase).toEqual([])
  })
})

describe('insights', () => {
  /** n moves for the player, each losing `loss` points. */
  const moves = (n: number, color: 'white' | 'black', loss: number, extra: Partial<MoveAnalysis> = {}) =>
    Array.from({ length: n }, () => move(color, loss, extra))

  it('needs enough moves to say anything', () => {
    const few: ClassifiedGame[] = [{ game: game('a'), moves: moves(5, 'white', 30) }]
    expect(insights(summarize(few))).toEqual([])
  })

  it('names the costliest phase and a rook endgame weakness', () => {
    const result = insights(
      summarize([
        {
          game: game('a'),
          moves: [
            ...moves(20, 'white', 1),
            ...moves(20, 'white', 1, { phase: 'middlegame' }),
            ...moves(20, 'white', 7, { phase: 'endgame', tags: ['rook-endgame'] }),
          ],
        },
      ]),
    )
    expect(result).toEqual([
      'Your costliest phase is the endgame: 7.0 points lost per move, vs 3.0 on average (78% of all points lost).',
      'Rook endgames are a weak spot: 7.0 points lost per move, 2.3× your average, across 1 game.',
    ])
  })

  it('compares colors only when the gap is notable', () => {
    const result = insights(
      summarize([
        { game: game('a', { myColor: 'white' }), moves: moves(20, 'white', 2) },
        { game: game('b', { myColor: 'black' }), moves: moves(20, 'black', 4) },
      ]),
    )
    expect(result).toEqual(['You lose more as black: 4.0 vs 2.0 points per move.'])
  })
})
