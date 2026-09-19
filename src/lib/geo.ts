import { LngLatBounds } from 'maplibre-gl'

export function boundsFromCoordinates(coords: unknown): LngLatBounds {
  const bounds = new LngLatBounds()
  walk(coords, bounds)
  return bounds
}

function walk(coords: unknown, bounds: LngLatBounds): void {
  if (!Array.isArray(coords) || coords.length === 0) return
  if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
    bounds.extend([coords[0], coords[1]])
    return
  }
  for (const part of coords) walk(part, bounds)
}
