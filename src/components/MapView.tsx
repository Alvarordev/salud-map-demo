import { useEffect, useRef } from 'react'
import {
  AttributionControl,
  LngLatBounds,
  Map,
  NavigationControl,
  type GeoJSONSource,
  type MapLayerMouseEvent,
  type Point,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { easeInOutStrong, prefersReducedMotion } from '../lib/easing'
import type { FacilityCollection, FacilityProperties } from '../lib/types'

const PERU_BOUNDS: [number, number, number, number] = [-81.4, -18.45, -68.6, -0.04]

const EMPTY: FacilityCollection = { type: 'FeatureCollection', features: [] }

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
  selectedId: string | number | null
  onSelectDepartment: (name: string) => void
  onSelectFacility: (facility: FacilityProperties) => void
}

export function MapView({
  selectedDep,
  selectedId,
  onSelectDepartment,
  onSelectFacility,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const selectedDepRef = useRef(selectedDep)
  const onSelectDepartmentRef = useRef(onSelectDepartment)
  const onSelectFacilityRef = useRef(onSelectFacility)
  const flightRef = useRef(0)

  useEffect(() => {
    selectedDepRef.current = selectedDep
    onSelectDepartmentRef.current = onSelectDepartment
    onSelectFacilityRef.current = onSelectFacility
  }, [selectedDep, onSelectDepartment, onSelectFacility])

  useEffect(() => {
    if (!rootRef.current || mapRef.current) return

    const map = new Map({
      container: rootRef.current,
      style: {
        version: 8,
        sources: {
          carto: {
            type: 'raster',
            tiles: [
              'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            ],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap contributors',
          },
          departamentos: {
            type: 'geojson',
            data: EMPTY,
          },
          establecimientos: {
            type: 'geojson',
            data: EMPTY,
            cluster: true,
            clusterRadius: 40,
            clusterMaxZoom: 11,
            generateId: true,
          },
        },
        layers: [
          { id: 'carto', type: 'raster', source: 'carto' },
          {
            id: 'dep-fill',
            type: 'fill',
            source: 'departamentos',
            paint: {
              'fill-color': FILL_COLOR as never,
              'fill-opacity': 0.72,
            },
          },
          {
            id: 'dep-line',
            type: 'line',
            source: 'departamentos',
            paint: {
              'line-color': '#1C1C1A',
              'line-width': 0.7,
              'line-opacity': 0.35,
            },
          },
          {
            id: 'dep-highlight',
            type: 'line',
            source: 'departamentos',
            filter: ['==', ['get', 'NOMBDEP'], ''],
            paint: {
              'line-color': '#0F5C4C',
              'line-width': 2.2,
              'line-opacity': 1,
            },
          },
          {
            id: 'clusters',
            type: 'circle',
            source: 'establecimientos',
            filter: ['has', 'point_count'],
            paint: {
              'circle-color': '#0F5C4C',
              'circle-radius': [
                'step',
                ['get', 'point_count'],
                14,
                25,
                18,
                80,
                22,
              ],
              'circle-opacity': 0.9,
              'circle-stroke-width': 1.5,
              'circle-stroke-color': '#F2F3F1',
            },
          },
          {
            id: 'unclustered',
            type: 'circle',
            source: 'establecimientos',
            filter: ['!', ['has', 'point_count']],
            paint: {
              'circle-color': '#0F5C4C',
              'circle-radius': 7,
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff',
              'circle-opacity': 1,
            },
          },
        ],
      },
      bounds: PERU_BOUNDS,
      fitBoundsOptions: { padding: 32 },
      attributionControl: false,
    })

    map.addControl(new AttributionControl({ compact: true }), 'bottom-left')
    map.addControl(new NavigationControl({ showCompass: false }), 'bottom-left')

    const tooltip = tooltipRef.current

    map.on('mousemove', (e: MapLayerMouseEvent) => {
      const dep = selectedDepRef.current ? [] : safeQuery(map, e.point, ['dep-fill'])
      const extra = safeQuery(map, e.point, ['unclustered', 'clusters'])
      map.getCanvas().style.cursor = dep.length || extra.length ? 'pointer' : ''
      if (!tooltip) return
      if (!dep[0]) {
        tooltip.hidden = true
        return
      }
      const name = String(dep[0].properties?.NOMBDEP ?? '')
      const count = Number(dep[0].properties?.count ?? 0)
      tooltip.hidden = false
      tooltip.textContent = `${titleCase(name)} · ${count.toLocaleString('es-PE')} establecimientos`
      tooltip.style.left = `${e.point.x + 14}px`
      tooltip.style.top = `${e.point.y + 14}px`
    })

    map.on('mouseout', () => {
      map.getCanvas().style.cursor = ''
      if (tooltip) tooltip.hidden = true
    })

    map.on('click', (e: MapLayerMouseEvent) => {
      const point = e.point
      const facilities = safeQuery(map, point, ['unclustered'])
      if (facilities[0]?.properties) {
        onSelectFacilityRef.current(facilities[0].properties as FacilityProperties)
        return
      }
      const clusters = safeQuery(map, point, ['clusters'])
      if (clusters[0]) {
        const clusterHit = clusters[0]
        const clusterId = clusterHit.properties?.cluster_id as number | undefined
        const clusterSource = map.getSource('establecimientos') as GeoJSONSource
        if (clusterId == null) return
        void clusterSource.getClusterExpansionZoom(clusterId).then((zoom) => {
          if (zoom == null || clusterHit.geometry.type !== 'Point') return
          const [lng, lat] = clusterHit.geometry.coordinates
          map.easeTo({
            center: [lng, lat],
            zoom,
            duration: prefersReducedMotion() ? 0 : 420,
            easing: easeInOutStrong,
          })
        })
        return
      }
      if (selectedDepRef.current) return
      const deps = safeQuery(map, point, ['dep-fill'])
      const name = String(deps[0]?.properties?.NOMBDEP ?? '')
      if (name) onSelectDepartmentRef.current(name)
    })

    mapRef.current = map
    const resize = () => map.resize()
    const observer = new ResizeObserver(resize)
    observer.observe(rootRef.current)
    resize()
    void fetch(new URL('/data/departamentos.geojson', window.location.origin))
      .then((res) => res.json())
        .then((data) => {
          const apply = () => {
            const src = map.getSource('departamentos') as GeoJSONSource | undefined
            src?.setData(data)
          }
          if (map.isStyleLoaded()) apply()
          else map.once('style.load', apply)
        })
    return () => {
      observer.disconnect()
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const apply = () => {
      map.setFilter('dep-highlight', ['==', ['get', 'NOMBDEP'], selectedDep ?? ''])
      map.setPaintProperty('dep-fill', 'fill-opacity', selectedDep ? 0.16 : 0.72)
      map.setPaintProperty('dep-line', 'line-opacity', selectedDep ? 0.18 : 0.35)
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

    const flyToPeru = () => {
      source()?.setData(EMPTY)
      map.fitBounds(PERU_BOUNDS, {
        padding: 32,
        duration,
        easing: easeInOutStrong,
        essential: true,
      })
    }

    const run = async () => {
      if (!selectedDep) {
        flyToPeru()
        return
      }
      const res = await fetch(
        new URL(
          `/data/establecimientos/${selectedDep.replaceAll(' ', '_')}.geojson`,
          window.location.origin,
        ).href,
      )
      if (flightRef.current !== flight) return
      const data = (await res.json()) as FacilityCollection
      if (flightRef.current !== flight) return
      const bounds = new LngLatBounds()
      for (const feat of data.features) {
        bounds.extend(feat.geometry.coordinates)
      }
      const reveal = () => {
        if (flightRef.current !== flight) return
        source()?.setData(data)
      }
      reveal()
      map.fitBounds(bounds, {
        padding: 56,
        duration,
        maxZoom: 12,
        easing: easeInOutStrong,
        essential: true,
      })
    }

    const kick = () => {
      if (!map.getSource('establecimientos')) {
        map.once('idle', kick)
        return
      }
      void run()
    }
    kick()
  }, [selectedDep])

  useEffect(() => {
    const map = mapRef.current
    if (!map?.isStyleLoaded()) return
    const source = map.getSource('establecimientos') as GeoJSONSource | undefined
    if (!source) return
    const features = map.querySourceFeatures('establecimientos', {
      filter: ['!', ['has', 'point_count']],
    })
    for (const feat of features) {
      const id = feat.id ?? feat.properties?.objectid
      if (id == null) continue
      map.setFeatureState(
        { source: 'establecimientos', id },
        { selected: String(id) === String(selectedId) },
      )
    }
  }, [selectedId, selectedDep])

  return (
    <div className="map-root">
      <div ref={rootRef} className="map-canvas" />
      <div ref={tooltipRef} className="map-tooltip" hidden />
    </div>
  )
}

function safeQuery(map: Map, point: Point, layers: string[]) {
  const available = layers.filter((id) => map.getLayer(id))
  if (!available.length) return []
  try {
    return map.queryRenderedFeatures(point, { layers: available })
  } catch {
    return []
  }
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(' ')
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ')
}
