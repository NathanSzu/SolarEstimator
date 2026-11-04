import { cacheGet, cacheSet } from './cache'
import { fetchJson } from './http'

const eiaKey = import.meta.env.VITE_EIA_API_KEY as string | undefined
const TTL_MS = 7 * 24 * 60 * 60 * 1000

export const rateLookupAvailable = !!eiaKey

const STATES: Record<string, string> = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA', colorado: 'CO', connecticut: 'CT',
  delaware: 'DE', 'district of columbia': 'DC', florida: 'FL', georgia: 'GA', hawaii: 'HI', idaho: 'ID',
  illinois: 'IL', indiana: 'IN', iowa: 'IA', kansas: 'KS', kentucky: 'KY', louisiana: 'LA', maine: 'ME',
  maryland: 'MD', massachusetts: 'MA', michigan: 'MI', minnesota: 'MN', mississippi: 'MS', missouri: 'MO',
  montana: 'MT', nebraska: 'NE', nevada: 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM',
  'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH', oklahoma: 'OK', oregon: 'OR',
  pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC', 'south dakota': 'SD', tennessee: 'TN',
  texas: 'TX', utah: 'UT', vermont: 'VT', virginia: 'VA', washington: 'WA', 'west virginia': 'WV',
  wisconsin: 'WI', wyoming: 'WY',
}

/** Maps a US state name or 2-letter code to its code; null if not a US state. */
export function stateCode(region: string | undefined): string | null {
  if (!region) return null
  const r = region.trim()
  if (/^[A-Za-z]{2}$/.test(r) && Object.values(STATES).includes(r.toUpperCase())) return r.toUpperCase()
  return STATES[r.toLowerCase()] ?? null
}

export interface RateResult {
  /** Average residential price in $/kWh over the latest available months. */
  rate: number
  months: number
  latestPeriod: string
}

export interface TrendResult {
  /** Compound annual growth of the average residential price, in percent. */
  pct: number
  fromYear: number
  toYear: number
}

/** Compound annual growth rate in percent between two positive prices `years` apart. */
export function cagrPct(first: number, last: number, years: number): number {
  return (Math.pow(last / first, 1 / years) - 1) * 100
}

/** Historical residential price growth for a state over the last `years` years of EIA annual data. */
export async function fetchRateTrend(state: string, years: number, signal?: AbortSignal): Promise<TrendResult> {
  if (!eiaKey) throw new Error('Rate lookup is not configured.')
  const key = `eia-trend:${state}:${years}`
  const cached = cacheGet<TrendResult>(key, TTL_MS)
  if (cached) return cached

  const params = new URLSearchParams({
    api_key: eiaKey,
    frequency: 'annual',
    'data[0]': 'price',
    'facets[sectorid][]': 'RES',
    'facets[stateid][]': state,
    'sort[0][column]': 'period',
    'sort[0][direction]': 'desc',
    length: String(years + 1),
  })
  const data = await fetchJson<{ response?: { data?: { period: string; price: number | string | null }[] } }>(
    `https://api.eia.gov/v2/electricity/retail-sales/data/?${params}`,
    { signal },
  )
  const rows = (data.response?.data ?? [])
    .map((d) => ({ year: Number(d.period), price: Number(d.price) }))
    .filter((d) => Number.isFinite(d.year) && Number.isFinite(d.price) && d.price > 0)
    .sort((a, b) => b.year - a.year)
  const last = rows[0]
  const first = rows[rows.length - 1]
  if (!last || !first || last.year - first.year < 1) throw new Error('Not enough price history for this state.')

  const result: TrendResult = {
    pct: Math.round(cagrPct(first.price, last.price, last.year - first.year) * 10) / 10,
    fromYear: first.year,
    toYear: last.year,
  }
  cacheSet(key, result)
  return result
}

/** Average US residential electricity price for a state from EIA (requires VITE_EIA_API_KEY). */
export async function fetchResidentialRate(state: string, signal?: AbortSignal): Promise<RateResult> {
  if (!eiaKey) throw new Error('Rate lookup is not configured.')
  const key = `eia:${state}`
  const cached = cacheGet<RateResult>(key, TTL_MS)
  if (cached) return cached

  const params = new URLSearchParams({
    api_key: eiaKey,
    frequency: 'monthly',
    'data[0]': 'price',
    'facets[sectorid][]': 'RES',
    'facets[stateid][]': state,
    'sort[0][column]': 'period',
    'sort[0][direction]': 'desc',
    length: '12',
  })
  const data = await fetchJson<{ response?: { data?: { period: string; price: number | string | null }[] } }>(
    `https://api.eia.gov/v2/electricity/retail-sales/data/?${params}`,
    { signal },
  )
  const rows = (data.response?.data ?? [])
    .map((d) => ({ period: d.period, cents: Number(d.price) }))
    .filter((d) => Number.isFinite(d.cents) && d.cents > 0)
  if (!rows.length) throw new Error('No rate data available for this state.')

  const result: RateResult = {
    rate: Math.round((rows.reduce((a, r) => a + r.cents, 0) / rows.length) * 10) / 1000,
    months: rows.length,
    latestPeriod: rows[0].period,
  }
  cacheSet(key, result)
  return result
}
