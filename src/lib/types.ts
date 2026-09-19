export type DepartmentIndex = {
  NOMBDEP: string
  count: number
  file: string
}

export type FacilityProperties = {
  objectid: number | string
  nombre: string
  departamento: string
  provincia: string
  distrito: string
  institucion: string
  codigoMinsa: number | string
  direccion: string
  disa: string
  red: string
  microrred: string
  categoria: string
  condicion: string
  actualizado: string
  fuente: string
  urlRenipr: string
}

export type FacilityFeature = {
  type: 'Feature'
  geometry: { type: 'Point'; coordinates: [number, number] }
  properties: FacilityProperties
}

export type FacilityCollection = {
  type: 'FeatureCollection'
  features: FacilityFeature[]
}

export type PanelTab = 'ficha' | 'renipress'
