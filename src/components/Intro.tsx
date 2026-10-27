/** What the app does, shown on the start page before any games are loaded. */
export function Intro() {
  return (
    <section className="intro">
      <h2>See where you lose points</h2>
      <p>
        chess-anlzr analyzes your recent chess.com games with Stockfish, right here in your browser, and shows
        where your play slips: by game phase, by color and by time control.
      </p>
      <ul>
        <li>Every move rated by what it cost you: inaccuracies, mistakes and blunders</li>
        <li>An accuracy score for each game, and the rating your play suggests</li>
        <li>An evaluation graph and your biggest mistakes for every game</li>
      </ul>
      <p className="muted">
        Enter your chess.com username above to start. Nothing is uploaded: games come from chess.com’s public
        API and the analysis stays on this device. The first run takes a few seconds per game; results are
        saved for next time.
      </p>
    </section>
  )
}
