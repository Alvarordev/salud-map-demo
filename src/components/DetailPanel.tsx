import { Breadcrumbs } from './Breadcrumbs'
import { FacilityFilters } from './FacilityFilters'
import { officialRenipressUrl, toProxiedRenipressUrl } from '../lib/renipress'
import { titleCase } from '../lib/title'
import type { SectorFilter } from '../lib/facility'
import type { DepartmentIndex, FacilityProperties, PanelTab } from '../lib/types'

type Props = {
  department: string | null
  facility: FacilityProperties | null
  tab: PanelTab
  departments: DepartmentIndex[]
  facilities: FacilityProperties[]
  totalFacilities: number
  query: string
  sectorFilter: SectorFilter
  onQuery: (value: string) => void
  onSectorFilter: (filter: SectorFilter) => void
  onTab: (tab: PanelTab) => void
  onPeru: () => void
  onDepartment: () => void
  onSelectDepartment: (name: string) => void
  onSelectFacility: (facility: FacilityProperties) => void
}

export function DetailPanel({
  department,
  facility,
  tab,
  departments,
  facilities,
  totalFacilities,
  query,
  sectorFilter,
  onQuery,
  onSectorFilter,
  onTab,
  onPeru,
  onDepartment,
  onSelectDepartment,
  onSelectFacility,
}: Props) {
  if (!department && !facility) {
    return (
      <aside className="panel">
        <Breadcrumbs department={null} facilityName={null} onPeru={onPeru} onDepartment={onDepartment} />
        <h2 className="panel-title">Establecimientos de salud</h2>
        <p className="panel-lead">
          Elige un departamento en el mapa o en la lista. El mapa de calles y los pines aparecen al entrar.
        </p>
        <ul className="dep-list">
          {departments.map((row) => (
            <li key={row.NOMBDEP}>
              <button type="button" onClick={() => onSelectDepartment(row.NOMBDEP)}>
                <span>{titleCase(row.NOMBDEP)}</span>
                <span className="dep-count">{row.count.toLocaleString('es-PE')}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>
    )
  }

  if (department && !facility) {
    return (
      <aside className="panel">
        <Breadcrumbs
          department={department}
          facilityName={null}
          onPeru={onPeru}
          onDepartment={onDepartment}
        />
        <h2 className="panel-title">{titleCase(department)}</h2>
        <p className="panel-lead">
          Selecciona un establecimiento en el mapa o en la lista para ver la ficha y RENIPRESS.
        </p>
        <FacilityFilters
          query={query}
          sector={sectorFilter}
          visible={facilities.length}
          total={totalFacilities}
          onQuery={onQuery}
          onSector={onSectorFilter}
        />
        <ul className="dep-list">
          {facilities.map((row) => (
            <li key={String(row.objectid)}>
              <button type="button" onClick={() => onSelectFacility(row)}>
                <span>{row.nombre || 'Sin nombre'}</span>
                <span className="dep-count">{row.institucion === 'PRIVADO' ? 'Privado' : 'Público'}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>
    )
  }

  if (!facility) return null

  const proxied = toProxiedRenipressUrl(facility.urlRenipr)
  const official = officialRenipressUrl(facility.urlRenipr)

  return (
    <aside className="panel">
      <Breadcrumbs
        department={department}
        facilityName={facility.nombre || 'Sin nombre'}
        onPeru={onPeru}
        onDepartment={onDepartment}
      />
      <div className="tab-bar" role="tablist" aria-label="Detalle">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'ficha'}
          className={tab === 'ficha' ? 'tab is-active' : 'tab'}
          onClick={() => onTab('ficha')}
        >
          Ficha
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'renipress'}
          className={tab === 'renipress' ? 'tab is-active' : 'tab'}
          onClick={() => onTab('renipress')}
        >
          RENIPRESS
        </button>
      </div>

      <div className="tab-viewport">
        <div
          className="tab-track"
          data-tab={tab}
          style={{ transform: tab === 'ficha' ? 'translateX(0)' : 'translateX(-50%)' }}
        >
          <div className="tab-pane" role="tabpanel">
            <h2 className="panel-title">{facility.nombre || 'Sin nombre'}</h2>
            <dl className="facts">
              <Fact label="Distrito" value={facility.distrito} />
              <Fact label="Institución" value={facility.institucion} />
              <Fact label="Código MINSA" value={String(facility.codigoMinsa ?? '')} />
              <Fact label="Categoría" value={facility.categoria} />
              <Fact label="Condición" value={facility.condicion} />
              <Fact label="Dirección" value={facility.direccion} />
              <Fact label="Red" value={facility.red} />
              <Fact label="Microrred" value={facility.microrred} />
            </dl>
          </div>
          <div className="tab-pane tab-pane-frame" role="tabpanel">
            <div className="iframe-bar">
              <p>Ficha oficial de SUSALUD. Si el marco queda vacío, ábrela en una pestaña.</p>
              <a href={official} target="_blank" rel="noreferrer">
                Abrir ficha oficial
              </a>
            </div>
            {proxied ? (
              <iframe
                className="renipress-frame"
                title="Ficha RENIPRESS"
                src={proxied}
                referrerPolicy="no-referrer"
              />
            ) : (
              <p className="panel-lead">Este establecimiento no tiene URL RENIPRESS.</p>
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  if (!value) return null
  return (
    <div className="fact">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}
