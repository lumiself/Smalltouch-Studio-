import { useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { uploadInput, uploadOutputBlob, getOutputUrl } from '../lib/storage'

async function isZip(blob) {
  const buf = await blob.slice(0, 2).arrayBuffer()
  const b = new Uint8Array(buf)
  return b[0] === 0x50 && b[1] === 0x4B
}

const POLL_INTERVAL_MS = 3000
// Tolerate this many consecutive network errors before aborting the poll.
// One or two blips (mobile data, brief wifi drop) should not kill the job.
const MAX_POLL_NETWORK_FAILURES = 3

async function readResponse(res) {
  const text = await res.text()
  try {
    return { ok: res.ok, status: res.status, data: JSON.parse(text), raw: text }
  } catch {
    return { ok: res.ok, status: res.status, data: null, raw: text }
  }
}

function serverError(parsed, fallback) {
  if (parsed.data?.error) return new Error(parsed.data.error)
  if (parsed.raw?.toLowerCase().includes('a server error')) {
    return new Error(`Server timed out (${parsed.status}). Try a smaller image or retry in a moment.`)
  }
  const snippet = parsed.raw?.trim().slice(0, 200)
  return new Error(snippet ? `${fallback} (${parsed.status}): ${snippet}` : `${fallback} (${parsed.status})`)
}

function wrapFetchError(err) {
  if (err?.message === 'Failed to fetch') {
    return new Error('Network error — check your connection. Use the Resume button to continue without resubmitting.')
  }
  return err
}

// addJob / updateJob come from LibraryContext via the calling component
export function useRetouch({ addJob, updateJob }) {

  function pollStatus(externalJobId, jobId) {
    return new Promise((resolve, reject) => {
      let consecutiveNetworkFailures = 0
      const interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/retouch/status?jobId=${externalJobId}`)
          consecutiveNetworkFailures = 0  // reset on any successful response
          const parsed = await readResponse(res)
          if (!parsed.ok || !parsed.data) {
            clearInterval(interval)
            reject(serverError(parsed, 'Status check failed'))
            return
          }
          const data = parsed.data
          if (data.state === 'completed') {
            clearInterval(interval)
            resolve(data)
          } else if (data.state === 'failed') {
            clearInterval(interval)
            reject(new Error(data.reason || 'Processing failed'))
          } else {
            updateJob(jobId, { progress: data.progress || 0, step: data.pluginName || data.currentStep })
          }
        } catch (err) {
          consecutiveNetworkFailures++
          if (consecutiveNetworkFailures >= MAX_POLL_NETWORK_FAILURES) {
            clearInterval(interval)
            reject(wrapFetchError(err))
          }
          // else: transient blip — stay in the interval and retry next tick
        }
      }, POLL_INTERVAL_MS)
    })
  }

  // Resumes a job that already has an externalJobId (was submitted but polling/download failed).
  // Does NOT deduct tokens — the job was already submitted and any failed-job refund already happened.
  const resumeJob = useCallback(async ({ userId, jobId, externalJobId, isZipJob }) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      // One-shot status check to see where we are
      const statusRes = await fetch(`/api/retouch/status?jobId=${externalJobId}`)
      const statusParsed = await readResponse(statusRes)
      if (!statusParsed.ok || !statusParsed.data) throw serverError(statusParsed, 'Status check failed')

      const currentState = statusParsed.data.state

      if (currentState === 'failed') {
        throw new Error(statusParsed.data.reason || 'Job failed on the processing server')
      }

      if (currentState === 'completed') {
        updateJob(jobId, { status: 'downloading', progress: 100 })
      } else {
        // Still in progress — resume polling from current progress
        updateJob(jobId, { status: 'processing', progress: statusParsed.data.progress || 0 })
        await pollStatus(externalJobId, jobId)
        updateJob(jobId, { status: 'downloading', progress: 100 })
      }

      const downloadRes = await fetch(`/api/retouch/download?jobId=${externalJobId}&internalJobId=${jobId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!downloadRes.ok) throw new Error('Download failed')
      const blob = await downloadRes.blob()

      if (isZipJob) {
        const parsedAsZip = await isZip(blob)
        const outputPath = await uploadOutputBlob(userId, jobId, blob, parsedAsZip ? 'zip' : 'jpg')
        await supabase.from('jobs').update({ status: 'completed', output_path: outputPath }).eq('id', jobId)
        updateJob(jobId, { status: 'completed', outputPath })
        return { jobId, outputPath }
      } else {
        const outputPath = await uploadOutputBlob(userId, jobId, blob)
        const resultUrl = await getOutputUrl(outputPath)
        await supabase.from('jobs').update({ status: 'completed', output_path: outputPath }).eq('id', jobId)
        updateJob(jobId, { status: 'completed', result: { url: resultUrl, outputPath } })
        return { jobId, resultUrl }
      }
    } catch (err) {
      const wrapped = wrapFetchError(err)
      updateJob(jobId, { status: 'failed', error: wrapped.message })
      await supabase.from('jobs').update({ status: 'failed' }).eq('id', jobId)
      throw wrapped
    }
  }, [updateJob])

  const runQuickEnhance = useCallback(async ({ userId, file, preset }) => {
    const jobId = crypto.randomUUID()
    addJob({ id: jobId, type: 'quick_enhance', panel: 'retouch', presetName: preset.name, status: 'uploading', progress: 0, result: null, originalFile: file, presetData: preset })

    try {
      updateJob(jobId, { status: 'uploading' })
      const inputPath = await uploadInput(userId, jobId, file)

      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      updateJob(jobId, { status: 'submitting' })
      const startRes = await fetch('/api/retouch/start', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputPath, payload: preset.payload }),
      })
      const startParsed = await readResponse(startRes)
      if (!startParsed.ok || !startParsed.data) throw serverError(startParsed, 'Failed to start job')

      const externalJobId = startParsed.data.externalJobId
      // Store externalJobId in state immediately — needed for Resume if polling fails
      updateJob(jobId, { externalJobId })

      const { error: jobInsertError } = await supabase.from('jobs').insert({
        id: jobId, user_id: userId, panel: 'retouch', operation: 'quick_enhance',
        status: 'processing', external_job_id: externalJobId,
        input_path: inputPath, tokens_used: preset.tokenCost,
      })
      if (jobInsertError) throw new Error(jobInsertError.message)

      updateJob(jobId, { status: 'processing' })
      await pollStatus(externalJobId, jobId)

      updateJob(jobId, { status: 'downloading', progress: 100 })
      const downloadRes = await fetch(`/api/retouch/download?jobId=${externalJobId}&internalJobId=${jobId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!downloadRes.ok) throw new Error('Download failed')
      const blob = await downloadRes.blob()

      const outputPath = await uploadOutputBlob(userId, jobId, blob)
      const resultUrl = await getOutputUrl(outputPath)

      await supabase.from('jobs').update({ status: 'completed', output_path: outputPath }).eq('id', jobId)
      updateJob(jobId, { status: 'completed', result: { url: resultUrl, outputPath }, originalFile: file })
      return { jobId, resultUrl }
    } catch (err) {
      const wrapped = wrapFetchError(err)
      updateJob(jobId, { status: 'failed', error: wrapped.message })
      await supabase.from('jobs').update({ status: 'failed' }).eq('id', jobId)
      throw wrapped
    }
  }, [addJob, updateJob])

  const runAdvancedEdit = useCallback(async ({ userId, file, plugins, intensityMode }) => {
    const jobId = crypto.randomUUID()
    addJob({ id: jobId, type: 'advanced_edit', panel: 'retouch', status: 'uploading', progress: 0, originalFile: file, pluginConfig: { plugins, intensityMode } })

    try {
      updateJob(jobId, { status: 'uploading' })
      const inputPath = await uploadInput(userId, jobId, file)

      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const tasks = buildAdvancedPayload(plugins, intensityMode)
      const payload = { mode: 'professional', tasks }

      updateJob(jobId, { status: 'submitting' })
      const startRes = await fetch('/api/retouch/start', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputPath, payload }),
      })
      const startParsed = await readResponse(startRes)
      if (!startParsed.ok || !startParsed.data) throw serverError(startParsed, 'Failed to start job')

      const externalJobId = startParsed.data.externalJobId
      // Store externalJobId in state immediately — needed for Resume if polling fails
      updateJob(jobId, { externalJobId })

      const { error: jobInsertError } = await supabase.from('jobs').insert({
        id: jobId, user_id: userId, panel: 'retouch', operation: 'advanced_edit',
        status: 'processing', external_job_id: externalJobId,
        input_path: inputPath, tokens_used: 2,
      })
      if (jobInsertError) throw new Error(jobInsertError.message)

      updateJob(jobId, { status: 'processing' })
      await pollStatus(externalJobId, jobId)

      updateJob(jobId, { status: 'downloading', progress: 100 })
      const downloadRes = await fetch(`/api/retouch/download?jobId=${externalJobId}&internalJobId=${jobId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!downloadRes.ok) throw new Error('Download failed')
      const blob = await downloadRes.blob()

      const parsedAsZip = await isZip(blob)
      const outputPath = await uploadOutputBlob(userId, jobId, blob, parsedAsZip ? 'zip' : 'jpg')
      await supabase.from('jobs').update({ status: 'completed', output_path: outputPath }).eq('id', jobId)
      updateJob(jobId, { status: 'completed', outputPath })
      return { jobId, outputPath }
    } catch (err) {
      const wrapped = wrapFetchError(err)
      updateJob(jobId, { status: 'failed', error: wrapped.message })
      await supabase.from('jobs').update({ status: 'failed' }).eq('id', jobId)
      throw wrapped
    }
  }, [addJob, updateJob])

  return { runQuickEnhance, runAdvancedEdit, resumeJob }
}

