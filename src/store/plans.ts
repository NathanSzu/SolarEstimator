import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { MAX_PLANS, createDefaultPlan, sanitizePlan, type Plan } from '../types/plan'

interface PlansState {
  plans: Plan[]
  addPlan: (name: string) => Plan | null
  duplicatePlan: (id: string) => Plan | null
  renamePlan: (id: string, name: string) => void
  updatePlan: (id: string, patch: Partial<Omit<Plan, 'id'>>) => void
  deletePlan: (id: string) => void
  /** Imports plans from parsed JSON (single plan or array); returns how many were added. */
  importPlans: (data: unknown) => number
}

export const usePlans = create<PlansState>()(
  persist(
    (set, get) => ({
      plans: [],
      addPlan: (name) => {
        if (get().plans.length >= MAX_PLANS) return null
        const plan = createDefaultPlan(name)
        set((s) => ({ plans: [...s.plans, plan] }))
        return plan
      },
      duplicatePlan: (id) => {
        const src = get().plans.find((p) => p.id === id)
        if (!src || get().plans.length >= MAX_PLANS) return null
        const now = new Date().toISOString()
        const copy: Plan = { ...structuredClone(src), id: crypto.randomUUID(), name: `${src.name} (copy)`, createdAt: now, updatedAt: now }
        set((s) => ({ plans: [...s.plans, copy] }))
        return copy
      },
      renamePlan: (id, name) => {
        const trimmed = name.trim()
        if (trimmed) get().updatePlan(id, { name: trimmed.slice(0, 60) })
      },
      updatePlan: (id, patch) =>
        set((s) => ({
          plans: s.plans.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p)),
        })),
      deletePlan: (id) => set((s) => ({ plans: s.plans.filter((p) => p.id !== id) })),
      importPlans: (data) => {
        const list = Array.isArray(data) ? data : [data]
        const room = MAX_PLANS - get().plans.length
        const valid = list.map(sanitizePlan).filter((p): p is Plan => p !== null).slice(0, Math.max(room, 0))
        if (valid.length) set((s) => ({ plans: [...s.plans, ...valid] }))
        return valid.length
      },
    }),
    {
      name: 'solar-estimator-plans',
      version: 1,
      migrate: (state) => {
        const old = (state as { plans?: unknown[] } | undefined)?.plans ?? []
        return { plans: old.map(sanitizePlan).filter((p): p is Plan => p !== null).slice(0, MAX_PLANS) }
      },
    },
  ),
)
