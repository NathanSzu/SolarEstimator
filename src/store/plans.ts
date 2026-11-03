import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { MAX_PLANS, type Plan } from '../types/plan'

interface PlansState {
  plans: Plan[]
  addPlan: (name: string) => Plan | null
  updatePlan: (id: string, patch: Partial<Omit<Plan, 'id'>>) => void
  deletePlan: (id: string) => void
}

export const usePlans = create<PlansState>()(
  persist(
    (set, get) => ({
      plans: [],
      addPlan: (name) => {
        if (get().plans.length >= MAX_PLANS) return null
        const now = new Date().toISOString()
        const plan: Plan = { id: crypto.randomUUID(), name, createdAt: now, updatedAt: now }
        set((s) => ({ plans: [...s.plans, plan] }))
        return plan
      },
      updatePlan: (id, patch) =>
        set((s) => ({
          plans: s.plans.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p)),
        })),
      deletePlan: (id) => set((s) => ({ plans: s.plans.filter((p) => p.id !== id) })),
    }),
    { name: 'solar-estimator-plans' },
  ),
)
