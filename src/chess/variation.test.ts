import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import { formatLine, legalTargets, tryMove, turnOf, type VariationMove } from './variation'

const START = new Chess().fen()

describe('tryMove', () => {
  it('plays a legal move and reports it', () => {
    const move = tryMove(START, 'e2', 'e4')
    expect(move).toMatchObject({ san: 'e4', uci: 'e2e4', moveNumber: 1, color: 'white' })
    expect(turnOf(move!.fen)).toBe('black')
  })

  it('records what a move captures', () => {
    const afterD5 = tryMove(tryMove(START, 'e2', 'e4')!.fen, 'd7', 'd5')!
    expect(tryMove(afterD5.fen, 'e4', 'd5')).toMatchObject({ san: 'exd5', captured: 'p' })
    expect(afterD5.captured).toBeNull()
  })

  it('rejects illegal moves and moves by the side not to move', () => {
    expect(tryMove(START, 'e2', 'e5')).toBeNull()
    expect(tryMove(START, 'e7', 'e5')).toBeNull()
  })

  it('promotes to a queen', () => {
    const fen = '8/P7/8/8/8/8/8/k6K w - - 0 1'
    expect(tryMove(fen, 'a7', 'a8')).toMatchObject({ san: 'a8=Q+', uci: 'a7a8q' })
  })
})

describe('legalTargets', () => {
  it('lists where a piece can go, and nothing for the side not to move', () => {
    expect(legalTargets(START, 'g1').sort()).toEqual(['f3', 'h3'])
    expect(legalTargets(START, 'g8')).toEqual([])
  })
})

describe('formatLine', () => {
  it('numbers moves like a scoresheet', () => {
    const line: VariationMove[] = []
    let fen = new Chess('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1').fen()
    for (const [from, to] of [
      ['e7', 'e5'],
      ['g1', 'f3'],
      ['b8', 'c6'],
    ] as const) {
      const move = tryMove(fen, from, to)!
      line.push(move)
      fen = move.fen
    }
    expect(formatLine(line)).toBe('1... e5 2. Nf3 Nc6')
  })
})
