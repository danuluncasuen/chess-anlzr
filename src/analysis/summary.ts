import type { Game } from '../types'
import { gameAccuracy } from './accuracy'
import type { MoveAnalysis } from './classify'

export interface ClassifiedGame {
  game: Game
  /** Every move of the game, both sides. */
  moves: MoveAnalysis[]
}

export interface GroupStats {
  key: string
  label: string
  games: number
  /** The player's moves in this group. */
  moves: number
  /** Winning chances lost, in percentage points, summed over the moves. */
  pointsLost: number
  /** pointsLost per move. */
  avgLoss: number
  /** This group's part of all points lost (0..1). */
  share: number
  inaccuracies: number
  mistakes: number
  blunders: number
}

/** Both players' accuracy in one game (null if they made no moves). */
export interface GameAccuracy {
  mine: number | null
  theirs: number | null
}

export function accuracyOf({ game, moves }: ClassifiedGame): GameAccuracy {
  const opponent = game.myColor === 'white' ? 'black' : 'white'
  return { mine: gameAccuracy(moves, game.myColor), theirs: gameAccuracy(moves, opponent) }
}

export interface Summary {
  /** The player's average game accuracy, or null with no games. */
  accuracy: number | null
  /** The player's average rating over the same games, for comparison. */
  rating: number | null
  overall: GroupStats
  byPhase: GroupStats[]
  byColor: GroupStats[]
  byTimeClass: GroupStats[]
  /** Positions with a given tag (currently only rook endgames). */
  rookEndgames: GroupStats
}

interface PlayerMove {
  game: Game
  move: MoveAnalysis
}

const PHASES = [
  ['opening', 'Opening'],
  ['middlegame', 'Middlegame'],
  ['endgame', 'Endgame'],
] as const
const COLORS = [
  ['white', 'As White'],
  ['black', 'As Black'],
] as const
const TIME_CLASSES = [
  ['bullet', 'Bullet'],
  ['blitz', 'Blitz'],
  ['rapid', 'Rapid'],
  ['daily', 'Daily'],
] as const

/** Where the player loses points, across their analyzed games. Only their own moves count. */
export function summarize(games: ClassifiedGame[]): Summary {
  const mine: PlayerMove[] = games.flatMap(({ game, moves }) =>
    moves.filter((m) => m.color === game.myColor).map((move) => ({ game, move })),
  )
  const total = sumLoss(mine)
  const group = (key: string, label: string, filter: (pm: PlayerMove) => boolean) =>
    stats(key, label, mine.filter(filter), total)
  const nonEmpty = (groups: GroupStats[]) => groups.filter((g) => g.moves > 0)

  const accuracies = games
    .map((g) => ({ rating: g.game.myRating, accuracy: accuracyOf(g).mine }))
    .filter((a): a is { rating: number; accuracy: number } => a.accuracy !== null)
  const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null)

  return {
    accuracy: mean(accuracies.map((a) => a.accuracy)),
    rating: mean(accuracies.map((a) => a.rating)),
    overall: group('all', 'All moves', () => true),
    byPhase: nonEmpty(PHASES.map(([key, label]) => group(key, label, (pm) => pm.move.phase === key))),
    byColor: nonEmpty(COLORS.map(([key, label]) => group(key, label, (pm) => pm.game.myColor === key))),
    byTimeClass: nonEmpty(
      TIME_CLASSES.map(([key, label]) => group(key, label, (pm) => pm.game.timeClass === key)),
    ),
    rookEndgames: group('rook-endgame', 'Rook endgames', (pm) => pm.move.tags.includes('rook-endgame')),
  }
}

function stats(key: string, label: string, moves: PlayerMove[], totalLoss: number): GroupStats {
  const pointsLost = sumLoss(moves)
  const count = (cls: MoveAnalysis['class']) => moves.filter((pm) => pm.move.class === cls).length
  return {
    key,
    label,
    games: new Set(moves.map((pm) => pm.game.id)).size,
    moves: moves.length,
    pointsLost,
    avgLoss: moves.length ? pointsLost / moves.length : 0,
    share: totalLoss ? pointsLost / totalLoss : 0,
    inaccuracies: count('inaccuracy'),
    mistakes: count('mistake'),
    blunders: count('blunder'),
  }
}

function sumLoss(moves: PlayerMove[]): number {
  return moves.reduce((sum, pm) => sum + pm.move.winProbLoss * 100, 0)
}

/** Don't single out a group with fewer of the player's moves than this. */
export const MIN_MOVES_FOR_INSIGHT = 15
/** Report a gap between groups only if one loses at least this much more per move. */
const NOTABLE_RATIO = 1.25

/** Plain-language findings, most important first. */
export function insights(summary: Summary): string[] {
  const { overall } = summary
  if (overall.moves < MIN_MOVES_FOR_INSIGHT || overall.avgLoss === 0) return []
  const fmt = (n: number) => n.toFixed(1)
  const enough = (g: GroupStats) => g.moves >= MIN_MOVES_FOR_INSIGHT
  const out: string[] = []

  const phases = summary.byPhase.filter(enough).sort((a, b) => b.avgLoss - a.avgLoss)
  const worst = phases[0]
  if (worst && phases.length > 1 && worst.avgLoss >= overall.avgLoss * NOTABLE_RATIO) {
    out.push(
      `Your costliest phase is the ${worst.label.toLowerCase()}: ${fmt(worst.avgLoss)} points lost per move, ` +
        `vs ${fmt(overall.avgLoss)} on average (${Math.round(worst.share * 100)}% of all points lost).`,
    )
  }

  const rook = summary.rookEndgames
  if (enough(rook)) {
    const ratio = rook.avgLoss / overall.avgLoss
    out.push(
      ratio >= NOTABLE_RATIO
        ? `Rook endgames are a weak spot: ${fmt(rook.avgLoss)} points lost per move, ${fmt(ratio)}× your average, across ${rook.games} ${rook.games === 1 ? 'game' : 'games'}.`
        : `Rook endgames look fine: ${fmt(rook.avgLoss)} points lost per move, close to your ${fmt(overall.avgLoss)} average.`,
    )
  }

  const white = summary.byColor.find((g) => g.key === 'white')
  const black = summary.byColor.find((g) => g.key === 'black')
  if (white && black && enough(white) && enough(black)) {
    const [worse, better] = white.avgLoss >= black.avgLoss ? [white, black] : [black, white]
    if (worse.avgLoss >= better.avgLoss * NOTABLE_RATIO) {
      out.push(
        `You lose more ${worse.label.toLowerCase()}: ${fmt(worse.avgLoss)} vs ${fmt(better.avgLoss)} points per move.`,
      )
    }
  }
  return out
}
