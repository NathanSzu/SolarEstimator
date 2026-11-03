export function monthlyPayment(principal: number, aprPct: number, termMonths: number): number {
  if (principal <= 0 || termMonths <= 0) return 0
  const r = aprPct / 100 / 12
  if (r === 0) return principal / termMonths
  return (principal * r) / (1 - Math.pow(1 + r, -termMonths))
}

export function loanSummary(principal: number, aprPct: number, termMonths: number) {
  const payment = monthlyPayment(principal, aprPct, termMonths)
  const total = payment * termMonths
  return { payment, total, interest: Math.max(total - principal, 0) }
}
