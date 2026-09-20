import type { FacilityProperties } from './types'

export type SectorFilter = 'all' | 'public' | 'private'

export function isPrivateFacility(f: FacilityProperties): boolean {
  return f.institucion === 'PRIVADO'
}

export function matchesSectorFilter(f: FacilityProperties, filter: SectorFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'private') return isPrivateFacility(f)
  return !isPrivateFacility(f)
}

export function matchesQuery(f: FacilityProperties, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [f.nombre, f.distrito, f.institucion, String(f.codigoMinsa ?? '')]
    .join(' ')
    .toLowerCase()
    .includes(q)
}
