import { createClient } from '@supabase/supabase-js'

const RETOUCH4ME_BASE = 'https://retoucher.hz.labs.retouch4.me/api/v1'

function supabaseClient() {
  return createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

async function verifyUser(req, supabase) {
  const token = req.headers.authorization?.slice(7)
  if (!token) return null
  const { data: { user }, error } = await supabase.auth.getUser(token)
  return (error || !user) ? null : user
}

export default async function handler(req, res) {
  const subpath = (req.url || '').split('?')[0].split('/').filter(Boolean)[2]

  // GET /api/retouch/status?jobId=...  (no auth required — public status check)
  if (subpath === 'status') {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
    const { jobId } = req.query
    if (!jobId) return res.status(400).json({ error: 'Missing jobId' })
    try {
      const statusRes = await fetch(`${RETOUCH4ME_BASE}/retoucher/status/${encodeURIComponent(jobId)}`)
      if (!statusRes.ok) return res.status(statusRes.status).json({ error: 'Failed to fetch status' })
      return res.status(200).json(await statusRes.json())
    } catch (err) {
      console.error('retouch/status error:', err)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  // All remaining routes require auth
  const supabase = supabaseClient()
  const user = await verifyUser(req, supabase)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  // GET /api/retouch/download?jobId=...
  if (subpath === 'download') {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
    const { jobId } = req.query
    if (!jobId) return res.status(400).json({ error: 'Missing jobId' })
    try {
      const fileRes = await fetch(`${RETOUCH4ME_BASE}/retoucher/getFile/${encodeURIComponent(jobId)}`)
      if (!fileRes.ok) return res.status(fileRes.status).json({ error: 'Failed to download result' })
      const contentType = fileRes.headers.get('content-type') || 'image/jpeg'
      const buffer = Buffer.from(await fileRes.arrayBuffer())
      res.setHeader('Content-Type', contentType)
      res.setHeader('Content-Length', buffer.length)
      return res.status(200).send(buffer)
    } catch (err) {
      console.error('retouch/download error:', err)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  // POST /api/retouch/start  (JSON body: { inputPath, payload })
  // The file is already in Supabase Storage from the client-side upload.
  // Vercel fetches it datacenter-to-datacenter (fast) and forwards to Retouch4me,
  // avoiding the slow browser→Vercel file upload that caused 10s timeout failures.
  if (subpath === 'start') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
    try {
      const chunks = []
      for await (const chunk of req) chunks.push(chunk)
      const body = JSON.parse(Buffer.concat(chunks).toString())
      const { inputPath, payload: payloadRaw } = body

      if (!inputPath) return res.status(400).json({ error: 'Missing inputPath' })
      if (!inputPath.startsWith(`${user.id}/`)) return res.status(403).json({ error: 'Access denied' })

      const retouch4meToken = process.env.RETOUCH4ME_TOKEN
      if (!retouch4meToken) return res.status(500).json({ error: 'API token not configured' })

      let parsedPayload
      try {
        parsedPayload = typeof payloadRaw === 'string' ? JSON.parse(payloadRaw) : payloadRaw
      } catch {
        return res.status(400).json({ error: 'Invalid payload' })
      }

      // Get a short-lived signed URL for the already-uploaded file
      const { data: urlData, error: urlError } = await supabase.storage.from('inputs').createSignedUrl(inputPath, 60)
      if (urlError || !urlData?.signedUrl) return res.status(500).json({ error: 'Could not access input file' })

      // Download from Supabase (datacenter-to-datacenter, fast)
      const fileRes = await fetch(urlData.signedUrl)
      if (!fileRes.ok) return res.status(500).json({ error: 'Failed to fetch input file from storage' })
      const fileBuffer = Buffer.from(await fileRes.arrayBuffer())
      const contentType = fileRes.headers.get('content-type') || 'image/jpeg'
      const filename = inputPath.split('/').pop() || 'image.jpg'

      // Forward to Retouch4me
      const form = new FormData()
      form.append('file', new Blob([fileBuffer], { type: contentType }), filename)
      form.append('token', retouch4meToken)
      form.append('payload', JSON.stringify(parsedPayload))

      const startRes = await fetch(`${RETOUCH4ME_BASE}/retoucher/start`, {
        method: 'POST',
        body: form,
      })

      const startData = await startRes.json()
      if (!startRes.ok || startData.status !== 200) {
        return res.status(startRes.status).json({ error: startData.message || 'Failed to start retouch job' })
      }

      return res.status(200).json({ externalJobId: startData.id, retouchQuota: startData.retouchQuota })
    } catch (err) {
      console.error('retouch/start error:', err)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  return res.status(404).json({ error: 'Not found' })
}
