import { describe, expect, it } from 'vitest'
import { cagrPct, stateCode } from './rates'

describe('cagrPct', () => {
  it('computes compound annual growth', () => {
    expect(cagrPct(10, 12.1, 2)).toBeCloseTo(10, 5)
    expect(cagrPct(10, 10, 5)).toBe(0)
    expect(cagrPct(12, 10, 3)).toBeLessThan(0)
  })
})

describe('stateCode', () => {
  it('maps US state names and codes', () => {
    expect(stateCode('Arizona')).toBe('AZ')
    expect(stateCode('new york')).toBe('NY')
    expect(stateCode('tx')).toBe('TX')
  })
  it('returns null for non-US regions', () => {
    expect(stateCode('Ontario')).toBeNull()
    expect(stateCode(undefined)).toBeNull()
  })
})
