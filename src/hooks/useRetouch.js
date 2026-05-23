import { useState, useCallback } from 'react'
import JSZip from 'jszip'
import { supabase } from '../lib/supabase'
import { uploadInput, uploadOutputBlob, getOutputUrl } from '../lib/storage'

const POLL_INTERVAL_MS = 3000

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
    return new Error(`Server timed out or crashed (${parsed.status}). Likely Vercel 10s function limit — try a smaller image.`)
  }
  const snippet = parsed.raw?.trim().slice(0, 200)
  return new Error(snippet ? `${fallback} (${parsed.status}): ${snippet}` : `${fallback} (${parsed.status})`)
}

export function useRetouch() {
  const [jobs, setJobs] = useState([])

  function updateJob(id, patch) {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, ...patch } : j))
  }

  async function pollStatus(externalJobId, jobId) {
    return new Promise((resolve, reject) => {
      const interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/retouch/status?jobId=${externalJobId}`)
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
          clearInterval(interval)
          reject(err)
        }
      }, POLL_INTERVAL_MS)
    })
  }

  const runQuickEnhance = useCallback(async ({ userId, file, preset }) => {
    const jobId = crypto.randomUUID()
    const newJob = { id: jobId, type: 'quick_enhance', presetName: preset.name, status: 'uploading', progress: 0, result: null }
    setJobs(prev => [...prev, newJob])

    try {
      updateJob(jobId, { status: 'uploading' })
      const inputPath = await uploadInput(userId, jobId, file)

      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      updateJob(jobId, { status: 'submitting' })
      const formData = new FormData()
      formData.append('file', file)
      formData.append('payload', JSON.stringify(preset.payload))
      formData.append('jobId', jobId)

      const startRes = await fetch('/api/retouch/start', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const startParsed = await readResponse(startRes)
      if (!startParsed.ok || !startParsed.data) throw serverError(startParsed, 'Failed to start job')
      const startData = startParsed.data

      const externalJobId = startData.externalJobId

      const { error: jobInsertError } = await supabase.from('jobs').insert({
        id: jobId,
        user_id: userId,
        panel: 'retouch',
        operation: 'quick_enhance',
        status: 'processing',
        external_job_id: externalJobId,
        input_path: inputPath,
        tokens_used: preset.tokenCost,
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
      updateJob(jobId, { status: 'failed', error: err.message })
      await supabase.from('jobs').update({ status: 'failed' }).eq('id', jobId)
      throw err
    }
  }, [])

  const runAdvancedEdit = useCallback(async ({ userId, file, plugins, intensityMode }) => {
    const jobId = crypto.randomUUID()
    const newJob = { id: jobId, type: 'advanced_edit', status: 'uploading', progress: 0, layers: null }
    setJobs(prev => [...prev, newJob])

    try {
      updateJob(jobId, { status: 'uploading' })
      const inputPath = await uploadInput(userId, jobId, file)

      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const tasks = buildAdvancedPayload(plugins, intensityMode)
      const payload = { mode: 'professional', tasks }

      updateJob(jobId, { status: 'submitting' })
      const formData = new FormData()
      formData.append('file', file)
      formData.append('payload', JSON.stringify(payload))
      formData.append('jobId', jobId)

      const startRes = await fetch('/api/retouch/start', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const startParsed = await readResponse(startRes)
      if (!startParsed.ok || !startParsed.data) throw serverError(startParsed, 'Failed to start job')
      const startData = startParsed.data

      const externalJobId = startData.externalJobId

      const { error: jobInsertError } = await supabase.from('jobs').insert({
        id: jobId,
        user_id: userId,
        panel: 'retouch',
        operation: 'advanced_edit',
        status: 'processing',
        external_job_id: externalJobId,
        input_path: inputPath,
        tokens_used: 2,
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

      const isZip = blob.type === 'application/zip' || blob.type === 'application/octet-stream'
      let layers = []
      let resultJson = null

      if (isZip) {
        const zip = await JSZip.loadAsync(blob)
        const resultJsonFile = zip.file('result.json')
        if (resultJsonFile) resultJson = JSON.parse(await resultJsonFile.async('string'))

        for (const [name, zipEntry] of Object.entries(zip.files)) {
          if (name.endsWith('.png') && !name.includes('result')) {
            const layerBlob = await zipEntry.async('blob')
            const url = URL.createObjectURL(layerBlob)
            const pluginName = name.replace('.png', '').replace(/_/g, ' ')
            layers.push({ name: pluginName, url, opacity: 1.0, blendMode: getBlendMode(pluginName) })
          }
        }
      }

      const outputPath = await uploadOutputBlob(userId, jobId, blob, isZip ? 'zip' : 'jpg')
      await supabase.from('jobs').update({ status: 'completed', output_path: outputPath }).eq('id', jobId)

      updateJob(jobId, { status: 'completed', layers, resultJson, outputPath, originalFile: file })
      return { jobId, layers, resultJson }
    } catch (err) {
      updateJob(jobId, { status: 'failed', error: err.message })
      await supabase.from('jobs').update({ status: 'failed' }).eq('id', jobId)
      throw err
    }
  }, [])

  return { jobs, runQuickEnhance, runAdvancedEdit, updateJob }
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
  const needsFaceDetection = enabledPlugins.includes('Glasses Anti Glare')
  if (needsFaceDetection) tasks.push({ Plugin: 'Face Detection' })

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

const BLEND_MODES = {
  heal: 'normal', fabric: 'normal', 'eye vessels': 'normal',
  'eye brilliance': 'normal', 'white teeth': 'normal',
  'dodge burn': 'soft-light', 'skin tone': 'soft-light', 'portrait volumes': 'soft-light',
  'glasses anti glare': 'linear-light',
}

function getBlendMode(pluginName) {
  return BLEND_MODES[pluginName.toLowerCase()] || 'normal'
}
