import { describe, expect, it } from 'vitest'
import { parseBestMove, parseInfo, sideToMove, toWhitePov } from './uci'

describe('parseInfo', () => {
  it('reads depth and a centipawn score, ignoring seldepth and the pv', () => {
    const line =
      'info depth 12 seldepth 14 multipv 1 score cp 31 nodes 8123 nps 129000 time 63 pv e2e4 c7c5 g1f3 depth 99'
    expect(parseInfo(line)).toEqual({ depth: 12, multipv: 1, score: { cp: 31 }, bound: false })
  })

  it('reads mate scores and bounds', () => {
    expect(parseInfo('info depth 2 score mate -3 pv a1a8')?.score).toEqual({ mate: -3 })
    expect(parseInfo('info depth 9 score cp 50 lowerbound nodes 10')?.bound).toBe(true)
  })

  it('reads the depth-0 line Stockfish sends for a finished game', () => {
    expect(parseInfo('info depth 0 score mate 0')).toEqual({
      depth: 0,
      multipv: 1,
      score: { mate: 0 },
      bound: false,
    })
  })

  it('ignores lines without a score', () => {
    expect(parseInfo('info string NNUE evaluation using nn-small.nnue')).toBeNull()
    expect(parseInfo('info depth 5 currmove e2e4 currmovenumber 1')).toBeNull()
    expect(parseInfo('bestmove e2e4')).toBeNull()
  })
})

describe('parseBestMove', () => {
  it('reads the move, null for a finished game, undefined for other lines', () => {
    expect(parseBestMove('bestmove e7e8q ponder a2a3')).toBe('e7e8q')
    expect(parseBestMove('bestmove (none)')).toBeNull()
    expect(parseBestMove('readyok')).toBeUndefined()
  })
})

describe('toWhitePov', () => {
  it('flips centipawns when Black is to move', () => {
    expect(toWhitePov({ cp: 40 }, 'white')).toEqual({ type: 'cp', value: 40 })
    expect(toWhitePov({ cp: 40 }, 'black')).toEqual({ type: 'cp', value: -40 })
    expect(toWhitePov({ cp: 0 }, 'black')).toEqual({ type: 'cp', value: 0 })
  })

  it('names the winner of a mate', () => {
    expect(toWhitePov({ mate: 2 }, 'black')).toEqual({ type: 'mate', moves: 2, winner: 'black' })
    expect(toWhitePov({ mate: -1 }, 'black')).toEqual({ type: 'mate', moves: 1, winner: 'white' })
    // Black to move and already checkmated, as in "info depth 0 score mate 0"
    expect(toWhitePov({ mate: 0 }, 'black')).toEqual({ type: 'mate', moves: 0, winner: 'white' })
  })
})

describe('sideToMove', () => {
  it('reads the FEN', () => {
    expect(sideToMove('8/8/8/8/8/8/8/K6k b - - 0 1')).toBe('black')
    expect(sideToMove('8/8/8/8/8/8/8/K6k w - - 0 1')).toBe('white')
  })
})
