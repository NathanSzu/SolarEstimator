import { afterEach, describe, expect, it, vi } from 'vitest'
import { cacheGet, cacheSet } from './cache'
import { ApiError, fetchJson } from './http'

const res = (status: number, body: unknown = {}, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers })

afterEach(() => vi.unstubAllGlobals())

describe('fetchJson', () => {
  it('returns parsed JSON on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res(200, { a: 1 })))
    expect(await fetchJson('x')).toEqual({ a: 1 })
  })

  it('retries 5xx responses then succeeds', async () => {
    const f = vi.fn().mockResolvedValueOnce(res(503)).mockResolvedValueOnce(res(200, { ok: true }))
    vi.stubGlobal('fetch', f)
    expect(await fetchJson('x', { backoffMs: 0 })).toEqual({ ok: true })
    expect(f).toHaveBeenCalledTimes(2)
  })

  it('reports rate limiting after retries are exhausted', async () => {
    const f = vi.fn().mockResolvedValue(res(429, {}, { 'retry-after': '0' }))
    vi.stubGlobal('fetch', f)
    await expect(fetchJson('x', { retries: 1, backoffMs: 0 })).rejects.toMatchObject({ kind: 'rate-limit' })
    expect(f).toHaveBeenCalledTimes(2)
  })

  it('does not retry client errors', async () => {
    const f = vi.fn().mockResolvedValue(res(400))
    vi.stubGlobal('fetch', f)
    await expect(fetchJson('x', { backoffMs: 0 })).rejects.toBeInstanceOf(ApiError)
    expect(f).toHaveBeenCalledTimes(1)
  })

  it('maps network failures to a friendly error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(fetchJson('x', { retries: 0 })).rejects.toMatchObject({ kind: 'network' })
  })
})

describe('cache', () => {
  const fakeStore = () => {
    const m = new Map<string, string>()
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }
  }

  it('returns fresh values and rejects expired ones unless stale is allowed', () => {
    const s = fakeStore()
    cacheSet('k', { v: 1 }, s, 1000)
    expect(cacheGet('k', 500, s, 1400)).toEqual({ v: 1 })
    expect(cacheGet('k', 500, s, 2000)).toBeNull()
    expect(cacheGet('k', Infinity, s, 2000)).toEqual({ v: 1 })
  })

  it('evicts the oldest entries beyond the cap', () => {
    const s = fakeStore()
    for (let i = 0; i < 30; i++) cacheSet(`k${i}`, i, s, i)
    expect(cacheGet('k0', Infinity, s)).toBeNull()
    expect(cacheGet('k29', Infinity, s)).toBe(29)
  })

  it('tolerates a missing store', () => {
    expect(cacheGet('k', 1, null)).toBeNull()
    expect(() => cacheSet('k', 1, null)).not.toThrow()
  })
})
