import { useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { uploadInput, getOutputUrl } from '../lib/storage'
import { fetchWithRetry } from '../lib/fetchWithRetry'

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

  const runReplace = useCallback(async ({ userId, file, preset }) => {
    const jobId = crypto.randomUUID()
    addJob({ id: jobId, type: 'bg_replace', panel: 'background', presetName: preset.name, status: 'uploading', progress: 0, result: null })
    try {
      updateJob(jobId, { status: 'uploading' })
      const inputPath = await uploadInput(userId, jobId, file)
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      updateJob(jobId, { status: 'submitting' })
      const startRes = await fetchWithRetry('/api/background/replace', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, inputPath, preset: preset.payload, tokenCost: preset.tokenCost }),
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
      updateJob(jobId, { status: 'failed', error: err.message })
      throw err
    }
  }, [addJob, updateJob])

  const runFluxPreset = useCallback(async ({ userId, file, preset }) => {
    const jobId = crypto.randomUUID()
    addJob({
      id: jobId,
      type: 'bg_flux_preset',
      panel: 'background',
      presetName: preset.name,
      status: 'uploading',
      progress: 0,
      result: null,
    })

    try {
      // 1. Upload source image to Supabase
      updateJob(jobId, { status: 'uploading' })
      const inputPath = await uploadInput(userId, jobId, file)

      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

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
      updateJob(jobId, { status: 'failed', error: err.message })
      throw err
    }
  }, [addJob, updateJob])

  return { runReplace, runFluxPreset }
}
