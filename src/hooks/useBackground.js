import { useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { uploadInput, getOutputUrl } from '../lib/storage'
import { fetchWithRetry, friendlyNetworkError } from '../lib/fetchWithRetry'

const POLL_INTERVAL_MS = 3000
const MAX_POLLS = 120 // 6 minutes max

function pollJob(jobId, updateJob) {
  return new Promise((resolve, reject) => {
    let count = 0
    const interval = setInterval(async () => {
      try {
        count++
        if (count > MAX_POLLS) {
          clearInterval(interval)
          reject(new Error('Generation timed out — please try again'))
          return
        }

        const { data: job, error } = await supabase
          .from('jobs')
          .select('status, output_path')
          .eq('id', jobId)
          .single()

        if (error) {
          // Transient network error — keep polling
          return
        }

        if (job.status === 'completed') {
          clearInterval(interval)
          resolve(job.output_path)
        } else if (job.status === 'failed') {
          clearInterval(interval)
          reject(new Error('Generation failed — your token has been refunded'))
        } else {
          // processing / starting — nudge progress bar
          updateJob(jobId, { progress: Math.min(count * 2, 88) })
        }
      } catch {
        // Swallow and retry next tick
      }
    }, POLL_INTERVAL_MS)
  })
}

export function useBackground({ addJob, updateJob }) {

  const runReplace = useCallback(async ({ userId, file, preset, model = 'nano_banana', chainedFrom }) => {
    const jobId = crypto.randomUUID()
    addJob({ id: jobId, type: 'bg_replace', panel: 'background', presetName: preset.name, status: 'uploading', progress: 0, result: null, originalFile: file ?? null, chainedPreview: chainedFrom?.preview ?? null })
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
      const startRes = await fetchWithRetry('/api/background/replace', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, inputPath, preset: preset.payload, tokenCost: preset.tokenCost, model }),
      })
      if (!startRes.ok) {
        const errData = await startRes.json().catch(() => ({}))
        throw new Error(errData.error || `Request failed (${startRes.status})`)
      }
      updateJob(jobId, { status: 'processing' })
      const outputPath = await pollJob(jobId, updateJob)
      const resultUrl = await getOutputUrl(outputPath)
      updateJob(jobId, { status: 'completed', progress: 100, result: { url: resultUrl, outputPath }, originalFile: file })
      return { jobId, resultUrl }
    } catch (err) {
      const wrapped = friendlyNetworkError(err)
      updateJob(jobId, { status: 'failed', error: wrapped.message })
      throw wrapped
    }
  }, [addJob, updateJob])

  const runFluxPreset = useCallback(async ({ userId, file, preset, chainedFrom }) => {
    const jobId = crypto.randomUUID()
    addJob({
      id: jobId,
      type: 'bg_flux_preset',
      panel: 'background',
      presetName: preset.name,
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
        // 1. Upload source image to Supabase
        updateJob(jobId, { status: 'uploading' })
        inputPath = await uploadInput(userId, jobId, file)
      }

      // 2. Start prediction — server creates job row + attaches webhook
      updateJob(jobId, { status: 'submitting' })
      const startRes = await fetchWithRetry('/api/background/flux-preset', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          inputPath,
          preset: preset.payload,
          tokenCost: preset.tokenCost,
        }),
      })

      if (!startRes.ok) {
        const errData = await startRes.json().catch(() => ({}))
        throw new Error(errData.error || `Request failed (${startRes.status})`)
      }

      // 3. Poll the Supabase jobs table — webhook updates it when Replicate finishes
      updateJob(jobId, { status: 'processing' })
      const outputPath = await pollJob(jobId, updateJob)

      // 4. Get signed URL for the stored result
      const resultUrl = await getOutputUrl(outputPath)

      updateJob(jobId, {
        status: 'completed',
        progress: 100,
        result: { url: resultUrl, outputPath },
        originalFile: file,
      })
      return { jobId, resultUrl }
    } catch (err) {
      const wrapped = friendlyNetworkError(err)
      updateJob(jobId, { status: 'failed', error: wrapped.message })
      throw wrapped
    }
  }, [addJob, updateJob])

  return { runReplace, runFluxPreset }
}
