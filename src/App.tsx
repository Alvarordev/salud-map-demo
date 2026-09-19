import { useCallback, useEffect, useState } from 'react'
import { DetailPanel } from './components/DetailPanel'
import { MapView } from './components/MapView'
import type { DepartmentIndex, FacilityProperties, PanelTab } from './lib/types'

export default function App() {
  const [index, setIndex] = useState<DepartmentIndex[]>([])
  const [selectedDep, setSelectedDep] = useState<string | null>(null)
  const [facility, setFacility] = useState<FacilityProperties | null>(null)
  const [facilities, setFacilities] = useState<FacilityProperties[]>([])
  const [tab, setTab] = useState<PanelTab>('ficha')

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

  const onSelectDepartment = useCallback((name: string) => {
    setSelectedDep(name)
    setFacility(null)
    setTab('ficha')
  }, [])

  const onSelectFacility = useCallback((next: FacilityProperties) => {
    setFacility(next)
    setTab('ficha')
  }, [])

  const onBack = useCallback(() => {
    if (facility) {
      setFacility(null)
      setTab('ficha')
      return
    }
    setSelectedDep(null)
    setTab('ficha')
  }, [facility])

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <p className="topbar-kicker">CENEPRED · SUSALUD</p>
          <h1>Establecimientos de salud</h1>
        </div>
        {selectedDep ? (
          <button
            type="button"
            className="back"
            onClick={onBack}
            aria-label={
              facility
                ? `Volver a ${titleCase(selectedDep)}`
                : 'Volver a Perú'
            }
          >
            {facility ? `← ${titleCase(selectedDep)}` : '← Perú'}
          </button>
        ) : (
          <p className="topbar-meta">16 624 centros · 25 departamentos</p>
        )}
      </header>
      <div className="split">
        <MapView
          selectedDep={selectedDep}
          facility={facility}
          onSelectDepartment={onSelectDepartment}
          onSelectFacility={onSelectFacility}
        />
        <DetailPanel
          department={selectedDep}
          facility={facility}
          tab={tab}
          departments={index}
          facilities={facilities}
          onTab={setTab}
          onSelectDepartment={onSelectDepartment}
          onSelectFacility={onSelectFacility}
        />
      </div>
    </div>
  )
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(' ')
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ')
}
