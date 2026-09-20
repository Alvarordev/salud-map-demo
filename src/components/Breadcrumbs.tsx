import { titleCase } from '../lib/title'

type Crumb = {
  label: string
  onClick?: () => void
}

type Props = {
  department: string | null
  facilityName: string | null
  onPeru: () => void
  onDepartment: () => void
}

export function Breadcrumbs({ department, facilityName, onPeru, onDepartment }: Props) {
  const crumbs: Crumb[] = [{ label: 'Perú', onClick: department ? onPeru : undefined }]
  if (department) {
    crumbs.push({
      label: titleCase(department),
      onClick: facilityName ? onDepartment : undefined,
    })
  }
  if (facilityName) crumbs.push({ label: facilityName })

  return (
    <nav className="crumbs" aria-label="Ubicación">
      {crumbs.map((crumb, i) => {
        const last = i === crumbs.length - 1
        return (
          <span key={`${crumb.label}-${i}`} className="crumb">
            {i > 0 ? <span className="crumb-sep" aria-hidden>/</span> : null}
            {crumb.onClick && !last ? (
              <button type="button" className="crumb-link" onClick={crumb.onClick}>
                {crumb.label}
              </button>
            ) : (
              <span className={last ? 'crumb-current' : undefined} aria-current={last ? 'page' : undefined}>
                {crumb.label}
              </span>
            )}
          </span>
        )
      })}
    </nav>
  )
}
