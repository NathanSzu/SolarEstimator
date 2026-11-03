import type { Plan } from '../types/plan'
import { monthlyPayment } from './loan'

export const HORIZON_YEARS = 25
export const DAYS_PER_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

export interface MonthRow {
  /** 1-based month index from installation. */
  month: number
  productionKwh: number
  savings: number
  loanPayment: number
  net: number
  cumulative: number
}

export interface Projection {
  upfront: number
  rows: MonthRow[]
  /** Month number when cumulative cash flow first reaches zero, or null if not within the horizon. */
  paybackMonth: number | null
  netAtHorizon: number
  firstYearKwh: number
  monthlyPayment: number
}

/** Monthly production (kWh) in year one from monthly plane-of-array irradiance (kWh/m²). */
export function monthlyProduction(kwhPerM2: number[], sizeKw: number, lossesPct: number): number[] {
  return kwhPerM2.map((irr) => irr * sizeKw * (1 - lossesPct / 100))
}

export function project(plan: Plan, yearOneMonthlyKwh: number[], years = HORIZON_YEARS): Projection {
  const { costs, loan, system, assumptions } = plan
  const net = Math.max(costs.installCost - costs.incentives, 0)
  const financed = loan.enabled ? Math.min(Math.max(loan.principal, 0), net) : 0
  const upfront = net - financed
  const payment = monthlyPayment(financed, loan.aprPct, loan.termMonths)

  const rows: MonthRow[] = []
  let cumulative = -upfront
  let paybackMonth: number | null = upfront === 0 ? 0 : null

  for (let m = 1; m <= years * 12; m++) {
    const year = Math.floor((m - 1) / 12)
    const kwh = yearOneMonthlyKwh[(m - 1) % 12] * Math.pow(1 - system.degradationPct / 100, year)
    const rate = assumptions.electricityRate * Math.pow(1 + assumptions.rateEscalationPct / 100, year)
    const savings = kwh * rate
    const loanPayment = m <= loan.termMonths && financed > 0 ? payment : 0
    const upkeep =
      costs.annualMaintenance / 12 +
      (costs.inverterReplacementCost > 0 && m === Math.round(costs.inverterReplacementYear) * 12
        ? costs.inverterReplacementCost
        : 0)
    const monthNet = savings - loanPayment - upkeep
    cumulative += monthNet
    if (paybackMonth === null && cumulative >= 0) paybackMonth = m
    rows.push({ month: m, productionKwh: kwh, savings, loanPayment, net: monthNet, cumulative })
  }

  return {
    upfront,
    rows,
    paybackMonth,
    netAtHorizon: cumulative,
    firstYearKwh: yearOneMonthlyKwh.reduce((a, b) => a + b, 0),
    monthlyPayment: payment,
  }
}
