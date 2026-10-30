import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import { capturedBy, materialBalance } from './material'
import { pgnToPositions } from './positions'

describe('materialBalance', () => {
  it('is even at the start', () => {
    expect(materialBalance(new Chess().fen())).toBe(0)
  })

  it('follows trades: a knight up, then even again', () => {
    // 1. e4 d5 2. exd5 Nf6 3. Nc3 Nxd5 4. Nxd5 Qxd5
    const { positions } = pgnToPositions('1. e4 d5 2. exd5 Nf6 3. Nc3 Nxd5 4. Nxd5 Qxd5 *')
    expect(materialBalance(positions[7]!)).toBe(3) // after 4. Nxd5: pawns traded, White a knight up
    expect(materialBalance(positions.at(-1)!)).toBe(0) // after 4... Qxd5: even
  })

  it('counts a promoted pawn as a queen', () => {
    expect(materialBalance('Q7/8/8/8/8/8/8/k6K b - - 0 1')).toBe(9)
    expect(materialBalance('8/8/8/8/8/8/8/k5qK w - - 0 1')).toBe(-9)
  })
})

describe('capturedBy', () => {
  it('lists each side’s captures, cheapest first, en passant included', () => {
    // 1. e4 d5 2. exd5 Qxd5 3. Nc3 Qa5 4. d4 c5 5. d5 e5 6. dxe6 (en passant) Bxe6 7. Bb5+ Qxb5 8. Nxb5
    const { moves } = pgnToPositions(
      '1. e4 d5 2. exd5 Qxd5 3. Nc3 Qa5 4. d4 c5 5. d5 e5 6. dxe6 Bxe6 7. Bb5+ Qxb5 8. Nxb5 *',
    )
    expect(capturedBy(moves)).toEqual({ white: ['p', 'p', 'q'], black: ['p', 'p', 'b'] })
  })
})
