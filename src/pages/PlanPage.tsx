import { Link, useParams } from 'react-router-dom'
import { usePlans } from '../store/plans'

export default function PlanPage() {
  const { id } = useParams()
  const plan = usePlans((s) => s.plans.find((p) => p.id === id))

  if (!plan) {
    return (
      <p>
        Plan not found. <Link to="/" className="text-sun-600 underline">Back home</Link>
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <Link to="/" className="text-sm text-sun-600 hover:underline">← All plans</Link>
      <h1 className="text-2xl font-bold">{plan.name}</h1>
      <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500 dark:border-slate-700">
        Input wizard and payback charts coming in the next phases.
      </div>
    </div>
  )
}
