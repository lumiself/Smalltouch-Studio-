import { createClient } from '@supabase/supabase-js'
import fetch from 'node-fetch'

const RETOUCH4ME_BASE = 'https://retoucher.hz.labs.retouch4.me/api/v1'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
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

  const { jobId } = req.query
  if (!jobId) return res.status(400).json({ error: 'Missing jobId' })

  try {
    const fileRes = await fetch(`${RETOUCH4ME_BASE}/retoucher/getFile/${encodeURIComponent(jobId)}`)
    if (!fileRes.ok) {
      return res.status(fileRes.status).json({ error: 'Failed to download result' })
    }

    const contentType = fileRes.headers.get('content-type') || 'image/jpeg'
    const buffer = await fileRes.buffer()

    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Length', buffer.length)
    return res.status(200).send(buffer)
  } catch (err) {
    console.error('retouch/download error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
