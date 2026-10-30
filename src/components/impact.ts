import type { MoveClass } from '../analysis/classify'

/** How strongly the board reacts to a move, by its rating: shake distance (px) and ring width (px). */
const IMPACT: Partial<Record<MoveClass, { shake: number; ring: number; color: string }>> = {
  blunder: { shake: 7, ring: 5, color: '--blunder' },
  mistake: { shake: 3, ring: 4, color: '--mistake' },
  inaccuracy: { shake: 0, ring: 3, color: '--inaccuracy' },
}

/**
 * Shakes `el` and flashes a colored ring around it, harder for worse moves: a clear shake for a
 * blunder, a small one for a mistake, only a faint ring for an inaccuracy. With reduced motion
 * turned on, there's no shake, only the ring.
 */
export function playImpact(el: HTMLElement | null, moveClass: MoveClass | undefined): void {
  if (!el || typeof el.animate !== 'function') return
  // Stop the previous move's effect so quick stepping never stacks them.
  for (const animation of el.getAnimations()) animation.cancel()
  const impact = moveClass && IMPACT[moveClass]
  if (!impact) return

  const color = getComputedStyle(el).getPropertyValue(impact.color).trim() || 'red'
  el.animate(
    [
      { boxShadow: `0 0 0 ${impact.ring}px ${color}` },
      { boxShadow: `0 0 0 ${impact.ring}px ${color}`, offset: 0.4 },
      { boxShadow: `0 0 0 0 transparent` },
    ],
    { duration: 1100, easing: 'ease-out' },
  )

  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (impact.shake === 0 || reduceMotion) return
  const d = impact.shake
  el.animate(
    [0, -d, d, -d * 0.7, d * 0.7, -d * 0.35, d * 0.35, 0].map((x) => ({ transform: `translateX(${x}px)` })),
    { duration: 450, easing: 'ease-out' },
  )
}
