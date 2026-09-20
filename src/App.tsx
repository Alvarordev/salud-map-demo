import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DetailPanel } from './components/DetailPanel'
import { MapView } from './components/MapView'
import { matchesQuery, matchesSectorFilter } from './lib/facility'
import { applyRoute, navKey, parseRoute, type MapRoute } from './lib/route'
import type { DepartmentIndex, FacilityProperties } from './lib/types'

export default function App() {
  const initial = useRef(parseRoute())
  const [index, setIndex] = useState<DepartmentIndex[]>([])
  const [selectedDep, setSelectedDep] = useState<string | null>(initial.current.dep)
  const [facility, setFacility] = useState<FacilityProperties | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(initial.current.id)
  const [facilities, setFacilities] = useState<FacilityProperties[]>([])
  const [query, setQuery] = useState(initial.current.q)
  const [sectorFilter, setSectorFilter] = useState(initial.current.sector)
  const [tab, setTab] = useState(initial.current.tab)

  const visibleFacilities = useMemo(
    () =>
      facilities.filter((f) => matchesSectorFilter(f, sectorFilter) && matchesQuery(f, query)),
    [facilities, sectorFilter, query],
  )

  const route: MapRoute = useMemo(
    () => ({
      dep: selectedDep,
      id: facility ? String(facility.objectid) : pendingId,
      q: query,
      sector: sectorFilter,
      tab,
    }),
    [selectedDep, facility, pendingId, query, sectorFilter, tab],
  )

  useEffect(() => {
    void fetch(new URL('/data/index.json', window.location.origin))
      .then((res) => res.json())
      .then((rows: DepartmentIndex[]) => {
        const next = rows.filter((row) => row.NOMBDEP !== 'SIN_UBIGEO')
        setIndex(next)
        const dep = initial.current.dep
        if (dep && !next.some((row) => row.NOMBDEP === dep)) {
          setSelectedDep(null)
          setPendingId(null)
        }
      })
  }, [])

  useEffect(() => {
    if (!selectedDep) {
      setFacilities([])
      setFacility(null)
      return
    }
    let cancelled = false
    setFacilities([])
    const file = selectedDep.replaceAll(' ', '_')
    void fetch(`/data/establecimientos/${file}.geojson`)
      .then((res) => res.json())
      .then((data: { features: { geometry: { coordinates: [number, number] }; properties: FacilityProperties }[] }) => {
        if (cancelled) return
        setFacilities(
          data.features.map((f) => ({
            ...f.properties,
            lng: f.geometry.coordinates[0],
            lat: f.geometry.coordinates[1],
          })),
        )
      })
    return () => {
      cancelled = true
    }
  }, [selectedDep])

  useEffect(() => {
    if (!pendingId) return
    const match = facilities.find((f) => String(f.objectid) === pendingId)
    if (match) {
      setFacility(match)
      setPendingId(null)
    } else if (facilities.length) {
      setPendingId(null)
    }
  }, [facilities, pendingId])

  useEffect(() => {
    if (!facility) return
    if (!visibleFacilities.some((f) => String(f.objectid) === String(facility.objectid))) {
      setFacility(null)
      setTab('ficha')
    }
  }, [visibleFacilities, facility])

  const prevNav = useRef(navKey(route))
  useEffect(() => {
    const key = navKey(route)
    const mode = key === prevNav.current ? 'replace' : 'push'
    prevNav.current = key
    applyRoute(route, mode)
  }, [route])

  useEffect(() => {
    const onPop = () => {
      const next = parseRoute()
      prevNav.current = navKey(next)
      setSelectedDep(next.dep)
      setQuery(next.q)
      setSectorFilter(next.sector)
      setTab(next.tab)
      if (next.id) {
        setPendingId(next.id)
        setFacility(null)
      } else {
        setPendingId(null)
        setFacility(null)
      }
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const onSelectDepartment = useCallback((name: string) => {
    setSelectedDep(name)
    setFacility(null)
    setPendingId(null)
    setQuery('')
    setSectorFilter('all')
    setTab('ficha')
  }, [])

  const onSelectFacility = useCallback((next: FacilityProperties) => {
    setFacility(next)
    setPendingId(null)
    setTab('ficha')
  }, [])

  const onPeru = useCallback(() => {
    setSelectedDep(null)
    setFacility(null)
    setPendingId(null)
    setQuery('')
    setSectorFilter('all')
    setTab('ficha')
  }, [])

  const onDepartment = useCallback(() => {
    setFacility(null)
    setPendingId(null)
    setTab('ficha')
  }, [])

  const onBack = useCallback(() => {
    if (facility || pendingId) onDepartment()
    else onPeru()
  }, [facility, pendingId, onDepartment, onPeru])

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <p className="topbar-kicker">CENEPRED · SUSALUD</p>
          <h1>Establecimientos de salud</h1>
        </div>
        <p className="topbar-meta">16 624 centros · 25 departamentos</p>
      </header>
      <div className="split">
        <MapView
          selectedDep={selectedDep}
          facility={facility}
          facilities={visibleFacilities}
          onBack={selectedDep ? onBack : undefined}
          onSelectDepartment={onSelectDepartment}
          onSelectFacility={onSelectFacility}
        />
        <DetailPanel
          department={selectedDep}
          facility={facility}
          tab={tab}
          departments={index}
          facilities={visibleFacilities}
          totalFacilities={facilities.length}
          query={query}
          sectorFilter={sectorFilter}
          onQuery={setQuery}
          onSectorFilter={setSectorFilter}
          onTab={setTab}
          onPeru={onPeru}
          onDepartment={onDepartment}
          onSelectDepartment={onSelectDepartment}
          onSelectFacility={onSelectFacility}
        />
      </div>
    </div>
  )
}
