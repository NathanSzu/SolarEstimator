import { HORIZON_YEARS } from './finance'

export const money = (n: number) =>
  n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
export const money2 = (n: number) => n.toLocaleString(undefined, { style: 'currency', currency: 'USD' })

export function formatPayback(month: number | null) {
  if (month === null) return `Not within ${HORIZON_YEARS} years`
  if (month === 0) return 'No up-front cost'
  const y = Math.floor(month / 12)
  const m = month % 12
  return [y && `${y} yr`, m && `${m} mo`].filter(Boolean).join(' ')
}
