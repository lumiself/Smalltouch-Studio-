import { createClient } from '@supabase/supabase-js'
import fetch from 'node-fetch'

const REPLICATE_BASE = 'https://api.replicate.com/v1'

function supabaseClient() {
  return createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

async function verifyUser(req, supabase) {
  const token = req.headers.authorization?.slice(7)
  if (!token) return null
  const { data: { user }, error } = await supabase.auth.getUser(token)
  return (error || !user) ? null : user
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
  const subpath = Array.isArray(req.query.path) ? req.query.path[0] : req.query.path

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

  return res.status(404).json({ error: 'Not found' })
}
