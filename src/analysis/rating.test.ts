import { describe, expect, it } from 'vitest'
import { estimateGameRating, estimateRating, estimateRatingRange, expectedAccuracy } from './rating'

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
})

describe('expectedAccuracy', () => {
  it('inverts estimateRating', () => {
    expect(estimateRating(expectedAccuracy(1000))).toBe(1000)
    expect(estimateRating(expectedAccuracy(2000))).toBe(2000)
  })
})

describe('estimateGameRating', () => {
  it('equals the usual-level estimate for a typical game', () => {
    expect(estimateGameRating(73.6, 73.6)).toBe(estimateRating(73.6))
  })

  it('moves only part of the way toward a single game', () => {
    const usual = 73.6
    const great = estimateGameRating(89.7, usual)
    expect(great).toBeGreaterThan(estimateRating(usual))
    expect(great).toBeLessThan(estimateRating(89.7))
    expect(great).toBe(estimateRating(usual + 0.25 * (89.7 - usual)))
  })
})
