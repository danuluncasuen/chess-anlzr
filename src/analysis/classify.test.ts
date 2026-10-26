import { describe, expect, it } from 'vitest'
import type { PositionEval, Score } from '../engine/types'
import type { Analysis } from '../types'
import { classifyGame, classifyLoss, formatScore, winProbability } from './classify'

const cp = (value: number): Score => ({ type: 'cp', value })
const ev = (score: Score, bestMove: string | null = null): PositionEval => ({
  score,
  bestMove,
  depth: 12,
})
const analysis = (plies: PositionEval[]): Analysis => ({
  gameId: 'g',
  engineId: 'test',
  depth: 12,
  plies,
  analyzedAt: 0,
})

describe('winProbability', () => {
  it('is 50% at equality and symmetric', () => {
    expect(winProbability(cp(0))).toBe(0.5)
    expect(winProbability(cp(300)) + winProbability(cp(-300))).toBeCloseTo(1)
  })

  it('follows the Lichess curve', () => {
    expect(winProbability(cp(100))).toBeCloseTo(0.591, 3)
    expect(winProbability(cp(300))).toBeCloseTo(0.751, 3)
  })

  it('caps big evals and treats mate as decided', () => {
    expect(winProbability(cp(5000))).toBe(winProbability(cp(1000)))
    expect(winProbability({ type: 'mate', moves: 3, winner: 'white' })).toBe(1)
    expect(winProbability({ type: 'mate', moves: 0, winner: 'black' })).toBe(0)
  })

  it('counts the same drop less when the game is already decided', () => {
    const lossAtEqual = winProbability(cp(0)) - winProbability(cp(-200))
    const lossWhenLost = winProbability(cp(-600)) - winProbability(cp(-800))
    expect(lossAtEqual).toBeGreaterThan(3 * lossWhenLost)
  })
})

describe('classifyLoss', () => {
  it('uses the thresholds', () => {
    expect(classifyLoss(0.04)).toBe('ok')
    expect(classifyLoss(0.05)).toBe('inaccuracy')
    expect(classifyLoss(0.1)).toBe('mistake')
    expect(classifyLoss(0.15)).toBe('blunder')
    expect(classifyLoss(0.6)).toBe('blunder')
  })
})

describe('classifyGame', () => {
  // 1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6?? 4. Qxf7#
  const pgn = '1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0'
  const plies = [
    ev(cp(30), 'e2e4'), // start
    ev(cp(30), 'e7e5'), // after 1. e4 (Black's best is e5)
    ev(cp(35), 'g1f3'), // after 1... e5 (White's best is Nf3)
    ev(cp(-20), 'b8c6'), // after 2. Qh5: White lost 0.55 pawns
    ev(cp(0), 'g1e2'), // after 2... Nc6 (White's best is Ne2, so Bc4 isn't best)
    ev(cp(-10), 'g7g6'), // after 3. Bc4 (Black's best is g6)
    ev({ type: 'mate', moves: 1, winner: 'white' }, 'h5f7'), // after 3... Nf6??
    ev({ type: 'mate', moves: 0, winner: 'white' }), // after 4. Qxf7#
  ]
  const moves = classifyGame(pgn, analysis(plies))

  it('rates each move from the mover’s side', () => {
    expect(moves.map((m) => `${m.san}:${m.class}`)).toEqual([
      'e4:best',
      'e5:best',
      'Qh5:inaccuracy',
      'Nc6:best',
      'Bc4:ok',
      'Nf6:blunder',
      'Qxf7#:best',
    ])
  })

  it('reports the losses and the better move', () => {
    const qh5 = moves[2]!
    expect(qh5.centipawnLoss).toBe(55)
    expect(qh5.winProbLoss).toBeCloseTo(winProbability(cp(35)) - winProbability(cp(-20)))
    expect(qh5.bestMoveSan).toBe('Nf3')

    const nf6 = moves[5]!
    expect(nf6.color).toBe('black')
    expect(nf6.winProbBefore).toBeCloseTo(1 - winProbability(cp(-10)))
    expect(nf6.winProbAfter).toBe(0)
    expect(nf6.centipawnLoss).toBe(1010)
    expect(nf6.bestMoveSan).toBe('g6')
  })

  it('marks the phase of each move', () => {
    expect(moves.every((m) => m.phase === 'opening' && m.tags.length === 0)).toBe(true)
  })

  it('rejects an analysis that does not match the game', () => {
    expect(() => classifyGame(pgn, analysis(plies.slice(1)))).toThrow(/positions/)
  })
})

describe('formatScore', () => {
  it('formats pawns and mates', () => {
    expect(formatScore(cp(134))).toBe('+1.3')
    expect(formatScore(cp(-40))).toBe('-0.4')
    expect(formatScore(cp(0))).toBe('0.0')
    expect(formatScore({ type: 'mate', moves: 3, winner: 'white' })).toBe('M3')
    expect(formatScore({ type: 'mate', moves: 2, winner: 'black' })).toBe('-M2')
    expect(formatScore({ type: 'mate', moves: 0, winner: 'black' })).toBe('0-1')
  })
})
