import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import type { PositionEval, Score } from '../engine/types'
import type { Analysis } from '../types'
import { classifyGame } from './classify'
import { explainMove, moveFacts } from './explain'

const cp = (value: number): Score => ({ type: 'cp', value })
const mateWhite = (moves: number): Score => ({ type: 'mate', moves, winner: 'white' })
const ev = (score: Score, bestMove: string | null = null): PositionEval => ({ score, bestMove, depth: 12 })
const analysis = (plies: PositionEval[]): Analysis => ({
  gameId: 'g',
  engineId: 'test',
  depth: 12,
  plies,
  analyzedAt: 0,
})

/** Explanation of the move at `index`, from `myColor`'s side. */
function explain(pgn: string, plies: PositionEval[], index: number, myColor: 'white' | 'black') {
  const moves = classifyGame(pgn, analysis(plies))
  return explainMove(moves[index]!, moves[index + 1], myColor)
}

describe('explainMove', () => {
  // 1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6?? 4. Qxf7#
  const scholar = '1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0'
  const scholarPlies = [
    ev(cp(30), 'e2e4'),
    ev(cp(30), 'e7e5'),
    ev(cp(35), 'g1f3'),
    ev(cp(-20), 'b8c6'),
    ev(cp(0), 'g1e2'),
    ev(cp(-10), 'g7g6'),
    ev(mateWhite(1), 'h5f7'),
    ev(mateWhite(0)),
  ]

  it('names the mate a blunder allows, whether it was found, and the better move', () => {
    expect(explain(scholar, scholarPlies, 5, 'black')).toEqual([
      'This let your opponent force mate in 1, starting with Qxf7# (they found it).',
      'Best was g6.',
    ])
  })

  it('speaks from the player’s side for the opponent’s moves', () => {
    expect(explain(scholar, scholarPlies, 5, 'white')).toEqual([
      'This let you force mate in 1, starting with Qxf7# (you found it).',
      'Best was g6.',
    ])
  })

  it('skips an ordinary reply to an inaccuracy, giving only the better move', () => {
    // The best answer to 2. Qh5 was the quiet 2... Nc6: nothing worth a sentence.
    expect(explain(scholar, scholarPlies, 2, 'white')).toEqual(['Best was Nf3.'])
  })

  it('says nothing about good moves', () => {
    expect(explain(scholar, scholarPlies, 0, 'white')).toEqual([])
  })

  it('points out an undefended piece being taken', () => {
    const pgn = '1. e4 e5 2. Ba6 bxa6 *'
    const plies = [
      ev(cp(30), 'e2e4'),
      ev(cp(30), 'e7e5'),
      ev(cp(30), 'g1f3'),
      ev(cp(-300), 'b7a6'),
      ev(cp(-300), 'g1f3'),
    ]
    expect(explain(pgn, plies, 2, 'white')).toEqual([
      'This let your opponent play bxa6, taking your undefended bishop (they found it).',
      'Best was Nf3.',
    ])
  })

  it('says when the punishing answer wasn’t played', () => {
    const pgn = '1. e4 e5 2. Ba6 Nc6 *'
    const plies = [
      ev(cp(30), 'e2e4'),
      ev(cp(30), 'e7e5'),
      ev(cp(30), 'g1f3'),
      ev(cp(-300), 'b7a6'),
      ev(cp(-20), 'a6b5'),
    ]
    expect(explain(pgn, plies, 2, 'white')).toEqual([
      'This let your opponent play bxa6, taking your undefended bishop (they missed it and played Nc6).',
      'Best was Nf3.',
    ])
  })

  it('gives the evaluation swing when a blunder’s punishment is a quiet move', () => {
    const pgn = '1. e4 e5 2. Ba6 bxa6 *'
    const plies = [
      ev(cp(30), 'e2e4'),
      ev(cp(30), 'e7e5'),
      ev(cp(30), 'g1f3'),
      ev(cp(-300), 'g8f6'),
      ev(cp(-300), 'g1f3'),
    ]
    expect(explain(pgn, plies, 2, 'white')).toEqual([
      'This let your opponent play Nf6, swinging the evaluation to -3.0 (they missed it and played bxa6).',
      'Best was Nf3.',
    ])
  })

  it('names a missed mate, and the reply when the game ends there', () => {
    const pgn = '1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Nc3 *'
    const plies = [...scholarPlies.slice(0, 7), ev(cp(-200), 'f6h5')]
    expect(explain(pgn, plies, 6, 'white')).toEqual([
      'Qxf7# was mate in 1.',
      'This let your opponent play Nxh5, taking your undefended queen.',
    ])
  })
})

describe('moveFacts', () => {
  it('describes a capture of a defended piece with check', () => {
    const chess = new Chess()
    for (const san of ['e4', 'e5', 'Nf3', 'd6', 'Bc4', 'Bg4']) chess.move(san)
    expect(moveFacts(chess.fen(), 'c4f7')).toEqual({
      captured: { name: 'pawn', defended: true },
      check: true,
      mate: false,
      castle: false,
      promotion: null,
    })
  })

  it('recognizes castling and rejects illegal moves', () => {
    const chess = new Chess()
    for (const san of ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5']) chess.move(san)
    expect(moveFacts(chess.fen(), 'e1g1')?.castle).toBe(true)
    expect(moveFacts(chess.fen(), 'e1e3')).toBeNull()
  })
})
