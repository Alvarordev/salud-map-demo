import { useEffect, useRef } from 'react'
import {
  AttributionControl,
  Map as MapLibre,
  Marker,
  NavigationControl,
  type GeoJSONSource,
  type MapLayerMouseEvent,
  type Point,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { easeInOutStrong, prefersReducedMotion } from '../lib/easing'
import { boundsFromCoordinates } from '../lib/geo'
import type { FacilityCollection, FacilityProperties } from '../lib/types'

const PERU_BOUNDS: [number, number, number, number] = [-81.4, -18.45, -68.6, -0.04]
const PAPER = '#f2f3f1'
const FACILITY_ZOOM = 13.5

const EMPTY: FacilityCollection = { type: 'FeatureCollection', features: [] }

type DepartmentFeature = {
  type: 'Feature'
  properties: { NOMBDEP: string; count?: number }
  geometry: { type: string; coordinates: unknown }
}

const FILL_COLOR = [
  'interpolate',
  ['linear'],
  ['get', 'count'],
  0,
  '#DCE6E1',
  120,
  '#B7CDC4',
  400,
  '#7FA898',
  1000,
  '#3D7A68',
  4500,
  '#0F5C4C',
]

type Props = {
  selectedDep: string | null
  facility: FacilityProperties | null
  facilities: FacilityProperties[]
  onSelectDepartment: (name: string) => void
  onSelectFacility: (facility: FacilityProperties) => void
}

type PinEntry = { marker: Marker; el: HTMLButtonElement }

export function MapView({
  selectedDep,
  facility,
  facilities,
  onSelectDepartment,
  onSelectFacility,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibre | null>(null)
  const selectedDepRef = useRef(selectedDep)
  const facilityRef = useRef(facility)
  const facilitiesRef = useRef(facilities)
  const onSelectDepartmentRef = useRef(onSelectDepartment)
  const onSelectFacilityRef = useRef(onSelectFacility)
  const flightRef = useRef(0)
  const pinsRef = useRef(new Map<string, PinEntry>())
  const placePinsRef = useRef<(data: FacilityCollection) => void>(() => {})
  const departmentsRef = useRef<DepartmentFeature[]>([])
  const fitDepartmentRef = useRef<(name: string, duration: number) => void>(() => {})
  const prevFacilityRef = useRef<FacilityProperties | null>(null)
  const basemapVisibleRef = useRef(false)

  useEffect(() => {
    selectedDepRef.current = selectedDep
    facilityRef.current = facility
    facilitiesRef.current = facilities
    onSelectDepartmentRef.current = onSelectDepartment
    onSelectFacilityRef.current = onSelectFacility
  }, [selectedDep, facility, facilities, onSelectDepartment, onSelectFacility])

  useEffect(() => {
    if (!rootRef.current || mapRef.current) return

    const map = new MapLibre({
      container: rootRef.current,
      style: {
        version: 8,
        sources: {
          departamentos: {
            type: 'geojson',
            data: EMPTY,
          },
          establecimientos: {
            type: 'geojson',
            data: EMPTY,
            generateId: true,
          },
        },
        layers: [
          {
            id: 'bg',
            type: 'background',
            paint: { 'background-color': PAPER },
          },
          {
            id: 'dep-fill',
            type: 'fill',
            source: 'departamentos',
            paint: {
              'fill-color': FILL_COLOR as never,
              'fill-opacity': 0.94,
            },
          },
          {
            id: 'dep-line',
            type: 'line',
            source: 'departamentos',
            paint: {
              'line-color': '#1C1C1A',
              'line-width': 1.15,
              'line-opacity': 0.55,
            },
          },
          {
            id: 'dep-highlight',
            type: 'line',
            source: 'departamentos',
            filter: ['==', ['get', 'NOMBDEP'], ''],
            paint: {
              'line-color': '#0F5C4C',
              'line-width': 2.4,
              'line-opacity': 1,
            },
          },
        ],
      },
      bounds: PERU_BOUNDS,
      fitBoundsOptions: { padding: 40 },
      attributionControl: false,
    })

    map.addControl(new AttributionControl({ compact: true }), 'bottom-left')
    map.addControl(new NavigationControl({ showCompass: false }), 'bottom-left')

    const clearPins = () => {
      for (const { marker } of pinsRef.current.values()) marker.remove()
      pinsRef.current.clear()
    }

    const hideTooltip = () => {
      if (tooltipRef.current) tooltipRef.current.hidden = true
    }

    const showPinTooltip = (el: HTMLElement, text: string) => {
      const tooltip = tooltipRef.current
      const root = rootRef.current
      if (!tooltip || !root || !text) return
      const pin = el.getBoundingClientRect()
      const box = root.getBoundingClientRect()
      tooltip.hidden = false
      tooltip.classList.add('is-pin')
      tooltip.textContent = text
      tooltip.style.left = `${pin.left - box.left + pin.width / 2}px`
      tooltip.style.top = `${pin.top - box.top}px`
    }

    const placePins = (data: FacilityCollection) => {
      clearPins()
      hideTooltip()
      const depName = selectedDepRef.current
      if (!depName) return
      const depFeat = departmentsRef.current.find((f) => f.properties.NOMBDEP === depName)
      const clip = depFeat
        ? boundsFromCoordinates(depFeat.geometry.coordinates)
        : null
      const selected = String(facilityRef.current?.objectid ?? '')
      for (const feat of data.features) {
        const [lng, lat] = feat.geometry.coordinates
        if (clip && !clip.contains([lng, lat])) continue
        const props: FacilityProperties = { ...feat.properties, lng, lat }
        const id = String(props.objectid)
        const el = document.createElement('button')
        el.type = 'button'
        el.className = 'map-pin'
        if (selected === id) el.classList.add('is-selected')
        const label = props.nombre || props.institucion || 'Establecimiento'
        el.setAttribute('aria-label', label)
        el.addEventListener('click', (ev) => {
          ev.stopPropagation()
          hideTooltip()
          onSelectFacilityRef.current(props)
        })
        el.addEventListener('mouseenter', () => showPinTooltip(el, label))
        el.addEventListener('mouseleave', hideTooltip)
        const marker = new Marker({ element: el, anchor: 'bottom' })
          .setLngLat([lng, lat])
          .addTo(map)
        pinsRef.current.set(id, { marker, el })
      }
    }
    placePinsRef.current = placePins

    const tooltip = tooltipRef.current

    map.on('mousemove', (e: MapLayerMouseEvent) => {
      const dep = selectedDepRef.current ? [] : safeQuery(map, e.point, ['dep-fill'])
      map.getCanvas().style.cursor = dep.length ? 'pointer' : ''
      if (!tooltip || selectedDepRef.current) return
      if (!dep[0]) {
        tooltip.hidden = true
        tooltip.classList.remove('is-pin')
        return
      }
      const name = String(dep[0].properties?.NOMBDEP ?? '')
      const count = Number(dep[0].properties?.count ?? 0)
      tooltip.hidden = false
      tooltip.classList.remove('is-pin')
      tooltip.textContent = `${titleCase(name)} · ${count.toLocaleString('es-PE')} establecimientos`
      tooltip.style.left = `${e.point.x + 14}px`
      tooltip.style.top = `${e.point.y + 14}px`
    })

    map.on('mouseout', () => {
      map.getCanvas().style.cursor = ''
      if (tooltip && !selectedDepRef.current) {
        tooltip.hidden = true
        tooltip.classList.remove('is-pin')
      }
    })

    map.on('click', (e: MapLayerMouseEvent) => {
      if (selectedDepRef.current) return
      const deps = safeQuery(map, e.point, ['dep-fill'])
      const name = String(deps[0]?.properties?.NOMBDEP ?? '')
      if (name) onSelectDepartmentRef.current(name)
    })

    const fitDepartment = (name: string, duration: number) => {
      const feat = departmentsRef.current.find((f) => f.properties.NOMBDEP === name)
      if (!feat) return
      const bounds = boundsFromCoordinates(feat.geometry.coordinates)
      map.fitBounds(bounds, {
        padding: 32,
        duration,
        easing: easeInOutStrong,
        essential: true,
      })
    }
    fitDepartmentRef.current = fitDepartment
    mapRef.current = map
    const resize = () => map.resize()
    const observer = new ResizeObserver(resize)
    observer.observe(rootRef.current)
    resize()
    void fetch(new URL('/data/departamentos.geojson', window.location.origin))
      .then((res) => res.json())
      .then((data: { crs?: unknown; features: DepartmentFeature[] }) => {
        delete data.crs
        departmentsRef.current = data.features
        const apply = () => {
          const src = map.getSource('departamentos') as GeoJSONSource | undefined
          src?.setData(data as never)
        }
        apply()
        if (!map.isStyleLoaded()) map.once('load', apply)
      })
    return () => {
      observer.disconnect()
      clearPins()
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const apply = () => {
      map.setFilter('dep-highlight', ['==', ['get', 'NOMBDEP'], selectedDep ?? ''])
      const country = !selectedDep
      map.setPaintProperty('dep-fill', 'fill-opacity', country ? 0.94 : 0.22)
      map.setPaintProperty('dep-line', 'line-opacity', country ? 0.55 : 0.28)
      map.setPaintProperty('dep-line', 'line-width', country ? 1.15 : 0.8)
    }

    if (map.isStyleLoaded()) apply()
    else map.once('load', apply)
  }, [selectedDep])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const source = () => map.getSource('establecimientos') as GeoJSONSource | undefined
    const reduce = prefersReducedMotion()
    const duration = reduce ? 0 : 820
    const flight = ++flightRef.current

    const showBasemap = (on: boolean) => {
      if (on) {
        if (!map.getSource('osm')) {
          map.addSource('osm', {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap contributors',
          })
          map.addLayer({ id: 'osm', type: 'raster', source: 'osm' }, 'dep-fill')
        }
        map.setLayoutProperty('osm', 'visibility', 'visible')
        return
      }
      if (map.getLayer('osm')) {
        map.setLayoutProperty('osm', 'visibility', 'none')
      }
    }

    const flyToPeru = () => {
      basemapVisibleRef.current = false
      source()?.setData(EMPTY)
      placePinsRef.current(EMPTY)
      showBasemap(false)
      map.fitBounds(PERU_BOUNDS, {
        padding: 40,
        duration,
        easing: easeInOutStrong,
        essential: true,
      })
    }

    const run = () => {
      if (!selectedDep) {
        flyToPeru()
        return
      }
      if (flightRef.current !== flight) return
      source()?.setData(EMPTY)
      basemapVisibleRef.current = false
      showBasemap(false)
      const reveal = () => {
        if (flightRef.current !== flight) return
        basemapVisibleRef.current = true
        showBasemap(true)
        const data = toCollection(facilitiesRef.current)
        source()?.setData(data)
        placePinsRef.current(data)
      }
      if (!facilityRef.current) fitDepartmentRef.current(selectedDep, duration)
      if (duration === 0) reveal()
      else window.setTimeout(reveal, duration + 40)
    }

    const kick = () => {
      if (!map.getSource('establecimientos')) {
        map.once('idle', kick)
        return
      }
      run()
    }
    kick()
  }, [selectedDep])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !selectedDep) return
    if (!basemapVisibleRef.current) return
    const data = toCollection(facilities)
    const src = map.getSource('establecimientos') as GeoJSONSource | undefined
    src?.setData(data)
    placePinsRef.current(data)
  }, [facilities, selectedDep])

  useEffect(() => {
    const selected = String(facility?.objectid ?? '')
    for (const [id, { el }] of pinsRef.current) {
      el.classList.toggle('is-selected', id === selected)
    }
  }, [facility])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const reduce = prefersReducedMotion()
    const duration = reduce ? 0 : 720
    const had = prevFacilityRef.current
    prevFacilityRef.current = facility

    if (facility?.lng != null && facility.lat != null) {
      map.easeTo({
        center: [facility.lng, facility.lat],
        zoom: FACILITY_ZOOM,
        duration,
        easing: easeInOutStrong,
        essential: true,
      })
      return
    }

    if (had && selectedDep) {
      fitDepartmentRef.current(selectedDep, reduce ? 0 : 820)
    }
  }, [facility, selectedDep])

  return (
    <div className={selectedDep ? 'map-root is-detail' : 'map-root is-country'}>
      <div ref={rootRef} className="map-canvas" />
      <div ref={tooltipRef} className="map-tooltip" hidden />
    </div>
  )
}

function safeQuery(map: MapLibre, point: Point, layers: string[]) {
  const available = layers.filter((id) => map.getLayer(id))
  if (!available.length) return []
  try {
    return map.queryRenderedFeatures(point, { layers: available })
  } catch {
    return []
  }
}

function toCollection(facilities: FacilityProperties[]): FacilityCollection {
  return {
    type: 'FeatureCollection',
    features: facilities.map((f) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [f.lng, f.lat] },
      properties: f,
    })),
  }
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(' ')
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ')
}
