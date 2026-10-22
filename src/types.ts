export type Color = 'white' | 'black'
export type GameResult = 'win' | 'loss' | 'draw'
export type TimeClass = 'bullet' | 'blitz' | 'rapid' | 'daily'

/** A finished game, normalized from whichever source it came from. */
export interface Game {
  /** Source-prefixed id, e.g. "chesscom:<uuid>". */
  id: string
  /** Lowercased username of the player being analyzed. */
  username: string
  source: 'chesscom'
  url: string
  /** Epoch milliseconds. */
  endTime: number
  timeClass: TimeClass
  timeControl: string
  myColor: Color
  result: GameResult
  myRating: number
  opponentName: string
  opponentRating: number
  /** Human-readable opening name, or null if unknown. */
  opening: string | null
  pgn: string
}
