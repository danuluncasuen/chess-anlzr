import { describe, expect, it } from 'vitest'
import type { PositionEval, Score } from '../engine/types'
import { gameAccuracy, moveAccuracy } from './accuracy'
import { classifyGame } from './classify'

const cp = (value: number): Score => ({ type: 'cp', value })
const ev = (value: number, bestMove: string | null = null): PositionEval => ({
  score: cp(value),
  bestMove,
  depth: 12,
})

/** Classifies `pgn` with the given White-POV evals (one per position). */
function movesFor(pgn: string, evals: PositionEval[]) {
  return classifyGame(pgn, { gameId: 'g', engineId: 'test', depth: 12, plies: evals, analyzedAt: 0 })
}

describe('moveAccuracy', () => {
  it('is 100 with no drop and falls off with bigger drops', () => {
    expect(moveAccuracy(50, 50)).toBeCloseTo(100, 3)
    expect(moveAccuracy(50, 40)).toBeCloseTo(63.6, 1)
    expect(moveAccuracy(60, 30)).toBeCloseTo(24.8, 1)
  })

  it('does not reward a move that improved the position', () => {
    expect(moveAccuracy(40, 70)).toBeCloseTo(100, 3)
  })

  it('stays within 0..100', () => {
    expect(moveAccuracy(100, 0)).toBe(0)
  })
})

describe('gameAccuracy', () => {
  const pgn = '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 *'

  it('is ~100 for a player who never lost anything', () => {
    const moves = movesFor(pgn, [ev(20), ev(25), ev(20), ev(25), ev(20), ev(25), ev(20)])
    expect(gameAccuracy(moves, 'white')).toBeCloseTo(100, 1)
    expect(gameAccuracy(moves, 'black')).toBeCloseTo(100, 1)
  })

  it('punishes one blunder harder than the plain average would', () => {
    // White's 2. Nf3 drops from +0.2 to -3.0; everything else is accurate.
    const moves = movesFor(pgn, [ev(20), ev(20), ev(20), ev(-300), ev(-300), ev(-300), ev(-300)])
    const perMove = moves
      .filter((m) => m.color === 'white')
      .map((m) => moveAccuracy(m.winProbBefore * 100, m.winProbAfter * 100))
    const plainMean = perMove.reduce((s, a) => s + a, 0) / perMove.length

    const accuracy = gameAccuracy(moves, 'white')!
    expect(accuracy).toBeLessThan(plainMean)
    expect(accuracy).toBeGreaterThan(Math.min(...perMove))
    expect(gameAccuracy(moves, 'black')).toBeCloseTo(100, 1)
  })

  it('is null for a player with no moves', () => {
    const moves = movesFor('1. e4 *', [ev(20), ev(20)])
    expect(gameAccuracy(moves, 'black')).toBeNull()
    expect(gameAccuracy([], 'white')).toBeNull()
  })
})
