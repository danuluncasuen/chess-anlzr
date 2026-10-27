import { CLASS_LABEL, type MoveClass } from '../analysis/classify'

/** A move rating as a label; inaccuracies, mistakes and blunders get a colored dot. */
export function ClassBadge({ cls }: { cls: MoveClass }) {
  return (
    <span className="class-badge">
      <span className={`dot dot-${cls}`} aria-hidden="true" />
      {CLASS_LABEL[cls]}
    </span>
  )
}
