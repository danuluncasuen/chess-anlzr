import { describe, expect, it } from 'vitest'
import { PgnParseError, pgnToPositions, uciToSan } from './positions'

// Morphy vs. Duke of Brunswick & Count Isouard, Paris 1858 ("the Opera Game"),
// formatted like a chess.com export: headers plus a clock comment after each move.
const OPERA_GAME = `[Event "Opera Game"]
[Site "Paris"]
[Date "1858.??.??"]
[White "Paul Morphy"]
[Black "Duke Karl / Count Isouard"]
[Result "1-0"]

1. e4 {[%clk 0:02:59.9]} 1... e5 {[%clk 0:02:59.1]} 2. Nf3 {[%clk 0:02:58.4]} 2... d6
3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5
10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7
16. Qb8+ Nxb8 17. Rd8# 1-0
`

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

describe('pgnToPositions', () => {
  const { positions, moves } = pgnToPositions(OPERA_GAME)

  it('returns one position per move plus the start', () => {
    expect(moves).toHaveLength(33)
    expect(positions).toHaveLength(34)
    expect(positions[0]).toBe(START_FEN)
  })

  it('produces the known positions', () => {
    // After 1. e4 e5 2. Nf3
    expect(positions[3]).toBe('rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2')
    // Final position after 17. Rd8#
    expect(positions[33]).toBe('1n1Rkb1r/p4ppp/4q3/4p1B1/4P3/8/PPP2PPP/2K5 b k - 1 17')
  })

  it('numbers and colors the moves', () => {
    expect(moves[0]).toEqual({ ply: 1, moveNumber: 1, color: 'white', san: 'e4', uci: 'e2e4' })
    expect(moves[1]).toEqual({ ply: 2, moveNumber: 1, color: 'black', san: 'e5', uci: 'e7e5' })
    expect(moves[32]).toEqual({ ply: 33, moveNumber: 17, color: 'white', san: 'Rd8#', uci: 'd1d8' })
  })

  it('gives castling in king-move UCI form, like Stockfish', () => {
    expect(moves.find((m) => m.san === 'O-O-O')?.uci).toBe('e1c1')
  })

  it('writes promotions with the piece letter', () => {
    const { moves } = pgnToPositions('[FEN "8/P7/8/8/8/8/8/k6K w - - 0 1"]\n[SetUp "1"]\n\n1. a8=Q+ *')
    expect(moves[0]?.uci).toBe('a7a8q')
  })

  it('starts from a FEN header when present', () => {
    const fen = '4k3/8/8/8/8/8/8/R3K3 w Q - 0 40'
    const { positions, moves } = pgnToPositions(`[FEN "${fen}"]\n[SetUp "1"]\n\n40. Ra8+ *`)
    expect(positions[0]).toBe(fen)
    expect(moves[0]?.moveNumber).toBe(40)
  })

  it('handles a game with no moves', () => {
    expect(pgnToPositions('[Result "*"]\n\n*')).toEqual({ positions: [START_FEN], moves: [] })
  })

  it('rejects illegal moves', () => {
    expect(() => pgnToPositions('1. e4 e5 2. Ke3 *')).toThrow(PgnParseError)
  })
})

describe('uciToSan', () => {
  it('converts engine moves to readable notation', () => {
    expect(uciToSan(START_FEN, 'g1f3')).toBe('Nf3')
    expect(uciToSan('8/P7/8/8/8/8/8/k6K w - - 0 1', 'a7a8q')).toBe('a8=Q+')
    expect(uciToSan('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', 'e1g1')).toBe('O-O')
  })

  it('returns null for an illegal move', () => {
    expect(uciToSan(START_FEN, 'e2e5')).toBeNull()
  })
})
