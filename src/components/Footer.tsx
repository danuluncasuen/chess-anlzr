import { useEffect, useState } from 'react'
import { formatBytes, savedDataSize } from '../db/storage'

const REPO_URL = 'https://github.com/danuluncasuen/chess-anlzr'
const STOCKFISH_SOURCE_URL = 'https://github.com/nmrugg/stockfish.js'

interface Props {
  /** Changes whenever more gets saved (e.g. the number of analyzed games), to refresh the size. */
  savedVersion: number
  onClearData: () => Promise<void>
}

/**
 * License and source notices (the app and Stockfish are GPL-3.0), the chess.com disclaimer, and
 * how much this device has saved, with a button to delete it.
 */
export function Footer({ savedVersion, onClearData }: Props) {
  return (
    <footer className="site-footer">
      <SavedData version={savedVersion} onClear={onClearData} />
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

function SavedData({ version, onClear }: { version: number; onClear: () => Promise<void> }) {
  const [size, setSize] = useState<number | null>(null)
  const [state, setState] = useState<'idle' | 'confirm' | 'clearing'>('idle')

  useEffect(() => {
    let cancelled = false
    void savedDataSize().then((bytes) => {
      if (!cancelled) setSize(bytes)
    })
    return () => {
      cancelled = true
    }
  }, [version])

  const amount = size === null ? '' : ` (${formatBytes(size)})`
  return (
    <p className="saved-data">
      {state === 'idle' ? (
        <>
          Your games and analyses are saved in this browser only{amount}.{' '}
          <button type="button" className="footer-button" onClick={() => setState('confirm')}>
            Clear saved data
          </button>
        </>
      ) : (
        <>
          Delete all saved games and analyses{amount} from this browser? They’ll be fetched and analyzed
          again next time.{' '}
          <button
            type="button"
            className="footer-button danger"
            disabled={state === 'clearing'}
            onClick={() => {
              setState('clearing')
              void onClear()
            }}
          >
            {state === 'clearing' ? 'Deleting…' : 'Delete'}
          </button>{' '}
          <button type="button" className="footer-button" onClick={() => setState('idle')} disabled={state === 'clearing'}>
            Cancel
          </button>
        </>
      )}
    </p>
  )
}
