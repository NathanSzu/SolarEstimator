import type { Plan } from '../types/plan'

export interface Scenario {
  financing: 'plan' | 'cash' | 'loan'
  /** Percentage-point change to annual energy price escalation. */
  escalationDelta: number
  /** Percent change to installation cost. */
  costPct: number
  /** Percent change to the electricity rate. */
  ratePct: number
}

export const DEFAULT_SCENARIO: Scenario = { financing: 'plan', escalationDelta: 0, costPct: 0, ratePct: 0 }

export const isDefaultScenario = (s: Scenario) =>
  s.financing === 'plan' && s.escalationDelta === 0 && s.costPct === 0 && s.ratePct === 0

/** Returns a what-if copy of the plan; never mutates or saves the original. */
export function applyScenario(plan: Plan, s: Scenario): Plan {
  const oldNet = Math.max(plan.costs.installCost - plan.costs.incentives, 0)
  const installCost = plan.costs.installCost * (1 + s.costPct / 100)
  const newNet = Math.max(installCost - plan.costs.incentives, 0)
  const hasLoan = plan.loan.enabled && plan.loan.principal > 0
  const principal = hasLoan ? plan.loan.principal * (oldNet > 0 ? newNet / oldNet : 1) : newNet

  const enabled = s.financing === 'plan' ? plan.loan.enabled : s.financing === 'loan'
  return {
    ...plan,
    costs: { ...plan.costs, installCost },
    loan: { ...plan.loan, enabled, principal: Math.min(principal, newNet) },
    assumptions: {
      ...plan.assumptions,
      electricityRate: plan.assumptions.electricityRate * (1 + s.ratePct / 100),
      rateEscalationPct: Math.min(20, Math.max(-10, plan.assumptions.rateEscalationPct + s.escalationDelta)),
    },
  }
}