const INTENSITY_ALPHAS = {
  Heal:              { subtle: { Alpha1: 0.2 }, normal: { Alpha1: 0.6 }, extreme: { Alpha1: 1.0 } },
  'Dodge Burn':      { subtle: { Alpha1: 0.2, Alpha2: 0.05 }, normal: { Alpha1: 0.6, Alpha2: 0.15 }, extreme: { Alpha1: 1.0, Alpha2: 0.35 } },
  'Portrait Volumes':{ subtle: { Alpha1: 0.1 }, normal: { Alpha1: 0.3 }, extreme: { Alpha1: 0.9 } },
  'Eye Vessels':     { subtle: { Alpha1: 0.2 }, normal: { Alpha1: 0.5 }, extreme: { Alpha1: 1.0 } },
  'Eye Brilliance':  { subtle: { Alpha1: 0.2 }, normal: { Alpha1: 0.5 }, extreme: { Alpha1: 0.85 } },
  'White Teeth':     { subtle: { Alpha1: 0.1, Alpha2: 0.08 }, normal: { Alpha1: 0.25, Alpha2: 0.25 }, extreme: { Alpha1: 0.65, Alpha2: 0.55 } },
  Mattifier:         { subtle: { Alpha1: 0.2 }, normal: { Alpha1: 0.5 }, extreme: { Alpha1: 0.9 } },
  'Skin Tone':       { subtle: { Alpha1: 0.2, Alpha2: 0.2 }, normal: { Alpha1: 0.5, Alpha2: 0.5 }, extreme: { Alpha1: 1.0, Alpha2: 1.0 } },
  Fabric:            { subtle: { Alpha1: 0.1 }, normal: { Alpha1: 0.39 }, extreme: { Alpha1: 0.75 } },
  Dust:              { subtle: { Alpha1: 0.2 }, normal: { Alpha1: 0.5 }, extreme: { Alpha1: 1.0 } },
  'Clean Backdrop':  { subtle: { Alpha1: 0.2 }, normal: { Alpha1: 0.5 }, extreme: { Alpha1: 1.0 } },
  'Glasses Anti Glare': { subtle: { 'Glasses Glare Removal': 0.2 }, normal: { 'Glasses Glare Removal': 0.5 }, extreme: { 'Glasses Glare Removal': 1.0 } },
}

const PLUGIN_SCALE = {
  Heal: 0, 'Dodge Burn': 2, 'Portrait Volumes': 0, 'Eye Vessels': 0,
  'Eye Brilliance': 0, 'White Teeth': 0, Mattifier: 0, 'Skin Tone': 0,
  Fabric: 0, Dust: 3, 'Clean Backdrop': 0,
}

function buildAdvancedPayload(enabledPlugins, intensityMode) {
  const tasks = []
  if (enabledPlugins.includes('Glasses Anti Glare')) tasks.push({ Plugin: 'Face Detection' })
  for (const plugin of enabledPlugins) {
    if (plugin === 'Glasses Anti Glare') {
      const alphas = INTENSITY_ALPHAS[plugin]?.[intensityMode] || {}
      tasks.push({ Plugin: plugin, Layer: 1, LayoutMode: 'full', ...alphas })
    } else {
      const alphas = INTENSITY_ALPHAS[plugin]?.[intensityMode] || {}
      const scale = PLUGIN_SCALE[plugin] ?? 0
      tasks.push({ Plugin: plugin, Scale: scale, Layer: 1, ...alphas })
    }
  }
  return tasks
}
