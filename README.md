# chess-anlzr

Browser-only chess weakness analyzer for chess.com accounts. See [mvp.md](mvp.md) for the spec.

## Commands

```bash
npm install        # once
npm run dev        # dev server at http://localhost:5173
npm test           # unit tests (watch mode); `npm run test:run` for a single run
npm run typecheck  # TypeScript strict check
npm run lint       # oxlint
npm run build      # production build into dist/ (static, for Cloudflare Pages)
npm run serve:lan  # build, then serve on the home network at http://<mac-ip>:4173 (for phones)
```

### Using it from a phone

1. On the Mac: `npm run serve:lan`. It prints a `Network:` address such as `http://192.168.1.33:4173/`.
   macOS may ask whether to allow incoming connections for `node`; allow it.
2. On the phone (same Wi-Fi), open that address. `http://<mac-name>.local:4173` also works
   (Mac name: System Settings → General → Sharing → Local hostname).
3. Optional: Share → **Add to Home Screen** (iPhone) or ⋮ → **Add to Home screen** (Android) for an
   icon that opens the app full-screen. The Mac has to be running `serve:lan` for it to load.

Analyses are stored per device and per address, so the phone analyzes its games itself (slower than a
laptop). It serves the production build rather than the dev server, which shouldn't be exposed to a network.

## Layout

```
src/
  types.ts                 Shared domain types (Game, ...)
  db/db.ts                 Dexie (IndexedDB) schema: games + fetch cache
  chess/positions.ts       PGN -> FEN of every position + per-move info (SAN, UCI, color)
  chess/phase.ts           Opening / middlegame / endgame and the rook-endgame tag, from material
  engine/types.ts          Engine interface (swappable: in-browser now, server later)
  engine/stockfish.ts      Stockfish WASM in a Web Worker
  engine/uci.ts            UCI output parsing, scores converted to White's point of view
  analysis/analyzeGame.ts  Evaluates every position of one game
  analysis/queue.ts        Background queue: one game at a time, pause/resume, saves to IndexedDB
  analysis/classify.ts     Win-probability loss per move -> best/ok/inaccuracy/mistake/blunder
  analysis/accuracy.ts     Lichess accuracy: per move from win% drop, per game volatility-weighted + harmonic mean
  analysis/explain.ts      Plain-language "why" for an error: mate allowed/missed, the punishing reply and
                           whether it was played, what it takes (and if undefended), what the best move does
  analysis/rating.ts       Rough rating estimate from accuracy (calibrated anchor points)
  analysis/summary.ts      Points lost by phase / color / time control / rook endgames, plus insights
  analysis/useClassifiedGames.ts  Loads + classifies analyzed games for the summary (cached per game)
  sources/
    types.ts               GameSource interface (pluggable input: chess.com now, Lichess/PGN later)
    chesscom/api.ts        Raw chess.com API client
    chesscom/normalize.ts  chess.com game -> Game
    chesscom/source.ts     Cached, serial loader: newest months first, up to 3 months
  components/GameList.tsx  Basic game table
  components/AnalysisPanel.tsx  Progress bar + pause/resume
  components/GameDetail.tsx     Per-game view: error counts, eval graph, biggest mistakes, all moves
  components/SummaryView.tsx    "Where you lose points": stat tiles, insights, grouped tables
  components/EvalGraph.tsx      SVG graph of the player's winning chances (hover, click, arrow keys)
  components/GameBoard.tsx      Board for the selected move (react-chessboard): step controls, best-move arrows
  components/MoveCard.tsx       Selected move: rating, winning-chances bar, why it was an error, "show best move"
  components/MoveList.tsx       Two-column move list with ?!/?/?? marks; fills the space beside the board
  components/ClassBadge.tsx     Move rating label with its colored dot
  components/Intro.tsx          Start-page description, shown before any games are loaded
  components/ThemeToggle.tsx    Night/cream theme switch in the top bar
  public/manifest.webmanifest   Home-screen name, colors and icons (icons from scripts/make-icons.mjs)
  theme.ts                 Theme choice (night default, cream alternative), saved in localStorage
  index.css                Color tokens for both themes (#212121 charcoal / #ffe2bd cream) + styles
  App.tsx                  Sticky top bar (logo back to start, username form, section links) + views
scripts/copy-engine.mjs    Copies the Stockfish lite build into public/engine/ (runs before dev/build)
```

## Notes

- **CORS:** verified on 2026-10-22. api.chess.com sends `Access-Control-Allow-Origin: *`, so no proxy is needed.
  Don't add custom request headers; they would trigger a preflight request.
- **Cache:** completed months are cached indefinitely, the current month for 10 minutes and the archive list for 1 hour.
- **Engine:** Stockfish 19 lite single-threaded (~1.8 MB), depth 12. About 5 s per game in Chrome on a laptop.
  Analyses store the engine id and depth; games are re-analyzed automatically if either changes.
- **License:** Stockfish is GPL-3.0. Shipping it means offering its source and license text; check what that
  means for the app's own code before going commercial.
- **Phases:** opening = first 12 moves; endgame = 6 or fewer knights/bishops/rooks/queens left in total
  (replaces the spec's "queens off" rule, which put early queen trades into the endgame); otherwise middlegame.
  Rook endgame = only kings, rooks and pawns left. Constants in `src/chess/phase.ts`.
- **Accuracy:** Lichess's formula (per-move accuracy from the win% drop; per game, the mean of a
  volatility-weighted and a harmonic average). Implemented in `src/analysis/accuracy.ts`.
- **Estimated rating:** `src/analysis/rating.ts` maps accuracy to rating with a log curve fitted on 290
  chess.com blitz player-games (100–3261, engine at depth 12): 64% ≈ 300, 75% ≈ 1000, 81% ≈ 2000.
  One game's accuracy scatters ±15 points, so the summary shows the average with a likely range, and each
  game's estimate starts from the player's usual accuracy and moves only 25% toward that game's
  (`GAME_WEIGHT`). Accuracy flattens out above ~2000, so estimates up there are unreliable.
- **Board:** `react-chessboard` (MIT). Shows the position after the selected move with its squares tinted by
  rating; "Best: …" switches to the position before it, with arrows for the move played and Stockfish's choice.
  Board colors are fixed (cream/brown, like the icon) in both themes.
- **Classification:** a move's loss is the drop in the mover's winning chances (Lichess formula, evals capped at
  ±10 pawns). Thresholds 5 / 10 / 15 points = inaccuracy / mistake / blunder, in `THRESHOLDS` in classify.ts.
  Playing the engine's best move always counts as "best".
