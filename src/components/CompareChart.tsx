import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Projection } from '../lib/finance'

export interface ComparedPlan {
  id: string
  name: string
  result: Projection
}

const COLORS = ['#d97706', '#2563eb', '#16a34a']
const compact = (n: number) => `${n < 0 ? '-' : ''}$${Math.abs(n) >= 1000 ? `${Math.round(Math.abs(n) / 1000)}k` : Math.abs(n)}`
const usd = (n: number) => n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const axis = { tick: { fill: 'currentColor', fontSize: 12 }, stroke: 'currentColor', strokeOpacity: 0.3 }

export default function CompareChart({ plans }: { plans: ComparedPlan[] }) {
  const months = plans[0].result.rows.length
  const data = Array.from({ length: months + 1 }, (_, m) => {
    const point: Record<string, number> = { year: m / 12 }
    for (const p of plans) point[p.id] = Math.round(m === 0 ? -p.result.upfront : p.result.rows[m - 1].cumulative)
    return point
  })

  return (
    <div className="h-72 text-slate-500 sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.15} />
          <XAxis dataKey="year" type="number" domain={[0, 'dataMax']} tickCount={6} unit=" yr" {...axis} />
          <YAxis tickFormatter={compact} width={56} {...axis} />
          <Tooltip formatter={(v, name) => [usd(Number(v)), name]} labelFormatter={(y) => `Year ${Number(y).toFixed(1)}`} />
          <Legend />
          <ReferenceLine y={0} stroke="currentColor" strokeOpacity={0.6} />
          {plans.map((p, i) => (
            <Line key={p.id} dataKey={p.id} name={p.name} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
