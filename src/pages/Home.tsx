import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { downloadJson, slug } from '../store/exportPlans'
import { usePlans } from '../store/plans'
import { MAX_PLANS } from '../types/plan'

const btn = 'text-sm hover:underline'

export default function Home() {
  const { plans, addPlan, duplicatePlan, deletePlan, importPlans } = usePlans()
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const full = plans.length >= MAX_PLANS

  const create = (e: React.FormEvent) => {
    e.preventDefault()
    const plan = addPlan(name.trim() || `Plan ${plans.length + 1}`)
    if (plan) navigate(`/plan/${plan.id}`)
  }

  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const count = importPlans(JSON.parse(await file.text()))
      setMessage(count ? `Imported ${count} plan(s).` : 'Nothing imported (invalid file or plan limit reached).')
    } catch {
      setMessage('Could not read that file.')
    }
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
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xl font-semibold">Your plans</h2>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500">{plans.length}/{MAX_PLANS} saved</span>
            <button onClick={() => fileRef.current?.click()} className={`${btn} text-sun-600`}>Import</button>
            {plans.length > 0 && (
              <button onClick={() => downloadJson(plans, 'solar-plans.json')} className={`${btn} text-sun-600`}>Export all</button>
            )}
            <input ref={fileRef} type="file" accept="application/json,.json" onChange={onImport} className="hidden" />
          </div>
        </div>
        {message && <p role="status" className="mb-3 text-sm text-slate-600 dark:text-slate-400">{message}</p>}
        {plans.length === 0 && <p className="text-slate-500">No plans yet. Create one below.</p>}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => (
            <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <Link to={`/plan/${p.id}`} className="font-medium hover:underline">{p.name}</Link>
              <p className="mt-1 text-xs text-slate-500">Updated {new Date(p.updatedAt).toLocaleDateString()}</p>
              <div className="mt-3 flex flex-wrap gap-3">
                <button onClick={() => duplicatePlan(p.id)} disabled={full} className={`${btn} disabled:opacity-40 disabled:no-underline`}>Duplicate</button>
                <button onClick={() => downloadJson(p, `${slug(p.name)}.json`)} className={btn}>Export</button>
                <button
                  onClick={() => window.confirm(`Delete "${p.name}"?`) && deletePlan(p.id)}
                  className={`${btn} text-red-600`}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={create} className="mt-6 flex flex-col gap-2 sm:flex-row">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={full}
            maxLength={60}
            aria-label="New plan name"
            placeholder="New plan name"
            className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900"
          />
          <button disabled={full} className="rounded-lg bg-sun-500 px-4 py-2 font-medium text-white hover:bg-sun-600 disabled:opacity-50">
            Create plan
          </button>
        </form>
        {full && <p className="mt-2 text-sm text-slate-500">Plan limit reached. Delete a plan to create or import another.</p>}
      </section>
    </div>
  )
}
