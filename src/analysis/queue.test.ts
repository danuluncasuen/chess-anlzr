import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/db'
import { abortError, type Engine, type PositionEval } from '../engine/types'
import type { Game } from '../types'
import { AnalysisQueue } from './queue'

/** Answers every position with 0.00 after a macrotask, so pausing can interrupt it. */
class FakeEngine implements Engine {
  evaluated = 0
  private id: string
  constructor(id = 'Fake 1') {
    this.id = id
  }
  async init() {
    return this.id
  }
  evaluate(_fen: string, { depth, signal }: { depth: number; signal?: AbortSignal }) {
    return new Promise<PositionEval>((resolve, reject) => {
      if (signal?.aborted) return reject(abortError())
      setTimeout(() => {
        if (signal?.aborted) return reject(abortError())
        this.evaluated++
        resolve({ score: { type: 'cp', value: 0 }, bestMove: null, depth })
      })
    })
  }
  dispose() {}
}

function game(id: string, pgn = '1. e4 e5 2. Nf3 *'): Game {
  return {
    id,
    username: 'dlunc',
    source: 'chesscom',
    url: '',
    endTime: 0,
    timeClass: 'blitz',
    timeControl: '180',
    myColor: 'white',
    result: 'win',
    myRating: 1000,
    opponentName: 'x',
    opponentRating: 1000,
    opening: null,
    pgn,
  }
}

/** Resolves when the queue stops running. */
function settled(queue: AnalysisQueue): Promise<void> {
  return new Promise((resolve) => {
    const unsubscribe = queue.subscribe(() => {
      if (queue.getState().status !== 'running') {
        unsubscribe()
        resolve()
      }
    })
  })
}

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

describe('AnalysisQueue', () => {
  it('analyzes every position of every game and saves the results', async () => {
    const engine = new FakeEngine()
    const queue = new AnalysisQueue(() => engine, 12)
    await queue.setGames([game('a'), game('b')])
    expect(queue.getState().status).toBe('idle')

    queue.start()
    await settled(queue)

    expect(queue.getState()).toMatchObject({ status: 'done', current: null, error: null })
    expect([...queue.getState().analyzed]).toEqual(['a', 'b'])
    const saved = await db.analyses.get('a')
    expect(saved).toMatchObject({ gameId: 'a', engineId: 'Fake 1', depth: 12 })
    expect(saved?.plies).toHaveLength(4) // start + 3 moves
    expect(engine.evaluated).toBe(8)
  })

  it('skips games already analyzed by the same engine at enough depth', async () => {
    const first = new AnalysisQueue(() => new FakeEngine(), 12)
    await first.setGames([game('a')])
    first.start()
    await settled(first)

    const engine = new FakeEngine()
    const second = new AnalysisQueue(() => engine, 12)
    await second.setGames([game('a'), game('b')])
    expect([...second.getState().analyzed]).toEqual(['a'])
    second.start()
    await settled(second)
    expect(engine.evaluated).toBe(4) // only game b
  })

  it('redoes games analyzed by a different engine or at lower depth', async () => {
    const old = new AnalysisQueue(() => new FakeEngine('Old engine'), 8)
    await old.setGames([game('a')])
    old.start()
    await settled(old)

    const deeper = new AnalysisQueue(() => new FakeEngine('Old engine'), 12)
    await deeper.setGames([game('a')])
    expect(deeper.getState().status).toBe('idle')

    const engine = new FakeEngine('New engine')
    const newer = new AnalysisQueue(() => engine, 8)
    await newer.setGames([game('a')])
    newer.start()
    await settled(newer)
    expect(engine.evaluated).toBe(4)
    expect((await db.analyses.get('a'))?.engineId).toBe('New engine')
  })

  it('pauses mid-game and resumes without redoing finished games', async () => {
    const engine = new FakeEngine()
    const queue = new AnalysisQueue(() => engine, 12)
    await queue.setGames([game('a'), game('b')])

    // Pause as soon as game b has started.
    const unsubscribe = queue.subscribe(() => {
      if (queue.getState().current?.gameId === 'b' && queue.getState().current!.done === 1) {
        unsubscribe()
        void queue.pause()
      }
    })
    queue.start()
    await settled(queue)

    expect(queue.getState().status).toBe('paused')
    expect([...queue.getState().analyzed]).toEqual(['a'])
    expect(await db.analyses.get('b')).toBeUndefined()

    queue.start()
    await settled(queue)
    expect(queue.getState().status).toBe('done')
    expect(await db.analyses.count()).toBe(2)
    expect(engine.evaluated).toBe(4 + 1 + 4) // a, b's first position, then b again
  })

  it('marks unreadable games as failed and carries on', async () => {
    const queue = new AnalysisQueue(() => new FakeEngine(), 12)
    await queue.setGames([game('bad', '1. e4 e5 2. Ke3 *'), game('good')])
    queue.start()
    await settled(queue)

    expect(queue.getState().status).toBe('done')
    expect([...queue.getState().failed.keys()]).toEqual(['bad'])
    expect([...queue.getState().analyzed]).toEqual(['good'])
  })

  it('stops and reports an error when the engine breaks', async () => {
    const broken: Engine = {
      init: async () => 'Broken',
      evaluate: async () => {
        throw new Error('Engine crashed: out of memory')
      },
      dispose: () => {},
    }
    const queue = new AnalysisQueue(() => broken, 12)
    await queue.setGames([game('a')])
    queue.start()
    await settled(queue)

    expect(queue.getState()).toMatchObject({ status: 'paused', error: 'Engine crashed: out of memory' })
  })
})
