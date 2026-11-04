export type ApiErrorKind = 'rate-limit' | 'network' | 'timeout' | 'server' | 'client'

export class ApiError extends Error {
  kind: ApiErrorKind
  constructor(kind: ApiErrorKind, message: string) {
    super(message)
    this.kind = kind
    this.name = 'ApiError'
  }
}

export interface FetchOptions {
  signal?: AbortSignal
  retries?: number
  timeoutMs?: number
  backoffMs?: number
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(t)
      reject(new DOMException('Aborted', 'AbortError'))
    })
  })

/** Parses a Retry-After header (seconds or HTTP date) into milliseconds, capped to keep the UI responsive. */
function retryAfterMs(res: Response): number | null {
  const h = res.headers.get('retry-after')
  if (!h) return null
  const secs = Number(h)
  const ms = Number.isFinite(secs) ? secs * 1000 : Date.parse(h) - Date.now()
  return Number.isFinite(ms) && ms >= 0 ? Math.min(ms, 10_000) : null
}

/** Fetches JSON with a timeout and retries (network errors, 429, 5xx) using exponential backoff. */
export async function fetchJson<T>(url: string, opts: FetchOptions = {}): Promise<T> {
  const { signal, retries = 2, timeoutMs = 15_000, backoffMs = 800 } = opts
  let lastError: ApiError = new ApiError('network', 'Network error. Check your connection and try again.')

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    const timeout = new AbortController()
    const timer = setTimeout(() => timeout.abort(), timeoutMs)
    const onAbort = () => timeout.abort()
    signal?.addEventListener('abort', onAbort)
    let wait = backoffMs * 2 ** attempt

    try {
      const res = await fetch(url, { signal: timeout.signal })
      if (res.ok) return (await res.json()) as T
      if (res.status === 429) {
        lastError = new ApiError('rate-limit', 'The data service is rate limiting requests. Wait a minute and retry.')
        wait = retryAfterMs(res) ?? wait
      } else if (res.status >= 500) {
        lastError = new ApiError('server', 'The data service is having problems. Try again shortly.')
      } else {
        throw new ApiError('client', `The data service rejected the request (${res.status}).`)
      }
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.kind === 'client') throw e
      } else if (signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError')
      } else if ((e as Error).name === 'AbortError') {
        lastError = new ApiError('timeout', 'The data service took too long to respond.')
      } else {
        lastError = new ApiError('network', 'Network error. Check your connection and try again.')
      }
    } finally {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
    }

    if (attempt < retries) await sleep(wait, signal)
  }
  throw lastError
}
