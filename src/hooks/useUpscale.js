import { useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { uploadInput, getOutputUrl } from '../lib/storage'
import { fetchWithRetry } from '../lib/fetchWithRetry'

const POLL_INTERVAL_MS = 3000
const MAX_POLLS = 120

function pollJob(jobId, updateJob) {
  return new Promise((resolve, reject) => {
    let count = 0
    const interval = setInterval(async () => {
      try {
        count++
        if (count > MAX_POLLS) {
          clearInterval(interval)
          reject(new Error('Upscale timed out — please try again'))
          return
        }

        const { data: job, error } = await supabase
          .from('jobs')
          .select('status, output_path')
          .eq('id', jobId)
          .single()

        if (error) return

        if (job.status === 'completed') {
          clearInterval(interval)
          resolve(job.output_path)
        } else if (job.status === 'failed') {
          clearInterval(interval)
          reject(new Error('Upscale failed — your token has been refunded'))
        } else {
          updateJob(jobId, { progress: Math.min(count * 2, 88) })
        }
      } catch {
        // retry next tick
      }
    }, POLL_INTERVAL_MS)
  })
}

export function useUpscale({ addJob, updateJob }) {
  const runUpscale = useCallback(async ({ userId, file, options, chainedFrom }) => {
    const TOKEN_COST = 1
    const jobId = crypto.randomUUID()
    addJob({
      id: jobId,
      type: 'bg_upscale',
      panel: 'background',
      presetName: 'Upscale',
      status: 'uploading',
      progress: 0,
      result: null,
      originalFile: file ?? null,
      chainedPreview: chainedFrom?.preview ?? null,
    })

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      let inputPath
      if (chainedFrom) {
        updateJob(jobId, { status: 'uploading' })
        const chainRes = await fetchWithRetry('/api/jobs/chain', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ outputPaths: [chainedFrom.outputPath] }),
        })
        if (!chainRes.ok) {
          const e = await chainRes.json().catch(() => ({}))
          throw new Error(e.error || 'Failed to chain input')
        }
        const { inputPaths } = await chainRes.json()
        inputPath = inputPaths[0].newInputPath
      } else {
        updateJob(jobId, { status: 'uploading' })
        inputPath = await uploadInput(userId, jobId, file)
      }

      updateJob(jobId, { status: 'submitting' })
      const startRes = await fetchWithRetry('/api/background/upscale', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, inputPath, options, tokenCost: TOKEN_COST }),
      })

      if (!startRes.ok) {
        const errData = await startRes.json().catch(() => ({}))
        throw new Error(errData.error || `Request failed (${startRes.status})`)
      }

      updateJob(jobId, { status: 'processing' })
      const outputPath = await pollJob(jobId, updateJob)
      const resultUrl = await getOutputUrl(outputPath)

      updateJob(jobId, {
        status: 'completed',
        progress: 100,
        result: { url: resultUrl, outputPath },
        originalFile: file,
      })
      return { jobId, resultUrl }
    } catch (err) {
      updateJob(jobId, { status: 'failed', error: err.message })
      throw err
    }
  }, [addJob, updateJob])

  return { runUpscale }
}
