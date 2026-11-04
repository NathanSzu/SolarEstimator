import { Suspense, lazy, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { formatPayback, money, money2 } from '../lib/format'
import { projectPlan } from '../lib/projectPlan'
import { usePlans } from '../store/plans'

const CompareChart = lazy(() => import('../components/CompareChart'))

export default function Compare() {
  const plans = usePlans((s) => s.plans)
  const items = useMemo(() => plans.map((plan) => ({ plan, result: projectPlan(plan) })), [plans])
  const ready = items.filter((i) => i.result !== null).map((i) => ({ id: i.plan.id, name: i.plan.name, result: i.result! }))
  const missing = items.filter((i) => i.result === null)

  if (plans.length < 2) {
    return (
      <div className="space-y-3">
        <Link to="/" className="text-sm text-sun-600 hover:underline">← All plans</Link>
        <p>Create at least two plans to compare them.</p>
      </div>
    )
  }

  const rows: [string, (i: (typeof items)[number]) => string][] = [
    ['Location', ({ plan }) => plan.location.label || 'Not set'],
    ['System size', ({ plan }) => `${plan.system.sizeKw} kW`],
    ['Net cost', ({ plan }) => money(Math.max(plan.costs.installCost - plan.costs.incentives, 0))],
    ['Financing', ({ result }) => (result ? (result.monthlyPayment ? `Loan, ${money2(result.monthlyPayment)}/mo` : 'Cash') : '—')],
    ['Up-front cost', ({ result }) => (result ? money(result.upfront) : '—')],
    ['Year-one production', ({ result }) => (result ? `${Math.round(result.firstYearKwh).toLocaleString()} kWh` : '—')],
    ['Payback', ({ result }) => (result ? formatPayback(result.paybackMonth) : '—')],
    ['25-year net profit', ({ result }) => (result ? money(result.netAtHorizon) : '—')],
  ]

  return (
    <div className="space-y-6">
      <Link to="/" className="text-sm text-sun-600 hover:underline">← All plans</Link>
      <h1 className="text-2xl font-bold">Compare plans</h1>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/50">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800">
              <th className="p-3 font-medium text-slate-500"></th>
              {items.map(({ plan }) => (
                <th key={plan.id} className="p-3 font-semibold">
                  <Link to={`/plan/${plan.id}`} className="hover:underline">{plan.name}</Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {rows.map(([label, get]) => (
              <tr key={label}>
                <th scope="row" className="p-3 font-medium text-slate-500">{label}</th>
                {items.map((i) => (
                  <td key={i.plan.id} className="p-3">{get(i)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {missing.length > 0 && (
        <p className="text-sm text-amber-700 dark:text-amber-400">
          {missing.map((m) => m.plan.name).join(', ')} {missing.length > 1 ? 'need' : 'needs'} a location and solar data. Open the plan and visit its Review step to load it.
        </p>
      )}

      {ready.length >= 2 && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/50">
          <h2 className="font-semibold">Cumulative cash position</h2>
          <p className="mb-3 text-xs text-slate-500">Where each line crosses zero is that plan's payback.</p>
          <Suspense fallback={<p className="text-sm text-slate-500">Loading chart…</p>}>
            <CompareChart plans={ready} />
          </Suspense>
        </section>
      )}
    </div>
  )
}
