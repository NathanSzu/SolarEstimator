import { useEffect, useState } from 'react'
import { searchLocations, type GeoResult } from '../lib/geocode'
import { loanSummary } from '../lib/loan'
import type { Plan } from '../types/plan'
import { Field, NumberField, inputClass } from './fields'

type Patch = Partial<Omit<Plan, 'id'>>
interface StepProps {
  plan: Plan
  update: (patch: Patch) => void
}

const money = (n: number) => n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const money2 = (n: number) => n.toLocaleString(undefined, { style: 'currency', currency: 'USD' })

function LocationStep({ plan, update }: StepProps) {
  const [query, setQuery] = useState(plan.location.label)
  const [results, setResults] = useState<GeoResult[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { lat, lon, label } = plan.location

  useEffect(() => {
    if (query.trim() === label || query.trim().length < 3) {
      setResults([])
      return
    }
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      setLoading(true)
      setError('')
      try {
        setResults(await searchLocations(query, ctrl.signal))
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setError('Location search is unavailable. Try again shortly.')
      } finally {
        setLoading(false)
      }
    }, 400)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [query, label])

  const pick = (r: GeoResult) => {
    update({ location: { label: r.label, lat: r.lat, lon: r.lon } })
    setQuery(r.label)
    setResults([])
  }

  return (
    <div className="space-y-4">
      <Field label="Installation location" hint="Search for a city or town. Used for solar production and energy prices.">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. Phoenix, Arizona"
          className={inputClass}
          autoComplete="off"
        />
      </Field>
      {loading && <p className="text-sm text-slate-500">Searching…</p>}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {results.length > 0 && (
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {results.map((r) => (
            <li key={`${r.lat},${r.lon}`}>
              <button type="button" onClick={() => pick(r)} className="w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800">
                {r.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      {lat !== null && lon !== null && (
        <div className="space-y-2">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Selected: <strong>{label}</strong> ({lat.toFixed(3)}, {lon.toFixed(3)})
          </p>
          <iframe
            title="Location map"
            loading="lazy"
            className="h-64 w-full rounded-lg border border-slate-200 dark:border-slate-800"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.1},${lat - 0.07},${lon + 0.1},${lat + 0.07}&layer=mapnik&marker=${lat},${lon}`}
          />
        </div>
      )}
    </div>
  )
}

function SystemStep({ plan, update }: StepProps) {
  const s = plan.system
  const set = (k: keyof Plan['system']) => (v: number) => update({ system: { ...s, [k]: v } })
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <NumberField label="System size" value={s.sizeKw} onChange={set('sizeKw')} min={0.5} max={1000} step={0.1} suffix="kW" />
      <NumberField label="Panel tilt" value={s.tiltDeg} onChange={set('tiltDeg')} min={0} max={90} suffix="°" />
      <NumberField label="Azimuth" value={s.azimuthDeg} onChange={set('azimuthDeg')} min={0} max={359} suffix="°" hint="180° faces south (northern hemisphere)." />
      <NumberField label="System losses" value={s.lossesPct} onChange={set('lossesPct')} min={0} max={50} step={0.5} suffix="%" />
      <NumberField label="Annual degradation" value={s.degradationPct} onChange={set('degradationPct')} min={0} max={3} step={0.1} suffix="%" />
      <NumberField
        label="Energy price escalation"
        value={plan.assumptions.rateEscalationPct}
        onChange={(v) => update({ assumptions: { rateEscalationPct: v } })}
        min={-5}
        max={15}
        step={0.1}
        suffix="%/yr"
      />
    </div>
  )
}

function CostsStep({ plan, update }: StepProps) {
  const { costs, loan } = plan
  const net = Math.max(costs.installCost - costs.incentives, 0)
  const sum = loanSummary(loan.principal, loan.aprPct, loan.termMonths)
  const setLoan = (patch: Partial<Plan['loan']>) => update({ loan: { ...loan, ...patch } })

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField label="Total installation cost" value={costs.installCost} onChange={(v) => update({ costs: { ...costs, installCost: v } })} min={0} step={100} prefix="$" />
        <NumberField label="Incentives & rebates" value={costs.incentives} onChange={(v) => update({ costs: { ...costs, incentives: v } })} min={0} step={100} prefix="$" hint="e.g. tax credits, utility rebates." />
      </div>
      <p className="text-sm">Net cost: <strong>{money(net)}</strong></p>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={loan.enabled}
          onChange={(e) => setLoan({ enabled: e.target.checked, principal: e.target.checked && !loan.principal ? net : loan.principal })}
          className="size-4 accent-amber-500"
        />
        <span className="font-medium">Finance with a loan</span>
      </label>

      {loan.enabled && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <NumberField label="Loan principal" value={loan.principal} onChange={(v) => setLoan({ principal: Math.min(v, net) })} min={0} max={net} step={100} prefix="$" />
            <NumberField label="Interest rate (APR)" value={loan.aprPct} onChange={(v) => setLoan({ aprPct: v })} min={0} max={40} step={0.05} suffix="%" />
            <NumberField label="Term" value={loan.termMonths} onChange={(v) => setLoan({ termMonths: Math.round(v) })} min={1} max={480} suffix="months" />
          </div>
          <div className="grid gap-3 rounded-xl bg-amber-50 p-4 text-sm sm:grid-cols-4 dark:bg-slate-900">
            <Stat label="Down payment" value={money(net - loan.principal)} />
            <Stat label="Monthly payment" value={money2(sum.payment)} />
            <Stat label="Total interest" value={money(sum.interest)} />
            <Stat label="Total repaid" value={money(sum.total)} />
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  )
}

function ReviewStep({ plan }: StepProps) {
  const { location: l, system: s, costs: c, loan } = plan
  const net = Math.max(c.installCost - c.incentives, 0)
  const rows: [string, string][] = [
    ['Location', l.label || 'Not set'],
    ['System', `${s.sizeKw} kW, ${s.tiltDeg}° tilt, ${s.azimuthDeg}° azimuth`],
    ['Losses / degradation', `${s.lossesPct}% / ${s.degradationPct}% per year`],
    ['Net cost', money(net)],
    ['Financing', loan.enabled ? `${money(loan.principal)} at ${loan.aprPct}% for ${loan.termMonths} months (${money2(loanSummary(loan.principal, loan.aprPct, loan.termMonths).payment)}/mo)` : 'Cash purchase'],
    ['Energy price escalation', `${plan.assumptions.rateEscalationPct}% per year`],
  ]
  return (
    <div className="space-y-4">
      <dl className="divide-y divide-slate-200 dark:divide-slate-800">
        {rows.map(([k, v]) => (
          <div key={k} className="flex flex-col gap-1 py-2 sm:flex-row sm:justify-between">
            <dt className="text-slate-500">{k}</dt>
            <dd className="font-medium">{v}</dd>
          </div>
        ))}
      </dl>
      {l.lat === null && <p className="text-sm text-amber-700 dark:text-amber-400">Add a location to enable production and energy price estimates.</p>}
      <p className="text-sm text-slate-500">Payback charts will appear here in an upcoming phase.</p>
    </div>
  )
}

const steps = [
  { title: 'Location', Component: LocationStep },
  { title: 'System', Component: SystemStep },
  { title: 'Costs & loan', Component: CostsStep },
  { title: 'Review', Component: ReviewStep },
]

export default function PlanWizard({ plan, update }: StepProps) {
  const [step, setStep] = useState(0)
  const { Component } = steps[step]

  return (
    <div className="space-y-6">
      <ol className="flex gap-2 overflow-x-auto" aria-label="Steps">
        {steps.map((s, i) => (
          <li key={s.title} className="flex-1">
            <button
              onClick={() => setStep(i)}
              aria-current={i === step ? 'step' : undefined}
              className={`w-full whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${
                i === step ? 'bg-sun-500 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {i + 1}. {s.title}
            </button>
          </li>
        ))}
      </ol>
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
        <Component plan={plan} update={update} />
      </div>
      <div className="flex justify-between">
        <button onClick={() => setStep((s) => s - 1)} disabled={step === 0} className="rounded-lg border border-slate-300 px-4 py-2 disabled:opacity-40 dark:border-slate-700">
          Back
        </button>
        <button onClick={() => setStep((s) => s + 1)} disabled={step === steps.length - 1} className="rounded-lg bg-sun-500 px-4 py-2 font-medium text-white hover:bg-sun-600 disabled:opacity-40">
          Next
        </button>
      </div>
      <p className="text-xs text-slate-500">Changes save automatically to this browser.</p>
    </div>
  )
}
