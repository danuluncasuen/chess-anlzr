import { describe, expect, it } from 'vitest'
import { countPieces, phaseOf, pieceCount, tagsOf } from './phase'

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

describe('countPieces', () => {
  it('counts both sides', () => {
    const counts = countPieces(START)
    expect(counts.white).toEqual({ p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 })
    expect(counts.black).toEqual(counts.white)
    expect(pieceCount(counts)).toBe(14)
  })
})

describe('phaseOf', () => {
  it('is the opening early on with full material', () => {
    expect(phaseOf(START, 1)).toBe('opening')
    expect(phaseOf(START, 12)).toBe('opening')
  })

  it('becomes the middlegame after the opening moves', () => {
    expect(phaseOf(START, 13)).toBe('middlegame')
  })

  it('keeps an early queen trade out of the endgame', () => {
    // Both queens traded, 12 pieces still on the board
    const noQueens = 'rnb1kbnr/pppppppp/8/8/8/8/PPPPPPPP/RNB1KBNR w KQkq - 0 8'
    expect(phaseOf(noQueens, 8)).toBe('opening')
    expect(phaseOf(noQueens, 20)).toBe('middlegame')
  })

  it('is the endgame once 6 or fewer pieces are left, queens or not', () => {
    // 2R + 2B + N vs R + N: 7 pieces
    expect(phaseOf('r1n1k3/5ppp/8/8/8/8/5PPP/R1BBK1NR w - - 0 30', 30)).toBe('middlegame')
    // Q + R each side: 4 pieces
    expect(phaseOf('3qk2r/5ppp/8/8/8/8/5PPP/3QK2R w - - 0 30', 30)).toBe('endgame')
    // Even early, if that much has been traded
    expect(phaseOf('3qk2r/5ppp/8/8/8/8/5PPP/3QK2R w - - 0 10', 10)).toBe('endgame')
  })
})

describe('tagsOf', () => {
  it('tags positions with only rooks and pawns', () => {
    expect(tagsOf('8/5pk1/6p1/8/r7/6P1/R4PK1/8 w - - 0 40')).toEqual(['rook-endgame'])
    // A rook against pawns still counts
    expect(tagsOf('8/5pk1/6p1/8/8/6P1/R4PK1/8 w - - 0 40')).toEqual(['rook-endgame'])
  })

  it('does not tag positions with other pieces or no rooks', () => {
    expect(tagsOf('8/5pk1/6p1/8/r7/6P1/R2B1PK1/8 w - - 0 40')).toEqual([])
    expect(tagsOf('8/5pk1/6p1/8/8/6P1/5PK1/8 w - - 0 40')).toEqual([])
    expect(tagsOf(START)).toEqual([])
  })
})
