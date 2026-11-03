export const MAX_PLANS = 3

export interface Plan {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  location?: { label: string; lat: number; lon: number }
  system?: { sizeKw: number; tiltDeg: number; azimuthDeg: number; lossesPct: number; degradationPct: number }
  costs?: { installCost: number; incentives: number }
  loan?: { principal: number; aprPct: number; termMonths: number }
  assumptions?: { rateEscalationPct: number }
}
