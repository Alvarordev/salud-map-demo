import { useCallback, useEffect, useMemo, useState } from 'react'
import { DetailPanel } from './components/DetailPanel'
import { MapView } from './components/MapView'
import { matchesSectorFilter, type SectorFilter } from './lib/facility'
import type { DepartmentIndex, FacilityProperties, PanelTab } from './lib/types'

export default function App() {
  const [index, setIndex] = useState<DepartmentIndex[]>([])
  const [selectedDep, setSelectedDep] = useState<string | null>(null)
  const [facility, setFacility] = useState<FacilityProperties | null>(null)
  const [facilities, setFacilities] = useState<FacilityProperties[]>([])
  const [sectorFilter, setSectorFilter] = useState<SectorFilter>('all')
  const [tab, setTab] = useState<PanelTab>('ficha')

  const visibleFacilities = useMemo(
    () => facilities.filter((f) => matchesSectorFilter(f, sectorFilter)),
    [facilities, sectorFilter],
  )

  useEffect(() => {
    void fetch(new URL('/data/index.json', window.location.origin))
      .then((res) => res.json())
      .then((rows: DepartmentIndex[]) => setIndex(rows.filter((row) => row.NOMBDEP !== 'SIN_UBIGEO')))
  }, [])

  useEffect(() => {
    if (!selectedDep) {
      setFacilities([])
      return
    }
    const file = selectedDep.replaceAll(' ', '_')
    void fetch(new URL(`/data/establecimientos/${file}.geojson`, window.location.origin))
      .then((res) => res.json())
      .then((data: { features: { geometry: { coordinates: [number, number] }; properties: FacilityProperties }[] }) => {
        setFacilities(
          data.features.map((f) => ({
            ...f.properties,
            lng: f.geometry.coordinates[0],
            lat: f.geometry.coordinates[1],
          })),
        )
      })
  }, [selectedDep])

  useEffect(() => {
    if (!facility) return
    if (!visibleFacilities.some((f) => String(f.objectid) === String(facility.objectid))) {
      setFacility(null)
      setTab('ficha')
    }
  }, [visibleFacilities, facility])

  const onSelectDepartment = useCallback((name: string) => {
    setSelectedDep(name)
    setFacility(null)
    setSectorFilter('all')
    setTab('ficha')
  }, [])

  const onSelectFacility = useCallback((next: FacilityProperties) => {
    setFacility(next)
    setTab('ficha')
  }, [])

  const onBack = useCallback(() => {
    setSelectedDep(null)
    setFacility(null)
    setSectorFilter('all')
    setTab('ficha')
  }, [])

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <p className="topbar-kicker">CENEPRED · SUSALUD</p>
          <h1>Establecimientos de salud</h1>
        </div>
        {selectedDep ? (
          <button type="button" className="back" onClick={onBack}>
            Perú
          </button>
        ) : (
          <p className="topbar-meta">16 624 centros · 25 departamentos</p>
        )}
      </header>
      <div className="split">
        <MapView
          selectedDep={selectedDep}
          facility={facility}
          facilities={visibleFacilities}
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
          sectorFilter={sectorFilter}
          onSectorFilter={setSectorFilter}
          onTab={setTab}
          onSelectDepartment={onSelectDepartment}
          onSelectFacility={onSelectFacility}
        />
      </div>
    </div>
  )
}
