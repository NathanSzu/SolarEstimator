import type { IrradianceCache } from '../types/plan'

/** Open-Meteo uses 0° = south, so convert from compass azimuth (180° = south). */
const toOpenMeteoAzimuth = (compass: number) => ((compass - 180 + 540) % 360) - 180

export function irradianceMatches(c: IrradianceCache | undefined, lat: number, lon: number, tilt: number, az: number) {
  return !!c && c.lat === lat && c.lon === lon && c.tiltDeg === tilt && c.azimuthDeg === az
}

/** Fetches last calendar year's hourly plane-of-array irradiance and sums it by month (kWh/m²). */
export async function fetchIrradiance(
  lat: number,
  lon: number,
  tiltDeg: number,
  azimuthDeg: number,
  signal?: AbortSignal,
): Promise<IrradianceCache> {
  const year = new Date().getFullYear() - 1
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    start_date: `${year}-01-01`,
    end_date: `${year}-12-31`,
    hourly: 'global_tilted_irradiance',
    tilt: String(tiltDeg),
    azimuth: String(toOpenMeteoAzimuth(azimuthDeg)),
    timezone: 'auto',
  })
  const res = await fetch(`https://archive-api.open-meteo.com/v1/archive?${params}`, { signal })
  if (!res.ok) throw new Error('Could not load historical solar data')
  const data: { hourly?: { time: string[]; global_tilted_irradiance: (number | null)[] } } = await res.json()
  if (!data.hourly) throw new Error('No solar data returned for this location')

  const months = new Array<number>(12).fill(0)
  data.hourly.time.forEach((t, i) => {
    months[parseInt(t.slice(5, 7), 10) - 1] += (data.hourly!.global_tilted_irradiance[i] ?? 0) / 1000
  })
  return { lat, lon, tiltDeg, azimuthDeg, year, monthlyKwhPerM2: months, fetchedAt: new Date().toISOString() }
}
