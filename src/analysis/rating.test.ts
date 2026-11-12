import { describe, expect, it } from 'vitest'
import {
  averageWeight,
  estimateGameRating,
  estimateRating,
  estimateRatingRange,
  expectedAccuracy,
  GAME_WEIGHT,
} from './rating'

describe('estimateRating', () => {
  it('follows the calibrated curve', () => {
    expect(estimateRating(64.4)).toBe(300)
    expect(estimateRating(74.7)).toBe(1000)
    expect(estimateRating(80.6)).toBe(2000)
  })

  it('rises with accuracy', () => {
    const ratings = [50, 60, 70, 75, 80, 85].map(estimateRating)
    expect(ratings).toEqual([...ratings].sort((a, b) => a - b))
  })

  it('stays within 100..3000', () => {
    expect(estimateRating(0)).toBe(100)
    expect(estimateRating(100)).toBe(3000)
  })
})

describe('estimateRatingRange', () => {
  it('narrows as more games are averaged', () => {
    const one = estimateRatingRange(74.7, 1)
    const thirty = estimateRatingRange(74.7, 30)
    expect(thirty.estimate).toBe(1000)
    expect(thirty.low).toBeLessThan(1000)
    expect(thirty.high).toBeGreaterThan(1000)
    expect(thirty.high - thirty.low).toBeLessThan(one.high - one.low)
  })

  it('agrees with the single-game estimate for one game', () => {
    for (const accuracy of [55, 69.9, 82.7, 90]) {
      expect(estimateRatingRange(accuracy, 1).estimate).toBe(estimateGameRating(accuracy))
    }
  })

  it('stays within the games’ own estimates (the rapid games that prompted this)', () => {
    const games = [84.0, 82.0, 67.9, 71.7, 58.8, 58.9]
    const average = games.reduce((s, a) => s + a, 0) / games.length
    const perGame = games.map(estimateGameRating)
    const { estimate, low, high } = estimateRatingRange(average, games.length)
    // Before, the raw curve gave ~600, below every one of the six games.
    expect(estimate).toBe(700)
    expect(estimate).toBeGreaterThanOrEqual(Math.min(...perGame))
    expect(estimate).toBeLessThanOrEqual(Math.max(...perGame))
    expect([low, high]).toEqual([400, 1300])
  })

  it('trusts the average more as games add up', () => {
    expect(averageWeight(1)).toBe(GAME_WEIGHT)
    expect(averageWeight(6)).toBeCloseTo(0.667, 3)
    expect(averageWeight(30)).toBeCloseTo(0.909, 3)
    expect(estimateRatingRange(70.5, 30).estimate).toBeLessThan(estimateRatingRange(70.5, 6).estimate)
  })
})

describe('expectedAccuracy', () => {
  it('inverts estimateRating', () => {
    expect(estimateRating(expectedAccuracy(1000))).toBe(1000)
    expect(estimateRating(expectedAccuracy(2000))).toBe(2000)
  })
})

describe('estimateGameRating', () => {
  it('depends only on the game’s accuracy, the same for every player', () => {
    // The game that prompted this: 82.7% vs 69.9%; the better game gets the higher estimate.
    expect(estimateGameRating(82.7)).toBe(1250)
    expect(estimateGameRating(69.9)).toBe(850)
  })

  it('gives the anchor rating for a typical game at that level', () => {
    expect(estimateGameRating(expectedAccuracy(1000))).toBe(1000)
  })

  it('moves only part of the way toward a single game', () => {
    const great = estimateGameRating(89.7)
    expect(great).toBeGreaterThan(1000)
    expect(great).toBeLessThan(estimateRating(89.7))
  })
})
