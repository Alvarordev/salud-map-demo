const LEGACY_HOST = 'http://app20.susalud.gob.pe:8080'
const HTTPS_HOST = 'https://app20.susalud.gob.pe:8086'
const HTTPS_HOST_8080 = 'https://app20.susalud.gob.pe:8080'

export function toProxiedRenipressUrl(url: string): string {
  if (!url) return ''
  try {
    const parsed = new URL(url)
    if (parsed.hostname.includes('susalud.gob.pe')) {
      return `${parsed.pathname}${parsed.search}`
    }
  } catch {
    /* fall through */
  }
  return url
    .replace(LEGACY_HOST, '')
    .replace(HTTPS_HOST, '')
    .replace(HTTPS_HOST_8080, '')
}

export function officialRenipressUrl(url: string): string {
  if (!url) return ''
  return url
    .replace(LEGACY_HOST, HTTPS_HOST)
    .replace('http://app20.susalud.gob.pe:8086', HTTPS_HOST)
}
