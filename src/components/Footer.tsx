const REPO_URL = 'https://github.com/danuluncasuen/chess-anlzr'
const STOCKFISH_SOURCE_URL = 'https://github.com/nmrugg/stockfish.js'

/** License and source notices (the app and Stockfish are GPL-3.0), and the chess.com disclaimer. */
export function Footer() {
  return (
    <footer className="site-footer">
      <p>
        chess-anlzr is free software under the{' '}
        <a href={`${REPO_URL}/blob/master/LICENSE`} target="_blank" rel="noreferrer">
          GPL-3.0
        </a>{' '}
        ·{' '}
        <a href={REPO_URL} target="_blank" rel="noreferrer">
          source code
        </a>
      </p>
      <p>
        Analysis by Stockfish, also GPL-3.0 (
        <a href={`${import.meta.env.BASE_URL}engine/COPYING.txt`} target="_blank" rel="noreferrer">
          license
        </a>
        ,{' '}
        <a href={STOCKFISH_SOURCE_URL} target="_blank" rel="noreferrer">
          source
        </a>
        )
      </p>
      <p>Not affiliated with or endorsed by Chess.com. Games are loaded from its public API.</p>
    </footer>
  )
}
