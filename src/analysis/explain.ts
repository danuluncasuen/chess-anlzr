// Plain-language reasons for a move's rating, built only from facts the analysis already has:
// the engine's scores, its best move, its best reply, and the moves on the board.
import { Chess, type PieceSymbol, type Square } from 'chess.js'
import type { Score } from '../engine/types'
import type { Color } from '../types'
import { hasBetterMove, type MoveAnalysis } from './classify'

const PIECE_NAME: Record<PieceSymbol, string> = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king',
}

const EXPLAINED: ReadonlySet<MoveAnalysis['class']> = new Set(['inaccuracy', 'mistake', 'blunder'])

/** What a move does on the board: what it captures (and whether that piece was defended), check, etc. */
export interface MoveFacts {
  captured: { name: string; defended: boolean } | null
  check: boolean
  mate: boolean
  castle: boolean
  promotion: string | null
}

/** Facts about playing `uci` in `fen`, or null if the move isn't legal there. */
export function moveFacts(fen: string, uci: string): MoveFacts | null {
  const chess = new Chess(fen)
  const to = uci.slice(2, 4) as Square
  let move
  try {
    move = chess.move({ from: uci.slice(0, 2), to, promotion: uci.slice(4) || undefined })
  } catch {
    return null
  }
  // A captured piece was defended if its own side attacked the square before the capture.
  const victim = move.color === 'w' ? 'b' : 'w'
  return {
    captured: move.captured
      ? { name: PIECE_NAME[move.captured], defended: new Chess(fen).isAttacked(to, victim) }
      : null,
    check: move.san.includes('+'),
    mate: move.san.includes('#'),
    castle: move.flags.includes('k') || move.flags.includes('q'),
    promotion: move.promotion ? PIECE_NAME[move.promotion] : null,
  }
}

/** ", taking your undefended knight with check" (owner = whose piece gets taken). */
function describe(facts: MoveFacts | null, owner: string): string {
  if (!facts) return ''
  const parts: string[] = []
  if (facts.castle) parts.push('castling')
  if (facts.captured) {
    parts.push(`taking ${owner} ${facts.captured.defended ? '' : 'undefended '}${facts.captured.name}`)
  }
  if (facts.promotion) parts.push(`promoting to a ${facts.promotion}`)
  const text = parts.join(' and ')
  if (facts.mate) return text ? `, ${text} with checkmate` : ', checkmate'
  if (facts.check) return text ? `, ${text} with check` : ', with check'
  return text ? `, ${text}` : ''
}

/** Moves until `color` mates, or null if the score isn't a forced mate for them. */
function mateFor(score: Score, color: Color): number | null {
  return score.type === 'mate' && score.winner === color && score.moves > 0 ? score.moves : null
}

/**
 * Sentences explaining why a move was rated an inaccuracy, mistake or blunder (empty otherwise).
 * `next` is the move actually played after it, to tell whether the punishing reply was found.
 */
export function explainMove(move: MoveAnalysis, next: MoveAnalysis | undefined, myColor: Color): string[] {
  const mine = move.color === myColor
  const opponent: Color = move.color === 'white' ? 'black' : 'white'
  // The side answering the move, first as a full name, then as a pronoun.
  const answerersReply = mine ? 'Your opponent’s' : 'Your'
  const answerer = mine ? 'they' : 'you'
  const moverPossessive = mine ? 'your' : 'their'
  const sentences: string[] = []

  // Mates first: they outweigh everything else.
  const missedMate = mateFor(move.evalBefore, move.color)
  const allowedMate = mateFor(move.evalAfter, opponent)
  if (missedMate !== null && mateFor(move.evalAfter, move.color) === null && move.bestMoveSan) {
    sentences.push(`${move.bestMoveSan} was mate in ${missedMate}.`)
  }
  const explained = EXPLAINED.has(move.class)
  if (!explained && sentences.length === 0) return sentences

  // The punishing reply: the engine's best answer in the position after the move.
  if (move.replyUci && move.replySan && (explained || allowedMate !== null)) {
    const desc = describe(moveFacts(move.fenAfter, move.replyUci), moverPossessive)
    const reply =
      allowedMate !== null && mateFor(move.evalBefore, opponent) === null
        ? `This allows mate in ${allowedMate}, starting with ${move.replySan}`
        : `${answerersReply} best answer was ${move.replySan}${desc}`
    // Whether the answer was actually played (unknown when the game ended right after the move).
    const outcome = !next
      ? '.'
      : next.uci === move.replyUci
        ? `, and ${answerer} found it.`
        : `; ${answerer} played ${next.san} instead.`
    sentences.push(reply + outcome)
  }

  // What the engine wanted instead (a missed mate is already covered above).
  if (hasBetterMove(move) && move.bestMoveUci && missedMate === null) {
    const desc = describe(moveFacts(move.fenBefore, move.bestMoveUci), mine ? 'their' : 'your')
    sentences.push(`Best was ${move.bestMoveSan ?? move.bestMoveUci}${desc}.`)
  }
  return sentences
}
