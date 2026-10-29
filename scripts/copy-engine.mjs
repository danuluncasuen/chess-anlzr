// Copies the Stockfish lite single-threaded build from node_modules into public/engine/,
// so only these two files (~1.8 MB) get served instead of the whole 200 MB package,
// plus Stockfish's license (GPL-3.0), which has to ship with it (linked from the page footer).
// Runs automatically before `npm run dev` and `npm run build`.
import { copyFileSync, mkdirSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'node_modules/stockfish/bin')
const dest = join(root, 'public/engine')

mkdirSync(dest, { recursive: true })
for (const ext of ['js', 'wasm']) {
  const file = readdirSync(src).find((f) => f.endsWith(`-lite-single.${ext}`))
  if (!file) throw new Error(`No *-lite-single.${ext} found in ${src}`)
  // The .js loads the .wasm with the same base name, so both get the same new name.
  copyFileSync(join(src, file), join(dest, `stockfish-lite-single.${ext}`))
}
copyFileSync(join(root, 'node_modules/stockfish/Copying.txt'), join(dest, 'COPYING.txt'))
console.log('Copied Stockfish engine and license to public/engine/')
