import { createClient } from '@supabase/supabase-js'

const REPLICATE_BASE = 'https://api.replicate.com/v1'
const NANO_BANANA_ENDPOINT = 'https://api.replicate.com/v1/models/google/nano-banana-pro/predictions'

function supabaseClient() {
  return createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

async function verifyUser(req, supabase) {
  const token = req.headers.authorization?.slice(7)
  if (!token) return null
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  if (!user.email_confirmed_at) return null
  return user
}

async function parseBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  try {
    return JSON.parse(Buffer.concat(chunks).toString())
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  const subpath = (req.url || '').split('?')[0].split('/').filter(Boolean)[2]

  // GET /api/background/status?predictionId=...  (no auth required)
  if (subpath === 'status') {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
    const { predictionId } = req.query
    if (!predictionId) return res.status(400).json({ error: 'Missing predictionId' })
    try {
      const replicateRes = await fetch(
        `${REPLICATE_BASE}/predictions/${encodeURIComponent(predictionId)}`,
        { headers: { Authorization: `Token ${process.env.REPLICATE_API_KEY}` } }
      )
      if (!replicateRes.ok) return res.status(replicateRes.status).json({ error: 'Failed to fetch prediction' })
      const data = await replicateRes.json()
      return res.status(200).json({ status: data.status, output: data.output ?? null, error: data.error ?? null })
    } catch (err) {
      console.error('background/status error:', err)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  // All remaining routes require auth
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const supabase = supabaseClient()
  const user = await verifyUser(req, supabase)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const body = await parseBody(req)
  if (!body) return res.status(400).json({ error: 'Invalid JSON body' })

  // POST /api/background/remove
  if (subpath === 'remove') {
    const { inputPath } = body
    if (!inputPath) return res.status(400).json({ error: 'Missing inputPath' })
    try {
      const { data: signedData, error: signedError } = await supabase.storage
        .from('inputs')
        .createSignedUrl(inputPath, 300)
      if (signedError || !signedData?.signedUrl) return res.status(500).json({ error: 'Failed to create signed URL' })

      const replicateRes = await fetch(`${REPLICATE_BASE}/predictions`, {
        method: 'POST',
        headers: { Authorization: `Token ${process.env.REPLICATE_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'cjwbw/rembg', input: { image: signedData.signedUrl } }),
      })
      const replicateData = await replicateRes.json()
      if (!replicateRes.ok) return res.status(500).json({ error: replicateData.detail || 'Replicate error' })
      return res.status(200).json({ predictionId: replicateData.id })
    } catch (err) {
      console.error('background/remove error:', err)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  // POST /api/background/generate
  if (subpath === 'generate') {
    const { prompt, width = 1024, height = 1024 } = body
    if (!prompt) return res.status(400).json({ error: 'Missing prompt' })
    try {
      const replicateRes = await fetch(`${REPLICATE_BASE}/predictions`, {
        method: 'POST',
        headers: { Authorization: `Token ${process.env.REPLICATE_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'stability-ai/sdxl',
          input: {
            prompt,
            width: Math.min(Number(width) || 1024, 1024),
            height: Math.min(Number(height) || 1024, 1024),
            num_outputs: 1,
          },
        }),
      })
      const replicateData = await replicateRes.json()
      if (!replicateRes.ok) return res.status(500).json({ error: replicateData.detail || 'Replicate error' })
      return res.status(200).json({ predictionId: replicateData.id })
    } catch (err) {
      console.error('background/generate error:', err)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  // POST /api/background/expand
  if (subpath === 'expand') {
    const { imageDataUri, maskDataUri, prompt } = body
    if (!imageDataUri || !maskDataUri || !prompt) return res.status(400).json({ error: 'Missing required fields' })
    try {
      const replicateRes = await fetch(`${REPLICATE_BASE}/predictions`, {
        method: 'POST',
        headers: { Authorization: `Token ${process.env.REPLICATE_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'stability-ai/stable-diffusion-inpainting',
          input: { image: imageDataUri, mask: maskDataUri, prompt },
        }),
      })
      const replicateData = await replicateRes.json()
      if (!replicateRes.ok) return res.status(500).json({ error: replicateData.detail || 'Replicate error' })
      return res.status(200).json({ predictionId: replicateData.id })
    } catch (err) {
      console.error('background/expand error:', err)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  // POST /api/background/flux-preset
  if (subpath === 'flux-preset') {
    const { jobId, inputPath, preset, tokenCost } = body
    if (!jobId || !inputPath || !preset?.prompt) {
      return res.status(400).json({ error: 'Missing jobId, inputPath, or preset.prompt' })
    }

    const webhookBase = process.env.WEBHOOK_BASE ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
    if (!webhookBase) {
      return res.status(500).json({ error: 'WEBHOOK_BASE is not configured — set it in Vercel environment variables' })
    }

    try {
      const { data: signedData, error: signedError } = await supabase.storage
        .from('inputs')
        .createSignedUrl(inputPath, 300)
      if (signedError || !signedData?.signedUrl) {
        return res.status(500).json({ error: 'Failed to create signed URL' })
      }

      const replicateRes = await fetch(NANO_BANANA_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.REPLICATE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: {
            prompt: preset.prompt,
            image_input: [signedData.signedUrl],
            aspect_ratio: preset.aspect_ratio ?? '2:3',
            resolution: preset.resolution ?? '2K',
            output_format: preset.output_format ?? 'jpg',
            safety_filter_level: preset.safety_filter_level ?? 'block_only_high',
          },
          webhook: `${webhookBase}/api/webhook/replicate?jobId=${jobId}`,
          webhook_events_filter: ['completed'],
        }),
      })
      const replicateData = await replicateRes.json()
      if (!replicateRes.ok) {
        return res.status(500).json({ error: replicateData.detail || replicateData.error || 'Replicate error' })
      }

      // Insert job row server-side so the webhook can find it
      const { error: insertError } = await supabase.from('jobs').insert({
        id: jobId,
        user_id: user.id,
        panel: 'background',
        operation: 'bg_flux_preset',
        status: 'processing',
        external_job_id: replicateData.id,
        input_path: inputPath,
        tokens_used: tokenCost ?? 2,
      })
      if (insertError) {
        console.error('flux-preset job insert error:', insertError)
        // Prediction is already running — log but don't error the client
      }

      return res.status(200).json({ jobId })
    } catch (err) {
      console.error('background/flux-preset error:', err)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  // POST /api/background/replace — single Flux-2-Max call: subject photo as input_images + preset prompt → new background
  if (subpath === 'replace') {
    const { jobId, inputPath, preset, tokenCost } = body
    if (!jobId || !inputPath || !preset?.prompt) {
      return res.status(400).json({ error: 'Missing jobId, inputPath, or preset.prompt' })
    }

    const webhookBase = process.env.WEBHOOK_BASE ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
    if (!webhookBase) {
      return res.status(500).json({ error: 'WEBHOOK_BASE is not configured — set it in Vercel environment variables' })
    }

    try {
      const { data: signedData, error: signedError } = await supabase.storage
        .from('inputs')
        .createSignedUrl(inputPath, 300)
      if (signedError || !signedData?.signedUrl) {
        return res.status(500).json({ error: 'Failed to create signed URL' })
      }

      const replicateRes = await fetch(NANO_BANANA_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.REPLICATE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: {
            prompt: preset.prompt,
            image_input: [signedData.signedUrl],
            aspect_ratio: preset.aspect_ratio ?? '2:3',
            resolution: preset.resolution ?? '2K',
            output_format: preset.output_format ?? 'jpg',
            safety_filter_level: preset.safety_filter_level ?? 'block_only_high',
          },
          webhook: `${webhookBase}/api/webhook/replicate?jobId=${jobId}`,
          webhook_events_filter: ['completed'],
        }),
      })
      const replicateData = await replicateRes.json()
      if (!replicateRes.ok) {
        return res.status(500).json({ error: replicateData.detail || replicateData.error || 'Replicate error' })
      }

      const { error: insertError } = await supabase.from('jobs').insert({
        id: jobId,
        user_id: user.id,
        panel: 'background',
        operation: 'bg_replace',
        status: 'processing',
        external_job_id: replicateData.id,
        input_path: inputPath,
        tokens_used: tokenCost ?? 2,
      })
      if (insertError) {
        console.error('replace job insert error:', insertError)
      }

      return res.status(200).json({ jobId })
    } catch (err) {
      console.error('background/replace error:', err)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  return res.status(404).json({ error: 'Not found' })
}
