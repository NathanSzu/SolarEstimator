import { cacheGet, cacheSet } from './cache'
import { fetchJson } from './http'

export interface GeoResult {
  label: string
  lat: number
  lon: number
  region?: string
  country?: string
}

const owmKey = import.meta.env.VITE_OPENWEATHER_API_KEY as string | undefined
const TTL_MS = 7 * 24 * 60 * 60 * 1000

async function viaOpenWeather(q: string, signal?: AbortSignal): Promise<GeoResult[]> {
  const data = await fetchJson<{ name: string; state?: string; country: string; lat: number; lon: number }[]>(
    `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(q)}&limit=5&appid=${owmKey}`,
    { signal, retries: 1 },
  )
  return data.map((d) => ({
    label: [d.name, d.state, d.country].filter(Boolean).join(', '),
    lat: d.lat,
    lon: d.lon,
    region: d.state,
    country: d.country,
  }))
}

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

/** Uses OpenWeatherMap when a key is configured (falling back to keyless Open-Meteo if it fails). Results are cached. */
export async function searchLocations(query: string, signal?: AbortSignal): Promise<GeoResult[]> {
  const q = query.trim()
  if (q.length < 3) return []

  const key = `geo:${q.toLowerCase()}`
  const cached = cacheGet<GeoResult[]>(key, TTL_MS)
  if (cached) return cached

  let results: GeoResult[]
  if (owmKey) {
    try {
      results = await viaOpenWeather(q, signal)
    } catch (e) {
      if ((e as Error).name === 'AbortError') throw e
      results = await viaOpenMeteo(q, signal)
    }
  } else {
    results = await viaOpenMeteo(q, signal)
  }
  if (results.length) cacheSet(key, results)
  return results
}
