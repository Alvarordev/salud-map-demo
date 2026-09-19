/** CSS cubic-bezier(0.77, 0, 0.175, 1) as a unit-time function. */
export function easeInOutStrong(t: number): number {
  return cubicBezier(0.77, 0, 0.175, 1, t)
}

function cubicBezier(x1: number, y1: number, x2: number, y2: number, t: number): number {
  const cx = 3 * x1
  const bx = 3 * (x2 - x1) - cx
  const ax = 1 - cx - bx
  const cy = 3 * y1
  const by = 3 * (y2 - y1) - cy
  const ay = 1 - cy - by

  let x = t
  for (let i = 0; i < 6; i += 1) {
    const sample = ((ax * x + bx) * x + cx) * x - t
    const deriv = (3 * ax * x + 2 * bx) * x + cx
    if (Math.abs(deriv) < 1e-6) break
    x -= sample / deriv
  }
  return ((ay * x + by) * x + cy) * x
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
