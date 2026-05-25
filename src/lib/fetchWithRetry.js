const RETRY_DELAYS = [2000, 4000, 8000]

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

function dispatch(name, success) {
  window.dispatchEvent(new CustomEvent(name, { detail: { success } }))
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
