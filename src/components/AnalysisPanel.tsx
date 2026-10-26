import type { AnalysisQueue, QueueState } from '../analysis/queue'

interface Props {
  queue: AnalysisQueue
  state: QueueState
}

export function AnalysisPanel({ queue, state }: Props) {
  const { status, total, analyzed, failed, current, error } = state
  if (total === 0) return null

  const finished = analyzed.size + failed.size
  // Count the game in progress fractionally so the bar moves smoothly.
  const partial = current && current.total > 0 ? current.done / current.total : 0
  const percent = Math.round(((finished + partial) / total) * 100)

  return (
    <section className="analysis">
      <div className="analysis-header">
        <span>
          {status === 'done'
            ? `All ${total} games analyzed`
            : `Analyzed ${analyzed.size} of ${total} games`}
          {failed.size > 0 && <span className="muted"> ({failed.size} could not be read)</span>}
          {current && current.total > 0 && (
            <span className="muted">
              {' '}
              · current game: position {current.done}/{current.total}
            </span>
          )}
        </span>
        {status === 'running' && (
          <button type="button" onClick={() => void queue.pause()}>
            Pause
          </button>
        )}
        {(status === 'paused' || status === 'idle') && (
          <button type="button" onClick={() => queue.start()}>
            {status === 'idle' ? 'Analyze' : 'Resume'}
          </button>
        )}
      </div>
      <progress max={100} value={percent} aria-label="Analysis progress" />
      {error && <p className="error">Engine error: {error}</p>}
    </section>
  )
}
