import type { Projection } from '../lib/finance'
import { formatPayback, money, money2 } from '../lib/format'
import { DEFAULT_SCENARIO, isDefaultScenario, type Scenario } from '../lib/scenario'

interface Props {
  scenario: Scenario
  onChange: (s: Scenario) => void
  cash: Projection | null
  loan: Projection | null
}

const options: { value: Scenario['financing']; label: string }[] = [
  { value: 'plan', label: 'As planned' },
  { value: 'cash', label: 'Pay cash' },
  { value: 'loan', label: 'Use loan' },
]

function Slider({ label, value, min, max, step, format, onChange }: {
  label: string
  value: number
  min: number
  max: number
  step: number
  format: (v: number) => string
  onChange: (v: number) => void
}) {
  return (
    <label className="block space-y-1">
      <span className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-slate-500">{format(value)}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-amber-500" />
    </label>
  )
}

const signed = (v: number, unit: string) => `${v > 0 ? '+' : ''}${v}${unit}`

function Summary({ title, result }: { title: string; result: Projection | null }) {
  if (!result) return null
  return (
    <div className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
      <div className="font-medium">{title}</div>
      <dl className="mt-1 space-y-0.5 text-slate-600 dark:text-slate-400">
        <div className="flex justify-between gap-2"><dt>Up-front</dt><dd>{money(result.upfront)}</dd></div>
        <div className="flex justify-between gap-2"><dt>Monthly loan payment</dt><dd>{result.monthlyPayment ? money2(result.monthlyPayment) : '—'}</dd></div>
        <div className="flex justify-between gap-2"><dt>Payback</dt><dd>{formatPayback(result.paybackMonth)}</dd></div>
        <div className="flex justify-between gap-2"><dt>Net profit</dt><dd>{money(result.netAtHorizon)}</dd></div>
      </dl>
    </div>
  )
}

export default function ScenarioPanel({ scenario, onChange, cash, loan }: Props) {
  const set = (patch: Partial<Scenario>) => onChange({ ...scenario, ...patch })
  return (
    <section className="space-y-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">What-if scenarios</h3>
          <p className="text-xs text-slate-500">Explore changes without editing your plan. Nothing here is saved.</p>
        </div>
        <button onClick={() => onChange(DEFAULT_SCENARIO)} disabled={isDefaultScenario(scenario)} className="text-sm text-sun-600 hover:underline disabled:opacity-40 disabled:no-underline">
          Reset
        </button>
      </div>

      <div role="radiogroup" aria-label="Financing" className="inline-flex overflow-hidden rounded-lg border border-slate-300 dark:border-slate-700">
        {options.map((o) => (
          <button
            key={o.value}
            role="radio"
            aria-checked={scenario.financing === o.value}
            onClick={() => set({ financing: o.value })}
            className={`px-3 py-1.5 text-sm ${scenario.financing === o.value ? 'bg-sun-500 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            {o.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Slider label="Energy price escalation" value={scenario.escalationDelta} min={-3} max={6} step={0.5} format={(v) => signed(v, ' pts/yr')} onChange={(v) => set({ escalationDelta: v })} />
        <Slider label="Installation cost" value={scenario.costPct} min={-30} max={30} step={5} format={(v) => signed(v, '%')} onChange={(v) => set({ costPct: v })} />
        <Slider label="Electricity rate" value={scenario.ratePct} min={-30} max={30} step={5} format={(v) => signed(v, '%')} onChange={(v) => set({ ratePct: v })} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Summary title="Cash purchase" result={cash} />
        <Summary title="Loan financed" result={loan} />
      </div>
    </section>
  )
}
