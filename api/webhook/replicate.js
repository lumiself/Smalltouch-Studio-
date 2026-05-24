import { createClient } from '@supabase/supabase-js'
import { createHmac, timingSafeEqual } from 'crypto'
import sharp from 'sharp'

function supabaseAdmin() {
  return createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

async function verifySignature(req, rawBody) {
  const secret = process.env.REPLICATE_WEBHOOK_SECRET
  if (!secret) return true // skip in local dev — set secret in production

  const webhookId        = req.headers['webhook-id']
  const webhookTimestamp = req.headers['webhook-timestamp']
  const webhookSignature = req.headers['webhook-signature']

  if (!webhookId || !webhookTimestamp || !webhookSignature) return false

  // Replicate uses Svix — secret may be prefixed with "whsec_"
  const keyBytes = secret.startsWith('whsec_')
    ? Buffer.from(secret.slice(6), 'base64')
    : Buffer.from(secret)

  const signedContent = `${webhookId}.${webhookTimestamp}.${rawBody}`
  const expected = createHmac('sha256', keyBytes).update(signedContent).digest('base64')
  const expectedBuf = Buffer.from(expected)

  return webhookSignature.split(' ').some(sig => {
    const value = sig.startsWith('v1,') ? sig.slice(3) : sig
    try {
      const actualBuf = Buffer.from(value)
      if (actualBuf.length !== expectedBuf.length) return false
      return timingSafeEqual(expectedBuf, actualBuf)
    } catch {
      return false
    }
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { jobId } = req.query
  if (!jobId) return res.status(400).json({ error: 'Missing jobId' })

  // Read raw body before any parsing — needed for signature verification
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const rawBody = Buffer.concat(chunks).toString()

  const valid = await verifySignature(req, rawBody)
  if (!valid) return res.status(401).json({ error: 'Invalid signature' })

  let data
  try { data = JSON.parse(rawBody) } catch { return res.status(400).json({ error: 'Invalid JSON' }) }

  const supabase = supabaseAdmin()

  // Find the job
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('id, user_id, status, external_job_id, tokens_used, operation')
    .eq('id', jobId)
    .single()

  if (jobError || !job) return res.status(404).json({ error: 'Job not found' })

  // Idempotency: already settled
  if (job.status === 'completed' || job.status === 'failed') {
    return res.status(200).json({ duplicate: true })
  }

  // Stale: prediction ID doesn't match (can happen if a job was retried)
  if (job.external_job_id !== data.id) {
    return res.status(200).json({ stale: true })
  }

  // Failure path
  if (data.status === 'failed' || data.status === 'canceled') {
    return await failJob(supabase, job, jobId, data.error || 'Prediction failed', res)
  }

  // Success path
  if (data.status === 'succeeded') {
    const outputUrl = Array.isArray(data.output) ? data.output[0] : data.output

    if (!outputUrl) {
      return await failJob(supabase, job, jobId, 'No output in prediction')
    }

    try {
      // Multi-step pipeline: bg_replace
      if (job.operation === 'bg_replace') {
        return await handleBgReplaceStep(supabase, job, jobId, outputUrl, res)
      }

      // Single-step: bg_flux_preset — download, upload, done
      return await storeResult(supabase, job, jobId, outputUrl, 'webp', res)
    } catch (err) {
      console.error('webhook/replicate error:', err)
      return await failJob(supabase, job, jobId, err.message, res)
    }
  }

  // starting / processing — acknowledge and wait for next event
  return res.status(200).json({ ok: true })
}

// ─── helpers ────────────────────────────────────────────────────────────────

async function failJob(supabase, job, jobId, reason, res) {
  await supabase.from('jobs').update({ status: 'failed' }).eq('id', jobId)
  if (job.tokens_used > 0) {
    await supabase
      .rpc('refund_tokens', { p_user_id: job.user_id, p_amount: job.tokens_used })
      .catch(() => {})
  }
  if (res) return res.status(200).json({ error: reason })
}

async function storeResult(supabase, job, jobId, outputUrl, ext, res) {
  const imgRes = await fetch(outputUrl)
  if (!imgRes.ok) throw new Error(`Failed to fetch result (${imgRes.status})`)
  const buffer = Buffer.from(await imgRes.arrayBuffer())

  const outputPath = `${job.user_id}/${jobId}_result.${ext}`
  const contentType = ext === 'webp' ? 'image/webp' : ext === 'png' ? 'image/png' : 'image/jpeg'

  const { error: uploadError } = await supabase.storage
    .from('outputs')
    .upload(outputPath, buffer, { contentType, upsert: true })
  if (uploadError) throw new Error(uploadError.message)

  await supabase.from('jobs').update({ status: 'completed', output_path: outputPath }).eq('id', jobId)
  if (res) return res.status(200).json({ ok: true })
}

// ─── bg_replace pipeline ─────────────────────────────────────────────────────

async function handleBgReplaceStep(supabase, job, jobId, outputUrl, res) {
  const { step, preset } = job.metadata ?? {}

  // Step 1 complete: rembg done → start Flux-2-Max background generation
  if (step === 1) {
    const webhookBase = process.env.WEBHOOK_BASE ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
    if (!webhookBase) throw new Error('WEBHOOK_BASE not configured')

    const FLUX_ENDPOINT = 'https://api.replicate.com/v1/models/black-forest-labs/flux-2-max/predictions'
    const fluxRes = await fetch(FLUX_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.REPLICATE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: {
          prompt: preset.prompt,
          aspect_ratio: preset.aspect_ratio ?? '1:1',
          resolution: preset.resolution ?? '1 MP',
          output_format: 'png', // PNG so we can composite cleanly
          safety_tolerance: preset.safety_tolerance ?? 2,
        },
        webhook: `${webhookBase}/api/webhook/replicate?jobId=${jobId}`,
        webhook_events_filter: ['completed'],
      }),
    })
    const fluxData = await fluxRes.json()
    if (!fluxRes.ok) throw new Error(fluxData.detail || 'Flux-2-Max error')

    // Advance to step 2; save the rembg subject URL in metadata
    await supabase.from('jobs').update({
      external_job_id: fluxData.id,
      metadata: { step: 2, preset, subject_url: outputUrl },
    }).eq('id', jobId)

    return res.status(200).json({ ok: true })
  }

  // Step 2 complete: Flux-2-Max done → composite subject over background
  if (step === 2) {
    const subjectUrl = job.metadata?.subject_url
    if (!subjectUrl) throw new Error('subject_url missing from metadata')

    // Download both images in parallel
    const [subjectRes, bgRes] = await Promise.all([
      fetch(subjectUrl),
      fetch(outputUrl),
    ])
    if (!subjectRes.ok) throw new Error('Failed to fetch subject PNG')
    if (!bgRes.ok)      throw new Error('Failed to fetch background PNG')

    const [subjectBuf, bgBuf] = await Promise.all([
      subjectRes.arrayBuffer().then(Buffer.from),
      bgRes.arrayBuffer().then(Buffer.from),
    ])

    // Get subject dimensions so the background matches exactly
    const { width, height } = await sharp(subjectBuf).metadata()

    // Resize background to cover subject canvas, then composite subject on top
    const bgResized = await sharp(bgBuf)
      .resize(width, height, { fit: 'cover', position: 'centre' })
      .png()
      .toBuffer()

    const composite = await sharp(bgResized)
      .composite([{ input: subjectBuf, blend: 'over' }])
      .jpeg({ quality: 92 })
      .toBuffer()

    const outputPath = `${job.user_id}/${jobId}_result.jpg`
    const { error: uploadError } = await supabase.storage
      .from('outputs')
      .upload(outputPath, composite, { contentType: 'image/jpeg', upsert: true })
    if (uploadError) throw new Error(uploadError.message)

    await supabase.from('jobs').update({ status: 'completed', output_path: outputPath }).eq('id', jobId)
    return res.status(200).json({ ok: true })
  }

  throw new Error(`Unknown bg_replace step: ${step}`)
}
