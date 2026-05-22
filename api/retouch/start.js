import { createClient } from '@supabase/supabase-js'
import FormData from 'form-data'
import fetch from 'node-fetch'

const RETOUCH4ME_BASE = 'https://retoucher.hz.labs.retouch4.me/api/v1'

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
    form.append('file', file.buffer, { filename: file.filename, contentType: file.contentType })
    form.append('token', retouch4meToken)
    form.append('payload', JSON.stringify(parsedPayload))

    const startRes = await fetch(`${RETOUCH4ME_BASE}/retoucher/start`, {
      method: 'POST',
      body: form,
      headers: form.getHeaders(),
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
