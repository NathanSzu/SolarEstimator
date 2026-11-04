import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { HORIZON_YEARS } from '../lib/finance'
import { formatPayback, money, money2 } from '../lib/format'
import { searchLocations, type GeoResult } from '../lib/geocode'
import { loanSummary } from '../lib/loan'
import { projectPlan } from '../lib/projectPlan'
import { fetchRateTrend, fetchResidentialRate, rateLookupAvailable, stateCode } from '../lib/rates'
import { DEFAULT_SCENARIO, applyScenario, isDefaultScenario, type Scenario } from '../lib/scenario'
import { fetchIrradiance, irradianceMatches } from '../lib/solar'
import type { Plan } from '../types/plan'
import { Field, NumberField, inputClass } from './fields'
import ScenarioPanel from './ScenarioPanel'

const PaybackCharts = lazy(() => import('./PaybackCharts'))

type Patch = Partial<Omit<Plan, 'id'>>
interface StepProps {
  plan: Plan
  update: (patch: Patch) => void
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

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
        if ((e as Error).name !== 'AbortError') setError(`${(e as Error).message} You can still type a different search.`)
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
    update({ location: { label: r.label, lat: r.lat, lon: r.lon, region: r.region, country: r.country } })
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

function usState(plan: Plan): string | null {
  const c = plan.location.country
  return c?.toUpperCase().startsWith('US') || c === 'United States' ? stateCode(plan.location.region) : null
}

const toggleTab = (active: boolean) =>
  `rounded-md px-2 py-1 ${active ? 'bg-sun-500 text-white' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`

const TREND_YEARS = [5, 10, 20]

function EscalationLookup({ plan, update }: StepProps) {
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [years, setYears] = useState(10)
  if (!rateLookupAvailable) return null
  const state = usState(plan)
  const a = plan.assumptions
  const local = a.localEscalation
  const usingLocal = a.escalationSource === 'local' && !!local

  const lookup = async () => {
    if (!state) return
    setBusy(true)
    setStatus('')
    try {
      const t = await fetchRateTrend(state, years)
      update({
        assumptions: {
          ...a,
          manualEscalation: a.escalationSource === 'local' ? a.manualEscalation : a.rateEscalationPct,
          localEscalation: { pct: t.pct, state, fromYear: t.fromYear, toYear: t.toYear },
          escalationSource: 'local',
          rateEscalationPct: t.pct,
        },
      })
    } catch (e) {
      setStatus((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const switchTo = (source: 'manual' | 'local') => {
    if (source === 'local' && local) {
      update({ assumptions: { ...a, escalationSource: 'local', manualEscalation: a.manualEscalation ?? a.rateEscalationPct, rateEscalationPct: local.pct } })
    } else if (source === 'manual') {
      update({ assumptions: { ...a, escalationSource: 'manual', rateEscalationPct: a.manualEscalation ?? a.rateEscalationPct } })
    }
  }

  return (
    <div className="text-xs">
      {local && (
        <div className="flex flex-wrap items-center gap-1">
          <button type="button" onClick={() => switchTo('manual')} aria-pressed={!usingLocal} className={toggleTab(!usingLocal)}>
            My value{a.manualEscalation != null ? ` (${a.manualEscalation}%)` : ''}
          </button>
          <button type="button" onClick={() => switchTo('local')} aria-pressed={usingLocal} className={toggleTab(usingLocal)}>
            {local.state} trend {local.fromYear}–{local.toYear} ({local.pct}%)
          </button>
        </div>
      )}
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <label className="text-slate-500" htmlFor="trend-years">Look back</label>
        <select id="trend-years" value={years} onChange={(e) => setYears(Number(e.target.value))} className="rounded border border-slate-300 bg-transparent px-1 py-0.5 dark:border-slate-700">
          {TREND_YEARS.map((y) => (
            <option key={y} value={y}>{y} years</option>
          ))}
        </select>
        <button type="button" onClick={lookup} disabled={!state || busy} className="text-sun-600 hover:underline disabled:opacity-50 disabled:no-underline">
          {busy ? 'Looking up…' : local ? 'Refresh trend' : 'Use historical local trend (US)'}
        </button>
        {!state && !local && <span className="text-slate-500">Choose a US location first.</span>}
      </div>
      {usingLocal && local && (
        <p className="mt-1 text-slate-500">
          Average yearly growth of EIA residential prices; past trends may not continue. Editing the field switches back to your own value.
        </p>
      )}
      {status && <p role="status" className="mt-1 text-slate-500">{status}</p>}
    </div>
  )
}

function RateLookup({ plan, update }: StepProps) {
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  if (!rateLookupAvailable) return null
  const state = usState(plan)

  const lookup = async () => {
    if (!state) return
    setBusy(true)
    setStatus('')
    try {
      const r = await fetchResidentialRate(state)
      const a = plan.assumptions
      update({
        assumptions: {
          ...a,
          manualRate: a.rateSource === 'local' ? a.manualRate : a.electricityRate,
          localRate: { rate: r.rate, state, months: r.months },
          rateSource: 'local',
          electricityRate: r.rate,
        },
      })
    } catch (e) {
      setStatus((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const a = plan.assumptions
  const local = a.localRate
  const usingLocal = a.rateSource === 'local' && !!local
  const switchTo = (source: 'manual' | 'local') => {
    if (source === 'local' && local) {
      update({ assumptions: { ...a, rateSource: 'local', manualRate: a.manualRate ?? a.electricityRate, electricityRate: local.rate } })
    } else if (source === 'manual') {
      update({ assumptions: { ...a, rateSource: 'manual', electricityRate: a.manualRate ?? a.electricityRate } })
    }
  }
  const tab = toggleTab

  return (
    <div className="text-xs">
      {local && (
        <div className="flex flex-wrap items-center gap-1">
          <button type="button" onClick={() => switchTo('manual')} aria-pressed={!usingLocal} className={tab(!usingLocal)}>
            My rate{a.manualRate != null ? ` ($${a.manualRate})` : ''}
          </button>
          <button type="button" onClick={() => switchTo('local')} aria-pressed={usingLocal} className={tab(usingLocal)}>
            {local.state} average (${local.rate})
          </button>
        </div>
      )}
      <button type="button" onClick={lookup} disabled={!state || busy} className="mt-1 text-sun-600 hover:underline disabled:opacity-50 disabled:no-underline">
        {busy ? 'Looking up…' : local ? 'Refresh local rate' : 'Use average local rate (US)'}
      </button>
      {!state && !local && <span className="ml-2 text-slate-500">Choose a US location first.</span>}
      {usingLocal && local && <p className="mt-1 text-slate-500">EIA average residential rate, last {local.months} months. Editing the field switches back to your own rate.</p>}
      {status && <p role="status" className="mt-1 text-slate-500">{status}</p>}
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
      <Field label="Start month" hint="First month the system produces power. Affects early cash flow because sunlight varies by season.">
        <select
          value={plan.assumptions.startMonth}
          onChange={(e) => update({ assumptions: { ...plan.assumptions, startMonth: Number(e.target.value) } })}
          className={inputClass}
        >
          {MONTH_NAMES.map((m, i) => (
            <option key={m} value={i + 1}>{m}</option>
          ))}
        </select>
      </Field>
      <div className="space-y-2">
        <NumberField
          label="Electricity rate"
          value={plan.assumptions.electricityRate}
          onChange={(v) => update({ assumptions: { ...plan.assumptions, electricityRate: v, manualRate: v, rateSource: 'manual' } })}
          min={0}
          max={2}
          step={0.01}
          prefix="$"
          suffix="/kWh"
          hint="Check your utility bill for your current rate."
        />
        <RateLookup plan={plan} update={update} />
      </div>
      <div className="space-y-2">
        <NumberField
          label="Energy price escalation"
          value={plan.assumptions.rateEscalationPct}
          onChange={(v) => update({ assumptions: { ...plan.assumptions, rateEscalationPct: v, manualEscalation: v, escalationSource: 'manual' } })}
          min={-5}
          max={15}
          step={0.1}
          suffix="%/yr"
        />
        <EscalationLookup plan={plan} update={update} />
      </div>
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

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Optional ongoing costs</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField label="Annual maintenance" value={costs.annualMaintenance} onChange={(v) => update({ costs: { ...costs, annualMaintenance: v } })} min={0} step={10} prefix="$" suffix="/yr" hint="Cleaning, monitoring, insurance." />
          <NumberField label="Inverter replacement" value={costs.inverterReplacementCost} onChange={(v) => update({ costs: { ...costs, inverterReplacementCost: v } })} min={0} step={100} prefix="$" hint="Leave at 0 to exclude." />
          <NumberField label="Replacement year" value={costs.inverterReplacementYear} onChange={(v) => update({ costs: { ...costs, inverterReplacementYear: Math.round(v) } })} min={1} max={HORIZON_YEARS} suffix="yr" hint="Often 12–15 years." />
        </div>
      </fieldset>

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

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div title={hint}>
      <div className="text-xs text-slate-500">
        {label}
        {hint && <span aria-hidden className="ml-1 cursor-help">ⓘ</span>}
      </div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  )
}

function ReviewStep({ plan, update }: StepProps) {
  const { location: l, system: s, costs: c, loan } = plan
  const net = Math.max(c.installCost - c.incentives, 0)
  const hasLoc = l.lat !== null && l.lon !== null
  const cache = plan.irradiance
  const fresh = hasLoc && irradianceMatches(cache, l.lat!, l.lon!, s.tiltDeg, s.azimuthDeg)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!hasLoc || fresh) return
    const ctrl = new AbortController()
    setLoading(true)
    setError('')
    fetchIrradiance(l.lat!, l.lon!, s.tiltDeg, s.azimuthDeg, ctrl.signal)
      .then((irradiance) => update({ irradiance }))
      .catch((e: Error) => e.name !== 'AbortError' && setError(e.message))
      .finally(() => setLoading(false))
    return () => ctrl.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasLoc, fresh, l.lat, l.lon, s.tiltDeg, s.azimuthDeg, attempt])

  const [scenario, setScenario] = useState<Scenario>(DEFAULT_SCENARIO)
  const scenarioActive = !isDefaultScenario(scenario)

  const { result, cash, loanResult } = useMemo(() => {
    const what = applyScenario(plan, scenario)
    return {
      result: projectPlan(what),
      cash: projectPlan(applyScenario(plan, { ...scenario, financing: 'cash' })),
      loanResult: projectPlan(applyScenario(plan, { ...scenario, financing: 'loan' })),
    }
  }, [plan, scenario])

  const rows: [string, string][] = [
    ['Location', l.label || 'Not set'],
    ['System', `${s.sizeKw} kW, ${s.tiltDeg}° tilt, ${s.azimuthDeg}° azimuth`],
    ['Losses / degradation', `${s.lossesPct}% / ${s.degradationPct}% per year`],
    ['Net cost', money(net)],
    ['Ongoing costs', c.annualMaintenance || c.inverterReplacementCost ? `${money(c.annualMaintenance)}/yr maintenance${c.inverterReplacementCost ? `, ${money(c.inverterReplacementCost)} inverter in year ${c.inverterReplacementYear}` : ''}` : 'None'],
    ['Financing', loan.enabled ? `${money(loan.principal)} at ${loan.aprPct}% for ${loan.termMonths} months (${money2(loanSummary(loan.principal, loan.aprPct, loan.termMonths).payment)}/mo)` : 'Cash purchase'],
    ['Energy price', `$${plan.assumptions.electricityRate}/kWh, rising ${plan.assumptions.rateEscalationPct}% per year`],
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
      {l.lat === null && <p className="text-sm text-amber-700 dark:text-amber-400">Add a location to calculate production and payback.</p>}
      {loading && <p className="text-sm text-slate-500">Loading historical solar data…</p>}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}{' '}
          <button onClick={() => setAttempt((a) => a + 1)} className="font-medium underline">Retry</button>
        </p>
      )}
      {result && (
        <>
          {scenarioActive && <p className="text-sm font-medium text-sun-600">Showing a what-if scenario (not saved).</p>}
          <div className="grid gap-3 rounded-xl bg-amber-50 p-4 sm:grid-cols-2 lg:grid-cols-4 dark:bg-slate-900">
          <Stat label="Payback" value={formatPayback(result.paybackMonth)} hint="The month your cumulative cash position reaches zero and stays there, counting the down payment, loan payments and ongoing costs." />
          <Stat label={`${HORIZON_YEARS}-year net profit`} value={money(result.netAtHorizon)} hint="Total savings minus all costs paid (down payment, loan principal and interest, maintenance, inverter replacement). Not adjusted for inflation or the time value of money." />
          <Stat label="Year-one production" value={`${Math.round(result.firstYearKwh).toLocaleString()} kWh`} />
          <Stat label="Up-front cost" value={money(result.upfront)} />
          <Stat label="First-month cash flow" value={money2(result.rows[0].net)} hint="Savings minus the loan payment and upkeep in month one only. It can be negative even when the plan eventually pays back, because savings grow over time and the loan payment ends." />
          </div>
          <ScenarioPanel scenario={scenario} onChange={setScenario} cash={cash} loan={loanResult} />
          <Suspense fallback={<p className="text-sm text-slate-500">Loading charts…</p>}>
            <PaybackCharts result={result} startMonth={plan.assumptions.startMonth} />
          </Suspense>
          <p className="text-xs text-slate-500">
            Based on {cache!.year} historical irradiance for this location (Open-Meteo), assuming all production offsets
            purchased electricity at your rate.
          </p>
        </>
      )}
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
        {step === steps.length - 1 ? (
          <Link to="/" className="rounded-lg bg-sun-500 px-4 py-2 font-medium text-white hover:bg-sun-600">
            Done
          </Link>
        ) : (
          <button onClick={() => setStep((s) => s + 1)} className="rounded-lg bg-sun-500 px-4 py-2 font-medium text-white hover:bg-sun-600">
            Next
          </button>
        )}
      </div>
      <p className="text-xs text-slate-500">Changes save automatically to this browser.</p>
    </div>
  )
}
