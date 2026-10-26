import { PgnParseError } from '../chess/positions'
import { db } from '../db/db'
import { isAbortError, type Engine } from '../engine/types'
import type { Analysis, Game } from '../types'
import { analyzeGame } from './analyzeGame'

export const DEFAULT_DEPTH = 12

/** idle: work left, not started. done: nothing left. */
export type QueueStatus = 'idle' | 'running' | 'paused' | 'done'

export interface QueueState {
  status: QueueStatus
  total: number
  /** Games with a usable analysis in the database. */
  analyzed: ReadonlySet<string>
  /** Games that could not be analyzed (e.g. unreadable PGN), with the reason. */
  failed: ReadonlyMap<string, string>
  /** The game being analyzed right now, with position progress. */
  current: { gameId: string; done: number; total: number } | null
  /** Set when the engine itself failed; analysis stops until started again. */
  error: string | null
}

type Listener = () => void

/**
 * Analyzes a list of games one at a time in the background and saves each result.
 * Pausing drops only the game in progress; finished games stay saved, so
 * resuming (even after a reload) continues where it left off.
 */
export class AnalysisQueue {
  private state: QueueState = {
    status: 'done',
    total: 0,
    analyzed: new Set(),
    failed: new Map(),
    current: null,
    error: null,
  }
  private listeners = new Set<Listener>()
  private games: Game[] = []
  private engine: Engine | null = null
  /** Known once the engine has started; before that, any engine's analysis counts. */
  private engineId: string | null = null
  private controller: AbortController | null = null
  private loop: Promise<void> | null = null
  private readonly createEngine: () => Engine
  readonly depth: number

  constructor(createEngine: () => Engine, depth = DEFAULT_DEPTH) {
    this.createEngine = createEngine
    this.depth = depth
  }

  getState = (): QueueState => this.state

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Replaces the games to analyze (in priority order). Stops any running analysis. */
  async setGames(games: Game[]): Promise<void> {
    await this.pause()
    this.games = games
    const analyzed = await this.loadAnalyzed()
    this.update({ total: games.length, analyzed, failed: new Map(), error: null, current: null })
    this.update({ status: this.pending().length > 0 ? 'idle' : 'done' })
  }

  start(): void {
    // With the engine still unknown, run anyway: it may turn some analyses stale.
    if (this.loop || (this.engineId !== null && this.pending().length === 0)) return
    const controller = new AbortController()
    this.controller = controller
    this.update({ status: 'running', error: null })
    this.loop = this.run(controller.signal).finally(() => {
      this.loop = null
      this.controller = null
    })
  }

  /** Stops after cancelling the current game. Resolves once the engine is idle. */
  async pause(): Promise<void> {
    this.controller?.abort()
    await this.loop
  }

  async dispose(): Promise<void> {
    await this.pause()
    this.engine?.dispose()
    this.engine = null
  }

  private async run(signal: AbortSignal): Promise<void> {
    try {
      this.engine ??= this.createEngine()
      this.engineId = await this.engine.init()
      // Now that the engine is known, analyses from a different engine no longer count.
      this.update({ analyzed: await this.loadAnalyzed() })

      for (const game of this.pending()) {
        if (signal.aborted) break
        this.update({ current: { gameId: game.id, done: 0, total: 0 } })
        try {
          const analysis = await analyzeGame(this.engine, game, {
            depth: this.depth,
            signal,
            onProgress: (done, total) => this.update({ current: { gameId: game.id, done, total } }),
          })
          await db.analyses.put(analysis)
          this.update({ analyzed: new Set(this.state.analyzed).add(game.id) })
        } catch (err) {
          if (!(err instanceof PgnParseError)) throw err
          this.update({ failed: new Map(this.state.failed).set(game.id, err.message) })
        }
      }
    } catch (err) {
      if (!isAbortError(err)) {
        // The engine itself broke; start a fresh one next time.
        this.engine?.dispose()
        this.engine = null
        this.update({ error: err instanceof Error ? err.message : String(err) })
      }
    }
    this.update({ current: null, status: this.pending().length > 0 ? 'paused' : 'done' })
  }

  private pending(): Game[] {
    return this.games.filter((g) => !this.state.analyzed.has(g.id) && !this.state.failed.has(g.id))
  }

  private async loadAnalyzed(): Promise<Set<string>> {
    const analyses = await db.analyses.bulkGet(this.games.map((g) => g.id))
    return new Set(analyses.filter((a) => a && this.isUsable(a)).map((a) => a!.gameId))
  }

  private isUsable(a: Analysis): boolean {
    return a.depth >= this.depth && (this.engineId === null || a.engineId === this.engineId)
  }

  private update(patch: Partial<QueueState>) {
    this.state = { ...this.state, ...patch }
    for (const listener of this.listeners) listener()
  }
}
