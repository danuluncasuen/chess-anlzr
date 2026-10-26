import { abortError, type Engine, type PositionEval } from './types'
import { parseBestMove, parseInfo, sideToMove, toWhitePov, type InfoLine } from './uci'

/** Served from public/engine/ (copied there by scripts/copy-engine.mjs). */
const ENGINE_URL = `${import.meta.env.BASE_URL}engine/stockfish-lite-single.js`

type LineListener = (line: string) => void

/**
 * Stockfish WASM running in its own Web Worker (the engine file is itself a
 * worker script), so analysis never blocks the page. Searches run one at a time.
 */
export class StockfishEngine implements Engine {
  private worker: Worker | null = null
  private ready: Promise<string> | null = null
  private listeners = new Set<LineListener>()
  /** Rejects every pending command if the engine crashes or is shut down. */
  private rejectors = new Set<(err: Error) => void>()
  private failure: Error | null = null
  /** Tail of the one-search-at-a-time chain. */
  private queue: Promise<unknown> = Promise.resolve()

  init(): Promise<string> {
    this.ready ??= this.start()
    return this.ready
  }

  evaluate(fen: string, options: { depth: number; signal?: AbortSignal }): Promise<PositionEval> {
    const run = () => this.search(fen, options)
    const result = this.queue.then(run, run)
    this.queue = result.catch(() => {})
    return result
  }

  dispose(): void {
    this.worker?.terminate()
    this.worker = null
    this.fail(new Error('Engine was shut down'))
  }

  private async start(): Promise<string> {
    const worker = new Worker(ENGINE_URL)
    this.worker = worker
    worker.onmessage = (e: MessageEvent) => {
      for (const listener of [...this.listeners]) listener(String(e.data))
    }
    worker.onerror = (e) => this.fail(new Error(`Engine crashed: ${e.message || 'unknown error'}`))

    let id = 'Stockfish'
    await this.send('uci', (line) => {
      if (line.startsWith('id name ')) id = line.slice('id name '.length).trim()
      return line === 'uciok'
    })
    await this.send('isready', (line) => line === 'readyok')
    return id
  }

  private async search(
    fen: string,
    { depth, signal }: { depth: number; signal?: AbortSignal },
  ): Promise<PositionEval> {
    await this.init()
    if (signal?.aborted) throw abortError()

    let last: InfoLine | null = null
    let bestMove: string | null = null
    const onAbort = () => this.worker?.postMessage('stop')
    signal?.addEventListener('abort', onAbort, { once: true })
    try {
      this.worker?.postMessage(`position fen ${fen}`)
      await this.send(`go depth ${depth}`, (line) => {
        const info = parseInfo(line)
        if (info && info.multipv === 1 && !info.bound) last = info
        const best = parseBestMove(line)
        if (best === undefined) return false
        bestMove = best
        return true
      })
    } finally {
      signal?.removeEventListener('abort', onAbort)
    }

    // A stopped search still ends with "bestmove", but its result is partial.
    if (signal?.aborted) throw abortError()
    const info = last as InfoLine | null
    if (!info) throw new Error(`Engine returned no score for ${fen}`)
    return { score: toWhitePov(info.score, sideToMove(fen)), bestMove, depth: info.depth }
  }

  /** Posts a command and resolves once `isDone` accepts an output line. */
  private send(command: string, isDone: (line: string) => boolean): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.failure || !this.worker) return reject(this.failure ?? new Error('Engine not started'))
      const listener = (line: string) => {
        if (!isDone(line)) return
        this.listeners.delete(listener)
        this.rejectors.delete(onFail)
        resolve()
      }
      const onFail = (err: Error) => {
        this.listeners.delete(listener)
        reject(err)
      }
      this.listeners.add(listener)
      this.rejectors.add(onFail)
      this.worker.postMessage(command)
    })
  }

  private fail(err: Error) {
    this.failure ??= err
    for (const reject of [...this.rejectors]) reject(err)
    this.rejectors.clear()
  }
}
