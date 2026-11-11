import { describe, expect, it } from 'vitest'
import type { TimeClass } from '../types'
import { filterByType, groupByTimeClass } from './gameTypes'

const games = (['rapid', 'bullet', 'rapid', 'daily', 'bullet'] as TimeClass[]).map((timeClass, i) => ({
  id: `g${i}`,
  timeClass,
}))

describe('groupByTimeClass', () => {
  it('groups fastest first, keeping each group’s order and skipping absent types', () => {
    expect(groupByTimeClass(games).map((g) => [g.timeClass, g.games.map((x) => x.id)])).toEqual([
      ['bullet', ['g1', 'g4']],
      ['rapid', ['g0', 'g2']],
      ['daily', ['g3']],
    ])
  })
})

describe('filterByType', () => {
  it('keeps one type, or everything for "all"', () => {
    expect(filterByType(games, 'rapid').map((g) => g.id)).toEqual(['g0', 'g2'])
    expect(filterByType(games, 'blitz')).toEqual([])
    expect(filterByType(games, 'all')).toHaveLength(5)
  })
})
