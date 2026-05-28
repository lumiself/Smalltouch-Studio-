import { createClient } from '@supabase/supabase-js'
import { createHmac, timingSafeEqual } from 'crypto'

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
    await supabase.from('jobs').update({ status: 'failed' }).eq('id', jobId)
    if (job.tokens_used > 0) {
      await supabase
        .rpc('refund_tokens', { p_user_id: job.user_id, p_amount: job.tokens_used })
        .catch(() => {}) // best-effort refund
    }
    return res.status(200).json({ ok: true })
  }

  // Success path
  if (data.status === 'succeeded') {
    const outputUrl = Array.isArray(data.output) ? data.output[0] : data.output

    if (!outputUrl) {
      await supabase.from('jobs').update({ status: 'failed' }).eq('id', jobId)
      if (job.tokens_used > 0) {
        await supabase
          .rpc('refund_tokens', { p_user_id: job.user_id, p_amount: job.tokens_used })
          .catch(() => {})
      }
      return res.status(200).json({ error: 'No output in prediction' })
    }

    try {
      // Download from Replicate CDN
      const imgRes = await fetch(outputUrl)
      if (!imgRes.ok) throw new Error(`Failed to fetch result (${imgRes.status})`)
      const buffer = Buffer.from(await imgRes.arrayBuffer())

      const ext = job.operation === 'bg_flux_preset' ? 'webp' : 'jpg'
      const outputPath = `${job.user_id}/${jobId}_result.${ext}`
      const contentType = ext === 'webp' ? 'image/webp' : 'image/jpeg'

      // Upload to Supabase outputs bucket
      const { error: uploadError } = await supabase.storage
        .from('outputs')
        .upload(outputPath, buffer, { contentType, upsert: true })

      if (uploadError) throw new Error(uploadError.message)

      await supabase
        .from('jobs')
        .update({ status: 'completed', output_path: outputPath })
        .eq('id', jobId)

      return res.status(200).json({ ok: true })
    } catch (err) {
      console.error('webhook/replicate storage error:', err)
      // Mark failed and refund so the user isn't charged for a broken result
      await supabase.from('jobs').update({ status: 'failed' }).eq('id', jobId)
      if (job.tokens_used > 0) {
        await supabase
          .rpc('refund_tokens', { p_user_id: job.user_id, p_amount: job.tokens_used })
          .catch(() => {})
      }
      return res.status(200).json({ error: err.message }) // always 200 to Replicate
    }
  }

  // starting / processing — acknowledge and wait for next event
  return res.status(200).json({ ok: true })
}
