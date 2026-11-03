export const MAX_PLANS = 3

export interface Plan {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  location: { label: string; lat: number | null; lon: number | null }
  system: { sizeKw: number; tiltDeg: number; azimuthDeg: number; lossesPct: number; degradationPct: number }
  costs: { installCost: number; incentives: number }
  loan: { enabled: boolean; principal: number; aprPct: number; termMonths: number }
  assumptions: { rateEscalationPct: number }
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
    costs: { installCost: 18000, incentives: 0 },
    loan: { enabled: false, principal: 0, aprPct: 6.5, termMonths: 180 },
    assumptions: { rateEscalationPct: 3 },
  }
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d)

/** Coerces arbitrary parsed JSON into a valid Plan with a fresh id, or null if unusable. */
export function sanitizePlan(raw: unknown): Plan | null {
  if (!isObj(raw) || typeof raw.name !== 'string') return null
  const d = createDefaultPlan(raw.name.slice(0, 60) || 'Imported plan')
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
    costs: { installCost: num(costs.installCost, d.costs.installCost), incentives: num(costs.incentives, 0) },
    loan: {
      enabled: loan.enabled === true,
      principal: num(loan.principal, 0),
      aprPct: num(loan.aprPct, d.loan.aprPct),
      termMonths: num(loan.termMonths, d.loan.termMonths),
    },
    assumptions: { rateEscalationPct: num(asm.rateEscalationPct, d.assumptions.rateEscalationPct) },
  }
}
