import { describe, expect, it } from 'vitest'
import { createDefaultPlan } from '../types/plan'
import { monthlyProduction, project } from './finance'
import { monthlyPayment } from './loan'

const flat = (kwh: number) => new Array<number>(12).fill(kwh)

describe('monthlyPayment', () => {
  it('matches the standard amortization formula', () => {
    expect(monthlyPayment(10000, 6, 60)).toBeCloseTo(193.33, 2)
  })
  it('handles zero interest and zero principal', () => {
    expect(monthlyPayment(1200, 0, 12)).toBe(100)
    expect(monthlyPayment(0, 5, 12)).toBe(0)
  })
})

describe('monthlyProduction', () => {
  it('applies size and losses', () => {
    expect(monthlyProduction([100], 5, 20)[0]).toBeCloseTo(400)
  })
})

describe('project', () => {
  const base = () => {
    const p = createDefaultPlan('t')
    p.costs = { ...p.costs, installCost: 12000, incentives: 0 }
    p.assumptions = { rateEscalationPct: 0, electricityRate: 0.2, startMonth: 1 }
    p.system.degradationPct = 0
    return p
  }

  it('finds payback for a cash purchase', () => {
    // 500 kWh * $0.20 = $100/month -> $12,000 after 120 months
    const r = project(base(), flat(500))
    expect(r.upfront).toBe(12000)
    expect(r.paybackMonth).toBe(120)
  })

  it('returns null when it never pays back', () => {
    expect(project(base(), flat(10)).paybackMonth).toBeNull()
  })

  it('accounts for loan payments and down payment', () => {
    const p = base()
    p.loan = { enabled: true, principal: 12000, aprPct: 0, termMonths: 120 }
    const r = project(p, flat(500))
    expect(r.upfront).toBe(0)
    expect(r.monthlyPayment).toBe(100)
    expect(r.rows[0].net).toBeCloseTo(0)
    expect(r.paybackMonth).toBe(0)
  })

  it('applies degradation and rate escalation yearly', () => {
    const p = base()
    p.assumptions.rateEscalationPct = 10
    p.system.degradationPct = 10
    const r = project(p, flat(100), 2)
    expect(r.rows[11].savings).toBeCloseTo(20)
    expect(r.rows[12].savings).toBeCloseTo(100 * 0.9 * 0.2 * 1.1)
  })

  it('amortizes the loan balance to zero at the end of the term', () => {
    const p = base()
    p.loan = { enabled: true, principal: 10000, aprPct: 6, termMonths: 60 }
    const r = project(p, flat(500), 6)
    expect(r.rows[0].loanBalance).toBeLessThan(10000)
    expect(r.rows[59].loanBalance).toBeCloseTo(0, 4)
    expect(r.rows[60].loanBalance).toBe(0)
  })

  it('starts production in the chosen calendar month', () => {
    const p = base()
    p.assumptions.startMonth = 6
    const kwh = Array.from({ length: 12 }, (_, i) => (i + 1) * 10)
    const r = project(p, kwh, 1)
    expect(r.rows[0].productionKwh).toBe(60)
    expect(r.rows[6].productionKwh).toBe(120)
    expect(r.rows[7].productionKwh).toBe(10)
  })

  it('does not count an early non-negative start as payback when cash flow dips later', () => {
    const p = base()
    p.costs.installCost = 600
    p.loan = { enabled: true, principal: 600, aprPct: 0, termMonths: 12 }
    // $30/month savings vs $50/month payment for a year, then $30/month with no payment
    const r = project(p, flat(150), 3)
    expect(r.upfront).toBe(0)
    expect(r.paybackMonth).toBe(20)
  })

  it('subtracts maintenance and a one-time inverter replacement', () => {
    const p = base()
    p.costs.annualMaintenance = 120
    p.costs.inverterReplacementCost = 1000
    p.costs.inverterReplacementYear = 2
    const r = project(p, flat(500), 3)
    expect(r.rows[0].net).toBeCloseTo(100 - 10)
    expect(r.rows[23].net).toBeCloseTo(100 - 10 - 1000)
    expect(r.rows[24].net).toBeCloseTo(100 - 10)
    expect(r.netAtHorizon).toBeCloseTo(-12000 + 36 * 90 - 1000)
  })
})
