import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import { isBrilliant, sacrificedMaterial } from './brilliant'

/** FEN after playing `sans` from the start. */
function fenAfter(...sans: string[]): string {
  const chess = new Chess()
  for (const san of sans) chess.move(san)
  return chess.fen()
}

// The classic "Greek gift": White can play Bxh7+ Kxh7, giving a bishop for a pawn.
const GREEK_GIFT = 'r1bq1rk1/pppn1ppp/4p3/3pP3/1b1P4/2NB1N2/PPP2PPP/R1BQK2R w KQ - 0 8'

describe('sacrificedMaterial', () => {
  it('counts a bishop given for a pawn as 2', () => {
    expect(sacrificedMaterial(GREEK_GIFT, 'd3h7')).toBe(2)
  })

  it('counts a piece left where a pawn can take it', () => {
    expect(sacrificedMaterial(fenAfter('e4', 'd5'), 'f1c4')).toBe(3) // the d5 pawn attacks c4
  })

  it('sees an even trade as no sacrifice', () => {
    const fen = fenAfter('e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6') // Bxc6 dxc6: bishop for knight
    expect(sacrificedMaterial(fen, 'b5c6')).toBe(0)
  })

  it('sees a queen trade as no sacrifice, since the queen is taken back', () => {
    // 1. e4 e5 2. Qh5 Nf6 3. Qxe5+ Qe7 4. Qxe7+ Bxe7: the queens come off.
    expect(sacrificedMaterial(fenAfter('e4', 'e5', 'Qh5', 'Nf6', 'Qxe5+', 'Qe7'), 'e5e7')).toBe(0)
  })

  it('never counts a pawn move, even one that lets a piece be taken elsewhere', () => {
    // 3... h6 invites Bxf6: an exchange, not a sacrifice by the pawn.
    expect(sacrificedMaterial(fenAfter('d4', 'd5', 'Bg5', 'Nf6', 'e3'), 'h7h6')).toBe(0)
    // 1. e4 d5 2. d4?? dxe4 would hang a pawn: still not a piece sacrifice.
    expect(sacrificedMaterial(fenAfter('e4', 'd5'), 'd2d4')).toBe(0)
  })

  it('sees a quiet piece move as no sacrifice', () => {
    expect(sacrificedMaterial(new Chess().fen(), 'g1f3')).toBe(0)
  })
})

describe('isBrilliant', () => {
  const greekGift = {
    fenBefore: GREEK_GIFT,
    uci: 'd3h7',
    isBest: true,
    winProbBefore: 0.6,
    winProbAfter: 0.62,
    secondBestWinProb: 0.4,
  }

  it('calls a sound sacrifice brilliant', () => {
    expect(isBrilliant(greekGift)).toBe(true)
  })

  it('must be clearly better than the second-best move', () => {
    expect(isBrilliant({ ...greekGift, secondBestWinProb: 0.55 })).toBe(false) // only 5 points better
    expect(isBrilliant({ ...greekGift, secondBestWinProb: 0.48 })).toBe(true) // 12 points better
    expect(isBrilliant({ ...greekGift, secondBestWinProb: null })).toBe(false) // not known
  })

  it('only counts Stockfish’s own move', () => {
    expect(isBrilliant({ ...greekGift, isBest: false })).toBe(false)
  })

  it('isn’t brilliant when already winning, or when it leaves the mover worse off', () => {
    expect(isBrilliant({ ...greekGift, winProbBefore: 0.95, winProbAfter: 0.96 })).toBe(false)
    expect(isBrilliant({ ...greekGift, winProbBefore: 0.35, winProbAfter: 0.35 })).toBe(false)
  })

  it('needs an actual sacrifice', () => {
    expect(isBrilliant({ ...greekGift, fenBefore: new Chess().fen(), uci: 'e2e4' })).toBe(false)
  })
})
