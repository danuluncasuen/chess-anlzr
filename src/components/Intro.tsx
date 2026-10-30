import { useState } from 'react'
import { Chessboard } from 'react-chessboard'
import { DARK_SQUARE, LIGHT_SQUARE } from './boardColors'

/** Final position of Morphy's "Opera Game" (Paris, 1858), after 17. Rd8#. */
const OPERA_GAME_FINAL = '1n1Rkb1r/p4ppp/4q3/4p1B1/4P3/8/PPP2PPP/2K5 b k - 1 17'

const dateLine = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

interface Props {
  /** Moves focus to the username field in the top bar. */
  onStart: () => void
}

/** The start page, laid out like a newspaper front page, shown before any games are loaded. */
export function Intro({ onStart }: Props) {
  // Today's date for the masthead, fixed when the page opens.
  const [today] = useState(() => dateLine.format(new Date()))

  return (
    <article className="paper">
      <header className="masthead">
        <div className="masthead-meta">
          <span>Vol. I · No. 1</span>
          <span>{today}</span>
          <span>
            {/* The edition follows the theme: cream paper in the morning, charcoal at night */}
            <span className="edition-night">Night edition</span>
            <span className="edition-cream">Morning edition</span> · Free
          </span>
        </div>
        <h2 className="masthead-title">The chess-anlzr</h2>
        <p className="masthead-motto">Every move, weighed and measured</p>
      </header>

      <div className="paper-lead">
        <div className="lead-story">
          <p className="kicker">Front page</p>
          <h3 className="headline">Local player finally learns where the points go</h3>
          <p className="deck">
            A new tool replays your recent chess.com games with Stockfish, right in your browser, and reports
            exactly where your play slips.
          </p>
          <p className="byline">By Stockfish · Staff analyst</p>
          <div className="story-columns">
            <p className="dropcap">
              For years the evidence was scattered across hundreds of games. Now it’s in one place: every move
              rated by what it cost you, from harmless inaccuracies to outright blunders, and summed up by game
              phase, by color and by time control.
            </p>
            <blockquote className="pull-quote">
              Most games aren’t lost to brilliant attacks. They’re lost one quiet inaccuracy at a time.
            </blockquote>
            <p>
              The analysis runs entirely on your own device. Nothing is uploaded: games come straight from
              chess.com’s public API, and the results are saved for your next visit.
            </p>
          </div>
          <button type="button" className="cta" onClick={onStart}>
            Analyze my games →
          </button>
        </div>

        <figure className="lead-figure">
          <div className="figure-board" aria-hidden="true">
            <Chessboard
              options={{
                id: 'front-page-board',
                position: OPERA_GAME_FINAL,
                allowDragging: false,
                allowDrawingArrows: false,
                showNotation: false,
                lightSquareStyle: LIGHT_SQUARE,
                darkSquareStyle: DARK_SQUARE,
              }}
            />
          </div>
          <figcaption>
            <strong>Fig. 1</strong> Morphy’s 17. Rd8#, Paris, 1858. Your games may be less famous, but they get
            the same treatment.
          </figcaption>
        </figure>
      </div>

      <div className="paper-sections">
        <section>
          <p className="kicker">Analysis</p>
          <h4>Every move graded</h4>
          <p>Inaccuracies, mistakes and blunders, measured by how much of your winning chances each move gave away.</p>
        </section>
        <section>
          <p className="kicker">Report card</p>
          <h4>Accuracy, and the rating it suggests</h4>
          <p>A score for every game, and an estimate of the level your play reflects, with an honest range.</p>
        </section>
        <section>
          <p className="kicker">Study</p>
          <h4>Replay it, then rewrite it</h4>
          <p>Step through each game on a board, see what Stockfish preferred and why, and try your own lines.</p>
        </section>
        <aside className="forecast">
          <p className="kicker">Forecast</p>
          <p>Scattered blunders in the middlegame, clearing toward the endgame. Bring a spare pawn.</p>
        </aside>
      </div>

      <p className="paper-notice">
        Notice to readers: free, no account needed. Enter your chess.com username in the bar above to print
        your own edition.
      </p>
    </article>
  )
}
