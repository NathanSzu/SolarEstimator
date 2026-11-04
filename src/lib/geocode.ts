import { cacheGet, cacheSet } from './cache'
import { fetchJson } from './http'

export interface GeoResult {
  label: string
  lat: number
  lon: number
  region?: string
  country?: string
}

const TTL_MS = 7 * 24 * 60 * 60 * 1000

async function viaOpenMeteo(q: string, signal?: AbortSignal): Promise<GeoResult[]> {
  const data = await fetchJson<{
    results?: { name: string; admin1?: string; country?: string; country_code?: string; latitude: number; longitude: number }[]
  }>(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=en&format=json`, {
    signal,
  })
  return (data.results ?? []).map((d) => ({
    label: [d.name, d.admin1, d.country].filter(Boolean).join(', '),
    lat: d.latitude,
    lon: d.longitude,
    region: d.admin1,
    country: d.country_code,
  }))
}

/** Searches locations via keyless Open-Meteo geocoding. Results are cached. */
export async function searchLocations(query: string, signal?: AbortSignal): Promise<GeoResult[]> {
  const q = query.trim()
  if (q.length < 3) return []

  const key = `geo:${q.toLowerCase()}`
  const cached = cacheGet<GeoResult[]>(key, TTL_MS)
  if (cached) return cached

  const results = await viaOpenMeteo(q, signal)
  if (results.length) cacheSet(key, results)
  return results
}
