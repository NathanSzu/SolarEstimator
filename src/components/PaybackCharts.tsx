import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Projection } from '../lib/finance'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const usd = (n: number) => n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const compact = (n: number) => `${n < 0 ? '-' : ''}$${Math.abs(n) >= 1000 ? `${Math.round(Math.abs(n) / 1000)}k` : Math.abs(n)}`
const axis = { tick: { fill: 'currentColor', fontSize: 12 }, stroke: 'currentColor', strokeOpacity: 0.3 }
const grid = <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.15} />

function Card({ title, caption, children }: { title: string; caption: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
      <h3 className="font-semibold">{title}</h3>
      <p className="mb-3 text-xs text-slate-500">{caption}</p>
      <div className="h-64 text-slate-500 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
    </section>
  )
}

export default function PaybackCharts({ result, startMonth }: { result: Projection; startMonth: number }) {
  const cashFlow = [
    { year: 0, cumulative: -result.upfront },
    ...result.rows.map((r) => ({ year: r.month / 12, cumulative: Math.round(r.cumulative) })),
  ]
  const paybackYear = result.paybackMonth === null ? null : result.paybackMonth / 12
  const paybackY = paybackYear === null ? 0 : (cashFlow.find((d) => d.year === paybackYear)?.cumulative ?? 0)

  const production = result.rows
    .slice(0, 12)
    .map((r, i) => ({ month: MONTHS[(startMonth - 1 + i) % 12], kwh: Math.round(r.productionKwh) }))

  const years = Array.from({ length: result.rows.length / 12 }, (_, y) => {
    const slice = result.rows.slice(y * 12, y * 12 + 12)
    const savings = slice.reduce((a, r) => a + r.savings, 0)
    const net = slice.reduce((a, r) => a + r.net, 0)
    return {
      year: y + 1,
      savings: Math.round(savings),
      costs: Math.round(savings - net),
      loanBalance: Math.round(slice[11].loanBalance),
    }
  })
  const hasLoan = result.monthlyPayment > 0

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="lg:col-span-2">
        <Card
          title="Payback timeline"
          caption="Cumulative cash position over time. The dot marks the month you break even."
        >
          <ComposedChart data={cashFlow} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
            {grid}
            <XAxis dataKey="year" type="number" domain={[0, 'dataMax']} tickCount={6} {...axis} unit=" yr" />
            <YAxis tickFormatter={compact} width={56} {...axis} />
            <Tooltip
              formatter={(v) => [usd(Number(v)), 'Cumulative']}
              labelFormatter={(y) => `Year ${Number(y).toFixed(1)}`}
            />
            <ReferenceLine y={0} stroke="currentColor" strokeOpacity={0.6} />
            <Area type="monotone" dataKey="cumulative" stroke="#d97706" fill="#f59e0b" fillOpacity={0.2} strokeWidth={2} dot={false} />
            {paybackYear !== null && (
              <ReferenceDot x={paybackYear} y={paybackY} r={6} fill="#16a34a" stroke="#fff" label={{ value: 'Payback', position: 'top', fill: '#16a34a', fontSize: 12 }} />
            )}
          </ComposedChart>
        </Card>
      </div>

      <Card title="Year-one production" caption="Estimated kWh per month from historical weather data.">
        <ComposedChart data={production} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
          {grid}
          <XAxis dataKey="month" {...axis} />
          <YAxis width={48} {...axis} />
          <Tooltip formatter={(v) => [`${Number(v).toLocaleString()} kWh`, 'Production']} />
          <Bar dataKey="kwh" fill="#f59e0b" radius={[4, 4, 0, 0]} />
        </ComposedChart>
      </Card>

      <Card
        title={hasLoan ? 'Savings vs. costs and loan balance' : 'Savings vs. ongoing costs'}
        caption="Annual electricity savings against loan payments and upkeep."
      >
        <ComposedChart data={years} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
          {grid}
          <XAxis dataKey="year" {...axis} />
          <YAxis tickFormatter={compact} width={56} {...axis} />
          <Tooltip formatter={(v, name) => [usd(Number(v)), name]} labelFormatter={(y) => `Year ${y}`} />
          <Legend />
          <Bar dataKey="savings" name="Savings" fill="#16a34a" />
          <Bar dataKey="costs" name="Loan & upkeep" fill="#ef4444" />
          {hasLoan && <Line dataKey="loanBalance" name="Loan balance" stroke="#2563eb" strokeWidth={2} dot={false} />}
        </ComposedChart>
      </Card>
    </div>
  )
}
