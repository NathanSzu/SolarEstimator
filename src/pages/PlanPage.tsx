import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import PlanWizard from '../components/PlanWizard'
import { usePlans } from '../store/plans'

export default function PlanPage() {
  const { id = '' } = useParams()
  const plan = usePlans((s) => s.plans.find((p) => p.id === id))
  const renamePlan = usePlans((s) => s.renamePlan)
  const updatePlan = usePlans((s) => s.updatePlan)
  const [draft, setDraft] = useState<string | null>(null)

  if (!plan) {
    return (
      <p>
        Plan not found. <Link to="/" className="text-sun-600 underline">Back home</Link>
      </p>
    )
  }

  const commit = () => {
    if (draft !== null) renamePlan(id, draft)
    setDraft(null)
  }

  return (
    <div className="space-y-4">
      <Link to="/" className="text-sm text-sun-600 hover:underline">← All plans</Link>
      <input
        value={draft ?? plan.name}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        maxLength={60}
        aria-label="Plan name"
        className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1 text-2xl font-bold hover:border-slate-300 focus:border-sun-500 focus:outline-none dark:hover:border-slate-700"
      />
      <PlanWizard plan={plan} update={(patch) => updatePlan(id, patch)} />
    </div>
  )
}
