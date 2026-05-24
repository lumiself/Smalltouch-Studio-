import { useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { uploadInput, uploadOutputBlob, getOutputUrl } from '../lib/storage'

const POLL_INTERVAL_MS = 3000
const MAX_POLLS = 120 // 6 minutes max

function pollPrediction(predictionId, jobId, updateJob) {
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
        const res = await fetch(`/api/background/status?predictionId=${predictionId}`)
        if (!res.ok) {
          clearInterval(interval)
          reject(new Error('Status check failed'))
          return
        }
        const data = await res.json()
        if (data.status === 'succeeded') {
          clearInterval(interval)
          resolve(data.output)
        } else if (data.status === 'failed' || data.status === 'canceled') {
          clearInterval(interval)
          reject(new Error(data.error || 'Generation failed'))
        } else {
          // starting | processing
          updateJob(jobId, { progress: Math.min(count * 2, 85) })
        }
      } catch (err) {
        clearInterval(interval)
        reject(err)
      }
    }, POLL_INTERVAL_MS)
  })
}

export function useBackground({ addJob, updateJob }) {

  const runFluxPreset = useCallback(async ({ userId, file, preset }) => {
    const jobId = crypto.randomUUID()
    addJob({ id: jobId, type: 'bg_flux_preset', panel: 'background', presetName: preset.name, status: 'uploading', progress: 0, result: null })

    try {
      updateJob(jobId, { status: 'uploading' })
      const inputPath = await uploadInput(userId, jobId, file)

      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      updateJob(jobId, { status: 'submitting' })
      const startRes = await fetch('/api/background/flux-preset', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputPath, preset: preset.payload }),
      })

      if (!startRes.ok) {
        const errData = await startRes.json().catch(() => ({}))
        throw new Error(errData.error || `Request failed (${startRes.status})`)
      }
      const { predictionId } = await startRes.json()

      await supabase.from('jobs').insert({
        id: jobId, user_id: userId, panel: 'background', operation: 'bg_flux_preset',
        status: 'processing', external_job_id: predictionId,
        input_path: inputPath, tokens_used: preset.tokenCost,
      })

      updateJob(jobId, { status: 'processing' })
      const outputUrl = await pollPrediction(predictionId, jobId, updateJob)

      // Download the generated image from Replicate and store in our outputs bucket
      updateJob(jobId, { status: 'downloading', progress: 95 })
      const imgRes = await fetch(outputUrl)
      if (!imgRes.ok) throw new Error('Failed to download generated image')
      const blob = await imgRes.blob()

      const outputPath = await uploadOutputBlob(userId, jobId, blob, 'webp')
      const resultUrl = await getOutputUrl(outputPath)

      await supabase.from('jobs').update({ status: 'completed', output_path: outputPath }).eq('id', jobId)
      updateJob(jobId, { status: 'completed', progress: 100, result: { url: resultUrl, outputPath }, originalFile: file })
      return { jobId, resultUrl }
    } catch (err) {
      updateJob(jobId, { status: 'failed', error: err.message })
      await supabase.from('jobs').update({ status: 'failed' }).eq('id', jobId).catch(() => {})
      throw err
    }
  }, [addJob, updateJob])

  return { runFluxPreset }
}
