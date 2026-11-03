export interface GeoResult {
  label: string
  lat: number
  lon: number
}

const owmKey = import.meta.env.VITE_OPENWEATHER_API_KEY as string | undefined

/** Uses OpenWeatherMap geocoding when a key is configured, otherwise keyless Open-Meteo. */
export async function searchLocations(query: string, signal?: AbortSignal): Promise<GeoResult[]> {
  const q = query.trim()
  if (q.length < 3) return []

  if (owmKey) {
    const res = await fetch(
      `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(q)}&limit=5&appid=${owmKey}`,
      { signal },
    )
    if (!res.ok) throw new Error('Location search failed')
    const data: { name: string; state?: string; country: string; lat: number; lon: number }[] = await res.json()
    return data.map((d) => ({
      label: [d.name, d.state, d.country].filter(Boolean).join(', '),
      lat: d.lat,
      lon: d.lon,
    }))
  }

  const res = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=en&format=json`,
    { signal },
  )
  if (!res.ok) throw new Error('Location search failed')
  const data: { results?: { name: string; admin1?: string; country?: string; latitude: number; longitude: number }[] } =
    await res.json()
  return (data.results ?? []).map((d) => ({
    label: [d.name, d.admin1, d.country].filter(Boolean).join(', '),
    lat: d.latitude,
    lon: d.longitude,
  }))
}
