export const MAX_PLANS = 3

export interface Plan {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  location: { label: string; lat: number | null; lon: number | null }
  system: { sizeKw: number; tiltDeg: number; azimuthDeg: number; lossesPct: number; degradationPct: number }
  costs: {
    installCost: number
    incentives: number
    annualMaintenance: number
    inverterReplacementCost: number
    inverterReplacementYear: number
  }
  loan: { enabled: boolean; principal: number; aprPct: number; termMonths: number }
  assumptions: { rateEscalationPct: number; electricityRate: number }
  /** Cached historical irradiance (kWh/m² per month) for the location and orientation it was fetched for. */
  irradiance?: IrradianceCache
}

export interface IrradianceCache {
  lat: number
  lon: number
  tiltDeg: number
  azimuthDeg: number
  year: number
  monthlyKwhPerM2: number[]
  fetchedAt: string
}

export function createDefaultPlan(name: string): Plan {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    name,
    createdAt: now,
    updatedAt: now,
    location: { label: '', lat: null, lon: null },
    system: { sizeKw: 6, tiltDeg: 20, azimuthDeg: 180, lossesPct: 14, degradationPct: 0.5 },
    costs: { installCost: 18000, incentives: 0, annualMaintenance: 0, inverterReplacementCost: 0, inverterReplacementYear: 13 },
    loan: { enabled: false, principal: 0, aprPct: 6.5, termMonths: 180 },
    assumptions: { rateEscalationPct: 3, electricityRate: 0.17 },
  }
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d)

function sanitizeIrradiance(v: unknown): IrradianceCache | undefined {
  if (!isObj(v) || !Array.isArray(v.monthlyKwhPerM2) || v.monthlyKwhPerM2.length !== 12) return undefined
  if (!v.monthlyKwhPerM2.every((n) => typeof n === 'number' && Number.isFinite(n))) return undefined
  if (![v.lat, v.lon, v.tiltDeg, v.azimuthDeg, v.year].every((n) => typeof n === 'number')) return undefined
  return {
    lat: v.lat as number,
    lon: v.lon as number,
    tiltDeg: v.tiltDeg as number,
    azimuthDeg: v.azimuthDeg as number,
    year: v.year as number,
    monthlyKwhPerM2: v.monthlyKwhPerM2 as number[],
    fetchedAt: typeof v.fetchedAt === 'string' ? v.fetchedAt : new Date().toISOString(),
  }
}

/**
 * Coerces arbitrary parsed JSON into a valid Plan, or null if unusable.
 * Imports get a fresh id; storage migrations pass keepIdentity to preserve id and timestamps.
 */
export function sanitizePlan(raw: unknown, keepIdentity = false): Plan | null {
  if (!isObj(raw) || typeof raw.name !== 'string') return null
  const d = createDefaultPlan(raw.name.slice(0, 60) || 'Imported plan')
  if (keepIdentity) {
    if (typeof raw.id === 'string') d.id = raw.id
    if (typeof raw.createdAt === 'string') d.createdAt = raw.createdAt
    if (typeof raw.updatedAt === 'string') d.updatedAt = raw.updatedAt
  }
  const loc = isObj(raw.location) ? raw.location : {}
  const sys = isObj(raw.system) ? raw.system : {}
  const costs = isObj(raw.costs) ? raw.costs : {}
  const loan = isObj(raw.loan) ? raw.loan : {}
  const asm = isObj(raw.assumptions) ? raw.assumptions : {}
  return {
    ...d,
    location: {
      label: typeof loc.label === 'string' ? loc.label : '',
      lat: typeof loc.lat === 'number' ? loc.lat : null,
      lon: typeof loc.lon === 'number' ? loc.lon : null,
    },
    system: {
      sizeKw: num(sys.sizeKw, d.system.sizeKw),
      tiltDeg: num(sys.tiltDeg, d.system.tiltDeg),
      azimuthDeg: num(sys.azimuthDeg, d.system.azimuthDeg),
      lossesPct: num(sys.lossesPct, d.system.lossesPct),
      degradationPct: num(sys.degradationPct, d.system.degradationPct),
    },
    costs: {
      installCost: num(costs.installCost, d.costs.installCost),
      incentives: num(costs.incentives, 0),
      annualMaintenance: num(costs.annualMaintenance, 0),
      inverterReplacementCost: num(costs.inverterReplacementCost, 0),
      inverterReplacementYear: num(costs.inverterReplacementYear, d.costs.inverterReplacementYear),
    },
    loan: {
      enabled: loan.enabled === true,
      principal: num(loan.principal, 0),
      aprPct: num(loan.aprPct, d.loan.aprPct),
      termMonths: num(loan.termMonths, d.loan.termMonths),
    },
    assumptions: {
      rateEscalationPct: num(asm.rateEscalationPct, d.assumptions.rateEscalationPct),
      electricityRate: num(asm.electricityRate, d.assumptions.electricityRate),
    },
    irradiance: sanitizeIrradiance(raw.irradiance),
  }
}
