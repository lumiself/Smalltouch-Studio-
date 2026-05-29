const RETRY_DELAYS = [2000, 4000, 8000]

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

function dispatch(name, success) {
  window.dispatchEvent(new CustomEvent(name, { detail: { success } }))
}

// Decides whether an error from a supabase-js call (or a thrown fetch error) is a
// transient connection blip worth retrying. Client errors (4xx, RLS, "not authorized")
// are NOT transient and must surface immediately.
export function isTransientNetworkError(error) {
  if (!error) return false
  const status = error.status ?? error.statusCode
  if (typeof status === 'number') {
    if (status >= 400 && status < 500) return false
    if (status >= 500) return true
  }
  const msg = (error.message || '').toLowerCase()
  if (msg.includes('row level security') || msg.includes('not authorized')) return false
  // Browser fetch-failure messages vary by engine
  return (
    msg.includes('failed to fetch') ||
    msg.includes('fetch failed') ||
    msg.includes('networkerror') ||
    msg.includes('network error') ||
    msg.includes('load failed') ||
    msg.includes('connection')
  )
}

// Retries a supabase-js operation (one that resolves to `{ data, error }` or rejects)
// on transient network errors, using the same backoff + network-banner events as
// fetchWithRetry. Resolves with the `{ data, error }` result on success; throws on a
// non-transient error or once retries are exhausted.
export async function supabaseRetry(fn) {
  let lastErr
  let didRetry = false

  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    let result
    try {
      result = await fn()
    } catch (err) {
      // A rejected promise (e.g. TypeError: Failed to fetch) — normalize to { error }
      result = { error: err }
    }

    if (!result?.error) {
      if (didRetry) dispatch('network-retry-done', true)
      return result
    }

    const error = result.error
    if (!isTransientNetworkError(error)) {
      if (didRetry) dispatch('network-retry-done', false)
      throw error
    }

    lastErr = error
    if (attempt < RETRY_DELAYS.length) {
      if (!didRetry) dispatch('network-retrying')
      didRetry = true
      await sleep(RETRY_DELAYS[attempt])
    }
  }

  if (didRetry) dispatch('network-retry-done', false)
  throw lastErr
}

// Replaces a raw browser "Failed to fetch" with an actionable message.
export function friendlyNetworkError(err) {
  if (isTransientNetworkError(err)) {
    return new Error('Network error — your image is saved and any tokens were refunded. Please try again.')
  }
  return err
}

export async function fetchWithRetry(url, options = {}) {
  let lastErr
  let didRetry = false

  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      const res = await fetch(url, options)
      // 4xx = client error, don't retry
      if (res.ok || (res.status >= 400 && res.status < 500)) {
        if (didRetry) dispatch('network-retry-done', true)
        return res
      }
      // 5xx — retry if attempts remain
      if (attempt < RETRY_DELAYS.length) {
        lastErr = new Error(`Server error (${res.status})`)
        if (!didRetry) dispatch('network-retrying')
        didRetry = true
        await sleep(RETRY_DELAYS[attempt])
        continue
      }
      if (didRetry) dispatch('network-retry-done', false)
      return res
    } catch (err) {
      lastErr = err
      if (attempt < RETRY_DELAYS.length) {
        if (!didRetry) dispatch('network-retrying')
        didRetry = true
        await sleep(RETRY_DELAYS[attempt])
      }
    }
  }

  if (didRetry) dispatch('network-retry-done', false)
  throw lastErr
}
