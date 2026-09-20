import type { SectorFilter } from './facility'
import type { PanelTab } from './types'

export type MapRoute = {
  dep: string | null
  id: string | null
  q: string
  sector: SectorFilter
  tab: PanelTab
}

const SECTORS: SectorFilter[] = ['all', 'public', 'private']
const TABS: PanelTab[] = ['ficha', 'renipress']

export function emptyRoute(): MapRoute {
  return { dep: null, id: null, q: '', sector: 'all', tab: 'ficha' }
}

export function parseRoute(search = window.location.search): MapRoute {
  const params = new URLSearchParams(search)
  const sector = params.get('sector')
  const tab = params.get('tab')
  return {
    dep: params.get('dep'),
    id: params.get('id'),
    q: params.get('q') ?? '',
    sector: SECTORS.includes(sector as SectorFilter) ? (sector as SectorFilter) : 'all',
    tab: TABS.includes(tab as PanelTab) ? (tab as PanelTab) : 'ficha',
  }
}

export function routeSearch(route: MapRoute): string {
  const params = new URLSearchParams()
  if (route.dep) params.set('dep', route.dep)
  if (route.dep && route.id) params.set('id', route.id)
  if (route.dep && route.q.trim()) params.set('q', route.q.trim())
  if (route.dep && route.sector !== 'all') params.set('sector', route.sector)
  if (route.dep && route.id && route.tab !== 'ficha') params.set('tab', route.tab)
  const text = params.toString()
  return text ? `?${text}` : ''
}

export function applyRoute(route: MapRoute, mode: 'push' | 'replace') {
  const next = `${window.location.pathname}${routeSearch(route)}`
  const current = `${window.location.pathname}${window.location.search}`
  if (next === current) return
  if (mode === 'push') window.history.pushState(route, '', next)
  else window.history.replaceState(route, '', next)
}

export function navKey(route: MapRoute): string {
  return `${route.dep ?? ''}|${route.id ?? ''}`
}
