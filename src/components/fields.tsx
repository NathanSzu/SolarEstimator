import { useState } from 'react'

const input =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:border-sun-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900'

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="block text-xs text-slate-500">{hint}</span>}
    </label>
  )
}

interface NumberFieldProps {
  label: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  prefix?: string
  suffix?: string
  hint?: string
}

export function NumberField({ label, value, onChange, min, max, step = 1, prefix, suffix, hint }: NumberFieldProps) {
  const [text, setText] = useState<string | null>(null)
  const clamp = (n: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n))

  return (
    <Field label={label} hint={hint}>
      <div className="relative">
        {prefix && <span className="pointer-events-none absolute left-3 top-2 text-slate-500">{prefix}</span>}
        <input
          type="number"
          inputMode="decimal"
          value={text ?? String(value)}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            setText(e.target.value)
            const n = parseFloat(e.target.value)
            if (Number.isFinite(n)) onChange(clamp(n))
          }}
          onBlur={() => setText(null)}
          className={`${input} ${prefix ? 'pl-7' : ''} ${suffix ? 'pr-14' : ''}`}
        />
        {suffix && <span className="pointer-events-none absolute right-3 top-2 text-sm text-slate-500">{suffix}</span>}
      </div>
    </Field>
  )
}

export const inputClass = input
