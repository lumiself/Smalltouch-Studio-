import { createClient } from '@supabase/supabase-js'
import fetch from 'node-fetch'

const REPLICATE_BASE = 'https://api.replicate.com/v1'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const token = authHeader.slice(7)
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid token' })
  }

  let body
  try {
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    body = JSON.parse(Buffer.concat(chunks).toString())
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' })
  }

  const { imageDataUri, maskDataUri, prompt } = body
  if (!imageDataUri || !maskDataUri || !prompt) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    const replicateRes = await fetch(`${REPLICATE_BASE}/predictions`, {
      method: 'POST',
      headers: {
        Authorization: `Token ${process.env.REPLICATE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'stability-ai/stable-diffusion-inpainting',
        input: {
          image: imageDataUri,
          mask: maskDataUri,
          prompt,
        },
      }),
    })

    const replicateData = await replicateRes.json()
    if (!replicateRes.ok) {
      return res.status(500).json({ error: replicateData.detail || 'Replicate error' })
    }

    return res.status(200).json({ predictionId: replicateData.id })
  } catch (err) {
    console.error('background/expand error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
