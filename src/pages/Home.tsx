import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { usePlans } from '../store/plans'
import { MAX_PLANS } from '../types/plan'

export default function Home() {
  const { plans, addPlan, deletePlan } = usePlans()
  const [name, setName] = useState('')
  const navigate = useNavigate()
  const full = plans.length >= MAX_PLANS

  const create = (e: React.FormEvent) => {
    e.preventDefault()
    const plan = addPlan(name.trim() || `Plan ${plans.length + 1}`)
    if (plan) navigate(`/plan/${plan.id}`)
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-gradient-to-br from-sun-400 to-sun-600 p-8 text-white shadow">
        <h1 className="text-3xl font-bold sm:text-4xl">Will your solar project pay for itself?</h1>
        <p className="mt-2 max-w-xl text-white/90">
          Model costs, financing, production and energy prices to see when you break even.
        </p>
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-xl font-semibold">Your plans</h2>
          <span className="text-sm text-slate-500">{plans.length}/{MAX_PLANS} saved</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => (
            <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <Link to={`/plan/${p.id}`} className="font-medium hover:underline">{p.name}</Link>
              <p className="mt-1 text-xs text-slate-500">Updated {new Date(p.updatedAt).toLocaleDateString()}</p>
              <button onClick={() => deletePlan(p.id)} className="mt-3 text-sm text-red-600 hover:underline">Delete</button>
            </div>
          ))}
        </div>
        <form onSubmit={create} className="mt-6 flex flex-col gap-2 sm:flex-row">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={full}
            placeholder="New plan name"
            className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900"
          />
          <button disabled={full} className="rounded-lg bg-sun-500 px-4 py-2 font-medium text-white hover:bg-sun-600 disabled:opacity-50">
            Create plan
          </button>
        </form>
        {full && <p className="mt-2 text-sm text-slate-500">Plan limit reached. Delete a plan to create a new one.</p>}
      </section>
    </div>
  )
}
