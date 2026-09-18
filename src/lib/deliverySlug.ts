import { randomBytes } from 'crypto'

const MONTHS_SLUG = [
  'enero','febrero','marzo','abril','mayo','junio',
  'julio','agosto','septiembre','octubre','noviembre','diciembre',
]

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    // eslint-disable-next-line no-misleading-character-class
    .replace(/[̀-ͯ]/g, '')   // elimina diacríticos: é→e, ó→o, ñ→n
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 35)
    .replace(/-$/, '')
}

export function generateDeliverySlug(clientName: string, entityName: string): string {
  const clientPart = normalize(clientName)
  const entityPart = normalize(entityName)
  const code = randomBytes(3).toString('hex') // 6 chars hex seguros
  const base = [clientPart, entityPart]
    .filter(Boolean)
    .join('-')
    .slice(0, 52)
    .replace(/-$/, '')
  return `${base}-${code}`
}

export function planEntityName(month: number, year: number): string {
  return `plan-${MONTHS_SLUG[(month ?? 1) - 1]}-${year}`
}
