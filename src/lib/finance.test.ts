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
    p.assumptions = { rateEscalationPct: 0, electricityRate: 0.2 }
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
