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
      const buffer = await fileRes.buffer()
      res.setHeader('Content-Type', contentType)
      res.setHeader('Content-Length', buffer.length)
      return res.status(200).send(buffer)
    } catch (err) {
      console.error('retouch/download error:', err)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  // POST /api/retouch/start  (multipart/form-data)
  if (subpath === 'start') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
    try {
      const chunks = []
      for await (const chunk of req) chunks.push(chunk)
      const body = Buffer.concat(chunks)

      const boundary = req.headers['content-type']?.match(/boundary=([^\s;]+)/)?.[1]
      if (!boundary) return res.status(400).json({ error: 'Missing boundary' })

      const { file, payload } = parseMultipart(body, boundary)
      if (!file) return res.status(400).json({ error: 'No file uploaded' })

      const retouch4meToken = process.env.RETOUCH4ME_TOKEN
      if (!retouch4meToken) return res.status(500).json({ error: 'API token not configured' })

      let parsedPayload
      try {
        parsedPayload = JSON.parse(payload)
      } catch {
        return res.status(400).json({ error: 'Invalid payload JSON' })
      }

      const form = new FormData()
      const fileBlob = new Blob([file.buffer], { type: file.contentType || 'image/jpeg' })
      form.append('file', fileBlob, file.filename)
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

function parseMultipart(body, boundary) {
  const boundaryBuf = Buffer.from(`--${boundary}`)
  const parts = splitBuffer(body, boundaryBuf)
  let file = null
  let payload = null

  for (const part of parts) {
    const headerEnd = part.indexOf('\r\n\r\n')
    if (headerEnd === -1) continue
    const headerStr = part.slice(0, headerEnd).toString()
    const content = part.slice(headerEnd + 4)
    const trimmed = content.slice(0, content.lastIndexOf('\r\n'))

    const nameMatch = headerStr.match(/name="([^"]+)"/)
    const filenameMatch = headerStr.match(/filename="([^"]+)"/)
    const contentTypeMatch = headerStr.match(/Content-Type:\s*([^\r\n]+)/)
    const name = nameMatch?.[1]

    if (name === 'file' && filenameMatch) {
      file = {
        buffer: trimmed,
        filename: filenameMatch[1],
        contentType: contentTypeMatch?.[1]?.trim() || 'image/jpeg',
      }
    } else if (name === 'payload') {
      payload = trimmed.toString()
    }
  }

  return { file, payload }
}

function splitBuffer(buf, delimiter) {
  const parts = []
  let start = 0
  let idx
  while ((idx = buf.indexOf(delimiter, start)) !== -1) {
    if (idx > start) parts.push(buf.slice(start, idx))
    start = idx + delimiter.length
    if (buf[start] === 0x0d && buf[start + 1] === 0x0a) start += 2
    else if (buf[start] === 0x2d && buf[start + 1] === 0x2d) break
  }
  return parts.filter(p => p.length > 4)
}
