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
```

## Layout

```
src/
  types.ts                 Shared domain types (Game, ...)
  db/db.ts                 Dexie (IndexedDB) schema: games + fetch cache
  sources/
    types.ts               GameSource interface (pluggable input: chess.com now, Lichess/PGN later)
    chesscom/api.ts        Raw chess.com API client
    chesscom/normalize.ts  chess.com game -> Game
    chesscom/source.ts     Cached, serial loader: newest months first, up to 3 months
  components/GameList.tsx  Basic game table
  App.tsx                  Username form + list
```

## Notes

- **CORS:** verified on 2026-10-22. api.chess.com sends `Access-Control-Allow-Origin: *`, so no proxy is needed.
  Don't add custom request headers; they would trigger a preflight request.
- **Cache:** completed months are cached indefinitely, the current month for 10 minutes and the archive list for 1 hour.
