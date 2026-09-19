import type { SectorFilter } from '../lib/facility'

const OPTIONS: { value: SectorFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'public', label: 'Público' },
  { value: 'private', label: 'Privado' },
]

type Props = {
  value: SectorFilter
  visible: number
  total: number
  onChange: (value: SectorFilter) => void
}

export function SectorFilterBar({ value, visible, total, onChange }: Props) {
  return (
    <div className="sector-filter">
      <div className="sector-filter-bar" role="group" aria-label="Filtrar por sector">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={value === opt.value ? 'sector-filter-btn is-active' : 'sector-filter-btn'}
            aria-pressed={value === opt.value}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {value !== 'all' ? (
        <p className="sector-filter-meta">
          {visible.toLocaleString('es-PE')} de {total.toLocaleString('es-PE')} establecimientos
        </p>
      ) : null}
    </div>
  )
}
