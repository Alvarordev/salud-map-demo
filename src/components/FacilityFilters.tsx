import type { SectorFilter } from '../lib/facility'

type Props = {
  query: string
  sector: SectorFilter
  visible: number
  total: number
  onQuery: (value: string) => void
  onSector: (value: SectorFilter) => void
}

export function FacilityFilters({ query, sector, visible, total, onQuery, onSector }: Props) {
  const filtered = query.trim() !== '' || sector !== 'all'
  return (
    <div className="facility-filters">
      <div className="filter-row">
        <input
          type="search"
          className="filter-input"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Buscar establecimiento"
          aria-label="Buscar establecimiento"
        />
        <select
          className="filter-select"
          value={sector}
          onChange={(e) => onSector(e.target.value as SectorFilter)}
          aria-label="Institución"
        >
          <option value="all">Todos</option>
          <option value="public">Público</option>
          <option value="private">Privado</option>
        </select>
      </div>
      {filtered ? (
        <p className="sector-filter-meta">
          {visible.toLocaleString('es-PE')} de {total.toLocaleString('es-PE')}
        </p>
      ) : null}
    </div>
  )
}
