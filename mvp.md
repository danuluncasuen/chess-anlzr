# Chess Analysis Tool: MVP Spec

A browser-based tool that takes a chess.com username, analyzes the player's recent games locally with Stockfish, and shows where they lose the most points. The aim is an aggregate weakness profile across many games, not just single-game review.

## Product vision (context only, not MVP)
- Free tier: unlimited game analysis. Stockfish runs in the user's browser, so server cost stays near zero.
- Later paid features: motif/pattern detection (forks, pins, hanging pieces, king exposure), then puzzle suggestions matched to the user's weaknesses (Lichess puzzle DB is open and theme-tagged).
- Ads are deliberately skipped early on; revenue path is a subscription for the advanced features.

## MVP goal
Enter a chess.com username, get the last ~30 games analyzed in the browser, and see a summary of where points are lost. Done when it runs on a real account (the author's own: `dlunc`) and surfaces known weaknesses (king safety, rook endgames).

## In scope
- Username input; fetch games from chess.com's public API (last 1-3 months of archives).
- Local caching of games and analysis (IndexedDB), so a repeat visit does not redo work.
- Stockfish WASM analysis in a Web Worker, with a progress bar and a background queue (cancel/resume).
- Move classification: inaccuracy, mistake, blunder, based on win-probability loss.
- Game list, with a per-game eval graph and a list of the biggest mistakes.
- Summary view: points lost by phase (opening / middlegame / endgame), by color, and by time control, plus a "rook endgame" tag.

## Out of scope (for now)
Accounts, payments, ads, motif detection, puzzles, Lichess and PGN upload, any backend.

## Architecture
- Frontend only: Vite + React + TypeScript, deployed as a static site on Cloudflare Pages (free tier).
- Libraries:
  - `chess.js` for PGN parsing and move legality
  - Stockfish WASM, lite single-threaded build, run in a Web Worker
  - IndexedDB via Dexie for storage
- Fetching: call the chess.com public API directly from the browser. **First task: verify CORS works.** If it is blocked, add a tiny Cloudflare Worker proxy that forwards and caches requests.
- Single-threaded WASM is chosen on purpose: multithreaded builds need cross-origin-isolation headers (COOP/COEP), which complicates hosting and are not needed at this rating level.

### chess.com API notes
- Archives list: `https://api.chess.com/pub/player/{username}/games/archives`
- Monthly games: `https://api.chess.com/pub/player/{username}/games/{YYYY}/{MM}` (includes PGN per game)
- No auth needed. Be polite: serial requests, cache aggressively, send a descriptive User-Agent where possible.
- Read chess.com's API/data terms before any commercial use.

## Data model
- **Game**: id, username, endTime, timeClass, myColor, result, myRating, opponentRating, pgn, opening
- **Analysis**: gameId, engineVersion, depth, plies[] (each with eval as centipawns or mate, and best move)
- **Move**: ply, san, centipawnLoss, winProbLoss, class, phase, tags[]
- **Summary**: computed on the fly from moves, not stored

Store engine version and depth with each analysis so games can be re-analyzed later without confusion.

## Classification rules (v1)
- **Loss**: compare eval before and after the player's move from the player's side. Convert centipawns to win probability so a 100 cp drop in an already lost position counts less than in an equal one. Tune thresholds against real games.
- **Phases**: opening runs to roughly move 10-12; endgame starts when queens are off or non-pawn material drops below a threshold.
- **Rook-endgame tag**: only rooks and pawns (plus kings) remain. Material-based, no pattern recognition needed.

## Defaults (change if needed)
- Depth 12, single-threaded.
- Default 30 games, adjustable.
- One repo, created from the Vite React-TS template.

## Build order
1. Project scaffold, chess.com fetcher with caching, basic game list. Verify CORS here.
2. PGN to positions to FEN, with a unit test on a known game.
3. Engine worker with a queue, fixed depth (~12), and cancel/resume.
4. Move classification and the per-game eval graph.
5. Summary view, then test on real games.

Expect tens of seconds per game on a laptop, so analyzing 30 games runs in the background while the user browses.

## Risks and open questions
- CORS on the chess.com API (check in step 1).
- Analysis speed on weak phones; consider a lower depth option.
- Chess.com API rate limits and terms of use.
- Pattern recognition is the hard part later; start rule-based on engine output, not ML.
- Keep the input layer pluggable so Lichess or PGN upload can be added later.

## Instructions for Claude Code
- Start with step 1 of the build order; do not build ahead.
- Keep the code in TypeScript with strict mode on, and write unit tests for the PGN-to-positions logic and the classification math.
- Keep the engine behind a small interface so it can be swapped or moved server-side later.
- Ask before adding dependencies beyond those listed above.