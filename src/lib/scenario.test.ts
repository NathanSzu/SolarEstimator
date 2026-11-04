import { describe, expect, it } from 'vitest'
import { createDefaultPlan } from '../types/plan'
import { DEFAULT_SCENARIO, applyScenario } from './scenario'

const plan = () => {
  const p = createDefaultPlan('t')
  p.costs = { ...p.costs, installCost: 20000, incentives: 5000 }
  p.assumptions = { ...p.assumptions, electricityRate: 0.2, rateEscalationPct: 3 }
  return p
}

describe('applyScenario', () => {
  it('leaves the plan unchanged by default and never mutates it', () => {
    const p = plan()
    const out = applyScenario(p, DEFAULT_SCENARIO)
    expect(out.costs.installCost).toBe(20000)
    expect(out.loan.enabled).toBe(false)
    applyScenario(p, { ...DEFAULT_SCENARIO, costPct: 50 })
    expect(p.costs.installCost).toBe(20000)
  })

  it('adjusts cost, rate and escalation', () => {
    const out = applyScenario(plan(), { financing: 'plan', escalationDelta: 2, costPct: 10, ratePct: -50 })
    expect(out.costs.installCost).toBeCloseTo(22000)
    expect(out.assumptions.electricityRate).toBeCloseTo(0.1)
    expect(out.assumptions.rateEscalationPct).toBe(5)
  })

  it('finances the full net cost when switching to loan without an existing loan', () => {
    const out = applyScenario(plan(), { ...DEFAULT_SCENARIO, financing: 'loan' })
    expect(out.loan.enabled).toBe(true)
    expect(out.loan.principal).toBe(15000)
  })

  it('keeps the financed share when cost changes and can force cash', () => {
    const p = plan()
    p.loan = { enabled: true, principal: 7500, aprPct: 6, termMonths: 120 }
    const scaled = applyScenario(p, { ...DEFAULT_SCENARIO, costPct: 100 })
    expect(scaled.loan.principal).toBeCloseTo(7500 * (35000 / 15000))
    expect(applyScenario(p, { ...DEFAULT_SCENARIO, financing: 'cash' }).loan.enabled).toBe(false)
  })
})
