const KEY = 'solar-estimator-api-cache'
const MAX_ENTRIES = 25

interface Entry {
  value: unknown
  at: number
}

type Store = Pick<Storage, 'getItem' | 'setItem'>

const defaultStore = (): Store | null => {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

function read(store: Store | null): Record<string, Entry> {
  try {
    const parsed = JSON.parse(store?.getItem(KEY) ?? '{}')
    return typeof parsed === 'object' && parsed !== null ? parsed : {}
  } catch {
    return {}
  }
}

/** Returns a cached value if it exists and is younger than ttlMs (pass Infinity to accept stale values). */
export function cacheGet<T>(key: string, ttlMs: number, store: Store | null = defaultStore(), now = Date.now()): T | null {
  const entry = read(store)[key]
  if (!entry || typeof entry.at !== 'number' || now - entry.at > ttlMs) return null
  return entry.value as T
}

/** Stores a value, evicting the oldest entries beyond the cap. Failures (e.g. quota) are ignored. */
export function cacheSet(key: string, value: unknown, store: Store | null = defaultStore(), now = Date.now()) {
  if (!store) return
  try {
    const all = read(store)
    all[key] = { value, at: now }
    const keep = Object.entries(all)
      .sort((a, b) => b[1].at - a[1].at)
      .slice(0, MAX_ENTRIES)
    store.setItem(KEY, JSON.stringify(Object.fromEntries(keep)))
  } catch {
    /* cache is best-effort */
  }
}
