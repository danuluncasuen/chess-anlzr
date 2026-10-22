import type { RawGame } from './api'

/** Builds a chess.com API game with sensible defaults; override what a test cares about. */
export function rawGame(overrides: Partial<RawGame> = {}): RawGame {
  return {
    uuid: '74c530b0-ce0e-11f1-920b-e2735601000f',
    url: 'https://www.chess.com/game/live/185745890270',
    pgn: '[Event "Live Chess"]\n[White "dlunc"]\n[Black "keishon26"]\n[Result "1-0"]\n\n1. e4 e5 2. d4 exd4 1-0',
    time_control: '180+2',
    time_class: 'blitz',
    end_time: 1792670134,
    rated: true,
    rules: 'chess',
    eco: 'https://www.chess.com/openings/Center-Game-Accepted-Normal-Variation',
    white: { username: 'dlunc', rating: 998, result: 'win' },
    black: { username: 'keishon26', rating: 966, result: 'checkmated' },
    ...overrides,
  }
}
